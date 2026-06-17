/**
 * Articles management page
 */

import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Upload, X } from 'lucide-react';
import { Button, Card, Modal, ConfirmDialog, StatusBadge } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type ArticleStatus = 'draft' | 'published' | 'unpublished';

type Article = {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  videoUrl?: string;
  status: ArticleStatus;
  createdAt: string;
};

type ArticleFormData = {
  title: string;
  description: string;
  media?: File;
  mediaType?: 'image' | 'video';
  status: ArticleStatus;
};

// Mock data for articles
const mockArticles: Article[] = [
  {
    id: '1',
    title: 'Understanding Skin Care Basics',
    description: 'A comprehensive guide to daily skin care routines and best practices.',
    thumbnail: '/images/skincare-basics.jpg',
    status: 'published',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'The Importance of Sun Protection',
    description: 'Learn why SPF is crucial for maintaining healthy skin.',
    thumbnail: '/images/sun-protection.jpg',
    status: 'published',
    createdAt: '2024-02-20T14:30:00Z',
  },
  {
    id: '3',
    title: 'Nutrition and Skin Health',
    description: 'Discover how diet affects your skin and overall wellness.',
    status: 'draft',
    createdAt: '2024-03-10T09:15:00Z',
  },
  {
    id: '4',
    title: 'Managing Acne in Adults',
    description: 'Expert advice on treating and preventing adult acne.',
    videoUrl: '/videos/acne-treatment.mp4',
    status: 'unpublished',
    createdAt: '2024-04-05T16:45:00Z',
  },
];

export const ArticlesPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>(mockArticles);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    description: '',
    status: 'draft',
  });
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<Article>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: (info) => (
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => (
        <div className="text-sm text-gray-600 max-w-md truncate">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: (info) => {
        const status = info.getValue() as ArticleStatus;
        const statusConfig = {
          published: { label: 'Published', color: 'bg-green-100 text-green-800' },
          draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
          unpublished: { label: 'Unpublished', color: 'bg-gray-100 text-gray-800' },
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
      header: () => <div className="text-center">Creation Date</div>,
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

  const filteredArticles = useMemo(() => {
    let result = [...articles];

    if (search) {
      result = result.filter((article) =>
        article.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter) {
      result = result.filter((article) => article.status === statusFilter);
    }

    return result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [articles, search, statusFilter]);

  const handleCreateClick = () => {
    setFormData({
      title: '',
      description: '',
      status: 'draft',
    });
    setMediaPreview(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (article: Article) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      description: article.description,
      status: article.status,
    });
    setMediaPreview(article.thumbnail || article.videoUrl || null);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (article: Article) => {
    setSelectedArticle(article);
    setIsDeleteDialogOpen(true);
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/webm'];
    
    if (![...validImageTypes, ...validVideoTypes].includes(file.type)) {
      toast.error('Invalid file type. Please upload an image (JPEG, PNG, WebP) or video (MP4, WebM)');
      return;
    }

    const mediaType = validImageTypes.includes(file.type) ? 'image' : 'video';
    
    setFormData(prev => ({ ...prev, media: file, mediaType }));
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setFormData(prev => ({ ...prev, media: undefined, mediaType: undefined }));
    setMediaPreview(null);
  };

  const handleCreate = () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newArticle: Article = {
      id: `article-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      ...(formData.mediaType === 'image' && mediaPreview ? { thumbnail: mediaPreview } : {}),
      ...(formData.mediaType === 'video' && mediaPreview ? { videoUrl: mediaPreview } : {}),
      status: formData.status,
      createdAt: new Date().toISOString(),
    };

    setArticles(prev => [...prev, newArticle]);
    setIsCreateModalOpen(false);
    toast.success('Article created successfully');
  };

  const handleUpdate = () => {
    if (!selectedArticle || !formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setArticles(prev =>
      prev.map(article =>
        article.id === selectedArticle.id
          ? {
              ...article,
              title: formData.title,
              description: formData.description,
              ...(formData.mediaType === 'image' && mediaPreview ? { thumbnail: mediaPreview, videoUrl: undefined } : {}),
              ...(formData.mediaType === 'video' && mediaPreview ? { videoUrl: mediaPreview, thumbnail: undefined } : {}),
              status: formData.status,
            }
          : article
      )
    );
    setIsEditModalOpen(false);
    setSelectedArticle(null);
    toast.success('Article updated successfully');
  };

  const handleDelete = () => {
    if (selectedArticle) {
      setArticles(prev => prev.filter(article => article.id !== selectedArticle.id));
      setIsDeleteDialogOpen(false);
      setSelectedArticle(null);
      toast.success('Article deleted successfully');
    }
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedArticle(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="text-gray-600 mt-1">Manage educational articles and content</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleCreateClick}>
          Add Article
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 w-full justify-between">
            <input
              type="text"
              placeholder="Search by article title..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '320px' }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              style={{ minWidth: '155px' }}
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </div>
        </div>
        <DataTable
          data={filteredArticles}
          columns={columns}
          enableSearch={false}
          emptyMessage="No articles found."
        />
      </Card>

      {/* Create Article Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Article"
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
              placeholder="Enter article title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={4}
              placeholder="Enter article description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media (Image or Video)
            </label>
            {!mediaPreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <span className="text-sm text-primary-600 hover:text-primary-700">
                      Upload a file
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                      onChange={handleMediaChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  JPEG, PNG, WebP, MP4, or WebM up to 10MB
                </p>
              </div>
            ) : (
              <div className="relative border border-gray-300 rounded-lg p-4">
                {formData.mediaType === 'image' ? (
                  <img src={mediaPreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                ) : (
                  <video src={mediaPreview} controls className="max-h-48 mx-auto rounded" />
                )}
                <button
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ArticleStatus }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Article Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Article"
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
              placeholder="Enter article title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={4}
              placeholder="Enter article description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media (Image or Video)
            </label>
            {!mediaPreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <span className="text-sm text-primary-600 hover:text-primary-700">
                      Upload a file
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                      onChange={handleMediaChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  JPEG, PNG, WebP, MP4, or WebM up to 10MB
                </p>
              </div>
            ) : (
              <div className="relative border border-gray-300 rounded-lg p-4">
                {formData.mediaType === 'image' ? (
                  <img src={mediaPreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                ) : (
                  <video src={mediaPreview} controls className="max-h-48 mx-auto rounded" />
                )}
                <button
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ArticleStatus }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
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
        title="Delete Article"
        message={`Are you sure you want to delete "${selectedArticle?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ArticlesPage;
