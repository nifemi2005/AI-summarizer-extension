function extractPageContent(): string {
  //Trying to find the main article content first
  const articleSelectors = [
    "article",
    '[role="main"]',
    "main",
    ".post-content",
    ".article-content",
    ".entry-content",
    ".content",
    "#content",
    "#main",
  ];

  let mainContent = "";

  //loop through selectors and use the first one that has content
  for (const selectors of articleSelectors) {
    const element = document.querySelector(selectors);
    if (
      element &&
      element.textContent &&
      element.textContent.trim().length > 200
    ) {
      mainContent = element.textContent;
      break;
    }
  }

  // if no article found, fall back to body
  if (!mainContent) {
    mainContent = document.body.textContent || "";
  }

  //clean up the extracted text
  const cleaned = mainContent.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();

  // limit to 5000 characters to avoid hitting API token limits
  return cleaned.slice(0, 5000);
}

function getPageTitle(): string {
  return document.title || "Untitled Page";
}

function getPageUrl(): string {
  return window.location.href;
}

// listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_CONTENT") {
    const content = extractPageContent();
    const title = getPageTitle();
    const url = getPageUrl();

    sendResponse({
      success: true,
      data: {
        content,
        title,
        url,
      },
    });
  }
  return true;
});
