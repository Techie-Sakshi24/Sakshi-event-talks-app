import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Simple in-memory cache
cache = {
    "data": None,
    "last_updated": None
}
CACHE_TIMEOUT_SECONDS = 600  # 10 minutes

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    
    # Set a user-agent to resemble a standard browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return None

    try:
        # Atom feed namespace
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_data)
        
        updates = []
        for entry in root.findall('atom:entry', namespaces):
            date_str = entry.find('atom:title', namespaces).text  # e.g., "June 15, 2026"
            entry_id = entry.find('atom:id', namespaces).text
            updated_time = entry.find('atom:updated', namespaces).text  # e.g., "2026-06-15T00:00:00-07:00"
            
            link_el = entry.find('atom:link', namespaces)
            alternate_link = link_el.attrib.get('href', '') if link_el is not None else ''
            
            content_el = entry.find('atom:content', namespaces)
            if content_el is None or content_el.text is None:
                continue
                
            content_html = content_el.text.strip()
            
            # Split the content by <h3> tags
            # Format: <h3>Type</h3> <p>Description...</p>
            parts = re.split(r'(?i)<h3>(.*?)</h3>', content_html)
            
            if len(parts) > 1:
                for i in range(1, len(parts), 2):
                    update_type = parts[i].strip()
                    update_desc = parts[i+1].strip() if i+1 < len(parts) else ""
                    
                    sub_id = f"{entry_id}#update_{i//2}"
                    
                    # Extract raw text for tweeting (removing HTML tags)
                    raw_text = re.sub('<[^<]+?>', '', update_desc)
                    # Clean up multiple whitespaces
                    raw_text = ' '.join(raw_text.split())
                    
                    updates.append({
                        'id': sub_id,
                        'date': date_str,
                        'updated_time': updated_time,
                        'type': update_type,  # e.g., "Feature", "Change", "Issue", "Deprecation"
                        'description': update_desc,
                        'raw_text': raw_text,
                        'link': alternate_link
                    })
            else:
                raw_text = re.sub('<[^<]+?>', '', content_html)
                raw_text = ' '.join(raw_text.split())
                
                updates.append({
                    'id': f"{entry_id}#general",
                    'date': date_str,
                    'updated_time': updated_time,
                    'type': 'General',
                    'description': content_html,
                    'raw_text': raw_text,
                    'link': alternate_link
                })
                
        return updates
    except Exception as e:
        print(f"Error parsing feed: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/updates')
def get_updates():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = datetime.now()
    
    # Check if cache is valid
    if not force_refresh and cache["data"] is not None and cache["last_updated"] is not None:
        time_diff = (now - cache["last_updated"]).total_seconds()
        if time_diff < CACHE_TIMEOUT_SECONDS:
            return jsonify({
                "status": "success",
                "source": "cache",
                "last_updated": cache["last_updated"].isoformat(),
                "updates": cache["data"]
            })
            
    # Fetch fresh data
    updates = fetch_and_parse_feed()
    if updates is not None:
        cache["data"] = updates
        cache["last_updated"] = now
        return jsonify({
            "status": "success",
            "source": "live",
            "last_updated": now.isoformat(),
            "updates": updates
        })
    else:
        # If fetch fails, fallback to cache if available
        if cache["data"] is not None:
            return jsonify({
                "status": "partial_success",
                "source": "cache_fallback",
                "message": "Failed to fetch live feed. Showing cached data.",
                "last_updated": cache["last_updated"].isoformat(),
                "updates": cache["data"]
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to fetch and parse release notes feed."
            }), 500

if __name__ == '__main__':
    # Bind to all interfaces (0.0.0.0) so it's accessible locally
    app.run(debug=True, host='127.0.0.1', port=5000)
