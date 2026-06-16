# BigQuery Release Pulse 📊✨

A premium, interactive web application dashboard built with **Python Flask** and vanilla **HTML, CSS, and JavaScript**. It fetches, parses, and monitors the Google Cloud BigQuery release notes feed in real-time. It enables you to search, filter by update type, preview full update details, and easily format and publish updates to X (Twitter).

---

## 🚀 Features

*   **Real-time Atom Feed Syncing:** Fetches live release updates directly from Google Cloud.
*   **Sub-Update Extraction:** Intelligent parsing of the daily release notes, separating mixed content entries into distinct, categorizable cards.
*   **Performance Cache:** 10-minute caching mechanism to prevent unnecessary network requests and ensure blazing-fast loads.
*   **Rich Dark Theme & UI:** Styled with a glassmorphic dark theme, custom responsive layouts, statistical overview counters, and keyframe loading animations.
*   **X (Twitter) Integration:** Custom-built post composer panel simulating a Twitter card with smart length truncation and a real-time circular SVG character limit counter (280 characters).

---

## 🛠️ Technology Stack

*   **Backend:** Python 3, Flask, XML.etree.ElementTree (Standard Library)
*   **Frontend:** Semantic HTML5, Vanilla CSS3 (Custom Variables, Flexbox/Grid), Vanilla JavaScript (ES6, Fetch API)
*   **Aesthetics:** Outfit & JetBrains Mono Fonts (Google Fonts), Custom SVG Path Icons

---

## 📁 File Structure

```text
agy-cli-project/
├── app.py                  # Flask Web Server & API XML parsing
├── templates/
│   └── index.html          # Frontend structure and layout
├── static/
│   ├── style.css           # Custom glassmorphic styling
│   └── script.js           # Filtering, rendering, and X composer state
├── .gitignore              # Ignored cache, environments, and settings
└── README.md               # Project documentation
```

---

## ⚙️ Getting Started & Running

### 1. Prerequisites
Ensure you have **Python 3.x** installed.

### 2. Install Dependencies
Install Flask using `pip`:
```bash
pip install Flask
```

### 3. Run the Development Server
Navigate to the directory and start the server:
```bash
python app.py
```

### 4. Open the Web App
Open your web browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📝 Licence
This project is open-source and available under the MIT License.
