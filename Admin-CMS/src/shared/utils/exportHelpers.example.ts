/**
 * Example: How to use Excel export utilities in your components
 */

import { exportToExcel, exportToCSV } from '@/shared/utils';
import type { User } from '@/mock-data/users';

/**
 * Export users to Excel
 */
export async function exportUsersToExcel(users: User[]): Promise<void> {
  const data = users.map(user => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    country: user.country,
    city: user.city,
    organization: user.organization,
    status: user.status,
    points: user.points,
    articlesViewed: user.articlesViewed,
    webinarsAttended: user.webinarsAttended,
    quizzesTaken: user.quizzesTaken,
    createdAt: user.createdAt,
  }));

  await exportToExcel({
    filename: `users-export-${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Users',
    columns: [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Organization', key: 'organization', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Points', key: 'points', width: 12 },
      { header: 'Articles Viewed', key: 'articlesViewed', width: 15 },
      { header: 'Webinars Attended', key: 'webinarsAttended', width: 18 },
      { header: 'Quizzes Taken', key: 'quizzesTaken', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ],
    data,
    author: 'QV Admin Panel',
    title: 'Users Report',
  });
}

/**
 * Export users to CSV
 */
export async function exportUsersToCSV(users: User[]): Promise<void> {
  const data = users.map(user => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    country: user.country,
    city: user.city,
    organization: user.organization,
    status: user.status,
    points: user.points,
  }));

  await exportToCSV({
    filename: `users-export-${new Date().toISOString().split('T')[0]}`,
    columns: [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Organization', key: 'organization', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Points', key: 'points', width: 12 },
    ],
    data,
  });
}

/**
 * Usage in a React component:
 * 
 * import { exportUsersToExcel, exportUsersToCSV } from './exportHelpers';
 * 
 * function UsersPage() {
 *   const users = useUsersStore(state => state.users);
 *   
 *   const handleExportExcel = async () => {
 *     await exportUsersToExcel(users);
 *   };
 *   
 *   const handleExportCSV = async () => {
 *     await exportUsersToCSV(users);
 *   };
 *   
 *   return (
 *     <div>
 *       <Button onClick={handleExportExcel}>Export to Excel</Button>
 *       <Button onClick={handleExportCSV}>Export to CSV</Button>
 *     </div>
 *   );
 * }
 */
