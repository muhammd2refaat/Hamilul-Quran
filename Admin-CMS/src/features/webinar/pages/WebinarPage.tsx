/**
 * Webinar management page
 */

import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Upload, X } from 'lucide-react';
import { Button, Card, Modal, ConfirmDialog } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type WebinarStatus = 'draft' | 'scheduled' | 'completed' | 'cancelled';

type Country = {
  id: string;
  name: string;
};

type Webinar = {
  id: string;
  title: string;
  description: string;
  countryIds: string[];
  status: WebinarStatus;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  speakerName: string;
  speakerTitle: string;
  zoomUrl: string;
  capacity: number;
  bannerUrl?: string;
  createdAt: string;
};

type WebinarFormData = {
  title: string;
  description: string;
  countryIds: string[];
  status: WebinarStatus;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  speakerName: string;
  speakerTitle: string;
  zoomUrl: string;
  capacity: number;
  banner?: File;
};

// Mock data for countries
const mockCountries: Country[] = [
  { id: '1', name: 'Saudi Arabia' },
  { id: '2', name: 'United Arab Emirates' },
  { id: '3', name: 'Kuwait' },
  { id: '4', name: 'Qatar' },
  { id: '5', name: 'Bahrain' },
  { id: '6', name: 'Oman' },
  { id: '7', name: 'Egypt' },
  { id: '8', name: 'Jordan' },
];

// Mock data for webinars
const mockWebinars: Webinar[] = [
  {
    id: '1',
    title: 'Understanding Skin Cancer Prevention',
    description: 'Learn about early detection and prevention strategies for skin cancer.',
    countryIds: ['1', '2', '3'],
    status: 'scheduled',
    date: '2024-06-15',
    startTime: '14:00',
    endTime: '15:00',
    duration: 60,
    speakerName: 'Dr. Sarah Ahmed',
    speakerTitle: 'Dermatologist',
    zoomUrl: 'https://zoom.us/j/123456789',
    capacity: 200,
    bannerUrl: '/images/webinar-skin-cancer.jpg',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'Managing Eczema in Children',
    description: 'Expert guidance on treating and managing pediatric eczema.',
    countryIds: ['1', '2', '4', '5'],
    status: 'completed',
    date: '2024-05-20',
    startTime: '16:00',
    endTime: '17:30',
    duration: 90,
    speakerName: 'Dr. Mohammed Hassan',
    speakerTitle: 'Pediatric Dermatologist',
    zoomUrl: 'https://zoom.us/j/987654321',
    capacity: 150,
    bannerUrl: '/images/webinar-eczema.jpg',
    createdAt: '2024-02-20T14:30:00Z',
  },
  {
    id: '3',
    title: 'Advanced Acne Treatment Options',
    description: 'Exploring modern treatment approaches for severe acne.',
    countryIds: ['1', '7', '8'],
    status: 'draft',
    date: '2024-07-01',
    startTime: '15:00',
    endTime: '16:15',
    duration: 75,
    speakerName: 'Dr. Fatima Al-Rashid',
    speakerTitle: 'Clinical Dermatologist',
    zoomUrl: 'https://zoom.us/j/456789123',
    capacity: 100,
    createdAt: '2024-03-10T09:15:00Z',
  },
];

