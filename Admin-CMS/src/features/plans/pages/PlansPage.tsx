import { ClipboardList } from 'lucide-react';

export function PlansPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
          <p className="text-gray-600 mt-1">
            Manage your subscription and memorization plans
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
          <ClipboardList className="w-8 h-8 text-primary-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No Plans Yet</h3>
        <p className="text-gray-500 mt-2 max-w-sm">
          You haven't created any plans. Get started by creating your first memorization plan.
        </p>
        <button className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          Create Plan
        </button>
      </div>
    </div>
  );
}

export default PlansPage;
