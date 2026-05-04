const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1024

// structure for a cached summary
interface CachedSummary {
  summary: string
  keyInsights: string[]
  readingTime: string
  timestamp: number
}

// build the prompt we send to Claude
function buildPrompt(content: string, title: string): string {
  return `You are a helpful assistant that summarizes web pages clearly and concisely.

Here is the content of a webpage titled "${title}":

${content}

Please provide:
1. A bullet-point summary (5-7 bullets) of the main points
2. 3 key insights or takeaways
3. Estimated reading time for the original content

Format your response as JSON with this exact structure:
{
  "summary": ["bullet point 1", "bullet point 2", ...],
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "readingTime": "X minute read"
}

Only respond with the JSON object, no other text.`
}

// make the Claude API call
async function callClaudeAPI(content: string, title: string): Promise<CachedSummary> {
  const prompt = buildPrompt(content, title)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'API call failed')
  }

  const data = await response.json()
  const text = data.content[0].text

  // parse the JSON response from Claude
  const parsed = JSON.parse(text)

  return {
    summary: parsed.summary,
    keyInsights: parsed.keyInsights,
    readingTime: parsed.readingTime,
    timestamp: Date.now(),
  }
}

// get cached summary from chrome.storage
async function getCachedSummary(url: string): Promise<CachedSummary | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(url, (result) => {
      const cached = result[url] as CachedSummary | undefined

      if (!cached) {
        resolve(null)
        return
      }

      // cache expires after 1 hour (3600000ms)
      const oneHour = 3600000
      if (Date.now() - cached.timestamp > oneHour) {
        chrome.storage.local.remove(url)
        resolve(null)
        return
      }

      resolve(cached)
    })
  })
}

// save summary to chrome.storage
async function cacheSummary(url: string, summary: CachedSummary): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [url]: summary }, resolve)
  })
}

// listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SUMMARIZE') {
    const { content, title, url } = message.data

    // handle the async work
    ;(async () => {
      try {
        // check cache first
        const cached = await getCachedSummary(url)
        if (cached) {
          sendResponse({ success: true, data: cached, fromCache: true })
          return
        }

        // no cache — call Claude API
        const summary = await callClaudeAPI(content, title)

        // save to cache
        await cacheSummary(url, summary)

        sendResponse({ success: true, data: summary, fromCache: false })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Something went wrong'
        sendResponse({ success: false, error: message })
      }
    })()
  }

  // keep message channel open for async response
  return true
})