export const WebinarPage: React.FC = () => {
  const [webinars, setWebinars] = useState<Webinar[]>(mockWebinars);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
  const [formData, setFormData] = useState<WebinarFormData>({
    title: '',
    description: '',
    countryIds: [],
    status: 'draft',
    date: '',
    startTime: '',
    endTime: '',
    duration: 60,
    speakerName: '',
    speakerTitle: '',
    zoomUrl: '',
    capacity: 100,
  });
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const getCountryNames = (countryIds: string[]) => {
    return mockCountries
      .filter(country => countryIds.includes(country.id))
      .map(country => country.name)
      .join(', ');
  };

  const columns = useMemo<ColumnDef<Webinar>[]>(() => [
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
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'countryIds',
      header: 'Country',
      cell: (info) => {
        const webinar = info.row.original;
        const countries = getCountryNames(webinar.countryIds);
        return (
          <div className="text-sm text-gray-600 max-w-xs truncate" title={countries}>
            {countries || 'All Countries'}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: (info) => {
        const status = info.getValue() as WebinarStatus;
        const statusConfig = {
          draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
          scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
          completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
          cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600' },
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
      accessorKey: 'date',
      header: () => <div className="text-center">Date</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {format(new Date(info.getValue() as string), 'MMM d, yyyy')}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'startTime',
      header: () => <div className="text-center">Start Time</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">{info.getValue() as string}</div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'endTime',
      header: () => <div className="text-center">End Time</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">{info.getValue() as string}</div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'duration',
      header: () => <div className="text-center">Duration</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">{info.getValue() as number} min</div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'speakerName',
      header: 'Speaker',
      cell: (info) => {
        const webinar = info.row.original;
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{webinar.speakerName}</div>
            <div className="text-xs text-gray-500">{webinar.speakerTitle}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'capacity',
      header: () => <div className="text-center">Capacity</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">{info.getValue() as number}</div>
      ),
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

  const filteredWebinars = useMemo(() => {
    let result = [...webinars];

    // Filter by search
    if (search) {
      result = result.filter((webinar) =>
        webinar.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter) {
      result = result.filter((webinar) => webinar.status === statusFilter);
    }

    // Filter by country
    if (countryFilter) {
      result = result.filter((webinar) => 
        webinar.countryIds.includes(countryFilter)
      );
    }

    // Sort by created at (newest first)
    return result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [webinars, search, statusFilter, countryFilter]);

  const handleCreateClick = () => {
    setFormData({
      title: '',
      description: '',
      countryIds: [],
      status: 'draft',
      date: '',
      startTime: '',
      endTime: '',
      duration: 60,
      speakerName: '',
      speakerTitle: '',
      zoomUrl: '',
      capacity: 100,
    });
    setBannerPreview(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (webinar: Webinar) => {
    setSelectedWebinar(webinar);
    setFormData({
      title: webinar.title,
      description: webinar.description,
      countryIds: webinar.countryIds,
      status: webinar.status,
      date: webinar.date,
      startTime: webinar.startTime,
      endTime: webinar.endTime,
      duration: webinar.duration,
      speakerName: webinar.speakerName,
      speakerTitle: webinar.speakerTitle,
      zoomUrl: webinar.zoomUrl,
      capacity: webinar.capacity,
    });
    setBannerPreview(webinar.bannerUrl || null);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (webinar: Webinar) => {
    setSelectedWebinar(webinar);
    setIsDeleteDialogOpen(true);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Banner size must be less than 5MB');
      return;
    }

    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!validImageTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image (JPEG, PNG, WebP)');
      return;
    }

    setFormData(prev => ({ ...prev, banner: file }));
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = () => {
    setFormData(prev => ({ ...prev, banner: undefined }));
    setBannerPreview(null);
  };

  const handleCountryToggle = (countryId: string) => {
    setFormData(prev => ({
      ...prev,
      countryIds: prev.countryIds.includes(countryId)
        ? prev.countryIds.filter(id => id !== countryId)
        : [...prev.countryIds, countryId]
    }));
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes - startMinutes;
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'startTime' && updated.endTime) {
        updated.duration = calculateDuration(value, updated.endTime);
      } else if (field === 'endTime' && updated.startTime) {
        updated.duration = calculateDuration(updated.startTime, value);
      }
      
      return updated;
    });
  };

  const handleCreate = () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.date || 
        !formData.startTime || !formData.endTime || !formData.speakerName.trim() || 
        !formData.speakerTitle.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.duration <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    const newWebinar: Webinar = {
      id: `webinar-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      countryIds: formData.countryIds,
      status: formData.status,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      duration: formData.duration,
      speakerName: formData.speakerName,
      speakerTitle: formData.speakerTitle,
      zoomUrl: formData.zoomUrl,
      capacity: formData.capacity,
      ...(bannerPreview ? { bannerUrl: bannerPreview } : {}),
      createdAt: new Date().toISOString(),
    };

    setWebinars(prev => [...prev, newWebinar]);
    setIsCreateModalOpen(false);
    toast.success('Webinar created successfully');
  };

  const handleUpdate = () => {
    if (!selectedWebinar || !formData.title.trim() || !formData.description.trim() || 
        !formData.date || !formData.startTime || !formData.endTime || 
        !formData.speakerName.trim() || !formData.speakerTitle.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.duration <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    setWebinars(prev =>
      prev.map(webinar =>
        webinar.id === selectedWebinar.id
          ? {
              ...webinar,
              title: formData.title,
              description: formData.description,
              countryIds: formData.countryIds,
              status: formData.status,
              date: formData.date,
              startTime: formData.startTime,
              endTime: formData.endTime,
              duration: formData.duration,
              speakerName: formData.speakerName,
              speakerTitle: formData.speakerTitle,
              zoomUrl: formData.zoomUrl,
              capacity: formData.capacity,
              ...(bannerPreview ? { bannerUrl: bannerPreview } : {}),
            }
          : webinar
      )
    );
    setIsEditModalOpen(false);
    setSelectedWebinar(null);
    toast.success('Webinar updated successfully');
  };

  const handleDelete = () => {
    if (selectedWebinar) {
      setWebinars(prev => prev.filter(webinar => webinar.id !== selectedWebinar.id));
      setIsDeleteDialogOpen(false);
      setSelectedWebinar(null);
      toast.success('Webinar deleted successfully');
    }
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedWebinar(null);
  };

  const renderWebinarForm = () => (
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
          placeholder="Enter webinar title"
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
          rows={3}
          placeholder="Enter webinar description"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time *
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => handleTimeChange('startTime', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time *
          </label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => handleTimeChange('endTime', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duration
        </label>
        <input
          type="text"
          value={`${formData.duration} minutes`}
          readOnly
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Speaker Name *
          </label>
          <input
            type="text"
            value={formData.speakerName}
            onChange={(e) => setFormData(prev => ({ ...prev, speakerName: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter speaker name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Speaker Title *
          </label>
          <input
            type="text"
            value={formData.speakerTitle}
            onChange={(e) => setFormData(prev => ({ ...prev, speakerTitle: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter speaker title"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Zoom URL
        </label>
        <input
          type="url"
          value={formData.zoomUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, zoomUrl: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="https://zoom.us/j/123456789"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Capacity *
        </label>
        <input
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 100 }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          min="1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status *
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as WebinarStatus }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Country Visibility ({formData.countryIds.length} selected)
        </label>
        <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto">
          {mockCountries.map((country) => (
            <label key={country.id} className="flex items-center py-2 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.countryIds.includes(country.id)}
                onChange={() => handleCountryToggle(country.id)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-sm text-gray-700">{country.name}</span>
            </label>
          ))}
        </div>
        {formData.countryIds.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">No countries selected - visible to all</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Banner Image
        </label>
        {!bannerPreview ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-2">
              <label className="cursor-pointer">
                <span className="text-sm text-primary-600 hover:text-primary-700">
                  Upload a banner
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBannerChange}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              JPEG, PNG, or WebP up to 5MB
            </p>
          </div>
        ) : (
          <div className="relative border border-gray-300 rounded-lg p-4">
            <img src={bannerPreview} alt="Preview" className="max-h-48 mx-auto rounded" />
            <button
              onClick={handleRemoveBanner}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webinars</h1>
          <p className="text-gray-600 mt-1">Manage educational webinars and events</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleCreateClick}>
          Add Webinar
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 w-full justify-between">
            <input
              type="text"
              placeholder="Search by webinar title..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '320px' }}
            />
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                style={{ minWidth: '155px' }}
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                style={{ minWidth: '155px' }}
              >
                <option value="">All Countries</option>
                {mockCountries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <DataTable
          data={filteredWebinars}
          columns={columns}
          enableSearch={false}
          emptyMessage="No webinars found."
        />
      </Card>

      {/* Create Webinar Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Webinar"
        size="lg"
      >
        {renderWebinarForm()}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Save</Button>
        </div>
      </Modal>

      {/* Edit Webinar Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Webinar"
        size="lg"
      >
        {renderWebinarForm()}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate}>Update</Button>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        onCancel={handleCloseDeleteDialog}
        title="Delete Webinar"
        message={`Are you sure you want to delete "${selectedWebinar?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default WebinarPage;