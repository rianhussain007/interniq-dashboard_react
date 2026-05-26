import os
import json
import subprocess
from fastapi import APIRouter, HTTPException, BackgroundTasks, File, UploadFile
from services.resume_parser import extract_text_from_pdf, analyze_resume_text

# --- Configuration ---
# The script assumes it's run from the 'backend' directory.
# Paths are relative to the project root (one level up from 'backend').
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_FILE = os.path.join(PROJECT_ROOT, 'data', 'internships.json')
SCRAPER_SCRIPT = os.path.join(PROJECT_ROOT, 'scraper', 'update_internships.py')

router = APIRouter()

# --- Helper Functions ---
def run_scraper_script():
    """Executes the scraper script using subprocess."""
    print(f"Starting scraper: {SCRAPER_SCRIPT}")
    try:
        subprocess.run(["python", SCRAPER_SCRIPT], check=True, capture_output=True, text=True)
        print("Scraper script finished successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error running scraper script: {e.stderr}")
    except FileNotFoundError:
        print(f"Error: Scraper script not found at {SCRAPER_SCRIPT}")

# --- API Endpoints ---
@router.get("/internships")
def get_internships():
    """Returns the list of internships from the JSON file."""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Internship data file not found. Please run the scraper first.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error decoding internship data. The JSON file might be corrupt.")

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
