# AI Summarizer — Chrome Extension

A Chrome Extension (Manifest V3) that extracts content from any webpage 
and uses AI to generate a structured summary with bullet points, 
key insights, and estimated reading time.

---

## Setup Instructions

### Requirements
- Google Chrome browser
- An Anthropic API key (get one at console.anthropic.com)
- Node.js 18 or higher
- npm 9 or higher

### Steps

1. **Clone the repository:**
```bash
   git clone https://github.com/your-username/ai-summarizer.git
   cd ai-summarizer
```

2. **Install dependencies:**
```bash
   npm install
```

3. **Create your environment file:**
   
   Create a `.env` file at the root of the project:
  VITE_ANTHROPIC_API_KEY=your-api-key-here
Replace `your-api-key-here` with your actual Anthropic API key.

4. **Build the extension:**
```bash
   npm run build
```

5. **Load the extension in Chrome:**
   - Open Chrome and go to `chrome://extensions`
   - Enable **Developer mode** (toggle in the top right)
   - Click **Load unpacked**
   - Select the `dist/` folder inside the project
   - The AI Summarizer extension will appear in your toolbar

6. **Pin the extension:**
   - Click the puzzle icon in Chrome toolbar
   - Find AI Summarizer and click the pin icon

---

## How to Use

1. Navigate to any article, blog post or webpage
2. Click the AI Summarizer icon in the Chrome toolbar
3. Click **Summarize this page**
4. Wait for the AI to analyze and summarize the content
5. View the bullet-point summary and key insights
6. Use **Copy** to copy the summary to clipboard
7. Use **Clear** to reset and summarize a new page
8. Use **Again** to re-summarize the current page

---

## Architecture Explanation
ai-summarizer/
├── public/
│   ├── manifest.json      # Chrome extension configuration
│   └── icons/             # Extension icons (16, 32, 48, 128px)
├── src/
│   ├── App.tsx            # Popup UI — all states (default, loading, result, error)
│   ├── main.tsx           # React entry point
│   ├── index.css          # Global styles and animations
│   ├── background.ts      # Service worker — handles AI API calls and caching
│   └── content.ts         # Content script — extracts page content
└── dist/                  # Built extension — loaded into Chrome

### How the pieces connect
User clicks "Summarize"
↓
popup (App.tsx)
↓ chrome.tabs.sendMessage
content.ts (runs on the page)
↓ extracts readable content
↓ sendResponse back to popup
popup (App.tsx)
↓ chrome.runtime.sendMessage
background.ts (service worker)
↓ checks chrome.storage cache
↓ if no cache → calls Claude API
↓ saves result to cache
↓ sendResponse back to popup
popup (App.tsx)
↓ renders summary, insights, reading time

---

## AI Integration Explanation

The extension uses the **Anthropic Claude API** to generate summaries.

### How it works

1. The content script extracts up to 5000 characters of readable text 
   from the page, preferring main article content over navigation and sidebars
2. The background service worker receives the text and builds a structured 
   prompt asking Claude to return a JSON object with summary bullets, 
   key insights and reading time
3. Claude responds with structured JSON which is parsed and sent back 
   to the popup for display

### The prompt structure

Claude is instructed to return exactly this JSON shape:
```json
{
  "summary": ["bullet 1", "bullet 2", "..."],
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "readingTime": "X minute read"
}
```

This makes parsing reliable and the UI predictable.

---

## Security Decisions

### API key protection
- The API key is stored in a `.env` file which is never committed to GitHub
- The key is only used in `background.ts` (the service worker) — never 
  in the popup or content script
- The `.env` file is listed in `.gitignore`

### Minimal permissions
The extension only requests the permissions it actually needs:
- `activeTab` — access the currently active tab
- `storage` — cache summaries in chrome.storage
- `scripting` — inject the content script

### Content sanitization
- The content script strips script tags, HTML tags and potential 
  XSS patterns before sending content to the AI
- React's JSX rendering automatically escapes all dynamic content 
  before displaying it in the popup

### Message validation
- The background script validates all incoming messages before 
  processing them — checking for required fields and correct structure
- Invalid messages are rejected with an error response

---

## Trade-offs and Limitations

- **API key in client build** — Vite replaces `import.meta.env` values 
  at build time, meaning the API key is embedded in the built JavaScript. 
  In a production extension, a proxy server would be used instead. 
  For this local extension, the key is protected by not committing 
  the `.env` file to the repository.

- **5000 character limit** — page content is truncated to 5000 characters 
  to stay within API token limits. Very long articles may lose context 
  from the later sections.

- **Content extraction heuristics** — the extension uses CSS selector 
  heuristics to find the main content. Some pages with unusual layouts 
  may not extract cleanly.

- **chrome://pages not supported** — Chrome restricts content scripts 
  from running on internal Chrome pages like `chrome://extensions`. 
  The extension only works on regular http/https websites.

- **1 hour cache** — summaries are cached for 1 hour per URL. After 
  that a fresh API call is made. This balances freshness with 
  API cost savings.

- **No streaming** — the summary appears all at once after the full 
  API response. Streaming responses would feel faster but add complexity.

---

## Local Installation (No Chrome Web Store)

Since this is a local extension it is not published to the Chrome Web Store. 
To install it:

1. Download or clone this repository
2. Follow the **Setup Instructions** above to build it
3. Load the `dist/` folder as an unpacked extension in Chrome
4. The extension will work exactly like a published extension but 
   only on your machine

To update after making code changes:
```bash
npm run build
```
Then go to `chrome://extensions` and click the **refresh icon** 
on the AI Summarizer card.

---

## Demo Video

A short demo video showing the extension in action is available at:
[https://drive.google.com/file/d/1vud63Z4ElVryzgFhw4IbPH69nKpMpFmi/view?usp=sharing]

The demo covers:
- Installing the extension locally
- Summarizing a news article
- Summarizing a Wikipedia page
- The cached summary behavior
- The copy to clipboard feature