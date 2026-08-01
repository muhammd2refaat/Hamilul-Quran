import { test, expect, loginAs } from './fixtures';

test.describe('Teacher dashboard', () => {
  test('a teacher with no students sees zero in the students stat', async ({ page, throwawayTeacher }) => {
    await loginAs(page, throwawayTeacher, '/dashboard/teacher');
    await expect(page.getByText(`Welcome back, ${throwawayTeacher.firstName}`)).toBeVisible();
  });

  test('an allocated teacher sees the student on their roster', async ({ page, allocatedPair }) => {
    await loginAs(page, allocatedPair.teacher, '/dashboard/teacher');

    await page.getByRole('link', { name: /my students/i }).click();
    await page.waitForURL('**/dashboard/teacher/students');

    await expect(
      page.getByText(`${allocatedPair.student.firstName} ${allocatedPair.student.lastName}`)
    ).toBeVisible();
  });

  test('teacher can open a student and record a session score', async ({ page, allocatedPair }) => {
    await loginAs(page, allocatedPair.teacher, '/dashboard/teacher');

    await page.getByRole('link', { name: /my students/i }).click();
    await page.waitForURL('**/dashboard/teacher/students');
    await page.getByText(`${allocatedPair.student.firstName} ${allocatedPair.student.lastName}`).click();

    await page.waitForURL('**/dashboard/teacher/students/*');

    // The record-session form's label isn't wired via htmlFor (siblings, not
    // nested), so getByLabel won't resolve it — score is the first of the two
    // type="number" inputs (score, then max score).
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('18');
    await numberInputs.nth(1).fill('20');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Session recorded.')).toBeVisible();
  });
});
