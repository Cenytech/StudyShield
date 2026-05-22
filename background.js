/* background.js */


// Listen for when any tab updates its URL path while browsing
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const url = changeInfo.url.toLowerCase();


    // Pull down the focus mode state and your custom list from storage
    chrome.storage.local.get(['focusModeActive', 'userBlocklist'], (data) => {
      if (data.focusModeActive) {
        // Fallback defaults if the user's custom list is somehow empty
        const currentBlocklist = data.userBlocklist || ["youtube.com", "twitter.com", "x.com"];
        
        // Loop through the list to see if the typed URL matches any blocked site
        const shouldClose = currentBlocklist.some(site => url.includes(site));
        
        if (shouldClose) {
          // Force close the tab instantly!
          chrome.tabs.remove(tabId);
          console.log(`StudyShield closed blocked tab: ${url}`);
        }
      }
    });
  }
});