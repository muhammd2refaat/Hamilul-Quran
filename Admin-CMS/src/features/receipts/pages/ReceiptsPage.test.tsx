import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n';
import { ReceiptsPage } from './ReceiptsPage';
import { useReceiptsStore } from '../store/receiptsStore';
import { get } from '@/services/api/client';

vi.mock('@/services/api/client', () => ({
  get: vi.fn(),
}));

const mockedGet = vi.mocked(get);

const rawReceipt = {
  id: 'rec-1',
  student_id: 'student-1',
  student_name: 'Ahmed Yusuf',
  original_filename: 'payment.png',
  content_type: 'image/png',
  amount: '50',
  note: 'Monthly payment',
  created_at: '2026-07-01T00:00:00Z',
  expires_at: '2026-07-31T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  useReceiptsStore.setState({ receipts: [], isLoading: false, error: null });
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
});

describe('ReceiptsPage', () => {
  it('fetches and renders receipts on mount', async () => {
    mockedGet.mockResolvedValueOnce([rawReceipt]);

    render(<ReceiptsPage />);

    expect(mockedGet).toHaveBeenCalledWith('/receipts');
    await waitFor(() => {
      expect(screen.getByText('Ahmed Yusuf')).toBeInTheDocument();
    });
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('shows the empty state when there are no receipts', async () => {
    mockedGet.mockResolvedValueOnce([]);

    render(<ReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no receipts found/i)).toBeInTheDocument();
    });
  });

  it('clicking View fetches the file as an authenticated blob and displays it', async () => {
    mockedGet.mockResolvedValueOnce([rawReceipt]); // list
    const fakeBlob = new Blob(['fake-image'], { type: 'image/png' });
    mockedGet.mockResolvedValueOnce(fakeBlob as any); // file blob
    const user = userEvent.setup();

    render(<ReceiptsPage />);

    await waitFor(() => expect(screen.getByText('Ahmed Yusuf')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /view/i }));

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/receipts/rec-1/file', { responseType: 'blob' });
    });

    const img = await screen.findByRole('img', { name: 'payment.png' });
    expect(img).toHaveAttribute('src', 'blob:mock-url');
    expect(screen.getByText('"Monthly payment"')).toBeInTheDocument();
  });
});
