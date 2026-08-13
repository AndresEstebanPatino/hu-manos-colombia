/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testEnvironment: "node",
  testMatch: ["**/src/features/reencuentro/**/*.test.ts?(x)"],
  collectCoverageFrom: [
    "src/features/reencuentro/**/*.{ts,tsx}",
    "!src/features/reencuentro/**/*.test.{ts,tsx}",
    "!src/features/reencuentro/**/index.ts",
  ],
};
