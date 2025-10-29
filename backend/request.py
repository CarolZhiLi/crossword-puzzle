import requests, json, re


# prompt format: Generate 20 one-word terms related to [topic]. Do not use bold (**), punctuation marks, or formatting other than the pattern WORD - description.
def request(prompt):
    url = "https://gpt.newbio.net/chat"
    headers = {
        "x-api-key": "BCIT-COMP4537-TERMPROJECT",
        "Content-Type": "application/json"
    }

    payload = {"prompt": prompt}
    r = requests.post(url, headers=headers, json=payload)

    try:
        data = r.json()
        content = data.get("response", "")

        lines = [line.strip() for line in content.split("\n") if line.strip()]
        response = []
        i = 0
        for line in lines:
            # Match formats like: **Cheetah**: Fastest land animal.
            match = re.match(r"^\**\s*(.*?)\**\s*[:\-]\s*(.*)$", line)
            if match:
                i += 1
                raw_word, definition = match.groups()
                clean_word = re.sub(r"[*_]+", "", raw_word).strip()  # remove * or _
                response.append((i, clean_word, definition.strip()))
        print(response)
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



