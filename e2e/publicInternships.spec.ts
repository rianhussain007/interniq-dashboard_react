import { expect, test } from '@playwright/test';

const internship = {
  id: 'e2e-internship-1',
  title: 'Frontend Engineering Intern',
  company: 'Northstar Labs',
  location: 'Remote, India',
  mode: 'Remote',
  stipend: '₹25,000/month',
  skills: ['React', 'TypeScript'],
  apply_link: 'https://jobs.example.test/frontend-intern',
  source: 'LinkedIn',
  description: 'Build accessible product experiences with the frontend team.',
};

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => console.error('Browser page error:', error));
  page.on('requestfailed', (request) => console.error('Browser request failed:', request.url(), request.failure()?.errorText));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error('Browser console error:', message.text());
  });
  await page.route(/\/api\/internships(?:\/search)?(?:\?.*)?$/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([internship]),
  }));
});

test('guest home opens public internships and preserves the return path when signing in', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/internships$/);
  await expect(page.getByRole('heading', { name: 'Find Your Next Internship' })).toBeVisible();
  await expect(page.getByRole('heading', { name: internship.title })).toBeVisible();
  await expect(page.getByRole('link', { name: `Open application link for ${internship.title}` }))
    .toHaveAttribute('href', internship.apply_link);

  await page.getByRole('button', { name: `Save ${internship.title}` }).click();
  await expect(page.getByRole('alert')).toContainText('Sign in to save internships');
  await page.getByRole('alert').getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('internship feed remains usable on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/internships?q=frontend', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: internship.title })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Keyword Search' })).toBeVisible();
  await expect(page.getByRole('button', { name: `Save ${internship.title}` })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('an authenticated student can open the protected resume builder and edit a draft', async ({ page }) => {
  await page.addInitScript(() => {
    const encode = (value: Record<string, unknown>) => btoa(JSON.stringify(value))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const expiresAt = Math.floor(Date.now() / 1000) + 3_600;
    const user = {
      id: 'e2e-student-1',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'student@example.test',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: 'Jordan Lee' },
      created_at: new Date().toISOString(),
    };
    const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
      aud: 'authenticated',
      exp: expiresAt,
      sub: user.id,
      role: 'authenticated',
    })}.test-signature`;

    localStorage.setItem('sb-e2e-project-auth-token', JSON.stringify({
      access_token: accessToken,
      refresh_token: 'e2e-refresh-token',
      token_type: 'bearer',
      expires_in: 3_600,
      expires_at: expiresAt,
      user,
    }));
  });

  await page.goto('/resume-builder', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await page.getByLabel('Full name').fill('Jordan Lee');
  await expect(page.getByRole('heading', { name: 'Jordan Lee' })).toBeVisible();
});
