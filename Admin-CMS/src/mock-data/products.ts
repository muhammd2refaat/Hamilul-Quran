/**
 * Mock data for products and categories module
 */

import type { EntityStatus } from '@/shared/types';

export type ProductDetailType = 'ingredients' | 'benefits' | 'usage' | 'precautions' | 'skincare';

export interface ProductDetail {
  id: string;
  type: ProductDetailType;
  title: string;
  content: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  image?: string;
  status: EntityStatus;
  details: ProductDetail[];
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  title: string;
  description?: string;
  productCount: number;
  status: EntityStatus;
  image?: string;
  createdAt: string;
  updatedAt?: string;
}

export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    title: 'Moisturizers & Hydration',
    description: 'Products for skin hydration and moisture retention',
    productCount: 12,
    status: 'active',
    image: '/uploads/categories/moisturizers.jpg',
    createdAt: '2024-06-10T09:00:00Z',
  },
  {
    id: 'cat-2',
    title: 'Sun Protection',
    description: 'Sunscreens and UV protection products',
    productCount: 8,
    status: 'active',
    image: '/uploads/categories/sunscreen.jpg',
    createdAt: '2024-06-12T10:30:00Z',
  },
  {
    id: 'cat-3',
    title: 'Acne Treatment',
    description: 'Products for acne prevention and treatment',
    productCount: 10,
    status: 'active',
    image: '/uploads/categories/acne.jpg',
    createdAt: '2024-06-15T11:00:00Z',
  },
  {
    id: 'cat-4',
    title: 'Anti-Aging',
    description: 'Products targeting signs of aging',
    productCount: 15,
    status: 'active',
    image: '/uploads/categories/antiaging.jpg',
    createdAt: '2024-06-18T14:00:00Z',
  },
  {
    id: 'cat-5',
    title: 'Cleansers',
    description: 'Facial cleansers for all skin types',
    productCount: 9,
    status: 'active',
    image: '/uploads/categories/cleansers.jpg',
    createdAt: '2024-06-20T09:30:00Z',
  },
  {
    id: 'cat-6',
    title: 'Serums & Treatments',
    description: 'Concentrated treatments for specific skin concerns',
    productCount: 7,
    status: 'active',
    image: '/uploads/categories/serums.jpg',
    createdAt: '2024-06-25T10:00:00Z',
  },
  {
    id: 'cat-7',
    title: 'Eye Care',
    description: 'Specialized products for the eye area',
    productCount: 4,
    status: 'active',
    image: '/uploads/categories/eyecare.jpg',
    createdAt: '2024-07-01T11:30:00Z',
  },
  {
    id: 'cat-8',
    title: 'Body Care',
    description: 'Skincare products for the body',
    productCount: 2,
    status: 'inactive',
    image: '/uploads/categories/bodycare.jpg',
    createdAt: '2024-07-05T14:00:00Z',
  },
];

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Intensive Hydration Cream',
    description: 'Deep moisturizing cream for dry and sensitive skin',
    categoryId: 'cat-1',
    categoryName: 'Moisturizers & Hydration',
    image: '/uploads/products/hydration-cream.jpg',
    status: 'active',
    details: [
      {
        id: 'd1-1',
        type: 'ingredients',
        title: 'Key Ingredients',
        content: '<ul><li><strong>Hyaluronic Acid</strong> - Attracts and retains moisture</li><li><strong>Ceramides</strong> - Strengthens skin barrier</li><li><strong>Glycerin</strong> - Humectant for hydration</li><li><strong>Squalane</strong> - Lightweight oil for moisture lock</li></ul>',
      },
      {
        id: 'd1-2',
        type: 'benefits',
        title: 'Therapeutic Benefits',
        content: '<p>Provides 24-hour hydration and repairs the skin barrier. Clinically proven to reduce dryness by 85% after 4 weeks of use. Suitable for eczema-prone skin.</p>',
      },
      {
        id: 'd1-3',
        type: 'usage',
        title: 'Recommended Usage Instructions',
        content: '<p>Apply a pea-sized amount to clean, damp skin morning and evening. Gently massage in upward circular motions until fully absorbed.</p>',
      },
      {
        id: 'd1-4',
        type: 'precautions',
        title: 'Precautions & Safety Advice',
        content: '<p>For external use only. Avoid contact with eyes. Discontinue use if irritation occurs. Store in a cool, dry place.</p>',
      },
    ],
    createdAt: '2024-07-15T11:30:00Z',
    updatedAt: '2025-10-20T14:00:00Z',
  },
  {
    id: 'prod-2',
    name: 'Daily Defense SPF 50 Sunscreen',
    description: 'Broad-spectrum protection with lightweight, non-greasy formula',
    categoryId: 'cat-2',
    categoryName: 'Sun Protection',
    image: '/uploads/products/sunscreen.jpg',
    status: 'active',
    details: [
      {
        id: 'd2-1',
        type: 'ingredients',
        title: 'Key Ingredients',
        content: '<ul><li><strong>Zinc Oxide 15%</strong> - Physical UV blocker</li><li><strong>Titanium Dioxide 5%</strong> - Broad-spectrum protection</li><li><strong>Vitamin E</strong> - Antioxidant protection</li><li><strong>Niacinamide</strong> - Skin barrier support</li></ul>',
      },
      {
        id: 'd2-2',
        type: 'benefits',
        title: 'Therapeutic Benefits',
        content: '<p>Provides SPF 50 PA++++ protection against UVA and UVB rays. Water-resistant for up to 80 minutes. Does not leave white cast.</p>',
      },
      {
        id: 'd2-3',
        type: 'usage',
        title: 'Recommended Usage Instructions',
        content: '<p>Apply generously 15 minutes before sun exposure. Reapply every 2 hours, or after swimming or sweating. Use as the last step of your morning routine.</p>',
      },
    ],
    createdAt: '2024-07-20T09:00:00Z',
  },
  {
    id: 'prod-3',
    name: 'Clear Skin Acne Gel',
    description: 'Targeted treatment gel for active breakouts',
    categoryId: 'cat-3',
    categoryName: 'Acne Treatment',
    image: '/uploads/products/acne-gel.jpg',
    status: 'active',
    details: [
      {
        id: 'd3-1',
        type: 'ingredients',
        title: 'Key Ingredients',
        content: '<ul><li><strong>Salicylic Acid 2%</strong> - Exfoliates pores</li><li><strong>Niacinamide 4%</strong> - Reduces inflammation</li><li><strong>Tea Tree Oil</strong> - Natural antibacterial</li></ul>',
      },
      {
        id: 'd3-2',
        type: 'benefits',
        title: 'Therapeutic Benefits',
        content: '<p>Reduces acne lesions by up to 60% in 4 weeks. Helps prevent new breakouts. Controls excess oil without over-drying.</p>',
      },
      {
        id: 'd3-3',
        type: 'precautions',
        title: 'Precautions & Safety Advice',
        content: '<p>Start with once daily application. May cause initial purging. Always use sunscreen when using this product. Not recommended during pregnancy.</p>',
      },
    ],
    createdAt: '2024-08-01T10:00:00Z',
  },
  {
    id: 'prod-4',
    name: 'Retinol Night Renewal Serum',
    description: 'Anti-aging serum with encapsulated retinol',
    categoryId: 'cat-4',
    categoryName: 'Anti-Aging',
    image: '/uploads/products/retinol-serum.jpg',
    status: 'active',
    details: [
      {
        id: 'd4-1',
        type: 'ingredients',
        title: 'Key Ingredients',
        content: '<ul><li><strong>Encapsulated Retinol 0.5%</strong> - Gentle but effective</li><li><strong>Bakuchiol</strong> - Plant-based retinol alternative</li><li><strong>Peptides</strong> - Collagen support</li></ul>',
      },
      {
        id: 'd4-2',
        type: 'benefits',
        title: 'Therapeutic Benefits',
        content: '<p>Reduces fine lines and wrinkles. Improves skin texture and tone. Stimulates collagen production. Visible results in 8-12 weeks.</p>',
      },
      {
        id: 'd4-3',
        type: 'usage',
        title: 'Recommended Usage Instructions',
        content: '<p>Apply 2-3 drops to clean skin at night. Start with 2-3 times per week, gradually increasing to nightly use. Follow with moisturizer.</p>',
      },
      {
        id: 'd4-4',
        type: 'skincare',
        title: 'Skin Care Advice',
        content: '<p>Always pair with sunscreen during the day. Do not use with other active ingredients like AHAs/BHAs on the same night. Best for ages 25+.</p>',
      },
    ],
    createdAt: '2024-08-10T14:30:00Z',
  },
  {
    id: 'prod-5',
    name: 'Gentle Foam Cleanser',
    description: 'pH-balanced cleanser for all skin types',
    categoryId: 'cat-5',
    categoryName: 'Cleansers',
    image: '/uploads/products/foam-cleanser.jpg',
    status: 'active',
    details: [
      {
        id: 'd5-1',
        type: 'ingredients',
        title: 'Key Ingredients',
        content: '<ul><li><strong>Gluconolactone</strong> - Gentle exfoliation</li><li><strong>Panthenol</strong> - Soothing and hydrating</li><li><strong>Centella Asiatica</strong> - Calming extract</li></ul>',
      },
      {
        id: 'd5-2',
        type: 'usage',
        title: 'Recommended Usage Instructions',
        content: '<p>Wet face with lukewarm water. Pump foam onto hands and massage onto face for 60 seconds. Rinse thoroughly. Use morning and evening.</p>',
      },
    ],
    createdAt: '2024-08-15T09:00:00Z',
  },
  {
    id: 'prod-6',
    name: 'Vitamin C Brightening Serum',
    description: '15% Vitamin C serum for radiant skin',
    categoryId: 'cat-6',
    categoryName: 'Serums & Treatments',
    image: '/uploads/products/vitamin-c.jpg',
    status: 'active',
    details: [
      {
        id: 'd6-1',
        type: 'ingredients',
        title: 'Key Ingredients',
        content: '<ul><li><strong>L-Ascorbic Acid 15%</strong> - Pure Vitamin C</li><li><strong>Vitamin E</strong> - Stabilizes Vitamin C</li><li><strong>Ferulic Acid</strong> - Boosts antioxidant effect</li></ul>',
      },
      {
        id: 'd6-2',
        type: 'benefits',
        title: 'Therapeutic Benefits',
        content: '<p>Brightens skin tone. Fades dark spots and hyperpigmentation. Provides antioxidant protection. Boosts collagen production.</p>',
      },
    ],
    createdAt: '2024-09-01T11:00:00Z',
  },
  {
    id: 'prod-7',
    name: 'Peptide Eye Cream',
    description: 'Advanced eye cream targeting dark circles and fine lines',
    categoryId: 'cat-7',
    categoryName: 'Eye Care',
    image: '/uploads/products/eye-cream.jpg',
    status: 'active',
    details: [
      {
        id: 'd7-1',
        type: 'ingredients',
        title: 'Key Ingredients',
        content: '<ul><li><strong>Matrixyl 3000</strong> - Peptide complex</li><li><strong>Caffeine</strong> - Reduces puffiness</li><li><strong>Vitamin K</strong> - Targets dark circles</li></ul>',
      },
      {
        id: 'd7-2',
        type: 'usage',
        title: 'Recommended Usage Instructions',
        content: '<p>Apply a small amount around the orbital bone using your ring finger. Gently tap until absorbed. Use morning and night.</p>',
      },
    ],
    createdAt: '2024-09-10T10:30:00Z',
  },
  {
    id: 'prod-8',
    name: 'Oil-Free Moisturizer',
    description: 'Lightweight gel moisturizer for oily and combination skin',
    categoryId: 'cat-1',
    categoryName: 'Moisturizers & Hydration',
    image: '/uploads/products/oil-free.jpg',
    status: 'active',
    details: [
      {
        id: 'd8-1',
        type: 'ingredients',
        title: 'Key Ingredients',
        content: '<ul><li><strong>Hyaluronic Acid</strong> - Lightweight hydration</li><li><strong>Niacinamide</strong> - Oil control</li><li><strong>Aloe Vera</strong> - Soothing</li></ul>',
      },
    ],
    createdAt: '2024-09-20T14:00:00Z',
  },
];
