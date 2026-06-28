# Hamilul-Quran Admin Panel

This is the central Admin CMS for the Hamilul-Quran platform. Built with React, TypeScript, Vite, Zustand, and TailwindCSS.

## 🔐 Quick Start - Admin Login

**Email:** `admin@qvhealth.com` *(Update in seed data if changed)*
**Password:** `Admin@123456`

## Features

- **Users**: Complete CRUD for Students and Teachers, with live backend integration. Includes nested backend data for **Complaints**, **Teacher History**, and **Session Scores**.
- **Auth**: Live backend integration for JWT-based login and session persistence.
- **Dashboard**: Metrics and charts (Currently using mock data).
- **Complaints**: Platform-wide complaints board (Currently using mock data).
- **Plans & Subscriptions**: Subscription management (Currently using mock data).
- **Allocations**: Teacher/Student allocations (Currently using mock data).

## Current Integration Status

The Admin CMS is currently in a hybrid state:
- **Fully Integrated (Live Backend)**: `auth`, `users` (Students, Teachers, and their sub-tables).
- **Mock Data (Frontend only)**: `dashboard`, `complaints` (general page), `plans`, `subscriptions`, `admins`, `allocations`, `requests`.

## How to Run

1. **Install dependencies**:
   ```sh
   yarn install
   ```
2. **Start development server**:
   ```sh
   yarn run dev
   ```
3. **Build for production**:
   ```sh
   yarn run build
   ```

## Tech Stack
- React 18
- TypeScript 5
- Vite 6
- Zustand (state management)
- TailwindCSS
- Lucide icons
