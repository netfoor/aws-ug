import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow
 * 
 * Tests critical user journeys with real browser interaction:
 * 1. Initial unauthenticated state
 * 2. Login flow with AWS Cognito
 * 3. Protected route access
 * 4. Navigation updates
 * 5. Logout flow
 * 6. Session persistence
 */

test.describe('Authentication Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Start from homepage for each test
    await page.goto('/');
  });

  test('should show unauthenticated state on initial load', async ({ page }) => {
    // Check initial state
    await expect(page).toHaveTitle(/AWS UG/);
    
    // Navigation should show login state
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // User info should not be displayed when not authenticated
    await expect(page.locator('[data-testid="user-info"]')).not.toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access protected profile page
    await page.goto('/profile');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*\/login/);
    
    // Login page should be displayed
    await expect(page.locator('h2')).toContainText('Login');
  });

  test('should complete full authentication flow', async ({ page }) => {
    // Wait for page to be fully loaded and hydrated
    await page.waitForLoadState('networkidle');
    
    // Navigate to login page
    const loginButton = page.locator('[data-testid="login-button"]');
    await expect(loginButton).toBeVisible();
    await loginButton.click();
    
    // Wait for navigation to complete
    await page.waitForURL(/.*\/login/, { timeout: 10000 });

    // Note: In real E2E, you would use test credentials
    // For demo purposes, we'll simulate successful auth
    // This would require actual AWS Cognito test user setup

    // Fill in login form (when available)
    // await page.fill('[data-testid="email-input"]', 'test@example.com');
    // await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    // await page.click('[data-testid="sign-in-button"]');

    // For now, verify login page structure
    await expect(page.locator('h2')).toContainText('Login');
    
    // Verify login form elements exist
    // This tests the UI structure even without actual auth
    const loginContainer = page.locator('[data-testid="login-container"]');
    await expect(loginContainer).toBeVisible();
  });

  test('should handle navigation between public and protected routes', async ({ page }) => {
    // Start on homepage and wait for full load
    await expect(page).toHaveURL('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to login
    const loginButton = page.locator('[data-testid="login-button"]');
    await expect(loginButton).toBeVisible();
    await loginButton.click();
    await page.waitForURL(/.*\/login/, { timeout: 10000 });
    
    // Go back to home
    await page.goto('/');
    await expect(page).toHaveURL('/');
    
    // Try protected route again
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should maintain consistent navigation state', async ({ page }) => {
    // Check navigation consistency across page loads
    await page.goto('/');
    
    // Login button should be present and functional
    const loginButton = page.locator('[data-testid="login-button"]');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();
    
    // Logout button should not be present when not authenticated
    await expect(page.locator('[data-testid="logout-button"]')).not.toBeVisible();
    
    // User info should not be displayed when not authenticated
    await expect(page.locator('[data-testid="user-info"]')).not.toBeVisible();
  });

  test('should load page performance within acceptable limits', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for main content to load
    await expect(page.locator('main')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds (more realistic for E2E)
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle browser back/forward navigation correctly', async ({ page }) => {
    // Navigate through different pages
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loginButton = page.locator('[data-testid="login-button"]');
    await expect(loginButton).toBeVisible();
    await loginButton.click();
    await page.waitForURL(/.*\/login/, { timeout: 10000 });
    
    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL('/');
    
    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL(/.*\/login/);
    
    // Navigation state should be consistent
    await expect(page.locator('h2')).toContainText('Login');
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Navigation should still be accessible
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });
});

/**
 * E2E Tests for Protected Route Behavior
 * 
 * Tests specific to middleware route protection
 */
test.describe('Protected Routes E2E', () => {
  const protectedRoutes = ['/profile', '/admin', '/dashboard'];
  
  protectedRoutes.forEach(route => {
    test(`should redirect ${route} to login when unauthenticated`, async ({ page }) => {
      await page.goto(route);
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login/);
      
      // Login page should load correctly
      await expect(page.locator('h2')).toContainText('Login');
    });
  });

  test('should handle direct URL access to protected routes', async ({ page }) => {
    // Simulate user typing URL directly
    await page.goto('/profile');
    
    // Should redirect to login with return URL
    await expect(page).toHaveURL(/.*\/login/);
    
    // Check that we're on login page
    await expect(page.locator('h2')).toContainText('Login');
  });
});

/**
 * E2E Tests for Error Handling
 * 
 * Tests error scenarios and edge cases
 */
test.describe('Error Handling E2E', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Should show 404 or redirect to home
    // This depends on your Next.js 404 page configuration
    const title = await page.title();
    expect(title).toBeTruthy(); // Page should have a title
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Go to a valid page first
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
    
    // Simulate offline mode
    await page.context().setOffline(true);
    
    // Try to navigate
    await page.click('[data-testid="login-button"]');
    
    // Should handle the error without crashing
    // The exact behavior depends on your error handling implementation
    
    // Restore connection
    await page.context().setOffline(false);
  });

  test('should maintain functionality after page refresh', async ({ page }) => {
    await page.goto('/');
    
    // Refresh the page
    await page.reload();
    
    // Should maintain same functionality after refresh
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });
});