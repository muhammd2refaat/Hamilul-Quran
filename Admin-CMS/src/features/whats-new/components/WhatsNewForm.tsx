/**
 * What's New Form Component
 * Handles creation and editing of What's New items
 */

import { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { Input } from '@/shared/components';
import { mockQuizzes } from '@/mock-data/quizzes';
import { mockArticles } from '@/mock-data/articles';
import { mockWebinars } from '@/mock-data/webinars';
import type { WhatsNewFormData, WhatsNewItemType } from '../types';

interface WhatsNewFormProps {
  initialData?: WhatsNewFormData;
  onSubmit: (data: WhatsNewFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  bannerPreview?: string | null;
  onBannerChange?: (preview: string | null) => void;
}

export function WhatsNewForm({ initialData, onSubmit, onCancel, isLoading, bannerPreview, onBannerChange }: WhatsNewFormProps) {
  const [formData, setFormData] = useState<WhatsNewFormData>({
    userTitle: initialData?.userTitle || '',
    itemType: initialData?.itemType || 'quiz',
    itemId: initialData?.itemId || '',
  });

  // Get available items based on selected type
  const getAvailableItems = () => {
    switch (formData.itemType) {
      case 'quiz':
        return mockQuizzes.map((q) => ({ value: q.id, label: q.title }));
      case 'article':
        return mockArticles.map((a) => ({ value: a.id, label: a.title }));
      case 'webinar':
        return mockWebinars.map((w) => ({ value: w.id, label: w.title }));
      default:
        return [];
    }
  };

  // Reset itemId when itemType changes
  useEffect(() => {
    if (!initialData) {
      setFormData((prev) => ({ ...prev, itemId: '' }));
    }
  }, [formData.itemType, initialData]);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, banner: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        onBannerChange?.(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBanner = () => {
    setFormData(prev => ({ ...prev, banner: undefined }));
    onBannerChange?.(null);
  };

  const availableItems = getAvailableItems();

  return (
    <div className="space-y-4">
      <Input
        label="User Title (Shown in App)"
        value={formData.userTitle}
        onChange={(e) => setFormData(prev => ({ ...prev, userTitle: e.target.value }))}
        placeholder="Enter user-facing title"
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content Type
        </label>
        <select
          value={formData.itemType}
          onChange={(e) => setFormData(prev => ({ ...prev, itemType: e.target.value as WhatsNewItemType }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
          required
        >
          <option value="quiz">Quiz</option>
          <option value="article">Article</option>
          <option value="webinar">Webinar</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select {formData.itemType.charAt(0).toUpperCase() + formData.itemType.slice(1)}
        </label>
        <select
          value={formData.itemId}
          onChange={(e) => setFormData(prev => ({ ...prev, itemId: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
          required
        >
          <option value="">-- Select a {formData.itemType} --</option>
          {availableItems.map(item => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Banner Image
        </label>
        {bannerPreview ? (
          <div className="relative">
            <img
              src={bannerPreview}
              alt="Banner preview"
              className="w-full h-48 object-cover rounded-lg border border-gray-300"
            />
            <button
              type="button"
              onClick={handleRemoveBanner}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Click to upload banner image</span>
            <span className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
