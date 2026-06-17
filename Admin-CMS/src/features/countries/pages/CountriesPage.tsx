/**
 * Countries management page
 */

import React, { useMemo, useState } from 'react';
import { Plus,Trash2, Edit2 } from 'lucide-react';
import { Button, Card, DataTable, Modal, ConfirmDialog, Input } from '@/shared/components';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Country = {
  id: string;
  name: string;
  cities: string[];
  status: 'active' | 'inactive';
  createdAt: string;
};

type CountryFormData = {
  name: string;
  cities: string[];
  status: 'active' | 'inactive';
};

// Mock data for countries
const mockCountries: Country[] = [
  { id: '1', name: 'Saudi Arabia', cities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina'], status: 'active', createdAt: new Date().toISOString() },
  { id: '2', name: 'United Arab Emirates', cities: ['Dubai', 'Abu Dhabi', 'Sharjah'], status: 'active', createdAt: new Date().toISOString() },
  { id: '3', name: 'Kuwait', cities: ['Kuwait City', 'Hawalli'], status: 'active', createdAt: new Date().toISOString() },
  { id: '4', name: 'Qatar', cities: ['Doha'], status: 'inactive', createdAt: new Date().toISOString() },
  { id: '5', name: 'Bahrain', cities: ['Manama', 'Muharraq'], status: 'active', createdAt: new Date().toISOString() },
  { id: '6', name: 'Oman', cities: ['Muscat', 'Salalah'], status: 'active', createdAt: new Date().toISOString() },
];

export const CountriesPage: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [countries, setCountries] = useState<Country[]>(mockCountries);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCitiesModalOpen, setIsCitiesModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<CountryFormData>({
    name: '',
    cities: [],
    status: 'active',
  });
  const [cityInput, setCityInput] = useState('');
  const [editCities, setEditCities] = useState<string[]>([]);

  // Handlers
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({ name: '', cities: [], status: 'active' });
    setSelectedCountry(null);
    setCityInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (country: Country) => {
    setModalMode('edit');
    setFormData({ name: country.name, cities: [...country.cities], status: country.status });
    setSelectedCountry(country);
    setCityInput('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCountry(null);
    setCityInput('');
  };

  const handleAddCity = () => {
    const trimmedCity = cityInput.trim();
    if (!trimmedCity) {
      toast.error('Please enter a city name');
      return;
    }
    if (formData.cities.includes(trimmedCity)) {
      toast.error('City already exists');
      return;
    }
    setFormData({ ...formData, cities: [...formData.cities, trimmedCity] });
    setCityInput('');
  };

  const handleRemoveCity = (cityToRemove: string) => {
    setFormData({ ...formData, cities: formData.cities.filter(city => city !== cityToRemove) });
  };

  const handleOpenCitiesModal = (country: Country) => {
    setSelectedCountry(country);
    setEditCities([...country.cities]);
    setCityInput('');
    setIsCitiesModalOpen(true);
  };

  const handleCloseCitiesModal = () => {
    setIsCitiesModalOpen(false);
    setSelectedCountry(null);
    setEditCities([]);
    setCityInput('');
  };

  const handleAddCityInEditModal = () => {
    const trimmedCity = cityInput.trim();
    if (!trimmedCity) {
      toast.error('Please enter a city name');
      return;
    }
    if (editCities.includes(trimmedCity)) {
      toast.error('City already exists');
      return;
    }
    setEditCities([...editCities, trimmedCity]);
    setCityInput('');
  };

  const handleRemoveCityInEditModal = (cityToRemove: string) => {
    setEditCities(editCities.filter(city => city !== cityToRemove));
  };

  const handleSaveCities = () => {
    if (!selectedCountry) return;
    setCountries(
      countries.map((country) =>
        country.id === selectedCountry.id
          ? { ...country, cities: editCities }
          : country
      )
    );
    toast.success('Cities updated successfully');
    handleCloseCitiesModal();
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (modalMode === 'create') {
      const newCountry: Country = {
        id: `country-${Date.now()}`,
        name: formData.name,
        cities: formData.cities,
        status: formData.status,
        createdAt: new Date().toISOString(),
      };
      setCountries([...countries, newCountry]);
      toast.success('Country created successfully');
    } else if (modalMode === 'edit' && selectedCountry) {
      setCountries(
        countries.map((country) =>
          country.id === selectedCountry.id
            ? { ...country, name: formData.name, cities: formData.cities, status: formData.status }
            : country
        )
      );
      toast.success('Country updated successfully');
    }
    handleCloseModal();
  };

  const handleOpenDeleteDialog = (country: Country) => {
    setSelectedCountry(country);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedCountry(null);
  };

  const handleDelete = () => {
    if (selectedCountry) {
      setCountries(countries.filter((country) => country.id !== selectedCountry.id));
      toast.success('Country deleted successfully');
    }
    handleCloseDeleteDialog();
  };

  // Filter and search countries
  const filteredCountries = useMemo(() => {
    let filtered = [...countries];
    if (search) {
      filtered = filtered.filter((country) => 
        country.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((country) => country.status === statusFilter);
    }
    // Sort by name ascending
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [countries, search, statusFilter]);

  // Table columns
  const columns = useMemo<ColumnDef<Country>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Country Name',
      cell: (info) => (
        <div className="font-medium text-gray-900">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'cities',
      header: 'Cities',
      cell: (info) => {
        const cities = info.getValue() as string[];
        return (
          <div className="text-sm text-gray-600">
            {cities.length > 0 ? `${cities.length} cities` : 'No cities'}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: (info) => {
        const status = info.getValue() as string;
        const statusConfig = {
          active: { label: 'Active', color: 'bg-green-100 text-green-800' },
          inactive: { label: 'Inactive', color: 'bg-red-50 text-red-600' },
        };
        const config = statusConfig[status as 'active' | 'inactive'];
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
            onClick={() => handleOpenEditModal(row.original)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => handleOpenCitiesModal(row.original)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit Cities
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
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Countries</h1>
          <p className="text-gray-600 mt-1">Manage countries in the system</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateModal}>
          Add Country
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex w-full justify-between gap-4">
            <input
              type="text"
              placeholder="Search by country name..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '320px' }}
            />
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="min-w-[155px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '155px' }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <DataTable
          data={filteredCountries}
          columns={columns}
          enableSearch={false}
          emptyMessage="No countries found."
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? 'Add Country' : 'Edit Country'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {modalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Country Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter country name"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cities ({formData.cities.length})
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCity())}
                placeholder="Enter city name"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <Button type="button" onClick={handleAddCity} size="sm">
                Add
              </Button>
            </div>
            {formData.cities.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {formData.cities.map((city, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm text-gray-700">{city}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCity(city)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Cities Modal */}
      <Modal
        isOpen={isCitiesModalOpen}
        onClose={handleCloseCitiesModal}
        title={`Edit Cities - ${selectedCountry?.name}`}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCloseCitiesModal}>
              Cancel
            </Button>
            <Button onClick={handleSaveCities}>
              Save Cities
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cities ({editCities.length})
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCityInEditModal())}
                placeholder="Enter city name"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <Button type="button" onClick={handleAddCityInEditModal} size="sm">
                Add
              </Button>
            </div>
            {editCities.length > 0 ? (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                {editCities.map((city, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm text-gray-700">{city}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCityInEditModal(city)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm border border-gray-200 rounded-lg">
                No cities added yet
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        onCancel={handleCloseDeleteDialog}
        title="Delete Country"
        message={`Are you sure you want to delete "${selectedCountry?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default CountriesPage;
