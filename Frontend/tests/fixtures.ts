import { test as base, request as pwRequest, type APIRequestContext, type Page } from '@playwright/test';

export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000/api/v1';

interface ThrowawayUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}

/** Drive the real login form and wait for the post-login dashboard redirect. */
export async function loginAs(page: Page, user: ThrowawayUser, expectedPath: '/dashboard/student' | '/dashboard/teacher') {
  await page.goto('/login');
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`**${expectedPath}`);
}

async function adminToken(api: APIRequestContext): Promise<string> {
  const res = await api.post(`${BACKEND_URL}/auth/login`, {
    data: { email: 'admin@qvhealth.com', password: 'Admin@123456' },
  });
  if (!res.ok()) {
    throw new Error(`Seeded admin login failed (${res.status()}) — is the backend running?`);
  }
  return (await res.json()).access_token;
}

async function createUser(
  api: APIRequestContext,
  token: string,
  role: 'STUDENT' | 'TEACHER',
  label: string
): Promise<ThrowawayUser> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'ThrowawayPass123!';
  const email = `e2e-${label}-${suffix}@apitest.dev`;
  const res = await api.post(`${BACKEND_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      email,
      username: `e2e_${label}_${suffix}`.replace(/-/g, '_'),
      first_name: 'E2E',
      last_name: label.charAt(0).toUpperCase() + label.slice(1),
      role,
      password,
    },
  });
  if (!res.ok()) {
    throw new Error(`Failed to create throwaway ${role}: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return {
    id: body.id,
    email,
    username: body.username,
    firstName: body.first_name,
    lastName: body.last_name,
    password,
  };
}

/**
 * Extended Playwright test with throwaway-account fixtures. Every account
 * created is hard-deleted via the real API in fixture teardown — never
 * touches seeded accounts (admin@qvhealth.com is only used to mint an
 * admin token, never mutated).
 */
export const test = base.extend<{
  api: APIRequestContext;
  throwawayStudent: ThrowawayUser;
  throwawayTeacher: ThrowawayUser;
  /** A throwaway teacher+student pair already linked by a real allocation. */
  allocatedPair: { teacher: ThrowawayUser; student: ThrowawayUser };
}>({
  api: async ({}, use) => {
    const api = await pwRequest.newContext();
    await use(api);
    await api.dispose();
  },

  throwawayStudent: async ({ api }, use) => {
    const token = await adminToken(api);
    const user = await createUser(api, token, 'STUDENT', 'student');
    await use(user);
    await api.delete(`${BACKEND_URL}/users/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  throwawayTeacher: async ({ api }, use) => {
    const token = await adminToken(api);
    const user = await createUser(api, token, 'TEACHER', 'teacher');
    await use(user);
    await api.delete(`${BACKEND_URL}/users/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  allocatedPair: async ({ api }, use) => {
    const token = await adminToken(api);
    const teacher = await createUser(api, token, 'TEACHER', 'teacher');
    const student = await createUser(api, token, 'STUDENT', 'student');

    const allocRes = await api.post(`${BACKEND_URL}/allocations`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        teacher_id: teacher.id, student_id: student.id,
        sessions_per_week: 1, duration: 30,
        schedule: [{ day: 'mon', time: '10:00 AM' }],
      },
    });
    if (!allocRes.ok()) {
      throw new Error(`Failed to create allocation: ${allocRes.status()} ${await allocRes.text()}`);
    }

    await use({ teacher, student });

    // Hard-deleting either user cascades the allocation itself.
    await api.delete(`${BACKEND_URL}/users/${teacher.id}`, { headers: { Authorization: `Bearer ${token}` } });
    await api.delete(`${BACKEND_URL}/users/${student.id}`, { headers: { Authorization: `Bearer ${token}` } });
  },
});

export { expect } from '@playwright/test';
export { adminToken };
