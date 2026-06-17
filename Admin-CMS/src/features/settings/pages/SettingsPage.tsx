import { useAuthStore } from '@/features/auth';

export function ProfilePage() {
  const { user } = useAuthStore();
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Profile</h1>
          <p className="text-gray-500 mb-8">Your account details</p>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-base font-semibold">
                {user?.name || 'Admin'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-base font-semibold">
                {user?.email || 'admin@qrkareem.com'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
