# What's New Feature

A comprehensive feature for managing highlighted/featured content in the admin panel.

## Overview

The What's New section allows administrators to showcase important content items (quizzes, articles, and webinars) to users. The feature supports a maximum of 10 featured items at any time.

## Features

- ✅ **CRUD Operations**: Create, Read, Update, and Delete featured items
- ✅ **Image Upload**: Upload featured images for each item
- ✅ **Content Types**: Support for Quizzes, Articles, and Webinars
- ✅ **Item Limit**: Maximum 10 items enforced at the store level
- ✅ **Responsive Table**: DataTable with sorting and filtering
- ✅ **Type Safety**: Full TypeScript support

## File Structure

```
features/whats-new/
├── components/
│   ├── WhatsNewForm.tsx       # Form for create/edit
│   └── index.ts
├── pages/
│   ├── WhatsNewPage.tsx       # Main page with table
│   └── index.ts
├── store/
│   ├── whatsNewStore.ts       # Zustand store
│   └── index.ts
├── types/
│   └── index.ts               # TypeScript types
└── index.ts                    # Barrel export
```

## Data Model

### WhatsNewItem
```typescript
{
  id: string;                    // Unique identifier
  title: string;                 // Admin display title
  userTitle: string;             // User-facing title (shown in app)
  itemType: 'quiz' | 'article' | 'webinar';
  itemId: string;                // Reference to the actual content
  itemTitle: string;             // Title of the referenced content
  image?: string;                // Featured image URL
  createdAt: string;             // ISO timestamp
  updatedAt?: string;            // ISO timestamp
}
```

## Usage

### Navigation
Access via the sidebar menu: **What's New** (Sparkles icon)

### Creating a New Item
1. Click "Add Item" button
2. Enter an admin title
3. Enter a user-facing title (shown in the app)
4. Select content type (Quiz, Article, or Webinar)
5. Choose a specific item from the dropdown
6. Upload a banner image (optional)
7. Click "Create"

### Editing an Item
1. Click the edit (pencil) icon on any row
2. Modify the fields as needed
3. Click "Update"

### Deleting an Item
1. Click the delete (trash) icon on any row
2. Confirm the deletion in the dialog

## Business Rules

- **Maximum Items**: Only 10 items can be active at any time
- **Unique Selection**: Each content item can only be featured once
- **Image Requirements**: PNG, JPG, or GIF format, maximum 5MB

## Store Methods

```typescript
fetchItems()           // Load all items
addItem(item)         // Add new item (validates limit)
updateItem(id, data)  // Update existing item
deleteItem(id)        // Remove item
canAddMore()          // Check if limit reached
```

## Integration Points

- **Router**: `/whats-new` route in [src/router/index.tsx](../../../router/index.tsx)
- **Navigation**: Added to sidebar in [src/layouts/MainLayout.tsx](../../../layouts/MainLayout.tsx)
- **Mock Data**: [src/mock-data/whats-new.ts](../../../mock-data/whats-new.ts)

## Components Used

- `DataTable` - For displaying items
- `Modal` - For create/edit forms
- `ConfirmDialog` - For delete confirmation
- `FileUploader` - For image uploads
- `Button`, `Input`, `Select` - Form elements

## Future Enhancements

- [ ] Drag-and-drop reordering
- [ ] Publish/draft status
- [ ] Schedule publish dates
- [ ] Analytics tracking
- [ ] Bulk operations
- [ ] Image cropping/editing
