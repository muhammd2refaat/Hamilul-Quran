/**
 * Add User modal — creates a real STUDENT or TEACHER via POST /users.
 * Password is optional; the backend generates a temporary one if omitted.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, Button, Input, Select } from '@/shared/components';
import { useUsersStore } from '../store/usersStore';

interface AddUserModalProps {
  role: 'STUDENT' | 'TEACHER';
  isOpen: boolean;
  onClose: () => void;
}

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  phone: '',
  country: '',
  city: '',
  gender: '' as '' | 'MALE' | 'FEMALE',
};

export function AddUserModal({ role, isOpen, onClose }: AddUserModalProps) {
  const createUser = useUsersStore((s) => s.createUser);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const label = role === 'STUDENT' ? 'Student' : 'Teacher';

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClose() {
    setForm(emptyForm);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.username.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      await createUser({
        email: form.email.trim(),
        username: form.username.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role,
        phone: form.phone || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
        gender: form.gender || undefined,
      });
      toast.success(`${label} created successfully`);
      handleClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || `Failed to create ${label.toLowerCase()}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Add ${label}`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>
            Create {label}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            required
          />
          <Input
            label="Last Name"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            required
          />
        </div>
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          required
        />
        <Input
          label="Username"
          value={form.username}
          onChange={(e) => update('username', e.target.value)}
          required
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Country"
            value={form.country}
            onChange={(e) => update('country', e.target.value)}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
          />
        </div>
        <Select
          label="Gender"
          value={form.gender}
          onChange={(e) => update('gender', e.target.value as 'MALE' | 'FEMALE')}
          placeholder="Select gender"
          options={[
            { value: 'MALE', label: 'Male' },
            { value: 'FEMALE', label: 'Female' },
          ]}
        />
        <p className="text-xs text-gray-500">
          A temporary password will be generated automatically. The {label.toLowerCase()} should sign in with Google or reset their password.
        </p>
      </form>
    </Modal>
  );
}

export default AddUserModal;
