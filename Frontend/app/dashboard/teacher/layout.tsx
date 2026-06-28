import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teacher Dashboard',
  description: 'Manage your students and Quran recitation sessions.',
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
