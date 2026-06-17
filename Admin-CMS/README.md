# QV Admin Panel

Enterprise-grade admin control panel for healthcare/wellness platforms. Built with React, TypeScript, Vite, Zustand, TanStack Query/Table, TailwindCSS, and more.

## 🔐 Quick Start - Admin Login

**Email:** `admin@qvhealth.com`  
**Password:** `Admin@123456`

> See [CREDENTIALS.md](CREDENTIALS.md) for additional test accounts and role details.

## Features

- **Dashboard**: Metrics, leaderboards, engagement charts, country stats
- **Users**: User management, filtering, bulk actions, detail modals
- **Organizations**: Manage healthcare organizations
- **Quizzes**: Quiz management, analytics
- **Articles**: Article management
- **Webinars**: Webinar management
- **Stories**: Story management
- **Products**: Product catalog and redemption
- **Settings**: Platform configuration
- **Auth**: Login, password reset, 2FA, session management

## Folder Structure

```
src/
  features/
    [module]/
      components/
      pages/
      store/
      types/
      schemas/ (where relevant)
      index.ts
  shared/
    components/
    constants/
    hooks/
    types/
    utils/
  layouts/
    MainLayout.tsx
    AuthLayout.tsx
  router/
    index.tsx
    ProtectedRoute.tsx
  mock-data/
    [module].ts
  services/
    api/
      client.ts
      queryClient.ts
      index.ts
  App.tsx
  main.tsx
```

## Data Schema Overview

- **User**: id, firstName, lastName, email, phone, country, city, organization, status, points, createdAt, lastActive, etc.
- **Organization**: id, name, country
- **Quiz, Article, Webinar, Story, Product**: Each has its own mock schema in `mock-data/`
- **Auth**: Session, token, user, 2FA, password reset

## How to Run

1. **Install dependencies**:
   ```sh
   npm install
   ```
2. **Start development server**:
   ```sh
   npm run dev
   # See attachments above for file contents.
   ```
3. **Login to Admin Panel**:
   - URL: `http://localhost:3000` (or the port shown in terminal)
   - **Email**: `admin@qvhealth.com`
   - **Password**: `Admin@123456`
   
4. **Build for production**:
   ```sh
   npm run build
   ```
5. **Preview production build**:
   ```sh
   npm run preview
   ```

## Tech Stack

- React 18
- TypeScript 5
- Vite 6
- Zustand (state management)
- TanStack React Query & Table
- TailwindCSS
- Recharts
- react-hook-form + Zod
- Lucide icons
- Tiptap editor
- Axios
- **ExcelJS** (for secure Excel/CSV exports)

## Development Notes

- Strict TypeScript (no `any` types)
- Modular feature folders
- Mock data for all modules
- Custom hooks and shared components
- Responsive, modern UI
- Security best practices (auth, session, 2FA)
- **Secure Excel exports** using ExcelJS (no vulnerabilities)

## Excel Export Utilities

The project includes secure Excel/CSV export functionality using ExcelJS:

```typescript
import { exportToExcel, exportToCSV, readExcelFile } from '@/shared/utils';

// Export to Excel
await exportToExcel({
  filename: 'users-report',
  sheetName: 'Users',
  columns: [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
  ],
  data: users,
});

// Export to CSV
await exportToCSV({
  filename: 'users-export',
  columns: [...],
  data: users,
});

// Read Excel file
const data = await readExcelFile(file);
```

## License

MIT
