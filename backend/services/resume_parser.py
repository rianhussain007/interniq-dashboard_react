import re
import fitz  # PyMuPDF
from typing import Dict, List, Any

# --- Regular Expressions for Parsing --- #

# Regex to find email addresses
EMAIL_REGEX = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"

# Regex to find phone numbers (supports various formats)
PHONE_REGEX = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"

# Keywords to identify sections in a resume
SKILLS_KEYWORDS = ["skills", "technical skills", "proficiencies", "technologies"]
EDUCATION_KEYWORDS = ["education", "academic background", "qualifications"]
EXPERIENCE_KEYWORDS = ["experience", "work experience", "professional experience", "employment history"]

def extract_text_from_pdf(file_stream) -> str:
    """Extracts all text from a PDF file stream."""
    try:
        with fitz.open(stream=file_stream.read(), filetype="pdf") as doc:
            text = "".join(page.get_text() for page in doc)
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def parse_name(text: str, email: str, phone: str) -> str:
    """Heuristically finds the name, often at the start of the resume."""
    # The name is usually one of the first few lines.
    # We remove the found email and phone to avoid them being mistaken for the name.
    potential_name_section = text.split('\n')[:5]
    for line in potential_name_section:
        clean_line = line.strip()
        if clean_line and clean_line.lower() not in (email.lower(), phone.lower()):
            # A simple heuristic: a name is usually 1-3 words.
            if 1 <= len(clean_line.split()) <= 3:
                return clean_line
    return "Not Found"

def parse_section(text: str, keywords: List[str]) -> str:
    """Extracts the content of a specific section based on keywords."""
    text_lower = text.lower()
    start_index = -1

    # Find the start of the target section
    for keyword in keywords:
        try:
            start_index = text_lower.index(keyword)
            break
        except ValueError:
            continue

    if start_index == -1:
        return "Not Found"

    # Find the end of the section (start of the next known section)
    all_keywords = SKILLS_KEYWORDS + EDUCATION_KEYWORDS + EXPERIENCE_KEYWORDS
    end_index = len(text)
    for keyword in all_keywords:
        # Find the next keyword that is *not* part of the current section's keywords
        if keyword not in keywords:
            try:
                next_keyword_index = text_lower.index(keyword, start_index + 1)
                if next_keyword_index < end_index:
                    end_index = next_keyword_index
            except ValueError:
                continue
    
    # Extract and clean the section content
    section_content = text[start_index:end_index].strip()
    # Clean up the keyword heading from the content
    for keyword in keywords:
        if section_content.lower().startswith(keyword):
            section_content = section_content[len(keyword):].strip()
            if section_content.startswith(':'):
                section_content = section_content[1:].strip()
            break
            
    return section_content if section_content else "Not Found"

def analyze_resume_text(text: str) -> Dict[str, Any]:
    """Analyzes the extracted text to find key information."""
    email_match = re.search(EMAIL_REGEX, text)
    phone_match = re.search(PHONE_REGEX, text)

    email = email_match.group(0) if email_match else "Not Found"
    phone = phone_match.group(0) if phone_match else "Not Found"
    
    # Parse name after finding email/phone to avoid conflicts
    name = parse_name(text, email, phone)

    # Parse major sections
    skills = parse_section(text, SKILLS_KEYWORDS)
    education = parse_section(text, EDUCATION_KEYWORDS)
    experience = parse_section(text, EXPERIENCE_KEYWORDS)

    # Convert skills string into a list for better frontend display
    skills_list = [skill.strip() for skill in re.split(r'[\n,•*·-]', skills) if skill.strip()]

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "skills": skills_list if skills_list else ["Not Found"],
        "education": education,
        "experience": experience,
    }
