/**
 * What's New module types
 */

export type WhatsNewItemType = 'quiz' | 'article' | 'webinar';

export interface WhatsNewItem {
  id: string;
  title: string;
  userTitle: string;
  itemType: WhatsNewItemType;
  itemId: string;
  itemTitle: string;
  image?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WhatsNewFormData {
  userTitle: string;
  itemType: WhatsNewItemType;
  itemId: string;
  banner?: File;
}
