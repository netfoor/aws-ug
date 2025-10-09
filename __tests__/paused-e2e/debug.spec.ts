import { test, expect } from '@playwright/test';

test.describe('Debug Tests', () => {
  test('debug profile redirect', async ({ page }) => {
    console.log('Starting debug test...');
    
    // Go to profile page
    await page.goto('/profile');
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    
    // Get current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if there's an h1
    const h1Elements = await page.locator('h1').all();
    console.log('Number of h1 elements:', h1Elements.length);
    
    // Get all h1 text content
    for (let i = 0; i < h1Elements.length; i++) {
      const text = await h1Elements[i].textContent();
      console.log(`H1 ${i} text:`, text);
    }
    
    // Get all text on page
    const bodyText = await page.locator('body').textContent();
    console.log('Body contains Login?', bodyText?.includes('Login'));
    console.log('Body contains Iniciar Sesión?', bodyText?.includes('Iniciar Sesión'));
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-profile-redirect.png' });
  });
  
  test('debug login button click', async ({ page }) => {
    console.log('Testing login button click...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('Home page URL:', page.url());
    
    // Check if login button exists
    const loginButton = page.locator('[data-testid="login-button"]');
    const loginButtonExists = await loginButton.count();
    console.log('Login button exists:', loginButtonExists > 0);
    
    if (loginButtonExists > 0) {
      const buttonText = await loginButton.textContent();
      console.log('Button text:', buttonText);
      
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      
      console.log('After click URL:', page.url());
      
      const h1Elements = await page.locator('h1').all();
      console.log('Number of h1 elements after click:', h1Elements.length);
      
      for (let i = 0; i < h1Elements.length; i++) {
        const text = await h1Elements[i].textContent();
        console.log(`H1 ${i} text after click:`, text);
      }
    }
    
    await page.screenshot({ path: 'debug-login-click.png' });
  });
});