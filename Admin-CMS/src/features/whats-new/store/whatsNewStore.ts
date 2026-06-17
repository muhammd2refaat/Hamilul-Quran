/**
 * What's New store using Zustand
 */

import { create } from 'zustand';
import type { WhatsNewItem } from '../types';
import { mockWhatsNewItems } from '@/mock-data/whats-new';

interface WhatsNewState {
  items: WhatsNewItem[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<WhatsNewItem, 'id' | 'createdAt'>) => Promise<void>;
  updateItem: (id: string, item: Partial<WhatsNewItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  canAddMore: () => boolean;
}

export const useWhatsNewStore = create<WhatsNewState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      set({ items: mockWhatsNewItems, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch items', isLoading: false });
    }
  },

  addItem: async (item) => {
    const { items } = get();
    
    // Check if we can add more items (max 10)
    if (items.length >= 10) {
      throw new Error('Maximum of 10 items allowed in What\'s New section');
    }

    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const newItem: WhatsNewItem = {
        ...item,
        id: `wn-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      
      set({ items: [newItem, ...items], isLoading: false });
    } catch (error) {
      set({ error: 'Failed to add item', isLoading: false });
      throw error;
    }
  },

  updateItem: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id
            ? { ...item, ...updates, updatedAt: new Date().toISOString() }
            : item
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to update item', isLoading: false });
      throw error;
    }
  },

  deleteItem: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete item', isLoading: false });
      throw error;
    }
  },

  canAddMore: () => {
    return get().items.length < 10;
  },
}));
