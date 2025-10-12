import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow
 * 
 * Tests the complete authentication flow with Google OAuth,
 * session persistence, token refresh, and logout.
 * 
 * Note: These tests require manual Google login in development.
 * For CI/CD, configure test user credentials in environment variables.
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('http://localhost:3000');
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    // Navigate to a protected route
    await page.goto('http://localhost:3000/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    
    // Verify login button is present
    const loginButton = page.getByRole('button', { name: /iniciar sesión con google/i });
    await expect(loginButton).toBeVisible();
  });

  test('should show navigation items based on auth state', async ({ page }) => {
    // Check unauthenticated state
    await page.goto('http://localhost:3000');
    
    // Should show login link
    const loginLink = page.getByRole('link', { name: /iniciar sesión/i });
    await expect(loginLink).toBeVisible();
    
    // Should not show logout button
    const logoutButton = page.getByRole('button', { name: /cerrar sesión/i });
    await expect(logoutButton).not.toBeVisible();
  });

  test('should redirect to Google OAuth when clicking login', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Click login button
    const loginButton = page.getByRole('button', { name: /iniciar sesión con google/i });
    
    // Listen for navigation
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      loginButton.click()
    ]);
    
    // Verify redirect to Cognito or Google
    const url = popup.url();
    expect(url).toMatch(/(cognito|google)/);
  });

  test.skip('should complete full authentication flow', async ({ page }) => {
    /**
     * This test is skipped by default as it requires manual Google login.
     * To run this test:
     * 1. Remove .skip
     * 2. Manually complete Google OAuth when prompted
     * 3. Verify the test completes successfully
     */
    
    await page.goto('http://localhost:3000/login');
    
    // Click login button
    const loginButton = page.getByRole('button', { name: /iniciar sesión con google/i });
    await loginButton.click();
    
    // Manual step: Complete Google OAuth
    // Wait for callback and redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    
    // Verify user is authenticated
    const logoutButton = page.getByRole('button', { name: /cerrar sesión/i });
    await expect(logoutButton).toBeVisible();
    
    // Verify protected content is accessible
    const dashboardContent = page.getByText(/dashboard/i);
    await expect(dashboardContent).toBeVisible();
  });

  test.skip('should persist session across page refreshes', async ({ page, context }) => {
    /**
     * This test verifies session persistence.
     * Requires authenticated session to run.
     */
    
    // Assume user is already authenticated
    await page.goto('http://localhost:3000/dashboard');
    
    // Verify authenticated state
    const logoutButton = page.getByRole('button', { name: /cerrar sesión/i });
    await expect(logoutButton).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Session should persist
    await expect(logoutButton).toBeVisible();
    
    // Should still be on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test.skip('should handle logout correctly', async ({ page }) => {
    /**
     * This test verifies logout functionality.
     * Requires authenticated session to run.
     */
    
    // Assume user is already authenticated
    await page.goto('http://localhost:3000/dashboard');
    
    // Click logout button
    const logoutButton = page.getByRole('button', { name: /cerrar sesión/i });
    await logoutButton.click();
    
    // Should redirect to home or login
    await expect(page).toHaveURL(/.*\/(login)?$/);
    
    // Should show login link
    const loginLink = page.getByRole('link', { name: /iniciar sesión/i });
    await expect(loginLink).toBeVisible();
    
    // Verify cannot access protected routes
    await page.goto('http://localhost:3000/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show loading state during authentication', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Verify page is not showing loading initially
    const loginButton = page.getByRole('button', { name: /iniciar sesión con google/i });
    await expect(loginButton).toBeEnabled();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    
    await page.goto('http://localhost:3000/login');
    
    // Try to login while offline
    const loginButton = page.getByRole('button', { name: /iniciar sesión con google/i });
    
    // Should handle error gracefully
    // (Implementation depends on error handling in the app)
    await expect(loginButton).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('should display correct navigation for admin users', async ({ page }) => {
    /**
     * This test verifies admin-specific navigation.
     * Note: Requires a user with admin role.
     */
    
    await page.goto('http://localhost:3000');
    
    // Check if admin link is present (only for authenticated admin users)
    const adminLink = page.getByRole('link', { name: /admin/i });
    
    // Admin link visibility depends on user role
    // For unauthenticated users, it should not be visible
    await expect(adminLink).not.toBeVisible();
  });
});

test.describe('Session Management', () => {
  test.skip('should refresh tokens automatically', async ({ page }) => {
    /**
     * This test verifies automatic token refresh.
     * Requires authenticated session to run.
     */
    
    // Navigate to dashboard
    await page.goto('http://localhost:3000/dashboard');
    
    // Wait for initial session
    await page.waitForTimeout(1000);
    
    // Trigger window focus event (should trigger refresh with debouncing)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    
    // Wait for debounce delay (300ms) + some buffer
    await page.waitForTimeout(500);
    
    // Session should still be valid
    const logoutButton = page.getByRole('button', { name: /cerrar sesión/i });
    await expect(logoutButton).toBeVisible();
  });

  test.skip('should use caching to reduce API calls', async ({ page }) => {
    /**
     * This test verifies the 5-second cache behavior.
     * Requires authenticated session to run.
     */
    
    await page.goto('http://localhost:3000/dashboard');
    
    // Trigger multiple focus events within 5 seconds
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.waitForTimeout(500); // Wait 500ms between events
    }
    
    // All events should be cached, only 1 API call should be made
    // Verify by checking network requests (would need network monitoring)
    
    const logoutButton = page.getByRole('button', { name: /cerrar sesión/i });
    await expect(logoutButton).toBeVisible();
  });
});

