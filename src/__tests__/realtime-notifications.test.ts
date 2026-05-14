import { describe, expect, it, vi } from 'vitest';

const notifyMock = vi.fn();
const useAuthMock = vi.fn();
const getUserGroupIdMock = vi.fn();
const getNotificationPreferencesMock = vi.fn();
const getPermissionStateMock = vi.fn();

let changeHandler:
  | ((payload: { new: { user_id: string; event_type: string; event_data: Record<string, unknown> } }) => void)
  | null = null;

vi.mock('@/lib/notifications', () => ({
  notify: notifyMock,
  getPermissionState: getPermissionStateMock,
}));

vi.mock('@/lib/auth', () => ({
  useAuth: useAuthMock,
}));

vi.mock('@/lib/store', () => ({
  getUserGroupId: getUserGroupIdMock,
  getNotificationPreferences: getNotificationPreferencesMock,
}));

vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    channel: () => ({
      on: (
        _event: string,
        _config: Record<string, unknown>,
        cb: (payload: { new: { user_id: string; event_type: string; event_data: Record<string, unknown> } }) => void
      ) => {
        changeHandler = cb;
        return {
          subscribe: () => ({ topic: 'test' }),
        };
      },
    }),
    removeChannel: vi.fn(),
  }),
}));

describe('RealtimeNotifications', () => {
  it('falls back when boss_defeated event_data omits boss fields', async () => {
    getPermissionStateMock.mockReturnValue('granted');
    useAuthMock.mockReturnValue({
      user: { id: 'viewer-1' },
      profile: { id: 'viewer-1' },
    });
    getUserGroupIdMock.mockResolvedValue('group-1');
    getNotificationPreferencesMock.mockResolvedValue({
      teammate_session: true,
      boss_defeated: true,
      boss_low_hp: true,
      badge_unlocked: true,
    });

    const React = await import('react');
    const { render, waitFor } = await import('@testing-library/react');
    const RealtimeNotifications = (await import('@/components/RealtimeNotifications')).default;

    render(React.createElement(RealtimeNotifications));

    await waitFor(() => {
      expect(changeHandler).toBeTypeOf('function');
    });

    changeHandler?.({
      new: {
        user_id: 'teammate-1',
        event_type: 'boss_defeated',
        event_data: {
          total_attackers: 3,
          // Repro source: producer in store/boss.ts does not send boss_emoji
          // or boss_name for this event.
        },
      },
    });

    await waitFor(() => {
      expect(notifyMock).toHaveBeenCalledTimes(1);
    });

    expect(notifyMock.mock.calls[0][2]).toBe('🏆 Bossen besegrad!');
  });
});
