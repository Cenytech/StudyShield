/* popup.js */

let timerInterval;
let isFocusModeActive = false;
let timeLeft = 25 * 60; 
let customBlocklist = ["youtube.com", "twitter.com", "x.com"]; 

// DOM Elements
const timerDisplay = document.getElementById('timer');
const toggleBtn = document.getElementById('toggle-btn');
const statusIndicator = document.getElementById('status-indicator'); 
const siteInput = document.getElementById('site-input');
const addBtn = document.getElementById('add-btn');
const blocklistUi = document.getElementById('blocklist-ui');

// New Time Input Elements
const timeInputGroup = document.getElementById('time-input-group');
const inputMinutes = document.getElementById('input-minutes');
const inputSeconds = document.getElementById('input-seconds');

// Load stored settings on open
chrome.storage.local.get(['focusModeActive', 'sessionEndTime', 'userBlocklist'], (data) => {
  if (data.userBlocklist) {
    customBlocklist = data.userBlocklist;
  }
  renderBlocklist();

  if (data.focusModeActive && data.sessionEndTime) {
    const currentTime = Date.now();
    const remainingTime = Math.ceil((data.sessionEndTime - currentTime) / 1000);

    if (remainingTime > 0) {
      isFocusModeActive = true;
      timeLeft = remainingTime;
      updateStatusUI(true); 
      startCountdown();
    } else {
      stopFocusMode();
    }
  } else {
    updateStatusUI(false); 
  }
});

// Real-time preview formatting as user types custom duration
function updatePreview() {
  if (!isFocusModeActive) {
    const mins = parseInt(inputMinutes.value) || 0;
    const secs = parseInt(inputSeconds.value) || 0;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
inputMinutes.addEventListener('input', updatePreview);
inputSeconds.addEventListener('input', updatePreview);

// Event: Add custom site to list
addBtn.addEventListener('click', () => {
  if (isFocusModeActive) {
    alert("You cannot modify your blocklist during an active session!");
    return;
  }
  let url = siteInput.value.trim().toLowerCase();
  if (url) {
    url = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    if (url && !customBlocklist.includes(url)) {
      customBlocklist.push(url);
      chrome.storage.local.set({ userBlocklist: customBlocklist });
      renderBlocklist();
      siteInput.value = '';
    }
  }
});

function renderBlocklist() {
  blocklistUi.innerHTML = '';
  customBlocklist.forEach((site, index) => {
    const li = document.createElement('li');
    li.textContent = site;
    const deleteSpan = document.createElement('span');
    deleteSpan.textContent = '×';
    deleteSpan.classList.add('delete-item');
    deleteSpan.addEventListener('click', () => {
      if (isFocusModeActive) {
        alert("Your blocklist is locked until the timer ends!");
        return;
      }
      customBlocklist.splice(index, 1);
      chrome.storage.local.set({ userBlocklist: customBlocklist });
      renderBlocklist();
    });
    li.appendChild(deleteSpan);
    blocklistUi.appendChild(li);
  });
}

toggleBtn.addEventListener('click', () => {
  if (!isFocusModeActive) {
    // 1. Read custom time settings set by user
    const mins = parseInt(inputMinutes.value) || 0;
    const secs = parseInt(inputSeconds.value) || 0;
    timeLeft = (mins * 60) + secs;

    // Safety guard: Don't allow starting an empty 00:00 timer
    if (timeLeft <= 0) {
      alert("Please set a valid focus duration time!");
      return;
    }

    isFocusModeActive = true;
    
    // 2. Calculate exact end timestamp
    const endTime = Date.now() + (timeLeft * 1000);
    
    updateStatusUI(true); 
    
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ["ruleset_1"]
    });
    
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url) {
          const matchFound = customBlocklist.some(site => tab.url.toLowerCase().includes(site));
          if (matchFound) {
            chrome.tabs.remove(tab.id);
          }
        }
      });
    });
    
    chrome.storage.local.set({ 
      focusModeActive: true, 
      sessionEndTime: endTime 
    });
    
    startCountdown();
  }
});

function startCountdown() {
  clearInterval(timerInterval);
  updateTimerDisplay(); // Display accurate value immediately
  timerInterval = setInterval(() => {
    timeLeft--;
    
    if (timeLeft <= 0) {
      stopFocusMode();
      alert("Great job! Your study session is complete. Shield deactivated.");
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function stopFocusMode() {
  isFocusModeActive = false;
  clearInterval(timerInterval);
  
  // Revert back to the custom input's current base state value
  const mins = parseInt(inputMinutes.value) || 25;
  const secs = parseInt(inputSeconds.value) || 0;
  timeLeft = (mins * 60) + secs;
  
  updateTimerDisplay();
  updateStatusUI(false); 

  chrome.declarativeNetRequest.updateEnabledRulesets({
    disableRulesetIds: ["ruleset_1"]
  });

  chrome.storage.local.set({ 
    focusModeActive: false, 
    sessionEndTime: null 
  });
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateStatusUI(isActive) {
  if (isActive) {
    statusIndicator.textContent = "Session Locked";
    statusIndicator.className = "status-active";
    
    // Hide inputs completely while focus mode runs to secure it
    timeInputGroup.style.display = "none";
    
    toggleBtn.textContent = "Locked 🔒";
    toggleBtn.disabled = true; 
    toggleBtn.style.opacity = "0.5";
    toggleBtn.style.cursor = "not-allowed";
    toggleBtn.style.background = "#555";
  } else {
    statusIndicator.textContent = "Ready to Focus";
    statusIndicator.className = "status-ready";
    
    // Bring back time duration option inputs when inactive
    timeInputGroup.style.display = "flex";
    
    toggleBtn.textContent = "Start Session";
    toggleBtn.disabled = false;
    toggleBtn.style.opacity = "1";
    toggleBtn.style.cursor = "pointer";
    toggleBtn.style.background = "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)";
  }
}