# E2E Tests - Authentication System

Modern End-to-End tests for the AWS UG authentication system using Playwright.

## Overview

These E2E tests validate the complete authentication flow including:
- Google OAuth integration
- Session persistence
- Token refresh with optimizations (debouncing, caching)
- Logout functionality
- Security features (CSRF, rate limiting)
- Error handling

## Test Structure

```
__tests__/e2e/
├── auth-flow.spec.ts       # Main authentication flow tests
└── README.md               # This file
```

## Running Tests

### Prerequisites

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright browsers** (if not already installed):
   ```bash
   npx playwright install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

### Run All E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npx playwright test __tests__/e2e --headed

# Run specific test file
npx playwright test __tests__/e2e/auth-flow.spec.ts

# Run in debug mode
npx playwright test __tests__/e2e --debug
```

### Run Specific Test Suites

```bash
# Run only authentication flow tests
npx playwright test --grep "Authentication Flow"

# Run only session management tests
npx playwright test --grep "Session Management"

# Run only security feature tests
npx playwright test --grep "Security Features"
```

## Test Categories

### 1. Authentication Flow

Tests the complete Google OAuth flow:
- ✅ Display login page for unauthenticated users
- ✅ Show navigation items based on auth state
- ✅ Redirect to Google OAuth when clicking login
- ⏭️ Complete full authentication flow (requires manual login)
- ⏭️ Persist session across page refreshes
- ⏭️ Handle logout correctly

**Note**: Tests marked with `.skip` require manual interaction or authenticated session.

### 2. Session Management

Tests token refresh and caching optimizations:
- ⏭️ Refresh tokens automatically on window focus
- ⏭️ Use caching to reduce API calls (5-second TTL)
- ⏭️ Debounce rapid refresh requests (300ms delay)

### 3. Security Features

Tests security measures:
- ✅ Include CSRF token in state-changing requests
- ✅ Enforce rate limiting on login attempts
- ✅ Set secure headers (X-Frame-Options, etc.)

### 4. Error Handling

Tests error scenarios:
- ✅ Handle invalid callback gracefully
- ✅ Display access denied page for unauthorized access
- ✅ Handle network errors gracefully

## Skipped Tests

Some tests are skipped by default because they require:
1. **Manual Google OAuth login** - Cannot be automated without test credentials
2. **Authenticated session** - Require a valid logged-in user

### Running Skipped Tests

To run skipped tests:

1. **Remove `.skip`** from the test:
   ```typescript
   test.skip('should complete full authentication flow', ...) 
   // Change to:
   test('should complete full authentication flow', ...)
   ```

2. **Run the test**:
   ```bash
   npx playwright test --grep "should complete full authentication flow"
   ```

3. **Manually complete Google OAuth** when the browser opens

4. **Verify the test passes**

## CI/CD Integration

For automated CI/CD pipelines:

### Option 1: Mock Google OAuth

Replace Google OAuth with a mock provider for testing:

```typescript
// In test setup
await page.route('**/oauth2/authorize**', (route) => {
  // Mock Google OAuth response
  route.fulfill({
    status: 302,
    headers: {
      'Location': 'http://localhost:3000/auth/callback?code=test_code'
    }
  });
});
```

### Option 2: Use Test Credentials

Configure test user credentials:

```bash
# .env.test
TEST_GOOGLE_EMAIL=test@example.com
TEST_GOOGLE_PASSWORD=test_password
```

Then automate login in tests:

```typescript
// Automate Google login
await page.fill('input[type="email"]', process.env.TEST_GOOGLE_EMAIL);
await page.click('button[type="submit"]');
await page.fill('input[type="password"]', process.env.TEST_GOOGLE_PASSWORD);
await page.click('button[type="submit"]');
```

### Option 3: Use Playwright Authentication State

Save authenticated state and reuse:

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  // Perform login
  await page.goto('http://localhost:3000/login');
  // ... complete OAuth flow
  
  // Save authenticated state
  await page.context().storageState({ path: 'auth.json' });
});

