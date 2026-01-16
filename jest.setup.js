import '@testing-library/jest-dom';

// Mock @clerk/nextjs before any imports
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(() => ({
    isSignedIn: false,
    isLoaded: true,
    userId: null,
  })),
  auth: jest.fn(() => ({ userId: null })),
  ClerkProvider: ({ children }) => children,
}));

// Mock environment variables for Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock localStorage for guest scan tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Reset mocks between tests
beforeEach(() => {
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});
