// Function to open Perplexity and handle the summarization
async function openPerplexityAndSummarize(selectedText, currentTab) {
  console.log("Opening Perplexity in new tab");

  // Open Perplexity AI in a new tab next to the current tab
  let perplexityTab;
  try {
    perplexityTab = await chrome.tabs.create({
      url: "https://www.perplexity.ai/",
      index: currentTab.index + 1, // Open to the right of the current tab
      active: true // Switch to the new Perplexity tab immediately
    });

    // Wait a bit for Perplexity to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Execute the script in the context of the Perplexity tab
    chrome.scripting.executeScript({
      target: { tabId: perplexityTab.id },
      func: waitForPerplexityAndPaste,
      args: [selectedText] // Pass the selected text as an argument
    });
  } catch (error) {
    console.error("Error creating new tab or executing script:", error);
  }
}

// Function to be injected into the Perplexity tab
function waitForPerplexityAndPaste(selectedText) {
  console.log("Content script executing: waitForPerplexityAndPaste");

  const MAX_WAIT_TIME = 10000; // Maximum wait time: 10 seconds
  const RETRY_INTERVAL = 250; // Retry interval: 250 milliseconds
  let totalWaitTime = 0;

  const intervalId = setInterval(() => {
    totalWaitTime += RETRY_INTERVAL;
    console.log("Checking for Perplexity input, time elapsed: ", totalWaitTime);

    // Attempt to find the Perplexity input textarea
    const perplexityInput = document.querySelector("textarea");

    if (perplexityInput) {
      console.log("Perplexity input found");
      clearInterval(intervalId);

      // Ensure the input is visible and enabled
      if (perplexityInput.offsetParent !== null && !perplexityInput.disabled) {
        // Construct the prompt for summarization
        const prompt = "Please summarize the following text to approximately 1/5 of the original length:\n\n";

        // Focus the input field
        perplexityInput.focus();
        console.log("Perplexity input focused");

        // Paste the prompt
        perplexityInput.value = prompt;
        console.log("Prompt pasted");

        // Paste the selected text into the input field
        perplexityInput.value += selectedText;

        // Dispatch input event to trigger Perplexity's processing
        const inputEvent = new Event('input', { bubbles: true });
        perplexityInput.dispatchEvent(inputEvent);

        console.log("Selected text pasted and input event dispatched.");

        // Simulate pressing Enter to submit the query
        const enterKeyEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          which: 13,
          keyCode: 13,
          bubbles: true,
          cancelable: true
        });
        perplexityInput.dispatchEvent(enterKeyEvent);
        console.log("Enter key simulated");
      } else {
        console.warn("Perplexity input is not yet visible or enabled.");
      }
    } else if (totalWaitTime >= MAX_WAIT_TIME) {
      clearInterval(intervalId);
      console.error('Timeout waiting for Perplexity to load.');
    }
  }, RETRY_INTERVAL);
}

// Create the context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize-with-perplexity",
    title: "Summarize with Perplexity",
    contexts: ["selection"]
  });
});

// Handle the context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarize-with-perplexity") {
    // Extract the selected text
    const selectedText = info.selectionText;

    // Check if text is selected
    if (selectedText) {
      // Call the function to handle the summarization
      openPerplexityAndSummarize(selectedText, tab);
    } else {
      console.error("No text selected");
    }
  }
});