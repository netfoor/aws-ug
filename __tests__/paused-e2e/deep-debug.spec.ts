import { test, expect } from '@playwright/test';

test.describe('Deep Login Navigation Debug', () => {
  test('investigate login button navigation step by step', async ({ page }) => {
    console.log('🔍 Starting deep investigation...');
    
    // Enable console logs from the browser
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
    
    // Go to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    console.log('✅ Homepage loaded:', page.url());
    
    // Wait for React hydration to complete
    await page.waitForTimeout(2000);
    console.log('⏱️ Hydration wait completed');
    
    // Check if login button exists
    const loginButton = page.locator('[data-testid="login-button"]');
    const count = await loginButton.count();
    console.log('🔢 Login button count:', count);
    
    if (count > 0) {
      // Get button properties
      const href = await loginButton.getAttribute('href');
      const text = await loginButton.textContent();
      const isVisible = await loginButton.isVisible();
      const isEnabled = await loginButton.isEnabled();
      
      console.log('🔗 Button href:', href);
      console.log('📝 Button text:', text);
      console.log('👁️ Button visible:', isVisible);
      console.log('✅ Button enabled:', isEnabled);
      
      // Check if button is actually clickable
      const boundingBox = await loginButton.boundingBox();
      console.log('📦 Button bounding box:', boundingBox);
      
      // Try hover first
      await loginButton.hover();
      console.log('🖱️ Hovered over button');
      
      // Wait a bit
      await page.waitForTimeout(500);
      
      // Check current URL before click
      const urlBeforeClick = page.url();
      console.log('📍 URL before click:', urlBeforeClick);
      
      // Try clicking with force option
      await loginButton.click({ force: true });
      console.log('🖱️ Clicked button (forced)');
      
      // Wait for navigation
      await page.waitForTimeout(2000);
      
      // Check URL after click
      const urlAfterClick = page.url();
      console.log('📍 URL after click:', urlAfterClick);
      
      // Check if navigation happened
      if (urlAfterClick.includes('/login')) {
        console.log('✅ Navigation successful!');
      } else {
        console.log('❌ Navigation failed!');
        
        // Try direct navigation to see if it works
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        console.log('🔄 Direct navigation to /login:', page.url());
        
        // Check if login page loads
        const hasLoginH2 = await page.locator('h2:has-text("Login")').count();
        console.log('📄 Login page h2 count:', hasLoginH2);
      }
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'deep-debug-login.png', fullPage: true });
  });
  
  test('test different navigation methods', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('🧪 Testing different navigation methods...');
    
    // Method 1: Regular click
    console.log('Method 1: Regular click');
    const loginButton1 = page.locator('[data-testid="login-button"]');
    await loginButton1.click();
    await page.waitForTimeout(1000);
    console.log('After regular click URL:', page.url());
    
    // Reset
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Method 2: Keyboard navigation
    console.log('Method 2: Keyboard Enter');
    const loginButton2 = page.locator('[data-testid="login-button"]');
    await loginButton2.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    console.log('After keyboard Enter URL:', page.url());
    
    // Reset
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Method 3: JavaScript navigation
    console.log('Method 3: JavaScript evaluation');
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="login-button"]');
      if (button) {
        button.click();
      }
    });
    await page.waitForTimeout(1000);
    console.log('After JavaScript click URL:', page.url());
  });
});