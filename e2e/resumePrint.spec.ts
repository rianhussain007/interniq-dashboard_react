import { expect, test } from '@playwright/test';

test('resume print output is a readable PDF the local scanner can review', async ({ page }) => {
  await page.goto('/resume-builder', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Full name').fill('Jordan Lee');
  await page.getByLabel('Target role').fill('Product Engineering Intern');
  await page.getByLabel('Email').fill('jordan.lee@example.test');
  await page.getByLabel('Professional summary').fill('Computer science student building accessible web products with React and TypeScript.');
  await page.getByLabel('Skills, separated by commas').fill('React, TypeScript, SQL');

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.resume-editor')).toBeHidden();
  await expect(page.locator('.resume-preview')).toBeVisible();
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');

  await page.emulateMedia({ media: 'screen' });
  await page.goto('/resume-scanner', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Choose resume PDF').setInputFiles({
    name: 'jordan-lee-resume.pdf',
    mimeType: 'application/pdf',
    buffer: pdf,
  });

  await expect(page.getByText(/jordan-lee-resume\.pdf · 1 page/)).toBeVisible();
  await expect(page.getByText('Email address').locator('..').getByLabel('Found')).toBeVisible();
  await expect(page.getByText('Resume text readable').locator('..').getByLabel('Found')).toBeVisible();
});
