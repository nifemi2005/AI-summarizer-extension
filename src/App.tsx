import { useState, useEffect } from "react";
import Logo from "../src/assets/logo.png";
import { HiPlus } from "react-icons/hi";
import { LuClock } from "react-icons/lu";

// types for data
type SummaryData = {
  summary: string[];
  keyInsights: string[];
  readingTime: string;
  timestamp: number;
};

type AppState = "default" | "loading" | "result" | "error";

function App() {
  const [appState, setAppState] = useState<AppState>("default");
  const [pageTitle, setPageTitle] = useState<string>("Loading page info...");
  const [pageDomain, setPageDomain] = useState<string>("");
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fromCache, setFromCache] = useState<boolean>(false);

  // get the current tab info when popup opens
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.title) setPageTitle(tab.title);
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          setPageDomain(url.hostname);
        } catch {
          setPageDomain("");
        }
      }
    });
  }, []);

  async function handleSummarize() {
    setAppState("loading");
    setErrorMessage("");

    try {
      // get the current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        setErrorMessage("Could not access the current tab");
        setAppState("error");
        return;
      }

      // send message to content script to extract page content
      const contentResponse = await chrome.tabs.sendMessage(tab.id, {
        type: "EXTRACT_CONTENT",
      });

      if (!contentResponse.success) {
        setErrorMessage("Could not extract page content");
        setAppState("error");
        return;
      }

      // send extracted content to background script for AI summarization
      const summaryResponse = await chrome.runtime.sendMessage({
        type: "SUMMARIZE",
        data: {
          content: contentResponse.data.content,
          title: contentResponse.data.title,
          url: contentResponse.data.url,
        },
      });

      if (!summaryResponse.success) {
        setErrorMessage(summaryResponse.error || "Failed to generate summary");
        setAppState("error");
        return;
      }

      setSummaryData(summaryResponse.data);
      setFromCache(summaryResponse.fromCache);
      setAppState("result");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
      setAppState("error");
    }
  }

  function handleClear() {
    setSummaryData(null);
    setFromCache(false);
    setAppState("default");
    setErrorMessage("");
  }

  async function handleCopy() {
    if (!summaryData) return;

    const text = [
      "📋 SUMMARY",
      ...summaryData.summary.map((p) => `• ${p}`),
      "",
      "💡 KEY INSIGHTS",
      ...summaryData.keyInsights.map((i) => `• ${i}`),
      "",
      `⏱ ${summaryData.readingTime}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="w-[320px] bg-white rounded-2xl overflow-hidden border border-gray-100 m-3">
      {/* Header */}
      <div className="flex items-center gap-1 px-3.5 py-3 border-b border-gray-100">
        <div className="w-7 h-7">
          <img src={Logo} alt="" />
        </div>
        <span className="text-[13px] font-medium text-gray-900 flex-1">
          AI Summarizer
        </span>
        <div className="flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Active
        </div>
      </div>

      {/* Page info */}
      <div className="px-3.5 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-[10px] text-gray-400">
            {pageDomain || "unknown"}
          </span>
        </div>
        <p className="text-[12px] font-medium text-gray-900 leading-snug line-clamp-2">
          {pageTitle}
        </p>
      </div>

      {/* default state body  */}
      {appState === "default" && (
        <div className="px-3.5 py-3">
          <button
            onClick={handleSummarize}
            className="w-full bg-[#7F77DD] hover:bg-[#6B63C8] active:scale-[0.98] transition-all rounded-xl py-3.5 flex items-center justify-center gap-2 mb-2.5 focus:outline-none focus:ring-2 focus:ring-[#7F77DD] focus:ring-offset-2 text-white"
          >
            {/* spark icon */}
            <HiPlus size={14} />
            <span className="text-[12px] font-medium text-white">
              Summarize this page
            </span>
          </button>
          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            Click to extract and summarize the content of this page using AI
          </p>
        </div>
      )}

      {/* Loading state */}
      {appState === "loading" && (
        <div className="px-3.5 py-4 flex flex-col items-center gap-3">
          {/* Spinner */}
          <div className="w-10 h-10 rounded-full bg-[#EEEDFE] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#AFA9EC] border-t-[#7F77DD] rounded-full animate-spin" />
          </div>

          <div className="text-center flex flex-col gap-1">
            <p className="text-[12px] font-medium text-gray-900">
              Analyzing page content
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              An AI is reading and summarizing
              <br />
              this page for you
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full h-0.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-[#7F77DD] rounded-full animate-slide" />
          </div>
        </div>
      )}

      {/* Result state */}
      {appState === "result" && summaryData && (
        <div className="px-3.5 py-3 flex flex-col gap-3">
          {/* Meta row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <LuClock size={11} className="text-gray-400 flex-shrink-0" />
              {summaryData.readingTime}
            </div>
            {fromCache && (
              <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                cached
              </span>
            )}
          </div>

          {/* Summary bullets */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
              Summary
            </p>
            <ul className="flex flex-col gap-1.5">
              {summaryData.summary.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7F77DD] flex-shrink-0 mt-1" />
                  <span className="text-[12px] text-gray-800 leading-snug">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key insights */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
              Key insights
            </p>
            <div className="flex flex-col gap-1.5">
              {summaryData.keyInsights.map((insight, index) => (
                <div
                  key={index}
                  className="bg-[#EEEDFE] border border-[#AFA9EC] rounded-lg px-2.5 py-2 text-[11px] text-[#3C3489] leading-snug"
                >
                  {insight}
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={handleClear}
              className="border border-gray-200 rounded-lg py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Clear
            </button>
            <button
              onClick={handleCopy}
              className="border border-gray-200 rounded-lg py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Copy
            </button>
            <button
              onClick={handleSummarize}
              className="bg-[#7F77DD] border border-[#7F77DD] rounded-lg py-1.5 text-[11px] font-medium text-white hover:bg-[#6B63C8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
            >
              Re-summarize
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {appState === "error" && (
        <div className="px-3.5 py-4 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="#EF4444" strokeWidth="1.5" />
              <path
                d="M9 5.5V9.5"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="9" cy="12" r="0.75" fill="#EF4444" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-medium text-gray-900">
              Something went wrong
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {errorMessage}
            </p>
          </div>
          <button
            onClick={handleClear}
            className="border border-gray-200 rounded-lg px-4 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
