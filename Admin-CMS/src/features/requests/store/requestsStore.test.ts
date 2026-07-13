import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRequestsStore } from './requestsStore';
import { get, patch } from '@/services/api/client';

vi.mock('@/services/api/client', () => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

const mockedGet = vi.mocked(get);
const mockedPatch = vi.mocked(patch);

const rawRequest = {
  id: 'req-1',
  type: 'reschedule',
  from_name: 'Fatima Al-Rashid',
  from_role: 'student',
  details: 'Work schedule changed',
  current_day: 'tue',
  current_time: '10:00 AM',
  requested_day: 'thu',
  requested_time: '04:00 PM',
  requested_plan: null,
  requested_teacher: null,
  created_at: '2026-07-01T00:00:00Z',
  status: 'pending',
  admin_note: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  useRequestsStore.setState({ requests: [], unreadCount: 0, isLoading: false, error: null });
});

describe('requestsStore.fetchRequests', () => {
  it('maps backend snake_case fields to the UI shape and computes unreadCount', async () => {
    mockedGet.mockResolvedValueOnce([rawRequest]);

    await useRequestsStore.getState().fetchRequests();

    const state = useRequestsStore.getState();
    expect(mockedGet).toHaveBeenCalledWith('/requests');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]).toMatchObject({
      id: 'req-1',
      fromName: 'Fatima Al-Rashid',
      fromRole: 'student',
      currentDay: 'tue',
      requestedDay: 'thu',
      status: 'pending',
    });
    expect(state.unreadCount).toBe(1); // one pending request
  });

  it('sets error state and stops loading when the request fails', async () => {
    mockedGet.mockRejectedValueOnce(new Error('network down'));

    await useRequestsStore.getState().fetchRequests();

    const state = useRequestsStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('network down');
    expect(state.requests).toEqual([]);
  });

  it('does not count non-pending requests toward unreadCount', async () => {
    mockedGet.mockResolvedValueOnce([
      { ...rawRequest, id: 'req-1', status: 'pending' },
      { ...rawRequest, id: 'req-2', status: 'approved' },
      { ...rawRequest, id: 'req-3', status: 'rejected' },
    ]);

    await useRequestsStore.getState().fetchRequests();

    expect(useRequestsStore.getState().unreadCount).toBe(1);
  });
});

describe('requestsStore.updateStatus', () => {
  it('PATCHes the backend and updates the matching request locally', async () => {
    useRequestsStore.setState({
      requests: [
        { id: 'req-1', type: 'other', fromName: 'A', fromRole: 'student', details: 'd', date: 'x', status: 'pending' },
      ] as any,
      unreadCount: 1,
    });
    mockedPatch.mockResolvedValueOnce({});

    await useRequestsStore.getState().updateStatus('req-1', 'approved', 'Approved by admin.');

    expect(mockedPatch).toHaveBeenCalledWith('/requests/req-1/status', {
      status: 'approved',
      admin_note: 'Approved by admin.',
    });
    const state = useRequestsStore.getState();
    expect(state.requests[0].status).toBe('approved');
    expect(state.requests[0].adminNote).toBe('Approved by admin.');
    expect(state.unreadCount).toBe(0);
  });

  it('re-throws and leaves state unchanged when the PATCH fails', async () => {
    const original = [
      { id: 'req-1', type: 'other', fromName: 'A', fromRole: 'student', details: 'd', date: 'x', status: 'pending' },
    ];
    useRequestsStore.setState({ requests: original as any, unreadCount: 1 });
    mockedPatch.mockRejectedValueOnce(new Error('server error'));

    await expect(
      useRequestsStore.getState().updateStatus('req-1', 'approved')
    ).rejects.toThrow('server error');

    expect(useRequestsStore.getState().requests).toEqual(original);
  });
});
