import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Hero } from './Hero';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockApiRequest = vi.mocked(apiRequest);
const mockUseAuth = vi.mocked(useAuth);

describe('Hero mentor assistant', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    mockUseAuth.mockReturnValue({
      user: { id: 'student-7', name: 'Jordan Lee', email: 'jordan@example.test', authProvider: 'email' },
    } as ReturnType<typeof useAuth>);
    mockApiRequest.mockImplementation((path) => {
      if (path === '/api/checklist') return Promise.resolve({ completed_task_ids: [] }) as never;
      if (path === '/api/dashboard/summary') {
        return Promise.resolve({ applications_tracked: 2, interviewing: 1, offers: 0, saved_internships: 3 }) as never;
      }
      if (path === '/api/mentor-chat') {
        return Promise.resolve({
          answer: 'Your React project is relevant experience for this frontend internship.',
          sources: [{ title: 'Frontend internship', source_id: 'internship-42', source_type: 'internship', similarity: 0.91 }],
          next_steps: ['Tailor your resume to the role'],
          suggested_internships: [{
            internship_id: 'internship-42',
            title: 'Frontend Engineering Intern',
            company: 'Northstar Labs',
            apply_link: 'https://jobs.example.test/frontend-intern',
            reason: 'Matches your React experience.',
          }],
        }) as never;
      }
      return Promise.resolve([]) as never;
    });
  });

  it('sends the signed-in student message and renders the structured, sourced response', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Hero /></MemoryRouter>);

    const input = screen.getByPlaceholderText('Ask anything about your career...');
    await user.type(input, 'Which frontend roles fit my React experience?');
    await user.click(screen.getByRole('button', { name: 'Send mentor message' }));

    expect(await screen.findByText('Your React project is relevant experience for this frontend internship.')).toBeTruthy();
    expect(screen.getByText('Next steps')).toBeTruthy();
    expect(screen.getByText('Tailor your resume to the role')).toBeTruthy();
    expect(screen.getByText('internship')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Frontend Engineering Intern/ }).getAttribute('href')).toBe('https://jobs.example.test/frontend-intern');

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('/api/mentor-chat', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Which frontend roles fit my React experience?'),
      }));
    });
    const request = mockApiRequest.mock.calls.find(([path]) => path === '/api/mentor-chat');
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      user_id: 'student-7',
      user_profile: { name: 'Jordan Lee', email: 'jordan@example.test', authProvider: 'email' },
      history: [{ role: 'assistant', content: 'Hi Jordan Lee, ask me about roles, skill gaps, or your application plan.' }],
    });
  });
});
