import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InternshipFeed } from './InternshipFeed';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest, type Internship } from '../lib/api';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiRequest: vi.fn() };
});

const internship: Internship = {
  id: 'internship-42',
  title: 'Frontend Engineering Intern',
  company: 'Northstar Labs',
  location: 'Remote, India',
  mode: 'Remote',
  stipend: '₹25,000/month',
  skills: ['React', 'TypeScript'],
  apply_link: 'https://jobs.example.test/frontend-intern',
  source: 'LinkedIn',
};

const mockApiRequest = vi.mocked(apiRequest);
const mockUseAuth = vi.mocked(useAuth);

function SignInDestination() {
  const location = useLocation();
  return <output data-testid="sign-in-location">{JSON.stringify(location.state)}</output>;
}

function renderFeed(path = '/internships') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/internships" element={<InternshipFeed />} />
        <Route path="/login" element={<SignInDestination />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InternshipFeed', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    mockApiRequest.mockImplementation((path) => {
      if (path.startsWith('/api/internships/')) return Promise.resolve([internship]) as never;
      return Promise.resolve([]) as never;
    });
  });

  it('loads public results from the keyword query in the URL and updates the query when searching', async () => {
    const user = userEvent.setup();
    renderFeed('/internships?q=frontend');

    expect(await screen.findByRole('heading', { name: internship.title })).toBeTruthy();
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('q=frontend'),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    const search = screen.getByRole('textbox', { name: 'Keyword Search' });
    await user.clear(search);
    await user.type(search, 'backend');

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('q=backend'),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it('returns guests to their internship search after signing in', async () => {
    const user = userEvent.setup();
    renderFeed('/internships?q=frontend');

    await user.click(await screen.findByRole('button', { name: `Save ${internship.title}` }));
    expect(screen.getByRole('alert').textContent).toContain('Sign in to save internships');
    await user.click(screen.getByRole('link', { name: 'Sign in' }));

    const destination = JSON.parse(screen.getByTestId('sign-in-location').textContent ?? '{}');
    expect(destination.from.pathname).toBe('/internships');
    expect(destination.from.search).toBe('?q=frontend');
  });

  it('saves an internship and tracks its application for a signed-in student', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: 'student-7', name: 'Jordan Lee', email: 'jordan@example.test', authProvider: 'email' },
    } as ReturnType<typeof useAuth>);
    renderFeed();

    const saveButton = await screen.findByRole('button', { name: `Save ${internship.title}` });
    await user.click(saveButton);
    expect((await screen.findByRole('button', { name: `Remove ${internship.title} from saved internships` })).getAttribute('aria-pressed')).toBe('true');

    const trackButton = screen.getByRole('button', { name: `Track application for ${internship.title}` });
    await user.click(trackButton);
    expect((await screen.findByRole('button', { name: `${internship.title} application tracked` })).getAttribute('aria-pressed')).toBe('true');

    expect(mockApiRequest).toHaveBeenCalledWith('/api/saved', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'student-7', internship_id: internship.id }),
    });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/applications', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'student-7', internship_id: internship.id, status: 'applied' }),
    });
  });

  it('switches a signed-in search to semantic retrieval after a usable query is entered', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: 'student-7', name: 'Jordan Lee', email: 'jordan@example.test', authProvider: 'email' },
    } as ReturnType<typeof useAuth>);
    renderFeed();

    await screen.findByRole('heading', { name: internship.title });
    await user.type(screen.getByRole('textbox', { name: 'Keyword Search' }), 'frontend engineer');
    await user.click(screen.getByRole('button', { name: 'Try AI semantic search' }));

    expect(await screen.findByText('Matching by meaning; the text field is locked until you switch back.')).toBeTruthy();
    expect((screen.getByRole('textbox', { name: 'AI Semantic Search' }) as HTMLInputElement).disabled).toBe(true);
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/api/internships/semantic-search'),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});
