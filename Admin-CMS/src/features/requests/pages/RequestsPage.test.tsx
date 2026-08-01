import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n'; // real i18next instance, real EN strings
import { RequestsPage } from './RequestsPage';
import { useRequestsStore } from '../store/requestsStore';
import { get, patch } from '@/services/api/client';

vi.mock('@/services/api/client', () => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

const mockedGet = vi.mocked(get);
const mockedPatch = vi.mocked(patch);

const rawRequests = [
  {
    id: 'req-1',
    type: 'reschedule',
    from_name: 'Fatima Al-Rashid',
    from_role: 'student',
    details: 'Work schedule changed, need to move sessions.',
    current_day: 'tue',
    current_time: '10:00 AM',
    requested_day: 'thu',
    requested_time: '04:00 PM',
    requested_plan: null,
    requested_teacher: null,
    created_at: '2026-07-01T00:00:00Z',
    status: 'pending',
    admin_note: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  useRequestsStore.setState({ requests: [], unreadCount: 0, isLoading: false, error: null });
});

describe('RequestsPage', () => {
  it('fetches and renders requests from the backend on mount', async () => {
    mockedGet.mockResolvedValueOnce(rawRequests);

    render(<RequestsPage />);

    expect(mockedGet).toHaveBeenCalledWith('/requests');

    await waitFor(() => {
      expect(screen.getByText('Fatima Al-Rashid')).toBeInTheDocument();
    });

    // Stats row: total should reflect the one pending request.
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('shows the empty state when there are no requests', async () => {
    mockedGet.mockResolvedValueOnce([]);

    render(<RequestsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no requests match/i)).toBeInTheDocument();
    });
  });

  it('approving a request calls the API and updates the badge locally', async () => {
    mockedGet.mockResolvedValueOnce(rawRequests);
    mockedPatch.mockResolvedValueOnce({});
    const user = userEvent.setup();

    render(<RequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Fatima Al-Rashid')).toBeInTheDocument();
    });

    // Expand the card to reveal the action buttons.
    const card = screen.getByText('Fatima Al-Rashid').closest('div.bg-white') as HTMLElement;
    const cardButtons = within(card!).getAllByRole('button');
    await user.click(cardButtons[cardButtons.length - 1]);

    const approveButton = await screen.findByRole('button', { name: /approve/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith('/requests/req-1/status', {
        status: 'approved',
        admin_note: 'Approved by admin.',
      });
    });
  });
});
