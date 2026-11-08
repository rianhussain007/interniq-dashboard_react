import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileOnboarding } from './ProfileOnboarding';
import { apiRequest } from '../lib/api';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiRequest: vi.fn() };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1', name: 'Jordan Lee', email: 'jordan@example.test' } }),
}));

const mockApiRequest = vi.mocked(apiRequest);

const renderCard = () =>
  render(
    <MemoryRouter>
      <ProfileOnboarding />
    </MemoryRouter>,
  );

describe('ProfileOnboarding', () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it('asks for skills first when the profile is empty', async () => {
    mockApiRequest.mockResolvedValue({ skills: [], target_role: '' } as never);
    renderCard();

    const addSkills = await screen.findByRole('link', { name: /Add your skills/ });
    expect(addSkills.getAttribute('href')).toBe('/profile-setup');
    expect(screen.getByRole('link', { name: /Turn on alerts/ }).getAttribute('href')).toBe('/settings/alerts');
    expect(screen.getByText('Tell InternIQ what you can do')).toBeTruthy();
  });

  it('links straight to ranked matches once skills exist', async () => {
    mockApiRequest.mockResolvedValue({ skills: ['React', 'SQL'], target_role: 'Frontend Intern' } as never);
    renderCard();

    expect(await screen.findByText(/Matching is on for 2 skills/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /See my matches/ }).getAttribute('href')).toBe(
      '/internships?q=Frontend%20Intern&match=1',
    );
  });

  it('stays out of the way when the profile cannot be loaded', async () => {
    mockApiRequest.mockRejectedValue(new Error('offline'));
    const { container } = renderCard();

    await waitFor(() => expect(container.querySelector('[role="status"]')).toBeNull());
    expect(container.querySelector('section')).toBeNull();
  });
});
