const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  // Transform ESM modules from node_modules
  transformIgnorePatterns: [
    '/node_modules/(?!(@clerk)/)',
  ],
  // Only collect coverage from files we're testing
  collectCoverageFrom: [
    'src/types/auction.ts',
    'src/lib/subscription.ts',
    'src/hooks/useGuestScans.ts',
  ],
};

module.exports = createJestConfig(customJestConfig);
