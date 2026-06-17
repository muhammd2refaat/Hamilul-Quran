import { PieChart } from 'lucide-react';

export function AllocationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Allocations</h1>
          <p className="text-gray-600 mt-1">
            Manage teacher and student allocations
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
          <PieChart className="w-8 h-8 text-primary-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No Allocations Found</h3>
        <p className="text-gray-500 mt-2 max-w-sm">
          There are currently no allocations to display in this view.
        </p>
        <button className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          Add Allocation
        </button>
      </div>
    </div>
  );
}

export default AllocationsPage;
