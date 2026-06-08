/**
 * E2E smoke tests.
 *
 * Verifies that the key routes load without errors and basic
 * interactive elements are present. Run with: npx playwright test
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Datacenter Builder/);
    await expect(page.locator('h1')).toContainText('Build a data center');
    await expect(page.getByRole('link', { name: /Start building/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Demo builds/i })).toBeVisible();
  });

  test('demos page loads', async ({ page }) => {
    await page.goto('/demos');
    await expect(page.locator('h1')).toContainText('Demo Builds');
    const cards = page.locator('.panel').filter({ hasText: 'Load demo' });
    await expect(cards).toHaveCount(3);
  });

  test('help page loads', async ({ page }) => {
    await page.goto('/help');
    await expect(page.locator('h1')).toContainText('Help');
    await expect(page.getByRole('heading', { name: /Builder controls/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Frequently asked questions/i })).toBeVisible();
  });

  test('credits page loads', async ({ page }) => {
    await page.goto('/credits');
    await expect(page.locator('h1')).toContainText('Credits');
    await expect(page.getByRole('heading', { name: /Framework/i })).toBeVisible();
  });

  test('verify page loads with empty state', async ({ page }) => {
    await page.goto('/verify');
    await expect(page.locator('h1')).toContainText('Verify certificate');
    await expect(page.locator('input')).toBeVisible();
  });

  test('scenarios page loads', async ({ page }) => {
    await page.goto('/scenarios');
    await expect(page.locator('h1')).toContainText(/scenario/i);
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1')).toContainText(/about/i);
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toContainText(/pricing/i);
  });

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1')).toContainText(/contact/i);
  });

  test('onboarding overlay shows on first visit', async ({ page }) => {
    // Clear localStorage to simulate first visit
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // The onboarding overlay should appear
    const dialog = page.getByRole('dialog', { name: /welcome tour/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click through all steps
    for (let i = 0; i < 5; i++) {
      const nextBtn = page.getByRole('button', { name: /next/i });
      const startBtn = page.getByRole('link', { name: /start building/i });
      if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click();
        break;
      }
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
      }
    }

    // After dismissing, the overlay should not appear on reload
    await page.reload();
    await expect(page.getByRole('dialog', { name: /welcome tour/i })).not.toBeVisible({
      timeout: 3000,
    });
  });

  test('builder page loads with free scenario', async ({ page }) => {
    await page.goto('/build/free');
    // Wait for the builder to initialize
    await page.waitForTimeout(2000);
    // The mode bar should be visible
    await expect(page.locator('[class*="ModeBar"], header').first()).toBeVisible();
  });
});
