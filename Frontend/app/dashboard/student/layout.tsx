import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Dashboard',
  description: 'Manage your Quran memorization sessions and track your progress.',
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
