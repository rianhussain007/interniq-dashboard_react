# 🚀 Internshala Scraper

This scraper fetches real internship opportunities from Internshala and integrates them with your InternIQ dashboard.

## 📋 Features

- **Real-time Data**: Scrapes live internship listings from Internshala
- **Comprehensive Information**: Extracts title, company, location, stipend, duration, requirements, and more
- **Smart Classification**: Automatically categorizes internships by domain and difficulty
- **Data Integration**: Seamlessly integrates with your InternIQ dashboard
- **Duplicate Prevention**: Avoids adding duplicate internships
- **Backup System**: Creates backups before updating data

## 🛠️ Installation

Make sure you have the required dependencies installed:

```bash
pip install beautifulsoup4 requests lxml
```

Or install all requirements:

```bash
pip install -r requirements.txt
```

## 📖 Usage

### 1. Basic Scraping

To scrape internships from Internshala:

```bash
python scraper/internshala_scraper.py
```

This will:
- Scrape 2 pages of internships (configurable)
- Save data to `data/internships.json`
- Display sample results

### 2. Update Dashboard Data

To update your InternIQ dashboard with fresh data:

```bash
python scraper/update_internships.py
```

This will:
- Load existing data
- Scrape new internships
- Merge without duplicates
- Create a backup
- Update the main data file

### 3. Programmatic Usage

You can also use the scraper in your own scripts:

```python
from scraper.internshala_scraper import scrape_internshala, save_to_json

# Scrape data
internships = scrape_internshala(max_pages=3, delay=2)

# Save to file
save_to_json(internships, "my_internships.json")

# Display results
for internship in internships[:5]:
    print(f"{internship['title']} at {internship['company']}")
```

## ⚙️ Configuration

### Scraping Parameters

- `max_pages`: Number of pages to scrape (default: 3)
- `delay`: Delay between requests in seconds (default: 2)

### Data Fields

Each internship includes:
- **id**: Unique identifier
- **title**: Internship title
- **company**: Company name
- **location**: Job location
- **domain**: Categorized domain (Software Development, Data Science, etc.)
- **duration**: Internship duration
- **stipend**: Monthly stipend
- **requirements**: Required skills
- **description**: Brief description
- **posted_date**: When posted
- **deadline**: Application deadline
- **remote**: Remote work option
- **paid**: Whether it's a paid internship
- **difficulty**: Easy/Medium/Hard classification
- **apply_link**: Direct application link
- **source**: Data source (Internshala)

## 🔧 Customization

### Adding New Domains

To add new domain classifications, edit the `determine_domain()` function in `internshala_scraper.py`:

```python
domain_keywords = {
    "Your New Domain": ["keyword1", "keyword2", "keyword3"],
    # ... existing domains
}
```

### Modifying Difficulty Logic

Edit the `determine_difficulty()` function to change how difficulty is calculated based on:
- Company reputation
- Required skills
- Stipend amount

## 📊 Data Quality

The scraper includes several features to ensure data quality:

- **Multiple Selectors**: Tries different CSS selectors to extract data
- **Data Cleaning**: Removes extra text and normalizes data
- **Error Handling**: Gracefully handles missing or malformed data
- **Validation**: Ensures required fields are present

## 🚨 Important Notes

### Rate Limiting

- The scraper includes delays between requests to be respectful to Internshala's servers
- Don't set delays too low to avoid being blocked
- Consider running during off-peak hours

### Legal Considerations

- This scraper is for educational purposes
- Respect Internshala's robots.txt and terms of service
- Don't overload their servers with too many requests
- Consider reaching out to Internshala for API access if you plan to use this commercially

### Data Accuracy

- Web scraping can be affected by website changes
- CSS selectors may need updates if Internshala changes their layout
- Always verify critical data manually

## 🔄 Automation

You can automate the scraping process:

### Windows Task Scheduler
```bash
# Create a batch file (update_internships.bat)
cd /d "C:\path\to\interniq-dashboard"
python scraper\update_internships.py
```

### Linux/Mac Cron
```bash
# Add to crontab (runs daily at 9 AM)
0 9 * * * cd /path/to/interniq-dashboard && python scraper/update_internships.py
```

## 🐛 Troubleshooting

### Common Issues

1. **"No internships found"**
   - Check your internet connection
   - Internshala might be blocking requests
   - Try increasing the delay between requests

2. **"N/A" values in data**
   - CSS selectors might need updating
   - Internshala's layout may have changed
   - Check the scraper logs for specific errors

3. **Import errors**
   - Ensure all dependencies are installed
   - Check Python path and working directory

### Debug Mode

To see detailed scraping information, modify the scraper to include more verbose logging:

```python
# Add this to see what's being scraped
print(f"Processing card: {card.get_text()[:100]}...")
```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your internet connection
3. Try running with different parameters
4. Check if Internshala's website structure has changed

## 📄 License

This scraper is provided as-is for educational purposes. Use responsibly and in accordance with Internshala's terms of service. 