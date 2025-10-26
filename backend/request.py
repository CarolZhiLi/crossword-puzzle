import requests, json

url = "https://gpt.newbio.net/chat"
headers = {
    "x-api-key": "BCIT-COMP4537-TERMPROJECT",
    "Content-Type": "application/json"
}
payload = {"prompt": "20 words and definitions for a crossword puzzle about javascript."}

r = requests.post(url, headers=headers, json=payload)  # <-- use 'json=' instead of 'data=json.dumps()'

# Debug info
print("Status code:", r.status_code)
print("Response headers:", r.headers)
print("Raw response text:", r.text)

# Try parsing JSON safely
try:
    data = r.json()
    print("JSON response:", data)
except requests.exceptions.JSONDecodeError:
    print("Response is not valid JSON")
   
