# Chaster Testing Guide

This document outlines the testing strategy and procedures for the Chaster project. We maintain three levels of testing: Unit/Route Tests, Integration Tests, and Stress Tests.

## 1. Test Environment Isolation

To ensure reliability, tests run in isolated environments:

*   **Unit/Route Tests**: Run against a dedicated, ephemeral SQLite database (`prisma/data/test.db`) generated automatically during the test run. They do NOT touch your development database.
*   **Integration Tests**: Run against a running development server (usually `localhost:3000`). They may share the development database but use specific test tokens to avoid interference.

## 2. Unit & Route Tests (Automated)

These tests cover individual functions and API route handlers in isolation. They are fast and mocked where necessary.

### Prerequisites
*   Node.js & npm installed.
*   No running server required (tests spin up their own environment).

### Running Tests
```bash
# Run all unit/route tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

### Key Features
*   **Automatic DB Setup**: A clean `test.db` is created for every run.
*   **Internal Tokens**: Tests use a `UNIT_TEST_TOKEN` automatically injected into the test database.
*   **Mocked Services**: External services like `tlock-js` are mocked to allow testing time-dependent logic (e.g., encryption/decryption) without waiting.

## 3. Integration Tests (Live Server)

These tests verify the end-to-end flow by making actual HTTP requests to a running instance of the application.

### Prerequisites
1.  **Start the Dev Server**:
    ```bash
    npm run dev
    ```
2.  **Create a Test Token** (One-time setup):
    You need a valid API token in your development database.
    ```bash
    npm run token create test_integration_user
    # Copy the token string output (e.g., tok_abc123...)
    ```

### Running Tests
Set the `TEST_TOKEN` environment variable and run the integration suite:

```bash
# Replace with your actual token
export TEST_TOKEN=tok_your_generated_token_here

# Run integration tests
npm run test:integration
```

> **Note**: These tests are skipped by default in `npm test` to prevent accidental failures if the server isn't running.

## 4. Stress Testing

For performance and concurrency testing, please refer to [STRESS_TESTING.md](./STRESS_TESTING.md).

## Troubleshooting

### "401 Unauthorized" in Tests
*   **Unit Tests**: Should not happen as `setup.ts` handles tokens. If it does, check `tests/test-db-setup.ts`.
*   **Integration Tests**: Ensure you have exported a valid `TEST_TOKEN` that exists in the server's database (`prisma/data/dev.db` by default).

### Database Locking
If you see `SQLITE_BUSY` errors, ensure no other heavy processes (like a manual `prisma studio`) are holding a write lock on the test database file.
