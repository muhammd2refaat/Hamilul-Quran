/**
 * Stories management page
 */

import React, { useState, useMemo } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Button, Card, Modal, ConfirmDialog } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type StoryStatus = 'published' | 'unpublished';

type Story = {
  id: string;
  authorName: string;
  authorTitle: string;
  organization: string;
  storyDetails: string;
  submissionDate: string;
  status: StoryStatus;
};

type StoryFormData = {
  status: StoryStatus;
};

// Mock data for stories
const mockStories: Story[] = [
  {
    id: '1',
    authorName: 'Sarah Ahmed',
    authorTitle: 'Patient',
    organization: 'Dubai Healthcare City',
    storyDetails: 'My journey with eczema taught me the importance of consistent skincare routines and working closely with dermatologists.',
    submissionDate: '2024-01-15T10:00:00Z',
    status: 'published',
  },
  {
    id: '2',
    authorName: 'Mohammed Hassan',
    authorTitle: 'Patient',
    organization: 'Riyadh Medical Center',
    storyDetails: 'Overcoming psoriasis through lifestyle changes and proper medication has transformed my life and confidence.',
    submissionDate: '2024-02-20T14:30:00Z',
    status: 'published',
  },
  {
    id: '3',
    authorName: 'Fatima Al-Rashid',
    authorTitle: 'Caregiver',
    organization: 'Dubai Healthcare City',
    storyDetails: 'Supporting my child through their skin condition journey has been challenging but rewarding. This community has been invaluable.',
    submissionDate: '2024-03-10T09:15:00Z',
    status: 'unpublished',
  },
  {
    id: '4',
    authorName: 'Ahmed Ali',
    authorTitle: 'Patient',
    organization: 'Riyadh Medical Center',
    storyDetails: 'Managing rosacea with the right products and treatments has helped me regain my self-esteem and social confidence.',
    submissionDate: '2024-04-05T16:45:00Z',
    status: 'published',
  },
];

// Get unique values for filters
const getUniqueAuthors = (stories: Story[]) => 
  Array.from(new Set(stories.map(s => s.authorName))).sort();

const getUniqueOrganizations = (stories: Story[]) => 
  Array.from(new Set(stories.map(s => s.organization))).sort();

export const StoriesPage: React.FC = () => {
  const [stories, setStories] = useState<Story[]>(mockStories);
  const [search, setSearch] = useState('');
  const [authorFilter, setAuthorFilter] = useState<string>('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [formData, setFormData] = useState<StoryFormData>({
    status: 'published',
  });

  const columns = useMemo<ColumnDef<Story>[]>(() => [
    {
      accessorKey: 'authorName',
      header: 'Author Name',
      cell: (info) => (
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'authorTitle',
      header: 'Author Title',
      cell: (info) => (
        <div className="text-sm text-gray-600">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'organization',
      header: 'Organization',
      cell: (info) => (
        <div className="text-sm text-gray-600">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'storyDetails',
      header: 'Story Details',
      cell: (info) => (
        <div className="text-sm text-gray-600 max-w-md truncate">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'submissionDate',
      header: () => <div className="text-center">Submission Date</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {format(new Date(info.getValue() as string), 'MMM d, yyyy')}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: (info) => {
        const status = info.getValue() as StoryStatus;
        const statusConfig = {
          published: { label: 'Published', color: 'bg-green-100 text-green-800' },
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

  const filteredStories = useMemo(() => {
    let result = [...stories];

    if (search) {
      result = result.filter((story) =>
        story.authorName.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (authorFilter) {
      result = result.filter((story) => story.authorName === authorFilter);
    }

    if (organizationFilter) {
      result = result.filter((story) => story.organization === organizationFilter);
    }

    return result.sort((a, b) => 
      new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
    );
  }, [stories, search, authorFilter, organizationFilter]);

  const handleEdit = (story: Story) => {
    setSelectedStory(story);
    setFormData({
      status: story.status,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (story: Story) => {
    setSelectedStory(story);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedStory) {
      toast.error('No story selected');
      return;
    }

    setStories(prev =>
      prev.map(story =>
        story.id === selectedStory.id
          ? {
              ...story,
              status: formData.status,
            }
          : story
      )
    );
    setIsEditModalOpen(false);
    setSelectedStory(null);
    toast.success('Story status updated successfully');
  };

  const handleDelete = () => {
    if (selectedStory) {
      setStories(prev => prev.filter(story => story.id !== selectedStory.id));
      setIsDeleteDialogOpen(false);
      setSelectedStory(null);
      toast.success('Story deleted successfully');
    }
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedStory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stories</h1>
          <p className="text-gray-600 mt-1">Manage user-generated stories and experiences</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 w-full justify-between">
            <input
              type="text"
              placeholder="Search by author name..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '320px' }}
            />
            <div className="flex gap-2">
              <select
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                style={{ minWidth: '155px' }}
              >
                <option value="">All Authors</option>
                {getUniqueAuthors(mockStories).map((author) => (
                  <option key={author} value={author}>{author}</option>
                ))}
              </select>
              <select
                value={organizationFilter}
                onChange={(e) => setOrganizationFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                style={{ minWidth: '155px' }}
              >
                <option value="">All Organizations</option>
                {getUniqueOrganizations(mockStories).map((org) => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <DataTable
          data={filteredStories}
          columns={columns}
          enableSearch={false}
          emptyMessage="No stories found."
        />
      </Card>

      {/* Edit Story Status Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Story Status"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Author:</span> {selectedStory?.authorName}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Story:</span> {selectedStory?.storyDetails}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as StoryStatus }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
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
        title="Delete Story"
        message={`Are you sure you want to delete the story by "${selectedStory?.authorName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default StoriesPage;
