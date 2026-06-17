/**
 * Categories management page
 */

import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Upload, X } from 'lucide-react';
import { Button, Card, Modal, ConfirmDialog } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type CategoryStatus = 'active' | 'inactive';

type Category = {
  id: string;
  title: string;
  productCount: number;
  status: CategoryStatus;
  imageUrl?: string;
  createdAt: string;
};

type CategoryFormData = {
  title: string;
  status: CategoryStatus;
  image?: File;
};

// Mock data for categories
const mockCategories: Category[] = [
  {
    id: '1',
    title: 'Skincare Essentials',
    productCount: 12,
    status: 'active',
    imageUrl: '/images/skincare-essentials.jpg',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'Anti-Aging',
    productCount: 8,
    status: 'active',
    imageUrl: '/images/anti-aging.jpg',
    createdAt: '2024-02-20T14:30:00Z',
  },
  {
    id: '3',
    title: 'Sun Protection',
    productCount: 5,
    status: 'inactive',
    createdAt: '2024-03-10T09:15:00Z',
  },
];

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    title: '',
    status: 'active',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<Category>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: (info) => (
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'productCount',
      header: () => <div className="text-center">Products</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {info.getValue() as number}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: (info) => {
        const status = info.getValue() as CategoryStatus;
        const statusConfig = {
          active: { label: 'Active', color: 'bg-green-100 text-green-800' },
          inactive: { label: 'Inactive', color: 'bg-red-50 text-red-600' },
        };
        const config = statusConfig[status];
        return (
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
        );
      },
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'createdAt',
      header: () => <div className="text-center">Created At</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {format(new Date(info.getValue() as string), 'MMM d, yyyy')}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handleEdit(row.original)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => handleDeleteClick(row.original)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ),
      meta: { className: 'text-right' },
    },
  ], []);

  const filteredCategories = useMemo(() => {
    let result = [...categories];

    if (search) {
      result = result.filter((category) =>
        category.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    return result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [categories, search]);

  const handleCreateClick = () => {
    setFormData({
      title: '',
      status: 'active',
    });
    setImagePreview(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      title: category.title,
      status: category.status,
    });
    setImagePreview(category.imageUrl || null);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!validImageTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image (JPEG, PNG, WebP)');
      return;
    }

    setFormData(prev => ({ ...prev, image: file }));
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: undefined }));
    setImagePreview(null);
  };

  const handleCreate = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a category title');
      return;
    }

    const newCategory: Category = {
      id: `category-${Date.now()}`,
      title: formData.title,
      productCount: 0,
      status: formData.status,
      ...(imagePreview ? { imageUrl: imagePreview } : {}),
      createdAt: new Date().toISOString(),
    };

    setCategories(prev => [...prev, newCategory]);
    setIsCreateModalOpen(false);
    toast.success('Category created successfully');
  };

  const handleUpdate = () => {
    if (!selectedCategory || !formData.title.trim()) {
      toast.error('Please enter a category title');
      return;
    }

    setCategories(prev =>
      prev.map(category =>
        category.id === selectedCategory.id
          ? {
              ...category,
              title: formData.title,
              status: formData.status,
              ...(imagePreview ? { imageUrl: imagePreview } : {}),
            }
          : category
      )
    );
    setIsEditModalOpen(false);
    setSelectedCategory(null);
    toast.success('Category updated successfully');
  };

  const handleDelete = () => {
    if (selectedCategory) {
      setCategories(prev => prev.filter(category => category.id !== selectedCategory.id));
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
      toast.success('Category deleted successfully');
    }
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">Manage product categories</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleCreateClick}>
          Add Category
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 w-full justify-between">
            <input
              type="text"
              placeholder="Search by category title..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '320px' }}
            />
          </div>
        </div>
        <DataTable
          data={filteredCategories}
          columns={columns}
          enableSearch={false}
          emptyMessage="No categories found."
        />
      </Card>

      {/* Create Category Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Category"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter category title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as CategoryStatus }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Image
            </label>
            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <span className="text-sm text-primary-600 hover:text-primary-700">
                      Upload an image
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  JPEG, PNG, or WebP up to 5MB
                </p>
              </div>
            ) : (
              <div className="relative border border-gray-300 rounded-lg p-4">
                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Category"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter category title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as CategoryStatus }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Image
            </label>
            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <span className="text-sm text-primary-600 hover:text-primary-700">
                      Upload an image
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  JPEG, PNG, or WebP up to 5MB
                </p>
              </div>
            ) : (
              <div className="relative border border-gray-300 rounded-lg p-4">
                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        onCancel={handleCloseDeleteDialog}
        title="Delete Category"
        message={`Are you sure you want to delete "${selectedCategory?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default CategoriesPage;