// In tests
test.use({ storageState: 'auth.json' });
```

## Test Configuration

Tests use configuration from `playwright.config.ts`:

```typescript
{
  testDir: './__tests__/e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
}
```

## Debugging

### Visual Debugging

```bash
# Run with headed browser
npx playwright test __tests__/e2e --headed

# Debug mode (step through tests)
npx playwright test __tests__/e2e --debug

# Show browser and slow down execution
npx playwright test __tests__/e2e --headed --slow-mo=1000
```

### Trace Viewer

```bash
# Run with trace
npx playwright test __tests__/e2e --trace=on

# Open trace viewer
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots: `test-results/*/test-failed-1.png`
- Videos: `test-results/*/video.webm`

## Performance Testing

### Validate Optimizations

Tests include validation of performance optimizations:

1. **Debouncing (300ms)**:
   ```typescript
   // Trigger rapid focus events
   for (let i = 0; i < 5; i++) {
     await page.dispatchEvent('window', 'focus');
     await page.waitForTimeout(100);
   }
   // Only 1 API call should be made after 300ms
   ```

2. **Caching (5s TTL)**:
   ```typescript
   // Trigger refresh
   await page.dispatchEvent('window', 'focus');
   await page.waitForTimeout(500);
   
   // Trigger again within 5 seconds
   await page.dispatchEvent('window', 'focus');
   // Should use cached session
   ```

3. **Request Deduplication**:
   ```typescript
   // Trigger multiple simultaneous refreshes
   await Promise.all([
     page.dispatchEvent('window', 'focus'),
     page.dispatchEvent('window', 'focus'),
     page.dispatchEvent('window', 'focus')
   ]);
   // Only 1 request should be in flight
   ```

## Network Monitoring

Monitor API calls during tests:

```typescript
// Track API calls
const apiCalls: string[] = [];

page.on('request', (request) => {
  const url = request.url();
  if (url.includes('/api/auth')) {
    apiCalls.push(url);
  }
});

// After test
console.log('API calls made:', apiCalls.length);
expect(apiCalls.length).toBeLessThan(5); // Verify caching
```

## Best Practices

1. **Use `data-testid` attributes** for reliable selectors:
   ```typescript
   await page.getByTestId('login-button').click();
   ```

2. **Wait for navigation** before assertions:
   ```typescript
   await page.waitForURL('**/dashboard');
   ```

3. **Clean up after tests**:
   ```typescript
   test.afterEach(async ({ page }) => {
     // Clear storage
     await page.context().clearCookies();
     await page.evaluate(() => localStorage.clear());
   });
   ```

4. **Use fixtures for common setup**:
   ```typescript
   const test = base.extend<{ authenticatedPage: Page }>({
     authenticatedPage: async ({ page }, use) => {
       // Setup authenticated page
       await page.goto('/login');
       // ... perform login
       await use(page);
     }
   });
   ```

## Troubleshooting

### Test Timeouts

If tests timeout:
1. Increase timeout in `playwright.config.ts`
2. Check network speed
3. Verify dev server is running

### Flaky Tests

If tests are flaky:
1. Add explicit waits: `await page.waitForSelector()`
2. Use `waitForLoadState('networkidle')`
3. Increase retries in config

### Authentication Failures

If OAuth fails:
1. Verify Google OAuth credentials
2. Check callback URLs are configured
3. Ensure Cognito User Pool is active

## Contributing

When adding new E2E tests:

1. **Follow naming convention**: `feature-name.spec.ts`
2. **Use descriptive test names**: `should do something specific`
3. **Group related tests**: Use `test.describe()` blocks
4. **Add comments**: Explain complex test logic
5. **Mark manual tests**: Use `.skip` for tests requiring interaction

## Future Enhancements

- [ ] Add tests for MFA flow
- [ ] Test biometric authentication (WebAuthn)
- [ ] Add performance benchmarks
- [ ] Test multi-device sessions
- [ ] Add accessibility tests (axe-core)
- [ ] Test internationalization (i18n)

---

**Last Updated**: 2024 (Phase 5)  
**Test Framework**: Playwright  
**Coverage**: Authentication, Security, Performance
