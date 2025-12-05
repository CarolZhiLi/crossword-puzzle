import os
import json
import re

from google import genai


# prompt format: Generate 20 one-word terms related to [topic]. Do not use bold (**), punctuation marks,
# or formatting other than the pattern WORD - description.
def request(prompt):
    """
    Calls Google Gemini API (via google-genai SDK) to generate a list of words and definitions.

    Environment variables:
      - GEMINI_API_KEY or GOOGLE_API_KEY: your Gemini API key
      - GEMINI_MODEL or GEMINI_MODEL_NAME (optional): model name, default 'gemini-2.5-flash'
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    model = os.getenv("GEMINI_MODEL") or os.getenv("GEMINI_MODEL_NAME") or "gemini-2.5-flash"

    # Normalize model names like '...-latest' to the base model ID.
    if isinstance(model, str) and model.endswith("-latest"):
        model = model[:-7]

    if not api_key:
        error_msg = {
            "error": "Missing Gemini API key",
            "details": "Set GEMINI_API_KEY or GOOGLE_API_KEY in backend/.env",
        }
        return [(0, "Error", json.dumps(error_msg, indent=2, ensure_ascii=False))]

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model,
            contents=prompt,
        )
    except Exception as e:
        print(f"Gemini client error: {e}")
        error_msg = {
            "error": "Request failed when calling Gemini generate_content",
            "details": str(e),
        }
        return [(0, "Error", json.dumps(error_msg, indent=2, ensure_ascii=False))]

    try:
        # Prefer the convenient aggregated text property if available.
        content = ""
        text = getattr(response, "text", None)
        if isinstance(text, str) and text.strip():
            content = text.strip()
        else:
            # Fallback: manually join all candidate parts' text.
            parts_texts = []
            for candidate in getattr(response, "candidates", []) or []:
                c_content = getattr(candidate, "content", None)
                if c_content is None:
                    continue
                for part in getattr(c_content, "parts", []) or []:
                    t = getattr(part, "text", None)
                    if isinstance(t, str):
                        parts_texts.append(t)
            content = "\n".join(parts_texts).strip()

        if not content:
            print(f"Empty response from Gemini API. Raw response: {response}")
            return []

        lines = [line.strip() for line in content.split("\n") if line.strip()]
        response_list = []
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
                    response_list.append((i, clean_word, definition.strip()))

        print(f"Parsed {len(response_list)} words from Gemini API response")
        if len(response_list) == 0:
            print(f"Warning: No words parsed. Content preview: {content[:200]}")
        return response_list

    except Exception as e:
        error_msg = {
            "error": str(e),
            "response_text": str(response),
        }
        return [(0, "Error", json.dumps(error_msg, indent=2, ensure_ascii=False))]


if __name__ == "__main__":
    results = request(
        "Generate 20 one-word terms related to JavaScript. "
        "Do not use bold (**), punctuation marks, or formatting other than the pattern WORD - description."
    )
    for _, word, definition in results:
        print(f"{word}: {definition}")


