// === Facebook Lead Scraper Pro — Popup Script ===

(function () {
  'use strict';

  // DOM references
  const dom = {
    btnStart: document.getElementById('btn-start'),
    btnStop: document.getElementById('btn-stop'),
    btnExport: document.getElementById('btn-export'),
    btnClear: document.getElementById('btn-clear'),
    modeBadge: document.getElementById('mode-badge'),
    modeDescription: document.getElementById('mode-description'),
    statusText: document.getElementById('status-text'),
    counterText: document.getElementById('counter-text'),
    progressContainer: document.getElementById('progress-container'),
    progressFill: document.getElementById('progress-fill'),
    progressCount: document.getElementById('progress-count'),
    progressBatch: document.getElementById('progress-batch'),
    previewCount: document.getElementById('preview-count'),
    leadsTbody: document.getElementById('leads-tbody'),
    emptyRow: document.getElementById('empty-row'),
    detectedMode: document.getElementById('detected-mode'),
  };

  let pollInterval = null;
  let currentLeads = [];

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    initPopup();
  });

  async function initPopup() {
    // Detect page mode from active tab URL
    await detectPageMode();
    // Get current state
    await refreshState();
    // Start polling for state changes
    startPolling();

    // Button handlers
    dom.btnStart.addEventListener('click', onStart);
    dom.btnStop.addEventListener('click', onStop);
    dom.btnExport.addEventListener('click', onExport);
    dom.btnClear.addEventListener('click', onClear);
  }

  // ============================================================
  // PAGE MODE DETECTION (from URL)
  // ============================================================
  async function detectPageMode() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || !tabs[0]) {
        setModeDescription('No active tab');
        return;
      }

      const url = tabs[0].url || '';
      if (!url.includes('facebook.com')) {
        setModeBadge('idle', 'Not Facebook');
        setModeDescription('⚠️ Navigate to a Facebook page');
        dom.btnStart.disabled = true;
        return;
      }

      const lower = url.toLowerCase();
      let mode = null;
      let label = '';

      if (lower.includes('/about')) {
        mode = 'about';
        label = '📄 Profile About Page';
      } else if (lower.includes('/search/people')) {
        mode = 'search';
        label = '🔎 Search Results';
      } else if ((lower.includes('/groups/') && lower.includes('/members')) ||
                 (lower.includes('/groups/') && lower.includes('/people'))) {
        mode = 'group';
        label = '👥 Group Members';
      } else {
        label = '❓ Unsupported page';
        dom.btnStart.disabled = true;
      }

      setModeBadge(mode || 'unsupported', mode || 'unsupported');
      setModeDescription(label);

      if (mode) {
        dom.btnStart.disabled = false;
        dom.btnStart.dataset.mode = mode;
      }
    } catch (err) {
      console.error('[FB Scraper Popup] Page detection error:', err);
      setModeDescription('Error detecting page');
    }
  }

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  async function refreshState() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (!resp || !resp.success) {
        setStatus('Error communicating with extension');
        return;
      }

      const state = resp.state;
      const total = resp.totalLeads || 0;

      // Update mode badge
      if (state.running) {
        setModeBadge('running', 'Running');
        dom.btnStart.disabled = true;
        dom.btnStop.disabled = false;
        dom.progressContainer.classList.remove('hidden');
      } else {
        setModeBadge(state.mode || 'idle', state.mode || 'Idle');
        dom.btnStart.disabled = false;
        dom.btnStop.disabled = true;
        dom.progressContainer.classList.add('hidden');
      }

      // Update counter
      dom.counterText.textContent = `${total} lead${total !== 1 ? 's' : ''}`;

      // Update progress
      if (state.running) {
        dom.progressCount.textContent = total;
        // Simulated progress (soft cap at 95% while running)
        const pct = Math.min(95, total > 0 ? (total % 100) : 5);
        dom.progressFill.style.width = `${pct}%`;
      }

      // Enable/disable buttons
      dom.btnExport.disabled = total === 0;
      dom.btnClear.disabled = total === 0;
      dom.previewCount.textContent = total;

      // Refresh table if we have leads
      if (total > 0) {
        const leadsResp = await chrome.runtime.sendMessage({ type: 'GET_LEADS' });
        if (leadsResp && leadsResp.success && leadsResp.leads) {
          currentLeads = leadsResp.leads;
          renderTable(currentLeads);
        }
      }
    } catch (err) {
      console.error('[FB Scraper Popup] State refresh error:', err);
      setStatus('Connection error');
    }
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(refreshState, 1500);
  }

  // ============================================================
  // HANDLERS
  // ============================================================
  async function onStart() {
    const mode = dom.btnStart.dataset.mode;
    if (!mode) return;

    dom.btnStart.disabled = true;
    setStatus('Starting scrape...');

    try {
      const resp = await chrome.runtime.sendMessage({ type: 'START_SCRAPE' });
      if (resp && resp.success) {
        setStatus(`Scraping in ${mode} mode`);
        dom.progressContainer.classList.remove('hidden');
        dom.progressFill.style.width = '5%';
      } else {
        setStatus(resp?.error || 'Failed to start');
        dom.btnStart.disabled = false;
      }
    } catch (err) {
      setStatus('Error: ' + err.message);
      dom.btnStart.disabled = false;
    }
  }

  async function onStop() {
    dom.btnStop.disabled = true;
    setStatus('Stopping...');

    try {
      const resp = await chrome.runtime.sendMessage({ type: 'STOP_SCRAPE' });
      if (resp && resp.success) {
        setStatus('Stopped');
        dom.progressFill.style.width = '100%';
        setTimeout(() => {
          dom.progressContainer.classList.add('hidden');
        }, 1000);
      }
    } catch (err) {
      setStatus('Error stopping');
      dom.btnStop.disabled = false;
    }
  }

  async function onExport() {
    dom.btnExport.disabled = true;
    setStatus('Generating CSV...');

    try {
      const resp = await chrome.runtime.sendMessage({ type: 'EXPORT_CSV' });
      if (resp && resp.success) {
        setStatus('CSV downloaded');
      } else {
        setStatus(resp?.error || 'Export failed');
        dom.btnExport.disabled = false;
      }
    } catch (err) {
      setStatus('Export error: ' + err.message);
      dom.btnExport.disabled = false;
    }

    setTimeout(() => dom.btnExport.disabled = currentLeads.length === 0, 2000);
  }

  async function onClear() {
    if (!confirm('Clear all collected leads?')) return;

    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_DATA' });
      currentLeads = [];
      renderTable([]);
      dom.counterText.textContent = '0 leads';
      dom.previewCount.textContent = '0';
      dom.btnExport.disabled = true;
      dom.btnClear.disabled = true;
      setStatus('Data cleared');
    } catch (err) {
      setStatus('Clear error: ' + err.message);
    }
  }

  // ============================================================
  // TABLE RENDERING
  // ============================================================
  function renderTable(leads) {
    const tbody = dom.leadsTbody;
    tbody.innerHTML = '';

    if (!leads || leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No leads yet. Start scraping!</td></tr>';
      return;
    }

    // Show last 20 leads (newest first)
    const displayLeads = leads.slice(-20).reverse();

    displayLeads.forEach(lead => {
      const tr = document.createElement('tr');

      const nameTd = document.createElement('td');
      const nameLink = document.createElement('a');
      nameLink.href = lead.profileUrl || '#';
      nameLink.textContent = lead.name || 'Unknown';
      nameLink.target = '_blank';
      nameLink.className = 'profile-link';
      nameLink.title = lead.profileUrl || '';
      nameTd.appendChild(nameLink);

      const emailTd = document.createElement('td');
      emailTd.textContent = lead.email || '-';
      emailTd.className = lead.email ? '' : 'text-muted';

      const phoneTd = document.createElement('td');
      phoneTd.textContent = lead.phone || '-';
      phoneTd.className = lead.phone ? '' : 'text-muted';

      const sourceTd = document.createElement('td');
      if (lead.website) {
        const webLink = document.createElement('a');
        webLink.href = lead.website;
        webLink.textContent = 'Website';
        webLink.target = '_blank';
        webLink.className = 'source-link';
        sourceTd.appendChild(webLink);
      } else if (lead.socialLinks && lead.socialLinks.length > 0) {
        sourceTd.textContent = lead.socialLinks[0].replace(/https?:\/\//, '').split('/')[0];
      } else if (lead.location) {
        sourceTd.textContent = '📍 ' + lead.location.split(',')[0];
      } else {
        sourceTd.textContent = '-';
        sourceTd.className = 'text-muted';
      }

      tr.appendChild(nameTd);
      tr.appendChild(emailTd);
      tr.appendChild(phoneTd);
      tr.appendChild(sourceTd);
      tbody.appendChild(tr);
    });
  }

  // ============================================================
  // UI HELPERS
  // ============================================================
  function setModeBadge(mode, text) {
    dom.modeBadge.textContent = text;
    dom.modeBadge.className = 'badge';
    if (mode === 'running') dom.modeBadge.classList.add('badge-running');
    else if (mode === 'about') dom.modeBadge.classList.add('badge-about');
    else if (mode === 'search') dom.modeBadge.classList.add('badge-search');
    else if (mode === 'group') dom.modeBadge.classList.add('badge-group');
    else dom.modeBadge.classList.add('badge-idle');
  }

  function setModeDescription(text) {
    dom.modeDescription.textContent = text;
  }

  function setStatus(text) {
    dom.statusText.textContent = text;
  }

  // Cleanup on unload
  window.addEventListener('unload', () => {
    if (pollInterval) clearInterval(pollInterval);
  });

  console.log('[FB Scraper Popup] Initialized.');
})();