/**
 * Web-only Jest project: renders components through react-native-web to real
 * HTML so DOM validity (e.g. no <button> nested in <button>) can be asserted.
 * Run with: npm run test:web
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/web',
  // renderToStaticMarkup needs no DOM; the node environment avoids jsdom's
  // missing TextEncoder/MessageChannel globals under React 19.
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: require('./jest.config.js').transformIgnorePatterns,
  testMatch: ['<rootDir>/src/**/*.web.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
};
