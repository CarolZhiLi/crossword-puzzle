import requests, json, re


# prompt format: Generate 20 one-word terms related to [topic]. Do not use bold (**), punctuation marks, or formatting other than the pattern WORD - description.
def request(prompt):
    url = "https://gpt.newbio.net/chat"
    headers = {
        "x-api-key": "BCIT-COMP4537-TERMPROJECT",
        "Content-Type": "application/json"
    }

    payload = {"prompt": prompt}
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=30)
        r.raise_for_status()  # Raise an exception for bad status codes
    except requests.exceptions.Timeout as e:
        print(f"Request timeout: {e}")
        error_msg = {
            "error": "Connection timeout - the word generation service took too long to respond",
            "details": str(e)
        }
        return [(0, "Error", json.dumps(error_msg, indent=2, ensure_ascii=False))]
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error: {e}")
        error_msg = {
            "error": "Connection failed - could not reach the word generation service",
            "details": str(e)
        }
        return [(0, "Error", json.dumps(error_msg, indent=2, ensure_ascii=False))]
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        error_msg = {
            "error": f"Request failed: {str(e)}",
            "response_text": r.text if 'r' in locals() and hasattr(r, 'text') else "No response"
        }
        return [(0, "Error", json.dumps(error_msg, indent=2, ensure_ascii=False))]

    try:
        data = r.json()
        content = data.get("response", "")
        
        if not content:
            print(f"Empty response from API. Full response: {data}")
            return []

        lines = [line.strip() for line in content.split("\n") if line.strip()]
        response = []
        i = 0
        for line in lines:
            # Match formats like: **Cheetah**: Fastest land animal.
            # Also try to match numbered lists like "1. WORD - definition" or "WORD - definition"
            match = re.match(r"^\**\s*(.*?)\**\s*[:\-]\s*(.*)$", line)
            if not match:
                # Try alternative format: "1. WORD - definition" or "WORD - definition"
                match = re.match(r"^\d+\.\s*(.*?)\s*[:\-]\s*(.*)$", line)
            if not match:
                # Try simple format: "WORD - definition"
                match = re.match(r"^([A-Za-z]+)\s*[:\-]\s*(.*)$", line)
            
            if match:
                i += 1
                raw_word, definition = match.groups()
                clean_word = re.sub(r"[*_]+", "", raw_word).strip()  # remove * or _
                if clean_word and definition.strip():
                    response.append((i, clean_word, definition.strip()))
        
        print(f"Parsed {len(response)} words from API response")
        if len(response) == 0:
            print(f"Warning: No words parsed. Content preview: {content[:200]}")
        return response

    except Exception as e:
        error_msg = {
            "error": str(e),
            "response_text": r.text if 'r' in locals() else "No response"
        }
        return [(0, "Error", json.dumps(error_msg, indent=2, ensure_ascii=False))]


if __name__ == "__main__":
    results = request("Generate 20 one-word terms related to JavaScript. Do not use bold (**), punctuation marks, or formatting other than the pattern WORD - description.")
    for _, word, definition in results:
        print(f"{word}: {definition}")



