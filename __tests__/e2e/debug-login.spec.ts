import { test, expect } from '@playwright/test';

test.describe('Debug Login Button Navigation', () => {
  test('debug login button click behavior', async ({ page }) => {
    console.log('🔍 Starting login button debug...');
    
    await page.goto('/');
    console.log('✅ Navigated to homepage');
    
    // Check if login button exists
    const loginButton = page.locator('[data-testid="login-button"]');
    await expect(loginButton).toBeVisible();
    console.log('✅ Login button is visible');
    
    // Check button properties
    const buttonText = await loginButton.textContent();
    console.log(`📝 Button text: "${buttonText}"`);
    
    const buttonHref = await loginButton.getAttribute('href');
    console.log(`🔗 Button href: "${buttonHref}"`);
    
    const buttonTag = await loginButton.evaluate(el => el.tagName);
    console.log(`🏷️ Button tag: "${buttonTag}"`);
    
    // Log current URL before click
    console.log(`📍 URL before click: ${page.url()}`);
    
    // Try to click and log what happens
    console.log('🖱️ Clicking login button...');
    await loginButton.click();
    
    // Wait a moment and check URL
    await page.waitForTimeout(2000);
    console.log(`📍 URL after click: ${page.url()}`);
    
    // Check if navigation occurred
    if (page.url().includes('/login')) {
      console.log('✅ Navigation to /login successful');
    } else {
      console.log('❌ Navigation to /login failed');
      
      // Try direct navigation to test if route exists
      await page.goto('/login');
      console.log(`📍 URL after direct navigation: ${page.url()}`);
      
      if (page.url().includes('/login')) {
        console.log('✅ Direct navigation to /login works');
        console.log('❌ Problem is with the button click, not the route');
      } else {
        console.log('❌ /login route might not exist or redirect');
      }
    }
  });

  test('test navigation component in different states', async ({ page }) => {
    await page.goto('/');
    
    // Check what navigation elements are present
    const navigation = page.locator('nav');
    await expect(navigation).toBeVisible();
    
    // Count all links in navigation
    const allLinks = navigation.locator('a');
    const linkCount = await allLinks.count();
    console.log(`🔢 Found ${linkCount} links in navigation`);
    
    // List all link hrefs
    for (let i = 0; i < linkCount; i++) {
      const link = allLinks.nth(i);
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      console.log(`🔗 Link ${i}: href="${href}" text="${text?.trim()}"`);
    }
    
    // Specifically check for login-related elements
    const loginElements = await page.locator('text=Iniciar').count();
    console.log(`🔍 Found ${loginElements} elements with "Iniciar" text`);
    
    const loginTestId = await page.locator('[data-testid="login-button"]').count();
    console.log(`🔍 Found ${loginTestId} elements with login-button test-id`);
  });
});