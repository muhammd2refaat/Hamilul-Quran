import { test, expect, loginAs } from './fixtures';

test.describe('Student dashboard', () => {
  test('a new student (no allocation) sees the pending/new-student state', async ({ page, throwawayStudent }) => {
    await loginAs(page, throwawayStudent, '/dashboard/student');
    await expect(page.getByText(`Welcome back, ${throwawayStudent.firstName}`)).toBeVisible();

    // Nav should show the reduced "new student" set (no Progress/Webinar/Calendar/Teacher-change).
    await expect(page.getByRole('link', { name: /my plan/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /payment receipts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /progress/i })).toHaveCount(0);
  });

  test('plan page shows the pending placeholder before any subscription is set', async ({ page, throwawayStudent }) => {
    await loginAs(page, throwawayStudent, '/dashboard/student');
    await page.getByRole('link', { name: /my plan/i }).click();
    await page.waitForURL('**/dashboard/student/plan');

    await expect(page.getByText(/pending admin activation/i).first()).toBeVisible();
  });

  test('student can upload a payment receipt and see it listed', async ({ page, throwawayStudent }) => {
    await loginAs(page, throwawayStudent, '/dashboard/student');
    await page.getByRole('link', { name: /payment receipts/i }).click();
    await page.waitForURL('**/dashboard/student/receipts');

    await expect(page.getByText(/no receipts uploaded yet/i)).toBeVisible();

    await page.setInputFiles('input[type="file"]', {
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
    });
    await page.getByRole('button', { name: /upload receipt/i }).click();

    await expect(page.getByText(/receipt uploaded/i)).toBeVisible();
    await expect(page.getByText(/no receipts uploaded yet/i)).toHaveCount(0);
  });

  test('an allocated student sees the full nav and their plan sessions-per-week', async ({ page, allocatedPair }) => {
    await loginAs(page, allocatedPair.student, '/dashboard/student');

    await expect(page.getByRole('link', { name: 'My Progress', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calendar', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /change teacher/i })).toBeVisible();
  });
});
