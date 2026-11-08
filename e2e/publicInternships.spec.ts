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
  source: 'Greenhouse',
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
  await page.goto('/', { waitUntil: 'commit' });

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

test('guests can open the browser-local career tools without signing in', async ({ page }) => {
  const tools = [
    ['/resume-builder', 'Resume builder'],
    ['/resume-scanner', 'Resume scanner'],
    ['/resume-templates', 'Resume templates'],
    ['/interview-prep', 'Interview preparation'],
    ['/networking', 'Networking message studio'],
    ['/salary-guide', 'Compensation comparison'],
  ] as const;

  for (const [path, title] of tools) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to internships' })).toHaveAttribute('href', '/internships');
  }

  await page.goto('/resume-builder', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await page.getByLabel('Full name').fill('Jordan Lee');
  await expect(page.getByRole('heading', { name: 'Jordan Lee' })).toBeVisible();
});

test('local email accounts can register, restore, sign in, and persist a career profile', async ({ page }) => {
  const email = `student-${Date.now()}@example.test`;
  const password = 'InternIQ-e2e-password-2026';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Full name').fill('Jordan Demo Student');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Jordan Demo Student' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pick up where you left off' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Alert settings/ })).toBeVisible();

  await page.getByRole('link', { name: /Alert settings/ }).click();
  await expect(page).toHaveURL(/\/settings\/alerts$/);
  await expect(page.getByRole('heading', { name: 'Alert settings' })).toBeVisible();
  await page.getByRole('radio', { name: /Every 15 minutes while open/ }).check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toContainText('Saved');

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Jordan Demo Student' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Jordan Demo Student' })).toBeVisible();

  await page.getByRole('button', { name: 'Jordan Demo Student' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Email or password is incorrect');

  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/profile-setup', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Career profile' })).toBeVisible();
  await page.getByLabel('Target internship role').fill('Data analyst intern');
  await page.getByLabel('Preferred location').fill('Bengaluru');
  await page.getByLabel('Skills').fill('Python, SQL');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Profile saved');

  await page.reload();
  await expect(page.getByLabel('Target internship role')).toHaveValue('Data analyst intern');
  await expect(page.getByLabel('Skills')).toHaveValue('Python, SQL');
});
