/**
 * Products management page
 */

import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Card, Modal, ConfirmDialog } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type ProductStatus = 'active' | 'inactive';

type ProductDetail = {
  id: string;
  label: string;
  value: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  categories: string[];
  status: ProductStatus;
  details: ProductDetail[];
  imageUrl?: string;
  createdAt: string;
};

type ProductFormData = {
  name: string;
  description: string;
  categories: string[];
  status: ProductStatus;
  details: ProductDetail[];
  image?: File;
};

// Mock categories
const mockCategories = [
  'Skincare Essentials',
  'Anti-Aging',
  'Sun Protection',
  'Acne Treatment',
];

// Mock data for products
const mockProductsData: Product[] = [
  {
    id: '1',
    name: 'Moisturizing Cream',
    description: 'Deeply hydrating cream for all skin types with hyaluronic acid and ceramides.',
    categories: ['Skincare Essentials'],
    status: 'active',
    details: [
      { id: '1', label: 'Size', value: '50ml' },
      { id: '2', label: 'Key Ingredients', value: 'Hyaluronic Acid, Ceramides' },
      { id: '3', label: 'Skin Type', value: 'All Skin Types' },
    ],
    imageUrl: '/images/moisturizing-cream.jpg',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Sunscreen SPF 50',
    description: 'Broad-spectrum protection against UVA and UVB rays, water-resistant formula.',
    categories: ['Sun Protection', 'Skincare Essentials'],
    status: 'active',
    details: [
      { id: '1', label: 'SPF', value: '50+' },
      { id: '2', label: 'Volume', value: '100ml' },
      { id: '3', label: 'Water Resistant', value: '80 minutes' },
    ],
    imageUrl: '/images/sunscreen.jpg',
    createdAt: '2024-02-20T14:30:00Z',
  },
  {
    id: '3',
    name: 'Anti-Aging Serum',
    description: 'Advanced formula with retinol and peptides to reduce fine lines and wrinkles.',
    categories: ['Anti-Aging'],
    status: 'inactive',
    details: [
      { id: '1', label: 'Size', value: '30ml' },
      { id: '2', label: 'Active Ingredients', value: 'Retinol 0.5%, Peptides' },
    ],
    createdAt: '2024-03-10T09:15:00Z',
  },
];

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProductsData);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    categories: [],
    status: 'active',
    details: [],
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);

  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      accessorKey: 'name',
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
      accessorKey: 'categories',
      header: 'Categories',
      cell: (info) => {
        const categories = info.getValue() as string[];
        return (
          <div className="text-sm text-gray-600">
            {categories.length > 0 ? categories.join(', ') : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: (info) => {
        const status = info.getValue() as ProductStatus;
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

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search) {
      result = result.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [products, search]);

  const handleCreateClick = () => {
    setFormData({
      name: '',
      description: '',
      categories: [],
      status: 'active',
      details: [],
    });
    setImagePreview(null);
    setIsDetailsExpanded(true);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      categories: [...product.categories],
      status: product.status,
      details: [...product.details],
    });
    setImagePreview(product.imageUrl || null);
    setIsDetailsExpanded(true);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
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

  const handleAddDetail = () => {
    const newDetail: ProductDetail = {
      id: `detail-${Date.now()}`,
      label: '',
      value: '',
    };
    setFormData(prev => ({
      ...prev,
      details: [...prev.details, newDetail],
    }));
  };

  const handleRemoveDetail = (detailId: string) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter(d => d.id !== detailId),
    }));
  };

  const handleDetailChange = (detailId: string, field: 'label' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map(d =>
        d.id === detailId ? { ...d, [field]: value } : d
      ),
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.description.trim() || formData.categories.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newProduct: Product = {
      id: `product-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      categories: formData.categories,
      status: formData.status,
      details: formData.details.filter(d => d.label.trim() && d.value.trim()),
      ...(imagePreview ? { imageUrl: imagePreview } : {}),
      createdAt: new Date().toISOString(),
    };

    setProducts(prev => [...prev, newProduct]);
    setIsCreateModalOpen(false);
    toast.success('Product created successfully');
  };

  const handleUpdate = () => {
    if (!selectedProduct || !formData.name.trim() || !formData.description.trim() || formData.categories.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProducts(prev =>
      prev.map(product =>
        product.id === selectedProduct.id
          ? {
              ...product,
              name: formData.name,
              description: formData.description,
              categories: formData.categories,
              status: formData.status,
              details: formData.details.filter(d => d.label.trim() && d.value.trim()),
              ...(imagePreview ? { imageUrl: imagePreview } : {}),
            }
          : product
      )
    );
    setIsEditModalOpen(false);
    setSelectedProduct(null);
    toast.success('Product updated successfully');
  };

  const handleDelete = () => {
    if (selectedProduct) {
      setProducts(prev => prev.filter(product => product.id !== selectedProduct.id));
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
      toast.success('Product deleted successfully');
    }
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedProduct(null);
  };

  const renderProductForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Enter product name"
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
          placeholder="Enter product description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categories * ({formData.categories.length} selected)
        </label>
        <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto">
          {mockCategories.map((category) => (
            <label key={category} className="flex items-center py-2 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.categories.includes(category)}
                onChange={() => handleCategoryToggle(category)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-sm text-gray-700">{category}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status *
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ProductStatus }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
        >
          <span>Product Details (Optional)</span>
          {isDetailsExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {isDetailsExpanded && (
          <div className="space-y-3 border border-gray-200 rounded-lg p-4">
            {formData.details.map((detail) => (
              <div key={detail.id} className="flex gap-2 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={detail.label}
                    onChange={(e) => handleDetailChange(detail.id, 'label', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Label (e.g., Size, Color)"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={detail.value}
                    onChange={(e) => handleDetailChange(detail.id, 'value', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Value (e.g., 50ml, Blue)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDetail(detail.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddDetail}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add Detail
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Image
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
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage reward products and inventory</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleCreateClick}>
          Add Product
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 w-full justify-between">
            <input
              type="text"
              placeholder="Search by product name..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '320px' }}
            />
          </div>
        </div>
        <DataTable
          data={filteredProducts}
          columns={columns}
          enableSearch={false}
          emptyMessage="No products found."
        />
      </Card>

      {/* Create Product Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Product"
        size="lg"
      >
        {renderProductForm()}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Save</Button>
        </div>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Product"
        size="lg"
      >
        {renderProductForm()}
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
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default ProductsPage;
