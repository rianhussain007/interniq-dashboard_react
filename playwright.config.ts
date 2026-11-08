import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

const platformPythonPath = (folder: string) => path.resolve(folder, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const projectVenvPython = platformPythonPath('.venv');
const backendVenvPython = platformPythonPath(path.join('backend', '.venv'));
const availablePython = existsSync(projectVenvPython) ? projectVenvPython : backendVenvPython;
const python = process.env.PYTHON || (existsSync(availablePython) ? `"${availablePython}"` : 'python');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `${python} -m uvicorn main:app --host 127.0.0.1 --port 8001`,
      cwd: 'backend',
      url: 'http://127.0.0.1:8001/api/health',
      // This suite binds dedicated ports and supplies its own CORS/database
      // environment. Reusing a stale process can silently run with the wrong env.
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        INTERNIQ_STORAGE_BACKEND: 'sqlite',
        INTERNIQ_AUTH_MODE: 'local',
        INTERNIQ_SQLITE_PATH: 'data/e2e-interniq.sqlite3',
        ALLOWED_ORIGINS: 'http://127.0.0.1:4173',
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:8001',
        VITE_AUTH_MODE: 'local',
      },
    },
  ],
});
