from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Response, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List, Literal
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import os
import logging
import uuid
import re
from pathlib import Path
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

class User(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    role: Literal['buyer', 'seller', 'admin'] = 'buyer'
    wallet_balance: float = 0.0
    created_at: datetime

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Coupon(BaseModel):
    coupon_id: str
    seller_id: str
    brand_name: str
    coupon_code: str
    expiry_date: str
    coupon_value: float
    asking_price: float
    proof_image_url: Optional[str] = None
    status: Literal['pending', 'approved', 'rejected', 'sold'] = 'pending'
    ai_risk_score: Optional[str] = None
    ai_feedback: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CouponCreate(BaseModel):
    brand_name: str
    coupon_code: str
    expiry_date: str
    coupon_value: float
    asking_price: float
    proof_image_url: Optional[str] = None

class CouponUpdate(BaseModel):
    status: Optional[Literal['pending', 'approved', 'rejected', 'sold']] = None

class Transaction(BaseModel):
    transaction_id: str
    buyer_id: str
    seller_id: str
    coupon_id: str
    amount: float
    platform_commission: float = 0.0
    status: Literal['pending', 'escrow', 'completed', 'disputed', 'refunded'] = 'pending'
    created_at: datetime
    completed_at: Optional[datetime] = None

class PaymentTransaction(BaseModel):
    payment_id: str
    user_id: str
    coupon_id: Optional[str] = None
    session_id: str
    amount: float
    currency: str = 'usd'
    payment_status: Literal['initiated', 'pending', 'paid', 'failed', 'expired'] = 'initiated'
    created_at: datetime
    updated_at: datetime

class AIValidationLog(BaseModel):
    log_id: str
    coupon_id: str
    risk_score: str
    feedback: str
    validation_details: dict
    created_at: datetime

class Review(BaseModel):
    review_id: str
    buyer_id: str
    coupon_id: str
    seller_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

class ReviewCreate(BaseModel):
    coupon_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class Dispute(BaseModel):
    dispute_id: str
    transaction_id: str
    buyer_id: str
    seller_id: str
    coupon_id: str
    reason: str
    status: Literal['open', 'investigating', 'resolved'] = 'open'
    resolution: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

class DisputeCreate(BaseModel):
    transaction_id: str
    reason: str

class Wallet(BaseModel):
    wallet_id: str
    user_id: str
    balance: float = 0.0
    updated_at: datetime

class WithdrawRequest(BaseModel):
    amount: float
    upi_id: Optional[str] = None
    bank_account: Optional[str] = None

class SessionDataRequest(BaseModel):
    session_id: str

async def get_current_user(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)) -> User:
    token = None
    if session_token:
        token = session_token
    elif authorization and authorization.startswith('Bearer '):
        token = authorization.replace('Bearer ', '')
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({'session_token': token}, {'_id': 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc['expires_at']
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({'user_id': session_doc['user_id']}, {'_id': 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

@api_router.get("/")
async def root():
    return {"message": "Coupon Marketplace API"}

@api_router.post("/auth/session")
async def create_session(request: SessionDataRequest, response: Response):
    \"\"\"Exchange Emergent session_id for user data and create session\"\"\"
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
                headers={'X-Session-ID': request.session_id}
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = resp.json()
            
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            existing_user = await db.users.find_one({'email': data['email']}, {'_id': 0})
            
            if existing_user:
                user_id = existing_user['user_id']
                await db.users.update_one(
                    {'user_id': user_id},
                    {'$set': {'name': data['name'], 'picture': data.get('picture')}}
                )
            else:
                user_doc = {
                    'user_id': user_id,
                    'email': data['email'],
                    'name': data['name'],
                    'picture': data.get('picture'),
                    'role': 'buyer',
                    'wallet_balance': 0.0,
                    'created_at': datetime.now(timezone.utc)
                }
                await db.users.insert_one(user_doc)
            
            session_token = data.get('session_token', f"session_{uuid.uuid4().hex}")
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            
            await db.user_sessions.delete_many({'user_id': user_id})
            
            session_doc = {
                'user_id': user_id,
                'session_token': session_token,
                'expires_at': expires_at,
                'created_at': datetime.now(timezone.utc)
            }
            await db.user_sessions.insert_one(session_doc)
            
            response.set_cookie(
                key='session_token',
                value=session_token,
                httponly=True,
                secure=True,
                samesite='none',
                path='/',
                max_age=7*24*60*60
            )
            
            user = await db.users.find_one({'user_id': user_id}, {'_id': 0})
            return user
            
    except httpx.HTTPError as e:
        logger.error(f"Error fetching session data: {e}")
        raise HTTPException(status_code=500, detail="Authentication service error")

@api_router.get("/auth/me")
async def get_me(request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    \"\"\"Get current authenticated user\"\"\"
    user = await get_current_user(authorization, session_token)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    \"\"\"Logout user and clear session\"\"\"
    if session_token:
        await db.user_sessions.delete_one({'session_token': session_token})
    
    response.delete_cookie(key='session_token', path='/', samesite='none', secure=True)
    return {"message": "Logged out successfully"}

@api_router.post("/coupons/validate")
async def validate_coupon(coupon: CouponCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    \"\"\"AI validation of coupon before submission\"\"\"
    user = await get_current_user(authorization, session_token)
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"validation_{uuid.uuid4().hex[:8]}",
            system_message=\"\"\"You are an AI coupon validator. Analyze the coupon details and determine:
1. Is the expiry date valid and in the future?
2. Does the coupon code format look legitimate?
3. Is there potential for fraud or suspicious patterns?
4. Does the asking price seem reasonable compared to coupon value?

Respond ONLY with JSON in this format:
{
  \"risk_score\": \"low\" | \"medium\" | \"high\",
  \"feedback\": \"Brief explanation of your assessment\",
  \"issues\": [\"list of specific issues found\"],
  \"recommendation\": \"approve\" | \"review\" | \"reject\"
}\"\"\"
        ).with_model('openai', 'gpt-5.2')
        
        message = UserMessage(
            text=f\"\"\"Validate this coupon:
Brand: {coupon.brand_name}
Code: {coupon.coupon_code}
Expiry: {coupon.expiry_date}
Value: ${coupon.coupon_value}
Asking Price: ${coupon.asking_price}
\"\"\"
        )
        
        response = await chat.send_message(message)
        
        import json
        validation_result = json.loads(response)
        
        return {
            'risk_score': validation_result.get('risk_score', 'medium'),
            'feedback': validation_result.get('feedback', 'Validation completed'),
            'issues': validation_result.get('issues', []),
            'recommendation': validation_result.get('recommendation', 'review')
        }
        
    except Exception as e:
        logger.error(f"AI validation error: {e}")
        return {
            'risk_score': 'medium',
            'feedback': 'Unable to complete AI validation. Manual review recommended.',
            'issues': ['AI validation service temporarily unavailable'],
            'recommendation': 'review'
        }

@api_router.post("/coupons", response_model=Coupon)
async def create_coupon(coupon: CouponCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    \"\"\"Create new coupon listing\"\"\"
    user = await get_current_user(authorization, session_token)
    
    if user.role not in ['seller', 'admin']:
        raise HTTPException(status_code=403, detail="Only sellers can create coupons")
    
    validation_result = await validate_coupon(coupon, authorization, session_token)
    
    coupon_id = f"cpn_{uuid.uuid4().hex[:12]}"
    
    status = 'pending'
    if validation_result['risk_score'] == 'low' and validation_result['recommendation'] == 'approve':
        status = 'approved'
    elif validation_result['risk_score'] == 'high' or validation_result['recommendation'] == 'reject':
        status = 'rejected'
    
    coupon_doc = {
        'coupon_id': coupon_id,
        'seller_id': user.user_id,
        'brand_name': coupon.brand_name,
        'coupon_code': coupon.coupon_code,
        'expiry_date': coupon.expiry_date,
        'coupon_value': coupon.coupon_value,
        'asking_price': coupon.asking_price,
        'proof_image_url': coupon.proof_image_url,
        'status': status,
        'ai_risk_score': validation_result['risk_score'],
        'ai_feedback': validation_result['feedback'],
        'created_at': datetime.now(timezone.utc),
        'updated_at': datetime.now(timezone.utc)
    }
    
    await db.coupons.insert_one(coupon_doc)
    
    log_doc = {
        'log_id': f"log_{uuid.uuid4().hex[:12]}",
        'coupon_id': coupon_id,
        'risk_score': validation_result['risk_score'],
        'feedback': validation_result['feedback'],
        'validation_details': validation_result,
        'created_at': datetime.now(timezone.utc)
    }
    await db.ai_validation_logs.insert_one(log_doc)
    
    return Coupon(**coupon_doc)

@api_router.get("/coupons", response_model=List[Coupon])
async def get_coupons(
    brand: Optional[str] = None,
    status: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 50
):
    \"\"\"Get coupons with filters (public endpoint for browsing)\"\"\"
    query = {}
    
    if brand:
        query['brand_name'] = {'$regex': brand, '$options': 'i'}
    
    if status:
        query['status'] = status
    else:
        query['status'] = 'approved'
    
    if min_price is not None:
        query['asking_price'] = query.get('asking_price', {})
        query['asking_price']['$gte'] = min_price
    
    if max_price is not None:
        query['asking_price'] = query.get('asking_price', {})
        query['asking_price']['$lte'] = max_price
    
    coupons = await db.coupons.find(query, {'_id': 0}).limit(limit).to_list(limit)
    
    for coupon in coupons:
        if coupon['status'] != 'sold':
            coupon['coupon_code'] = '****' + coupon['coupon_code'][-4:] if len(coupon['coupon_code']) > 4 else '****'
    
    return [Coupon(**c) for c in coupons]

@api_router.get("/coupons/my", response_model=List[Coupon])
async def get_my_coupons(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    \"\"\"Get coupons created by current user (seller)\"\"\"
    user = await get_current_user(authorization, session_token)
    
    coupons = await db.coupons.find({'seller_id': user.user_id}, {'_id': 0}).to_list(100)
    return [Coupon(**c) for c in coupons]

@api_router.get("/coupons/{coupon_id}", response_model=Coupon)
async def get_coupon(coupon_id: str):
    \"\"\"Get specific coupon details\"\"\"
    coupon = await db.coupons.find_one({'coupon_id': coupon_id}, {'_id': 0})
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    if coupon['status'] != 'sold':
        coupon['coupon_code'] = '****' + coupon['coupon_code'][-4:] if len(coupon['coupon_code']) > 4 else '****'
    
    return Coupon(**coupon)

@api_router.post("/checkout/session")
async def create_checkout(
    request: Request,
    coupon_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    \"\"\"Create Stripe checkout session for coupon purchase\"\"\"
    user = await get_current_user(authorization, session_token)
    
    coupon = await db.coupons.find_one({'coupon_id': coupon_id}, {'_id': 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    if coupon['status'] != 'approved':
        raise HTTPException(status_code=400, detail="Coupon not available for purchase")
    
    body = await request.json()
    origin_url = body.get('origin_url')
    
    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url is required")
    
    success_url = f\"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}\"\n    cancel_url = f\"{origin_url}/payment/cancel\"\n    \n    host_url = str(request.base_url).rstrip('/')\n    webhook_url = f\"{host_url}/api/webhook/stripe\"\n    \n    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)\n    \n    checkout_request = CheckoutSessionRequest(\n        amount=float(coupon['asking_price']),\n        currency='usd',\n        success_url=success_url,\n        cancel_url=cancel_url,\n        metadata={\n            'user_id': user.user_id,\n            'coupon_id': coupon_id,\n            'seller_id': coupon['seller_id']\n        }\n    )\n    \n    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)\n    \n    payment_id = f\"pmt_{uuid.uuid4().hex[:12]}\"\n    payment_doc = {\n        'payment_id': payment_id,\n        'user_id': user.user_id,\n        'coupon_id': coupon_id,\n        'session_id': session.session_id,\n        'amount': coupon['asking_price'],\n        'currency': 'usd',\n        'payment_status': 'initiated',\n        'created_at': datetime.now(timezone.utc),\n        'updated_at': datetime.now(timezone.utc)\n    }\n    await db.payment_transactions.insert_one(payment_doc)\n    \n    return {'url': session.url, 'session_id': session.session_id}

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    \"\"\"Get payment status for a session\"\"\"
    user = await get_current_user(authorization, session_token)
    
    payment = await db.payment_transactions.find_one({'session_id': session_id}, {'_id': 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment['user_id'] != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if payment['payment_status'] in ['paid', 'failed', 'expired']:
        return payment
    
    webhook_url = f\"{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')}/api/webhook/stripe\"\n    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)\n    \n    try:\n        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)\n        \n        new_payment_status = 'paid' if status.payment_status == 'paid' else 'pending'\n        \n        if new_payment_status == 'paid' and payment['payment_status'] != 'paid':\n            await db.payment_transactions.update_one(\n                {'session_id': session_id},\n                {'$set': {'payment_status': 'paid', 'updated_at': datetime.now(timezone.utc)}}\n            )\n            \n            coupon = await db.coupons.find_one({'coupon_id': payment['coupon_id']}, {'_id': 0})\n            \n            transaction_id = f\"txn_{uuid.uuid4().hex[:12]}\"\n            transaction_doc = {\n                'transaction_id': transaction_id,\n                'buyer_id': user.user_id,\n                'seller_id': coupon['seller_id'],\n                'coupon_id': payment['coupon_id'],\n                'amount': payment['amount'],\n                'platform_commission': payment['amount'] * 0.10,\n                'status': 'escrow',\n                'created_at': datetime.now(timezone.utc),\n                'completed_at': None\n            }\n            await db.transactions.insert_one(transaction_doc)\n            \n            await db.coupons.update_one(\n                {'coupon_id': payment['coupon_id']},\n                {'$set': {'status': 'sold', 'updated_at': datetime.now(timezone.utc)}}\n            )\n        \n        payment = await db.payment_transactions.find_one({'session_id': session_id}, {'_id': 0})\n        return payment\n        \n    except Exception as e:\n        logger.error(f\"Error checking payment status: {e}\")\n        return payment

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    \"\"\"Handle Stripe webhook events\"\"\"
    body = await request.body()\n    signature = request.headers.get('Stripe-Signature')\n    \n    webhook_url = f\"{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')}/api/webhook/stripe\"\n    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)\n    \n    try:\n        event = await stripe_checkout.handle_webhook(body, signature)\n        logger.info(f\"Stripe webhook: {event.event_type}\")\n        \n        if event.event_type == 'checkout.session.completed':\n            await db.payment_transactions.update_one(\n                {'session_id': event.session_id},\n                {'$set': {'payment_status': 'paid', 'updated_at': datetime.now(timezone.utc)}}\n            )\n        \n        return {'status': 'success'}\n    except Exception as e:\n        logger.error(f\"Webhook error: {e}\")\n        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/transactions/my", response_model=List[Transaction])
async def get_my_transactions(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Get transactions for current user\"\"\"
    user = await get_current_user(authorization, session_token)\n    \n    query = {'$or': [{'buyer_id': user.user_id}, {'seller_id': user.user_id}]}\n    transactions = await db.transactions.find(query, {'_id': 0}).to_list(100)\n    \n    return [Transaction(**t) for t in transactions]

@api_router.get("/transactions/{transaction_id}/coupon-code")
async def get_coupon_code(transaction_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Reveal coupon code after successful payment\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    \n    transaction = await db.transactions.find_one({'transaction_id': transaction_id}, {'_id': 0})\n    if not transaction:\n        raise HTTPException(status_code=404, detail=\"Transaction not found\")\n    \n    if transaction['buyer_id'] != user.user_id:\n        raise HTTPException(status_code=403, detail=\"Access denied\")\n    \n    if transaction['status'] not in ['escrow', 'completed']:\n        raise HTTPException(status_code=400, detail=\"Payment not completed\")\n    \n    coupon = await db.coupons.find_one({'coupon_id': transaction['coupon_id']}, {'_id': 0})\n    if not coupon:\n        raise HTTPException(status_code=404, detail=\"Coupon not found\")\n    \n    return {'coupon_code': coupon['coupon_code'], 'brand_name': coupon['brand_name'], 'expiry_date': coupon['expiry_date']}

@api_router.post("/transactions/{transaction_id}/confirm")
async def confirm_transaction(transaction_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Buyer confirms coupon worked - releases payment from escrow\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    \n    transaction = await db.transactions.find_one({'transaction_id': transaction_id}, {'_id': 0})\n    if not transaction:\n        raise HTTPException(status_code=404, detail=\"Transaction not found\")\n    \n    if transaction['buyer_id'] != user.user_id:\n        raise HTTPException(status_code=403, detail=\"Access denied\")\n    \n    if transaction['status'] != 'escrow':\n        raise HTTPException(status_code=400, detail=\"Transaction not in escrow\")\n    \n    payout_amount = transaction['amount'] - transaction['platform_commission']\n    \n    await db.users.update_one(\n        {'user_id': transaction['seller_id']},\n        {'$inc': {'wallet_balance': payout_amount}}\n    )\n    \n    await db.transactions.update_one(\n        {'transaction_id': transaction_id},\n        {'$set': {'status': 'completed', 'completed_at': datetime.now(timezone.utc)}}\n    )\n    \n    return {'message': 'Transaction completed', 'seller_payout': payout_amount}

@api_router.post("/reviews", response_model=Review)
async def create_review(review: ReviewCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Create review for a coupon purchase\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    \n    transaction = await db.transactions.find_one({'coupon_id': review.coupon_id, 'buyer_id': user.user_id}, {'_id': 0})\n    if not transaction:\n        raise HTTPException(status_code=403, detail=\"You haven't purchased this coupon\")\n    \n    coupon = await db.coupons.find_one({'coupon_id': review.coupon_id}, {'_id': 0})\n    if not coupon:\n        raise HTTPException(status_code=404, detail=\"Coupon not found\")\n    \n    review_id = f\"rev_{uuid.uuid4().hex[:12]}\"\n    review_doc = {\n        'review_id': review_id,\n        'buyer_id': user.user_id,\n        'coupon_id': review.coupon_id,\n        'seller_id': coupon['seller_id'],\n        'rating': review.rating,\n        'comment': review.comment,\n        'created_at': datetime.now(timezone.utc)\n    }\n    \n    await db.reviews.insert_one(review_doc)\n    return Review(**review_doc)

@api_router.get("/reviews/{coupon_id}\", response_model=List[Review])\nasync def get_coupon_reviews(coupon_id: str):\n    \"\"\"Get all reviews for a coupon\"\"\"  \n    reviews = await db.reviews.find({'coupon_id': coupon_id}, {'_id': 0}).to_list(100)\n    return [Review(**r) for r in reviews]

@api_router.get("/wallet\")
async def get_wallet(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Get user wallet balance\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    return {'wallet_balance': user.wallet_balance, 'user_id': user.user_id}

@api_router.post("/wallet/withdraw\")
async def withdraw_funds(withdraw: WithdrawRequest, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Request withdrawal (placeholder - manual process)\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    \n    if withdraw.amount > user.wallet_balance:\n        raise HTTPException(status_code=400, detail=\"Insufficient balance\")\n    \n    if withdraw.amount < 10:\n        raise HTTPException(status_code=400, detail=\"Minimum withdrawal amount is $10\")\n    \n    await db.users.update_one(\n        {'user_id': user.user_id},\n        {'$inc': {'wallet_balance': -withdraw.amount}}\n    )\n    \n    withdrawal_doc = {\n        'withdrawal_id': f\"wdr_{uuid.uuid4().hex[:12]}\",\n        'user_id': user.user_id,\n        'amount': withdraw.amount,\n        'upi_id': withdraw.upi_id,\n        'bank_account': withdraw.bank_account,\n        'status': 'pending',\n        'created_at': datetime.now(timezone.utc)\n    }\n    await db.withdrawals.insert_one(withdrawal_doc)\n    \n    return {'message': 'Withdrawal request submitted', 'amount': withdraw.amount}

@api_router.post(\"/disputes\", response_model=Dispute)\nasync def create_dispute(dispute: DisputeCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Create a dispute for a transaction\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    \n    transaction = await db.transactions.find_one({'transaction_id': dispute.transaction_id}, {'_id': 0})\n    if not transaction:\n        raise HTTPException(status_code=404, detail=\"Transaction not found\")\n    \n    if transaction['buyer_id'] != user.user_id:\n        raise HTTPException(status_code=403, detail=\"Access denied\")\n    \n    dispute_id = f\"dsp_{uuid.uuid4().hex[:12]}\"\n    dispute_doc = {\n        'dispute_id': dispute_id,\n        'transaction_id': dispute.transaction_id,\n        'buyer_id': user.user_id,\n        'seller_id': transaction['seller_id'],\n        'coupon_id': transaction['coupon_id'],\n        'reason': dispute.reason,\n        'status': 'open',\n        'resolution': None,\n        'created_at': datetime.now(timezone.utc),\n        'resolved_at': None\n    }\n    \n    await db.disputes.insert_one(dispute_doc)\n    \n    await db.transactions.update_one(\n        {'transaction_id': dispute.transaction_id},\n        {'$set': {'status': 'disputed'}}\n    )\n    \n    return Dispute(**dispute_doc)

@api_router.patch(\"/admin/coupons/{coupon_id}\", response_model=Coupon)\nasync def admin_update_coupon(coupon_id: str, update: CouponUpdate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Admin approve/reject coupons\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    \n    if user.role != 'admin':\n        raise HTTPException(status_code=403, detail=\"Admin access required\")\n    \n    coupon = await db.coupons.find_one({'coupon_id': coupon_id}, {'_id': 0})\n    if not coupon:\n        raise HTTPException(status_code=404, detail=\"Coupon not found\")\n    \n    update_data = {'updated_at': datetime.now(timezone.utc)}\n    if update.status:\n        update_data['status'] = update.status\n    \n    await db.coupons.update_one({'coupon_id': coupon_id}, {'$set': update_data})\n    \n    coupon = await db.coupons.find_one({'coupon_id': coupon_id}, {'_id': 0})\n    return Coupon(**coupon)

@api_router.get(\"/admin/analytics\")\nasync def admin_analytics(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Admin analytics dashboard data\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    \n    if user.role != 'admin':\n        raise HTTPException(status_code=403, detail=\"Admin access required\")\n    \n    total_users = await db.users.count_documents({})\n    total_coupons = await db.coupons.count_documents({})\n    active_coupons = await db.coupons.count_documents({'status': 'approved'})\n    sold_coupons = await db.coupons.count_documents({'status': 'sold'})\n    total_transactions = await db.transactions.count_documents({})\n    \n    pipeline = [\n        {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}\n    ]\n    result = await db.transactions.aggregate(pipeline).to_list(1)\n    total_sales = result[0]['total'] if result else 0\n    \n    fraud_attempts = await db.ai_validation_logs.count_documents({'risk_score': 'high'})\n    open_disputes = await db.disputes.count_documents({'status': 'open'})\n    \n    return {\n        'total_users': total_users,\n        'total_coupons': total_coupons,\n        'active_coupons': active_coupons,\n        'sold_coupons': sold_coupons,\n        'total_transactions': total_transactions,\n        'total_sales': total_sales,\n        'fraud_attempts': fraud_attempts,\n        'open_disputes': open_disputes\n    }

@api_router.get(\"/admin/users\", response_model=List[User])\nasync def admin_get_users(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Admin get all users\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    \n    if user.role != 'admin':\n        raise HTTPException(status_code=403, detail=\"Admin access required\")\n    \n    users = await db.users.find({}, {'_id': 0}).to_list(1000)\n    return [User(**u) for u in users]

@api_router.get(\"/admin/disputes\", response_model=List[Dispute])\nasync def admin_get_disputes(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Admin get all disputes\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    \n    if user.role != 'admin':\n        raise HTTPException(status_code=403, detail=\"Admin access required\")\n    \n    disputes = await db.disputes.find({}, {'_id': 0}).to_list(1000)\n    return [Dispute(**d) for d in disputes]

@api_router.patch(\"/admin/disputes/{dispute_id}\")\nasync def admin_resolve_dispute(dispute_id: str, resolution: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Admin resolve dispute\"\"\"  \n    user = await get_current_user(authorization, session_token)\n    \n    if user.role != 'admin':\n        raise HTTPException(status_code=403, detail=\"Admin access required\")\n    \n    await db.disputes.update_one(\n        {'dispute_id': dispute_id},\n        {'$set': {'status': 'resolved', 'resolution': resolution, 'resolved_at': datetime.now(timezone.utc)}}\n    )\n    \n    return {'message': 'Dispute resolved'}

@api_router.patch(\"/admin/users/{user_id}/role\")\nasync def admin_update_user_role(user_id: str, role: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):\n    \"\"\"Admin update user role\"\"\"  \n    admin = await get_current_user(authorization, session_token)\n    \n    if admin.role != 'admin':\n        raise HTTPException(status_code=403, detail=\"Admin access required\")\n    \n    if role not in ['buyer', 'seller', 'admin']:\n        raise HTTPException(status_code=400, detail=\"Invalid role\")\n    \n    await db.users.update_one(\n        {'user_id': user_id},\n        {'$set': {'role': role}}\n    )\n    \n    return {'message': 'User role updated'}

app.include_router(api_router)

app.add_middleware(\n    CORSMiddleware,\n    allow_credentials=True,\n    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),\n    allow_methods=[\"*\"],\n    allow_headers=[\"*\"],\n)

@app.on_event(\"shutdown\")\nasync def shutdown_db_client():\n    client.close()
