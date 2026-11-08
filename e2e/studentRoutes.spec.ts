import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routeChecks = [
  { path: '/', heading: 'Pick up where you left off', screenshot: 'dashboard' },
  { path: '/internships', heading: 'Find Your Next Internship', screenshot: 'internships' },
  { path: '/saved', heading: 'Saved Internships', screenshot: 'saved' },
  { path: '/applications', heading: 'Applications', screenshot: 'applications' },
  { path: '/profile-setup', heading: 'Career profile', screenshot: 'profile' },
  { path: '/resume-builder', heading: 'Resume builder', screenshot: 'resume-builder' },
  { path: '/resume-scanner', heading: 'Resume scanner', screenshot: 'resume-scanner' },
  { path: '/resume-analyzer', heading: 'Resume scanner', screenshot: 'resume-analyzer' },
  { path: '/resume-templates', heading: 'Resume templates', screenshot: 'resume-templates' },
  { path: '/github-tracker', heading: 'GitHub Profile Tracker', screenshot: 'github-tracker' },
  { path: '/branding-tips', heading: 'Personal Branding Tips', screenshot: 'branding-tips' },
  { path: '/interview-prep', heading: 'Interview preparation', screenshot: 'interview-prep' },
  { path: '/networking', heading: 'Networking message studio', screenshot: 'networking' },
  { path: '/salary-guide', heading: 'Compensation comparison', screenshot: 'salary-guide' },
  { path: '/community', heading: 'Community & events', screenshot: 'community' },
  { path: '/settings/alerts', heading: 'Alert settings', screenshot: 'alert-settings' },
] as const;

const sampleInternship = {
  id: 'route-review-internship',
  title: 'Product Engineering Intern',
  company: 'Northstar Labs',
  location: 'Remote, India',
  mode: 'Remote',
  stipend: '₹25,000/month',
  skills: ['React', 'TypeScript'],
  apply_link: 'https://jobs.example.test/product-engineering-intern',
  source: 'Greenhouse',
  description: 'Build accessible product experiences with a small engineering team.',
};

