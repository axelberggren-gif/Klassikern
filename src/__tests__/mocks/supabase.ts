import { vi } from 'vitest';

/**
 * Mock Supabase client for unit testing.
 *
 * Usage in tests:
 *   vi.mock('@/lib/supabase', () => ({ createClient: () => mockSupabase }));
 *
 * Then configure responses:
 *   mockSupabase._mockResponse('profiles', { data: [...], error: null });
 */

type MockResponse = { data: unknown; error: unknown };

const responses = new Map<string, MockResponse>();

function createChain(table: string) {
  const defaultResponse = responses.get(table) ?? { data: null, error: null };

  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(defaultResponse),
    maybeSingle: vi.fn().mockResolvedValue(defaultResponse),
    then: vi.fn((resolve: (value: MockResponse) => void) => resolve(defaultResponse)),
  };

  return chain;
}

export const mockSupabase = {
  from: vi.fn((table: string) => createChain(table)),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  _mockResponse(table: string, response: MockResponse) {
    responses.set(table, response);
  },
  _reset() {
    responses.clear();
    vi.clearAllMocks();
  },
};
