# InternIQ Dashboard

InternIQ is a full-stack web application designed to help students and professionals find and track internship opportunities. It features a Python-based web scraper, a FastAPI backend, and a modern React frontend.

## Features

- **Automated Internship Scraping:** Gathers the latest internship postings from various sources.
- **Dynamic Frontend:** A responsive and interactive UI built with React, TypeScript, and Tailwind CSS.
- **Robust Backend:** A powerful and scalable API built with FastAPI.
- **Search and Filtering:** Easily search and filter internships by title, location, and domain.
- **One-Click Scrape:** Manually trigger the scraper to get the latest data on-demand.
- **Toast Notifications:** User-friendly feedback for asynchronous actions like scraping.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, `react-hot-toast`
- **Backend:** Python, FastAPI, `python-dotenv`, BeautifulSoup
- **Deployment:** Vercel (Frontend), Render (Backend)

---

## Local Development Setup

Follow these steps to run the application on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Python](https://www.python.org/) (v3.8 or later) and `pip`

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/interniq-dashboard_react.git
cd interniq-dashboard_react
```

### 2. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    # For Windows
    python -m venv venv
    .\venv\Scripts\activate

    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    Copy the example file and leave the default values for local development.
    ```bash
    cp .env.example .env
    ```

5.  **Run the initial scrape to generate data:**
    ```bash
    python ../scraper/update_internships.py
    ```

6.  **Start the backend server:**
    ```bash
    uvicorn main:app --reload
    ```
    The API will be running at `http://127.0.0.1:8000`.

### 3. Frontend Setup

1.  **Navigate to the project root directory (from the `backend` folder):**
    ```bash
    cd ..
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Copy the example file. The default URL should work with the local backend.
    ```bash
    cp .env.example .env
    ```

4.  **Start the frontend development server:**
    ```bash
    npm run dev
    ```
    The frontend will be accessible at `http://localhost:5173`.

---

## Deployment

### Deploying the Backend to Render

1.  **Sign up** for a [Render](https://render.com/) account.
2.  **Create a new "Web Service"** and connect your GitHub repository.
3.  **Configure the service:**
    -   **Name:** `interniq-backend` (or your choice)
    -   **Root Directory:** `backend`
    -   **Environment:** `Python 3`
    -   **Build Command:** `pip install -r requirements.txt`
    -   **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4.  **Add Environment Variables:**
    -   Go to the "Environment" tab for your new service.
    -   Add a variable with the key `ALLOWED_ORIGINS` and set the value to your Vercel frontend URL (e.g., `https://your-app-name.vercel.app`).
5.  **Deploy.** Once complete, Render will provide you with a public URL for your backend (e.g., `https://interniq-backend.onrender.com`).

### Deploying the Frontend to Vercel

1.  **Sign up** for a [Vercel](https://vercel.com/) account.
2.  **Create a new project** and connect your GitHub repository.
3.  **Configure the project:**
    -   Vercel should automatically detect that it's a Vite project and configure the build settings correctly.
    -   **Framework Preset:** `Vite`
    -   **Root Directory:** `.` (leave as default)
4.  **Add Environment Variables:**
    -   Go to the project's "Settings" -> "Environment Variables".
    -   Add a variable with the key `VITE_API_BASE_URL` and set the value to your **Render backend URL** from the previous step.
5.  **Deploy.** Your site will be live at a public Vercel URL.

---

### Are the Frontend and Backend Production-Ready?

**Yes.** With the changes we've made, both the frontend and backend are now production-ready.

-   **Configuration:** Both applications load sensitive data (like API URLs and CORS origins) from environment variables, which is a security best practice.
-   **CORS:** The backend is properly configured to only accept requests from your deployed frontend, preventing unauthorized access.
-   **Scalability:** The chosen hosting platforms (Vercel and Render) are designed for production workloads and can scale as your user base grows.
-   **Automation:** The deployment process is automated through Git, making updates simple and reliable.

Your InternIQ dashboard is now fully prepared for the world. Let me know if you have any other questions!