test('student routes render at desktop and mobile sizes without horizontal overflow', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const pageErrors: string[] = [];
  const routeAccessibilityIssues: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const email = `route-review-${Date.now()}@example.test`;
  await page.route(/\/api\/internships(?:\/search)?(?:\?.*)?$/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([sampleInternship]),
  }));
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Full name').fill('Route Review Student');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill('InternIQ-route-review-2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Pick up where you left off' })).toBeVisible();

  for (const route of routeChecks) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    const heading = page.getByRole('heading', { name: route.heading, exact: true }).first();
    await expect(heading).toBeVisible();

    const accessibilityIssues = await page.evaluate(() => {
      const visible = (element: Element) => {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden'
          && element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"]');
      };
      const accessibleName = (element: Element) => {
        const labelledBy = element.getAttribute('aria-labelledby')?.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
        const labels = 'labels' in element
          ? Array.from((element as HTMLInputElement).labels ?? []).map((label) => label.textContent ?? '').join(' ')
          : '';
        const imageText = Array.from(element.querySelectorAll('img[alt]')).map((image) => image.getAttribute('alt') ?? '').join(' ');
        const controlValue = element instanceof HTMLInputElement ? element.value : '';
        return [element.getAttribute('aria-label'), labelledBy, labels, element.textContent, imageText, element.getAttribute('title'), controlValue]
          .find((value) => value?.trim())?.trim() ?? '';
      };
      const unlabeledControls = Array.from(document.querySelectorAll('button, a[href], input:not([type="hidden"]), textarea, select, [role="button"]'))
        .filter(visible)
        .filter((element) => !accessibleName(element))
        .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`);
      const imagesWithoutAlt = Array.from(document.querySelectorAll('img'))
        .filter(visible)
        .filter((image) => !image.hasAttribute('alt'))
        .map((image) => image.getAttribute('src') ?? 'image');
      const visibleHeadings = Array.from(document.querySelectorAll('h1')).filter(visible).length;
      const mainLandmarks = Array.from(document.querySelectorAll('main')).filter(visible).length;
      return { unlabeledControls, imagesWithoutAlt, visibleHeadings, mainLandmarks };
    });
    if (accessibilityIssues.unlabeledControls.length) {
      routeAccessibilityIssues.push(`${route.path}: unnamed controls: ${accessibilityIssues.unlabeledControls.join(', ')}`);
    }
    if (accessibilityIssues.imagesWithoutAlt.length) {
      routeAccessibilityIssues.push(`${route.path}: images missing alt: ${accessibilityIssues.imagesWithoutAlt.join(', ')}`);
    }
    if (accessibilityIssues.visibleHeadings !== 1) {
      routeAccessibilityIssues.push(`${route.path}: ${accessibilityIssues.visibleHeadings} visible h1 headings`);
    }
    if (accessibilityIssues.mainLandmarks !== 1) {
      routeAccessibilityIssues.push(`${route.path}: ${accessibilityIssues.mainLandmarks} main landmarks`);
    }
    // Let route entrance transitions settle before checking contrast: Axe
    // evaluates the temporarily composited colors while animated opacity is < 1.
    await page.waitForTimeout(650);
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
      .analyze();
    for (const violation of axeResults.violations) {
      const affectedNodes = violation.nodes.slice(0, 4).map((node) => {
        const target = node.target.join(' ');
        const summary = node.failureSummary?.replace(/\s+/g, ' ').slice(0, 160) ?? '';
        return `${target}${summary ? `: ${summary}` : ''}`;
      });
      routeAccessibilityIssues.push(
        `${route.path}: ${violation.impact ?? 'unknown'} ${violation.id} (${violation.nodes.length} node(s)) ${affectedNodes.join(' | ')}`,
      );
    }

    if (route.path === '/internships') {
      // Let the debounced feed request finish so the visual review covers a
      // populated internship card rather than its loading placeholder.
      await expect(page.getByText(sampleInternship.title, { exact: true })).toBeVisible();
    }

    if (process.env.INTERNIQ_VISUAL_REVIEW === '1') {
      await page.screenshot({
        path: testInfo.outputPath(`${route.screenshot}-desktop.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }

    await page.setViewportSize({ width: 375, height: 812 });
    if (process.env.INTERNIQ_VISUAL_REVIEW === '1') {
      await page.screenshot({
        path: testInfo.outputPath(`${route.screenshot}-mobile.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }
    const overflowElements = await page.evaluate(() => Array.from(document.body.querySelectorAll('*'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { element, right: rect.right, left: rect.left };
      })
      .filter(({ element, right, left }) => {
        const style = getComputedStyle(element);
        return style.position !== 'fixed' && (right > window.innerWidth + 1 || left < -1);
      })
      .slice(0, 8)
      .map(({ element, right, left }) => ({
        tag: element.tagName,
        className: typeof element.className === 'string' ? element.className : '',
        left: Math.round(left),
        right: Math.round(right),
      })));
    expect(overflowElements, `${route.path} should fit a 375px viewport`).toEqual([]);
    if (route.path === '/') {
      const [guide, profileLink] = await Promise.all([
        page.getByRole('button', { name: 'Open InternIQ guide' }).boundingBox(),
        page.getByRole('link', { name: /Add your skills/ }).boundingBox(),
      ]);
      expect(guide).not.toBeNull();
      expect(profileLink).not.toBeNull();
      expect(
        guide!.x < profileLink!.x + profileLink!.width
          && guide!.x + guide!.width > profileLink!.x
          && guide!.y < profileLink!.y + profileLink!.height
          && guide!.y + guide!.height > profileLink!.y,
        'the floating guide must not cover the dashboard profile action',
      ).toBe(false);
    }
  }

  expect(routeAccessibilityIssues, 'student routes should have labeled controls and valid page landmarks').toEqual([]);
  expect(pageErrors, 'student routes should not throw browser errors').toEqual([]);
});
