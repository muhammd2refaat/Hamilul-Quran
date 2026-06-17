/**
 * User filters component - simplified version
 */

import { Button } from '@/shared/components/Button';
import { X, RotateCcw } from 'lucide-react';
import type { UserFilterParams } from '../types';

interface UserFiltersProps {
  filters: UserFilterParams;
  onFilterChange: (filters: Partial<UserFilterParams>) => void;
  onReset: () => void;
  onClose?: () => void;
}

export function UserFilters({
  filters,
  onFilterChange,
  onReset,
  onClose,
}: UserFiltersProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({
      status: value ? (value as UserFilterParams['status']) : undefined,
    });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({ country: value || undefined });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Reset
          </Button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <select
            value={filters.country || ''}
            onChange={handleCountryChange}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">All Countries</option>
            <option value="KSA">Saudi Arabia</option>
            <option value="UAE">United Arab Emirates</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization
          </label>
          <select
            value={filters.organization || ''}
            onChange={(e) =>
              onFilterChange({ organization: e.target.value || undefined })
            }
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">All Organizations</option>
            <option value="org-1">Riyadh Medical Center</option>
            <option value="org-2">King Faisal Hospital</option>
            <option value="org-3">Jeddah Clinic</option>
            <option value="org-4">Dammam Hospital</option>
            <option value="org-5">Dubai Healthcare City</option>
            <option value="org-6">Abu Dhabi Medical</option>
            <option value="org-7">Sharjah Medical Center</option>
            <option value="org-8">Al Ain Hospital</option>
          </select>
        </div>
      </div>
    </div>
  );
}
