import os
import sys
import subprocess
from fastapi import APIRouter, HTTPException, BackgroundTasks, File, UploadFile
from db import get_db_connection
from internships_store import list_internships
from services.resume_parser import extract_text_from_pdf, analyze_resume_text

# --- Configuration ---
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRAPER_SCRIPT = os.path.join(PROJECT_ROOT, 'scraper', 'update_internships.py')

router = APIRouter()

# --- Helper Functions ---
def run_scraper_script():
    """Executes the scraper script using subprocess."""
    print(f"Starting scraper: {SCRAPER_SCRIPT}")
    try:
        subprocess.run([sys.executable, SCRAPER_SCRIPT], cwd=PROJECT_ROOT, check=True, capture_output=True, text=True)
        print("Scraper script finished successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error running scraper script: {e.stderr}")
    except FileNotFoundError:
        print(f"Error: Scraper script not found at {SCRAPER_SCRIPT}")

# --- API Endpoints ---
@router.get("/internships")
def get_internships():
    """Returns the list of internships from PostgreSQL."""
    try:
        with get_db_connection() as conn:
            return list_internships(conn)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database operation failed: {exc}") from exc

@router.post("/scrape")
def scrape_internships(background_tasks: BackgroundTasks):
    """Triggers the internship scraper to run in the background."""
    background_tasks.add_task(run_scraper_script)
    return {"message": "Scraping process started in the background."}

@router.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    """Analyzes an uploaded resume PDF and returns extracted information."""
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")

    try:
        # Extract text from the uploaded PDF file stream
        text = extract_text_from_pdf(file.file)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF. The file might be empty or image-based.")

        # Analyze the extracted text
        parsed_data = analyze_resume_text(text)
        return parsed_data
    except HTTPException as e:
        # Re-raise HTTP exceptions to be handled by FastAPI
        raise e
    except Exception as e:
        # Catch any other unexpected errors during parsing
        print(f"Error during resume analysis: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
