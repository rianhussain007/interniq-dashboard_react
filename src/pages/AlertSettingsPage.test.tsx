import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AlertSettingsPage from './AlertSettingsPage';
import { apiRequest } from '../lib/api';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockApiRequest = vi.mocked(apiRequest);
const defaultPreferences = {
  match_alerts: true,
  deadline_alerts: true,
  community_alerts: true,
  email_alerts: false,
  frequency_minutes: 60,
  email_available: false,
  email_transport: 'disabled' as const,
};

describe('AlertSettingsPage', () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockImplementation((path, options) => {
      if (path === '/api/notifications/preferences' && !options) return Promise.resolve(defaultPreferences) as never;
      if (path === '/api/notifications/preferences' && options?.method === 'PUT') {
        return Promise.resolve({
          ...JSON.parse(String(options.body)),
          email_available: false,
          email_transport: 'disabled',
        }) as never;
      }
      return Promise.resolve({}) as never;
    });
  });

  it('loads, saves, and confirms account alert preferences', async () => {
    const user = userEvent.setup();
    const settingsUpdated = vi.fn();
    window.addEventListener('interniq:alerts-settings-updated', settingsUpdated);
    render(<MemoryRouter><AlertSettingsPage /></MemoryRouter>);

    const matches = await screen.findByLabelText(/New internship matches/);
    await user.click(matches);
    await user.click(screen.getByRole('radio', { name: /Every 15 minutes/ }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Saved')).toBeTruthy();
    expect(mockApiRequest).toHaveBeenCalledWith('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        match_alerts: false,
        deadline_alerts: true,
        community_alerts: true,
        email_alerts: false,
        frequency_minutes: 15,
      }),
    });
    expect(settingsUpdated).toHaveBeenCalledOnce();
    window.removeEventListener('interniq:alerts-settings-updated', settingsUpdated);
  });
});
