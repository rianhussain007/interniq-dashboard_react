import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import InterviewPrepPage from './InterviewPrepPage';
import NetworkingPage from './NetworkingPage';
import ResumeBuilderPage from './ResumeBuilderPage';
import ResumeScannerPage from './ResumeScannerPage';
import ResumeTemplatesPage from './ResumeTemplatesPage';
import SalaryGuidePage from './SalaryGuidePage';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
}));

describe('InternIQ career tools', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists a resume draft locally and updates the live preview', async () => {
    const user = userEvent.setup();
    render(<AuthProvider><MemoryRouter><ResumeBuilderPage /></MemoryRouter></AuthProvider>);

    await user.type(screen.getByLabelText('Full name'), 'Jordan Lee');
    expect(await screen.findByRole('heading', { name: 'Jordan Lee' })).toBeTruthy();
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('interniq.resumeDraft.v1') ?? '{}').name).toBe('Jordan Lee');
    });
  });

  it('carries a selected resume template into the builder', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/resume-templates']}>
          <Routes>
            <Route path="/resume-templates" element={<ResumeTemplatesPage />} />
            <Route path="/resume-builder" element={<ResumeBuilderPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await user.click(screen.getAllByRole('link', { name: /Use this template/ })[2]);
    expect(screen.getByText(/Compact template/)).toBeTruthy();
  });

  it('checks an invalid resume file without starting PDF parsing', async () => {
    render(<AuthProvider><MemoryRouter><ResumeScannerPage /></MemoryRouter></AuthProvider>);
    const file = new File(['not a pdf'], 'resume.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Choose resume PDF'), { target: { files: [file] } });

    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Choose a PDF file');
  });

  it('guides a role-specific interview practice session', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><InterviewPrepPage /></MemoryRouter>);

    await user.selectOptions(screen.getByLabelText('Practice area'), 'Design & product');
    await user.click(screen.getByRole('button', { name: /How do you learn what a user needs/ }));
    expect(screen.getByRole('heading', { name: 'How do you learn what a user needs?' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Show answer prompts' }));
    expect(screen.getByText('Name the user and the context')).toBeTruthy();
  });

  it('personalizes an outreach draft and copies the reviewed text', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<MemoryRouter><NetworkingPage /></MemoryRouter>);

    await user.type(screen.getByLabelText('Your name'), 'Jordan');
    await user.type(screen.getByLabelText('Their name'), 'Alex');
    await user.type(screen.getByLabelText('Your context'), 'a design student');
    await user.type(screen.getByLabelText('A specific reason you are reaching out'), 'your accessibility project');
    await user.click(screen.getByRole('button', { name: 'Copy draft' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Hi Alex, I'm Jordan, a design student."));
    expect(screen.getByRole('status').textContent).toContain('Copied');
  });

  it('compares offer totals using the entered internship hours and term', () => {
    render(<MemoryRouter><SalaryGuidePage /></MemoryRouter>);

    const comparison = screen.getByText(/Offer B is higher by/).textContent ?? '';
    expect(comparison).toContain('Offer B is higher by');
    expect(comparison).toContain('960');
  });
});
