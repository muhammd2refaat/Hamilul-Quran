import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSubscriptionsStore } from './subscriptionsStore';
import { get, put } from '@/services/api/client';

vi.mock('@/services/api/client', () => ({
  get: vi.fn(),
  put: vi.fn(),
}));

const mockedGet = vi.mocked(get);
const mockedPut = vi.mocked(put);

const rawSubscription = {
  id: 'sub-1',
  student_id: 'student-1',
  student_name: 'Fatima Al-Rashid',
  plan_name: '2 sessions/week — Hifz',
  status: 'active',
  start_date: '2026-07-01',
  notes: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  useSubscriptionsStore.setState({ subscriptions: [], isLoading: false, error: null });
});

describe('subscriptionsStore.fetchSubscriptions', () => {
  it('maps snake_case fields to the UI shape', async () => {
    mockedGet.mockResolvedValueOnce([rawSubscription]);

    await useSubscriptionsStore.getState().fetchSubscriptions();

    const state = useSubscriptionsStore.getState();
    expect(state.subscriptions[0]).toMatchObject({
      id: 'sub-1',
      studentId: 'student-1',
      studentName: 'Fatima Al-Rashid',
      planName: '2 sessions/week — Hifz',
      status: 'active',
    });
    expect(state.isLoading).toBe(false);
  });

  it('sets an error message on failure', async () => {
    mockedGet.mockRejectedValueOnce({ response: { data: { detail: 'boom' } } });

    await useSubscriptionsStore.getState().fetchSubscriptions();

    expect(useSubscriptionsStore.getState().error).toBe('boom');
  });
});

describe('subscriptionsStore.upsertSubscription', () => {
  it('PUTs then refetches the full list so student_name stays in sync', async () => {
    mockedPut.mockResolvedValueOnce({ id: 'sub-1', plan_name: 'New Plan' });
    mockedGet.mockResolvedValueOnce([{ ...rawSubscription, plan_name: 'New Plan' }]);

    await useSubscriptionsStore.getState().upsertSubscription('student-1', {
      plan_name: 'New Plan',
      status: 'active',
      start_date: '2026-07-01',
    });

    expect(mockedPut).toHaveBeenCalledWith('/subscriptions/student-1', {
      plan_name: 'New Plan',
      status: 'active',
      start_date: '2026-07-01',
    });
    expect(mockedGet).toHaveBeenCalledWith('/subscriptions');
    expect(useSubscriptionsStore.getState().subscriptions[0].planName).toBe('New Plan');
  });

  it('propagates the error when the PUT fails, without refetching', async () => {
    mockedPut.mockRejectedValueOnce(new Error('validation failed'));

    await expect(
      useSubscriptionsStore.getState().upsertSubscription('student-1', {
        plan_name: 'p', status: 'active', start_date: '2026-07-01',
      })
    ).rejects.toThrow('validation failed');

    expect(mockedGet).not.toHaveBeenCalled();
  });
});
