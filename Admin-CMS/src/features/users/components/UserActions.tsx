/**
 * Compact status-toggle + delete actions shared by StudentCard and TeacherCard.
 */

import { useState } from 'react';
import { Ban, CheckCircle2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/shared/components';
import { useUsersStore, type User } from '../store/usersStore';

export function UserActions({ user }: { user: User }) {
  const updateUserStatus = useUsersStore((s) => s.updateUserStatus);
  const deleteUser = useUsersStore((s) => s.deleteUser);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const isActive = user.status === 'ACTIVE' || user.status === 'active';

  async function toggleStatus() {
    setIsBusy(true);
    try {
      await updateUserStatus(user.id, isActive ? 'SUSPENDED' : 'ACTIVE');
      toast.success(isActive ? 'User suspended' : 'User activated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update status');
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmDelete() {
    setIsBusy(true);
    try {
      await deleteUser(user.id);
      toast.success('User permanently deleted');
      setIsDeleteOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete user');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleStatus}
          disabled={isBusy}
          title={isActive ? 'Suspend' : 'Activate'}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
            isActive
              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          {isActive ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {isActive ? 'Suspend' : 'Activate'}
        </button>
        <button
          onClick={() => setIsDeleteOpen(true)}
          disabled={isBusy}
          title="Delete"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Permanently delete user"
        message={`Are you sure you want to permanently delete ${user.firstName} ${user.lastName}? This will erase all their data — allocations, complaints, requests, session history, and everything else — and cannot be undone. They will need to sign up again to use the platform.`}
        confirmText="Delete permanently"
        variant="danger"
        isLoading={isBusy}
      />
    </>
  );
}

export default UserActions;
