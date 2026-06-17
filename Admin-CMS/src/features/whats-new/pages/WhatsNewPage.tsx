/**
 * What's New Page
 * Displays and manages featured content items
 */

import { useEffect, useState, useMemo } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button, Card, Modal, ConfirmDialog } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import { WhatsNewForm } from '../components';
import { useWhatsNewStore } from '../store';
import type { WhatsNewItem, WhatsNewFormData } from '../types';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function WhatsNewPage() {
  const { items, isLoading, fetchItems, addItem, updateItem, deleteItem, canAddMore } =
    useWhatsNewStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WhatsNewItem | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<WhatsNewFormData>({
    userTitle: '',
    itemType: 'quiz',
    itemId: '',
  });
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Fetch items on mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Handlers
  const handleOpenCreateModal = () => {
    if (!canAddMore()) {
      toast.error('Maximum of 10 items allowed in What\'s New section');
      return;
    }
    setModalMode('create');
    setFormData({
      userTitle: '',
      itemType: 'quiz',
      itemId: '',
    });
    setBannerPreview(null);
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: WhatsNewItem) => {
    setModalMode('edit');
    setSelectedItem(item);
    setFormData({
      userTitle: item.userTitle,
      itemType: item.itemType,
      itemId: item.itemId,
    });
    setBannerPreview(item.image || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleOpenDeleteDialog = (item: WhatsNewItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  const handleSave = async () => {
    if (!formData.userTitle.trim() || !formData.itemId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const itemTitle = getItemTitle(formData.itemType, formData.itemId);
      
      if (modalMode === 'create') {
        await addItem({
          title: formData.userTitle,
          userTitle: formData.userTitle,
          itemType: formData.itemType,
          itemId: formData.itemId,
          itemTitle,
          image: bannerPreview || undefined,
        });
        toast.success('Item added successfully');
      } else if (modalMode === 'edit' && selectedItem) {
        await updateItem(selectedItem.id, {
          title: formData.userTitle,
          userTitle: formData.userTitle,
          itemType: formData.itemType,
          itemId: formData.itemId,
          itemTitle,
          image: bannerPreview || undefined,
        });
        toast.success('Item updated successfully');
      }
      handleCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      await deleteItem(selectedItem.id);
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      toast.success('Item deleted successfully');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  // Helper function to get item title
  const getItemTitle = (type: string, id: string): string => {
    const { mockQuizzes } = require('@/mock-data/quizzes');
    const { mockArticles } = require('@/mock-data/articles');
    const { mockWebinars } = require('@/mock-data/webinars');

    switch (type) {
      case 'quiz':
        return mockQuizzes.find((q: any) => q.id === id)?.title || '';
      case 'article':
        return mockArticles.find((a: any) => a.id === id)?.title || '';
      case 'webinar':
        return mockWebinars.find((w: any) => w.id === id)?.title || '';
      default:
        return '';
    }
  };

  // Table columns
  const columns: ColumnDef<WhatsNewItem>[] = useMemo(
    () => [
      {
        accessorKey: 'image',
        header: () => <div className="text-left">Image</div>,
        cell: ({ row }) => (
          <div className="flex items-center">
            {row.original.image ? (
              <img
                src={row.original.image}
                alt={row.original.title}
                className="h-12 w-20 object-cover rounded"
              />
            ) : (
              <div className="h-12 w-20 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-gray-400 text-xs">No Image</span>
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'userTitle',
        header: () => <div className="text-left">User Title</div>,
        cell: ({ row }) => (
          <div className="text-sm text-gray-700">{row.original.userTitle}</div>
        ),
      },
      {
        accessorKey: 'itemType',
        header: () => <div className="text-center">Type</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
              {row.original.itemType}
            </span>
          </div>
        ),
        meta: { className: 'text-center' },
      },
      {
        accessorKey: 'itemTitle',
        header: () => <div className="text-left">Item</div>,
        cell: ({ row }) => (
          <div className="text-sm text-gray-700">{row.original.itemTitle}</div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: () => <div className="text-center">Created At</div>,
        cell: ({ row }) => (
          <div className="text-center text-sm text-gray-600">
            {format(new Date(row.original.createdAt), 'MMM d, yyyy')}
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
              onClick={() => handleOpenEditModal(row.original)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => handleOpenDeleteDialog(row.original)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        ),
        meta: { className: 'text-right' },
      },
    ],
    []
  );

  const sortedItems = useMemo(() => {
    // Sort by created at (newest first)
    return [...items].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">What's New</h1>
          <p className="text-gray-600 mt-1">
            Manage featured content items ({items.length}/10 items)
          </p>
        </div>
        <Button 
          leftIcon={<Plus className="h-4 w-4" />} 
          onClick={handleOpenCreateModal}
          disabled={!canAddMore()}
        >
          Add Item
        </Button>
      </div>

      {!canAddMore() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            You have reached the maximum limit of 10 items in the What's New section.
            Please delete an item to add a new one.
          </p>
        </div>
      )}

      <Card className="p-6">
        <DataTable
          columns={columns}
          data={sortedItems}
          isLoading={isLoading}
          enableSearch={false}
          emptyMessage="No items found."
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? 'Add New Item' : 'Edit Item'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.userTitle.trim() || !formData.itemId}>
              {modalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        }
      >
        <WhatsNewForm
          initialData={formData}
          onSubmit={handleSave}
          onCancel={handleCloseModal}
          isLoading={isLoading}
          bannerPreview={bannerPreview}
          onBannerChange={setBannerPreview}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        onCancel={handleCloseDeleteDialog}
        title="Delete Item"
        message={`Are you sure you want to delete "${selectedItem?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