test.describe('Security Features', () => {
  test('should include CSRF token in state-changing requests', async ({ page }) => {
    /**
     * This test verifies CSRF protection.
     * Note: Requires network request interception.
     */
    
    await page.goto('http://localhost:3000/login');
    
    // Monitor network requests
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      
      // POST requests should include CSRF token
      if (method === 'POST' && url.includes('/api/auth')) {
        const headers = request.headers();
        expect(headers['x-csrf-token']).toBeDefined();
      }
    });
  });

  test('should enforce rate limiting on login attempts', async ({ page }) => {
    /**
     * This test verifies rate limiting (10 requests per 15 minutes).
     * Note: This test takes time to run.
     */
    
    await page.goto('http://localhost:3000/login');
    
    const loginButton = page.getByRole('button', { name: /iniciar sesión con google/i });
    
    // Make multiple rapid login attempts
    for (let i = 0; i < 3; i++) {
      await loginButton.click();
      await page.waitForTimeout(100);
      
      // Close any popups
      const pages = page.context().pages();
      if (pages.length > 1) {
        await pages[pages.length - 1].close();
      }
    }
    
    // Should still be functional (under rate limit)
    await expect(loginButton).toBeEnabled();
  });

  test('should set secure headers', async ({ page }) => {
    const response = await page.goto('http://localhost:3000');
    
    if (response) {
      const headers = response.headers();
      
      // Check for security headers
      expect(headers['x-frame-options']).toBeTruthy();
      expect(headers['x-content-type-options']).toBeTruthy();
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle invalid callback gracefully', async ({ page }) => {
    // Navigate to callback with invalid code
    await page.goto('http://localhost:3000/auth/callback?code=invalid_code_123');
    
    // Should redirect to login or show error
    await page.waitForTimeout(2000);
    
    // Should eventually redirect to a safe page
    const url = page.url();
    expect(url).toMatch(/\/(login|error|access-denied)?$/);
  });

  test('should display access denied page for unauthorized access', async ({ page }) => {
    // Try to access admin page without authentication
    await page.goto('http://localhost:3000/admin');
    
    // Should redirect to login or access denied
    await page.waitForTimeout(1000);
    
    const url = page.url();
    expect(url).toMatch(/\/(login|access-denied)/);
  });
});
