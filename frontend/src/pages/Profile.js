import React from 'react';
import Navbar from '../components/Navbar';
import { User as UserIcon, Mail, Shield } from 'lucide-react';

const Profile = ({ user }) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-outfit font-bold mb-8" data-testid="profile-title">Profile</h1>

        <div className="card p-8">
          <div className="flex items-center space-x-6 mb-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-24 h-24 rounded-full"
                  data-testid="profile-picture"
                />
              ) : (
                <UserIcon className="w-12 h-12 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-3xl font-outfit font-bold mb-1" data-testid="profile-name">{user?.name}</h2>
              <p className="text-text-secondary" data-testid="profile-email">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-t border-border pt-6">
              <h3 className="text-xl font-outfit font-bold mb-4">Account Information</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-background-subtle p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Mail className="w-5 h-5 text-text-secondary" />
                    <span className="text-sm text-text-secondary">Email</span>
                  </div>
                  <p className="font-semibold">{user?.email}</p>
                </div>

                <div className="bg-background-subtle p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-5 h-5 text-text-secondary" />
                    <span className="text-sm text-text-secondary">Role</span>
                  </div>
                  <p className="font-semibold uppercase" data-testid="profile-role">{user?.role}</p>
                </div>

                <div className="bg-background-subtle p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <UserIcon className="w-5 h-5 text-text-secondary" />
                    <span className="text-sm text-text-secondary">User ID</span>
                  </div>
                  <p className="font-mono text-sm" data-testid="profile-user-id">{user?.user_id}</p>
                </div>

                <div className="bg-background-subtle p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <UserIcon className="w-5 h-5 text-text-secondary" />
                    <span className="text-sm text-text-secondary">Member Since</span>
                  </div>
                  <p className="font-semibold">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
