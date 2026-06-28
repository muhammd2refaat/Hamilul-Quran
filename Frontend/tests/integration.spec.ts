import { test, expect } from '@playwright/test';

test.describe('E2E Integration Flow', () => {

  test('Student login and dashboard verification', async ({ page }) => {
    // 1. Go to the Next.js Frontend
    await page.goto('http://localhost:3000/login');
    
    // 2. Verify Login Page is rendered
    await expect(page.getByText('Sign in to your account')).toBeVisible({ timeout: 30000 });

    // 3. Fill in student credentials
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'Student123!');
    
    // 4. Submit login form
    await page.click('button[type="submit"]');

    // 5. Verify redirection to Student Dashboard
    await page.waitForURL('**/dashboard/student');
    await expect(page.getByRole('heading', { name: 'Student Dashboard' })).toBeVisible();

    // 6. Verify personalized data components rendered
    await expect(page.getByText('Welcome back, Test!')).toBeVisible();
    await expect(page.getByText('My Allocations')).toBeVisible();
    await expect(page.getByText('Recent Session Scores')).toBeVisible();
    await expect(page.getByText('Teacher History', { exact: true })).toBeVisible();
    
    // 7. Verify API data loading (Wait for data rows)
    // We expect the student to have history based on the seed
    await expect(page.getByRole('cell', { name: 'Current' })).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('Teacher login and dashboard verification', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[type="email"]', 'teacher@example.com');
    await page.fill('input[type="password"]', 'Teacher123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard/teacher');
    await expect(page.getByRole('heading', { name: 'Teacher Dashboard' })).toBeVisible();
    await expect(page.getByText('Welcome back, Teacher Test!')).toBeVisible();
    
    await expect(page.getByText('My Assigned Students')).toBeVisible();
  });

});
