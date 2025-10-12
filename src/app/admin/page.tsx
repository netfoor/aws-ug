'use client';

import { useAuth } from '@/context/auth-context';
import Navigation from '@/components/Navigation';

export default function AdminPage() {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Panel</h1>
          
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">User Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Email:</label>
                <p className="text-gray-900">{user?.signInDetails?.loginId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Role:</label>
                <p className="text-gray-900">Administrator</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">User ID:</label>
                <p className="text-gray-900 text-sm font-mono">{user?.userId}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Admin Functions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Manage Users
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                View Analytics
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                System Settings
              </button>
              <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}