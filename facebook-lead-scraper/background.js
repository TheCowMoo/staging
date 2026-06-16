// === Facebook Lead Scraper Pro — Background Service Worker (MV3) ===

const STORAGE_KEYS = {
  LEADS: 'fbscrapedLeads',
  STATE: 'fbscraperState',
  PROCESSED: 'fbscraperProcessed', // Set of processed profile URLs for dedup
};

// Per-tab scrape state: { tabId -> { running, mode, count, error } }
const scrapeState = new Map();

// ============================================================
// INITIALIZATION
// ============================================================
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    [STORAGE_KEYS.LEADS]: [],
    [STORAGE_KEYS.STATE]: { running: false, mode: 'idle', count: 0 },
    [STORAGE_KEYS.PROCESSED]: [],
  });
});

// ============================================================
// MESSAGE HANDLER — Popup <-> Background <-> Content pipeline
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.type];
  if (handler) {
    handler(message, sender, sendResponse);
  } else {
    console.warn('[FB Scraper] Unknown message type:', message.type);
  }
  // Keep channel open for async response
  return true;
});

const messageHandlers = {

  // Popup -> Background: Start scraping
  START_SCRAPE: async (msg, sender, sendResponse) => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || !tabs[0]) {
        sendResponse({ success: false, error: 'No active tab found.' });
        return;
      }

      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url || '';

      if (!tabUrl.includes('facebook.com')) {
        sendResponse({ success: false, error: 'Not on a Facebook page.' });
        return;
      }

      // Detect mode from URL
      const mode = detectScrapeMode(tabUrl);
      if (!mode) {
        sendResponse({ success: false, error: 'Unsupported Facebook page type. Go to a profile About page, search results, or group members page.' });
        return;
      }

      // Set state
      scrapeState.set(tabId, { running: true, mode, count: 0, error: null });

      // Persist running state
      await chrome.storage.local.set({
        [STORAGE_KEYS.STATE]: { running: true, mode, count: 0 },
      });

      // Notify content script to start
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'SCRAPE_START',
          mode,
          tabId,
        });
        sendResponse({ success: true, mode });
      } catch (err) {
        scrapeState.set(tabId, { running: false, mode: 'idle', count: 0, error: err.message });
        await chrome.storage.local.set({
          [STORAGE_KEYS.STATE]: { running: false, mode: 'idle', count: 0 },
        });
        sendResponse({ success: false, error: 'Content script not responding. Reload the page and try again. ' + err.message });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  },

  // Popup -> Background: Stop scraping
  STOP_SCRAPE: async (msg, sender, sendResponse) => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        const tabId = tabs[0].id;
        scrapeState.set(tabId, { running: false, mode: 'idle', count: scrapeState.get(tabId)?.count || 0, error: null });

        try {
          await chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_STOP' });
        } catch (_) {
          // content script may not be loaded, ignore
        }
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.STATE]: { running: false, mode: 'idle', count: 0 },
      });
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  },

  // Content -> Background: Incoming leads batch
  LEADS_BATCH: async (msg, sender, sendResponse) => {
    try {
      const { leads, processed } = msg;
      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        sendResponse({ success: true });
        return;
      }

      // Get existing leads from storage
      const existing = await chrome.storage.local.get([STORAGE_KEYS.LEADS, STORAGE_KEYS.PROCESSED]);
      const currentLeads = existing[STORAGE_KEYS.LEADS] || [];
      const currentProcessed = existing[STORAGE_KEYS.PROCESSED] || [];

      // Merge new leads (dedup by profile URL)
      const existingUrls = new Set(currentProcessed);
      const newLeads = leads.filter(l => {
        if (!l.profileUrl) return false;
        if (existingUrls.has(l.profileUrl)) return false;
        existingUrls.add(l.profileUrl);
        return true;
      });

      if (newLeads.length === 0) {
        sendResponse({ success: true, count: 0 });
        return;
      }

      const updatedLeads = [...currentLeads, ...newLeads];
      const updatedProcessed = Array.from(existingUrls);

      // Update tab count
      if (sender.tab) {
        const state = scrapeState.get(sender.tab.id) || { running: true, mode: 'unknown', count: 0, error: null };
        state.count += newLeads.length;
        scrapeState.set(sender.tab.id, state);
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.LEADS]: updatedLeads,
        [STORAGE_KEYS.PROCESSED]: updatedProcessed,
        [STORAGE_KEYS.STATE]: {
          running: scrapeState.get(sender.tab?.id)?.running || false,
          mode: scrapeState.get(sender.tab?.id)?.mode || 'unknown',
          count: updatedLeads.length,
        },
      });

      sendResponse({ success: true, count: newLeads.length });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  },

  // Content -> Background: Scrape complete
  SCRAPE_COMPLETE: async (msg, sender, sendResponse) => {
    try {
      if (sender.tab) {
        const state = scrapeState.get(sender.tab.id);
        if (state) {
          state.running = false;
        }
      }

      const currentState = await chrome.storage.local.get([STORAGE_KEYS.STATE]);
      const state = currentState[STORAGE_KEYS.STATE] || {};
      state.running = false;

      await chrome.storage.local.set({
        [STORAGE_KEYS.STATE]: state,
      });

      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  },

  // Popup -> Background: Get current state
  GET_STATE: async (msg, sender, sendResponse) => {
    try {
      const data = await chrome.storage.local.get([STORAGE_KEYS.STATE, STORAGE_KEYS.LEADS]);
      sendResponse({
        success: true,
        state: data[STORAGE_KEYS.STATE] || { running: false, mode: 'idle', count: 0 },
        totalLeads: (data[STORAGE_KEYS.LEADS] || []).length,
      });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  },

  // Popup -> Background: Clear all data
  CLEAR_DATA: async (msg, sender, sendResponse) => {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.LEADS]: [],
        [STORAGE_KEYS.STATE]: { running: false, mode: 'idle', count: 0 },
        [STORAGE_KEYS.PROCESSED]: [],
      });
      scrapeState.clear();
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  },

  // Popup -> Background: Get leads for CSV export
  GET_LEADS: async (msg, sender, sendResponse) => {
    try {
      const data = await chrome.storage.local.get([STORAGE_KEYS.LEADS]);
      sendResponse({ success: true, leads: data[STORAGE_KEYS.LEADS] || [] });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  },

  // Popup -> Background: Trigger CSV download
  EXPORT_CSV: async (msg, sender, sendResponse) => {
    try {
      const data = await chrome.storage.local.get([STORAGE_KEYS.LEADS]);
      const leads = data[STORAGE_KEYS.LEADS] || [];

      if (leads.length === 0) {
        sendResponse({ success: false, error: 'No leads to export.' });
        return;
      }

      const csvContent = generateCSV(leads);
      const blobUrl = URL.createObjectURL(new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' }));

      const downloadId = await chrome.downloads.download({
        url: blobUrl,
        filename: `facebook-leads-${Date.now()}.csv`,
        saveAs: true,
      });

      sendResponse({ success: true, downloadId });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  },
};

// ============================================================
// HELPERS
// ============================================================

function detectScrapeMode(url) {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('/about')) {
    return 'about';
  }
  if (lowerUrl.includes('/search/people')) {
    return 'search';
  }
  if ((lowerUrl.includes('/groups/') && lowerUrl.includes('/members')) ||
      (lowerUrl.includes('/groups/') && lowerUrl.includes('/people'))) {
    return 'group';
  }
  return null;
}

function generateCSV(leads) {
  const headers = [
    'Name',
    'Profile URL',
    'Email',
    'Phone',
    'Website',
    'Location',
    'Social Links',
    'Bio/About',
    'Workplace',
    'Education',
    'Scraped At',
  ];

  const rows = leads.map(l => [
    l.name || '',
    l.profileUrl || '',
    l.email || '',
    l.phone || '',
    l.website || '',
    l.location || '',
    Array.isArray(l.socialLinks) ? l.socialLinks.join('; ') : (l.socialLinks || ''),
    l.bio || '',
    l.workplace || '',
    l.education || '',
    l.scrapedAt || new Date().toISOString(),
  ]);

  const escapeCSV = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(r => r.map(escapeCSV).join(','));

  return [headerRow, ...dataRows].join('\n');
}

// Clean up blob URLs from downloads (surrogate cleanup)
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    // No-op; blob URLs are freed on tab close
  }
});

console.log('[FB Scraper] Background service worker initialized.');