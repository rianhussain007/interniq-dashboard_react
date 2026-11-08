import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardWorkspace } from './DashboardWorkspace';

describe('DashboardWorkspace', () => {
  it('puts every requested career workflow one click from the dashboard', () => {
    render(<MemoryRouter><DashboardWorkspace /></MemoryRouter>);

    const routes: Record<string, string> = {
      'Browse internships': '/internships',
      'Saved roles': '/saved',
      Applications: '/applications',
      'Career profile': '/profile-setup',
      'Resume builder': '/resume-builder',
      'Resume scanner': '/resume-scanner',
      'Resume analyzer': '/resume-analyzer',
      'Resume templates': '/resume-templates',
      'GitHub tracker': '/github-tracker',
      'Branding tips': '/branding-tips',
      'Interview prep': '/interview-prep',
      'Networking studio': '/networking',
      'Salary guide': '/salary-guide',
      'Community & events': '/community',
      'Alert settings': '/settings/alerts',
    };

    for (const [label, path] of Object.entries(routes)) {
      expect(screen.getByRole('link', { name: new RegExp(label) }).getAttribute('href')).toBe(path);
    }
  });
});
