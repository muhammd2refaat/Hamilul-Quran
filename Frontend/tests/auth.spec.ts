import { test, expect } from './fixtures';

test.describe('Login', () => {
  test('valid credentials redirect a student to the student dashboard', async ({ page, throwawayStudent }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    await page.fill('#email', throwawayStudent.email);
    await page.fill('#password', throwawayStudent.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard/student');
    await expect(page.getByText(`Welcome back, ${throwawayStudent.firstName}`)).toBeVisible();
  });

  test('valid credentials redirect a teacher to the teacher dashboard', async ({ page, throwawayTeacher }) => {
    await page.goto('/login');
    await page.fill('#email', throwawayTeacher.email);
    await page.fill('#password', throwawayTeacher.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard/teacher');
    await expect(page.getByText(`Welcome back, ${throwawayTeacher.firstName}`)).toBeVisible();
  });

  test('invalid password shows an error and stays on the login page', async ({ page, throwawayStudent }) => {
    await page.goto('/login');
    await page.fill('#email', throwawayStudent.email);
    await page.fill('#password', 'TheWrongPassword!');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/failed to login|check your credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('unknown email shows an error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'nobody-at-all@apitest.dev');
    await page.fill('#password', 'whatever123');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/failed to login|check your credentials/i)).toBeVisible();
  });
});
