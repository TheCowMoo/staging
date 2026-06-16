// === Facebook Lead Scraper Pro — Content Script (MV3) ===
// Anti-obfuscation DOM extraction with human emulation

(function () {
  'use strict';

  let isRunning = false;
  let currentMode = null;
  let processedUrls = new Set();
  let scrollInterval = null;

  // ============================================================
  // UTILITY: Delay with jitter (human emulation)
  // ============================================================
  function delay(min, max) {
    const ms = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================
  // UTILITY: Randomized scroll with smooth behavior
  // ============================================================
  async function humanScroll(container, increments = 5) {
    for (let i = 0; i < increments && isRunning; i++) {
      const stepSize = Math.floor(Math.random() * 500 + 300); // 300-800px
      const jitter = Math.random() * 1500 + 500; // 0.5-2s jitter per step

      container.scrollBy({ top: stepSize, behavior: 'smooth' });
      await delay(1500, 4000); // 1.5-4s between scrolls

      // Check if we've reached the bottom
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 200) {
        break;
      }

      // Random pause (mimics reading)
      if (Math.random() < 0.2) {
        await delay(2000, 5000);
      }
    }
  }

  // ============================================================
  // UTILITY: Get scrollable container
  // ============================================================
  function getScrollContainer() {
    // Facebook main content area
    return (
      document.querySelector('[role="main"]') ||
      document.querySelector('[role="feed"]') ||
      document.querySelector('div[data-pagelet]') ||
      document.documentElement
    );
  }

  // ============================================================
  // EXTRACTION: Profile About Page
  // ============================================================
  async function extractAboutPage() {
    const lead = {
      name: '',
      profileUrl: window.location.href.split('?')[0].split('#')[0],
      email: '',
      phone: '',
      website: '',
      location: '',
      socialLinks: [],
      bio: '',
      workplace: '',
      education: '',
      scrapedAt: new Date().toISOString(),
    };

    try {
      // --- NAME ---
      // Try multiple selectors for the profile name
      const nameEl =
        document.querySelector('h1') ||
        document.querySelector('[data-testid="profile-name"]') ||
        document.querySelector('[role="main"] h2') ||
        document.querySelector('[role="heading"]');
      if (nameEl) {
        lead.name = nameEl.textContent.trim();
      }

      // --- EMAIL (mailto: links and text-based) ---
      const mailtoLinks = document.querySelectorAll('a[href*="mailto:"]');
      mailtoLinks.forEach(link => {
        const email = link.getAttribute('href').replace('mailto:', '').trim();
        if (email && email.includes('@')) {
          lead.email = email;
        }
      });

      if (!lead.email) {
        // Text-anchored XPath: find "Email" label then walk to value
        const emailNodes = document.evaluate(
          '//span[contains(text(),"Email")]/ancestor::div[1]//a[contains(@href,"mailto")]',
          document,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
          null
        );
        let node = emailNodes.iterateNext();
        if (node) {
          const href = node.getAttribute('href') || '';
          lead.email = href.replace('mailto:', '').trim();
        }
      }

      // Regex-based fallback for email in text
      if (!lead.email) {
        const bodyText = document.body.innerText || '';
        const emailMatch = bodyText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          lead.email = emailMatch[1];
        }
      }

      // --- PHONE (tel: links and text-based) ---
      const telLinks = document.querySelectorAll('a[href*="tel:"]');
      telLinks.forEach(link => {
        const phone = link.getAttribute('href').replace('tel:', '').trim();
        if (phone) {
          lead.phone = phone;
        }
      });

      if (!lead.phone) {
        const bodyText = document.body.innerText || '';
        const phoneMatch = bodyText.match(/(?:\+|\b)(\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/);
        if (phoneMatch) {
          lead.phone = phoneMatch[0].trim();
        }
      }

      // --- WEBSITE (globe icon or explicit link) ---
      // Strategy: find links containing common website patterns in the main content area
      const main = document.querySelector('[role="main"]') || document.body;
      const allLinks = main.querySelectorAll('a[href]');

      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent.trim().toLowerCase();

        // Globe SVG icon indicator (Facebook uses SVG paths for icons)
        const hasGlobeIcon = link.querySelector('svg') !== null &&
          (link.innerHTML.includes('world') || link.innerHTML.includes('globe') ||
           link.innerHTML.includes('M12') || link.innerHTML.includes('earth'));

        // Check if it's a normal website link (not Facebook internal)
        if (hasGlobeIcon || text.includes('website') || text.includes('site') ||
            (href.startsWith('http') && !href.includes('facebook.com'))) {
          if (!href.includes('facebook.com') && !href.includes('l.facebook.com')) {
            const cleanUrl = href.split('?')[0];
            if (cleanUrl.startsWith('http') && cleanUrl !== lead.profileUrl) {
              lead.website = cleanUrl;
            }
          }
        }
      });

      // --- LOCATION (text-anchored extraction) ---
      const locationIndicators = ['Lives in', 'From', 'Location', 'City', 'Hometown'];
      locationIndicators.forEach(indicator => {
        if (lead.location) return;
        const xpath = `//span[contains(text(),'${indicator}')]/following-sibling::span[1] | //span[contains(text(),'${indicator}')]/../following-sibling::div[1]//span`;
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        if (result.singleNodeValue) {
          const text = result.singleNodeValue.textContent.trim();
          if (text && !text.includes(indicator)) {
            lead.location = text;
          }
        }
      });

      if (!lead.location) {
        // Fallback: find "Lives in" or "From" in text
        const spans = main.querySelectorAll('span, div');
        for (const el of spans) {
          const text = el.textContent.trim();
          if (text.startsWith('Lives in ') && text.length > 9) {
            lead.location = text.replace('Lives in ', '').trim();
            break;
          }
          if (text.startsWith('From ') && text.length > 5) {
            lead.location = text.replace('From ', '').trim();
            break;
          }
        }
      }

      // --- SOCIAL LINKS (Instagram, Twitter, etc.) ---
      const socialDomains = ['instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com',
        'tiktok.com', 'snapchat.com', 'pinterest.com', 'github.com'];
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        for (const domain of socialDomains) {
          if (href.includes(domain) && !lead.socialLinks.some(s => s.includes(domain))) {
            lead.socialLinks.push(href.split('?')[0]);
            break;
          }
        }
      });

      // --- BIO / ABOUT (text-blocks around "About" or "Intro") ---
      const bioSelectors = [
        '[data-testid="profile_about_overview_bio"]',
        'div[data-pagelet="ProfileTabs"]',
      ];
      for (const sel of bioSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const bioText = el.textContent.trim();
          if (bioText && bioText.length > 10) {
            lead.bio = bioText;
            break;
        }
      }}

      if (!lead.bio) {
        // XPath: find "About" heading then get sibling content
        const aboutSection = document.evaluate(
          '//span[contains(text(),"About")]/ancestor::div[3]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        if (aboutSection.singleNodeValue) {
          const paragraphs = aboutSection.singleNodeValue.querySelectorAll('div[dir="auto"]');
          const bioParts = [];
          paragraphs.forEach(p => {
            const t = p.textContent.trim();
            if (t && t.length > 5 && !t.startsWith('About')) bioParts.push(t);
          });
          if (bioParts.length > 0) lead.bio = bioParts.join('\n');
        }
      }

      // --- WORKPLACE ---
      const workIndicators = ['Works at', 'Workplace', 'Company', 'Employment'];
      workIndicators.forEach(indicator => {
        if (lead.workplace) return;
        const spans = main.querySelectorAll('span, div');
        for (const el of spans) {
          const text = el.textContent.trim();
          if (text.startsWith(indicator) || text.includes(indicator)) {
            // Get next meaningful sibling or parent container text
            const parent = el.closest('div[dir="auto"]') || el.parentElement;
            if (parent) {
              const fullText = parent.textContent.trim();
              if (fullText.length > indicator.length && fullText.length < 200) {
                lead.workplace = fullText;
                break;
              }
            }
          }
        }
        if (lead.workplace) return;
      });

      // --- EDUCATION ---
      const eduIndicators = ['Studied at', 'Went to', 'Education', 'School', 'University', 'College'];
      eduIndicators.forEach(indicator => {
        if (lead.education) return;
        const spans = main.querySelectorAll('span, div');
        for (const el of spans) {
          const text = el.textContent.trim();
          if (text.startsWith(indicator) || text.includes(indicator)) {
            const parent = el.closest('div[dir="auto"]') || el.parentElement;
            if (parent) {
              const fullText = parent.textContent.trim();
              if (fullText.length > indicator.length && fullText.length < 200) {
                lead.education = fullText;
                break;
              }
            }
          }
        }
        if (lead.education) return;
      });

    } catch (err) {
      console.error('[FB Scraper] About page extraction error:', err);
    }

    return lead;
  }

  // ============================================================
  // EXTRACTION: Search Results Page
  // ============================================================
  async function extractSearchResults() {
    const leads = [];
    const main = document.querySelector('[role="main"]') || document.body;

    try {
      // Facebook search results are typically in <div> elements with links to profiles
      // Look for profile links within the search results area
      const profileCards = [];

      // Strategy 1: Find all links that look like profile URLs
      const links = main.querySelectorAll('a[href*="/user/"], a[href*="profile.php"], a[href*="/photo/"]');
      const seen = new Set();

      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        let profileUrl = '';

        // Extract profile URL
        if (href.includes('/user/')) {
          profileUrl = href.includes('http') ? href.split('?')[0] : 'https://www.facebook.com' + href.split('?')[0];
        } else if (href.includes('profile.php')) {
          profileUrl = href.includes('http') ? href.split('&')[0] : 'https://www.facebook.com' + href.split('&')[0];
        }

        if (!profileUrl || seen.has(profileUrl)) return;
        seen.add(profileUrl);

        // Extract name from the link or parent
        const name = link.getAttribute('aria-label') ||
          link.querySelector('span')?.textContent?.trim() ||
          link.textContent.trim() ||
          '';

        if (name && name.length > 0 && name.length < 100) {
          // Find the card container for additional info
          const card = link.closest('[role="article"]') || link.closest('div[style]') || link.parentElement;

          profileCards.push({
            element: card || link,
            profileUrl,
            name,
          });
        }
      });

      // If no profile urls with /user/ pattern, try broader search
      if (profileCards.length === 0) {
        // Look for search result cards more generically
        const articles = main.querySelectorAll('[role="article"]');
        articles.forEach(article => {
          const articleLinks = article.querySelectorAll('a[href*="facebook.com"]');
          articleLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const cleanHref = href.split('?')[0];

            // Filter to actual profile links
            if (cleanHref.match(/facebook\.com\/[\w.]+\/?$/) && !cleanHref.includes('/photo')) {
              if (seen.has(cleanHref)) return;
              seen.add(cleanHref);

              const name = link.getAttribute('aria-label') ||
                link.querySelector('span')?.textContent?.trim() ||
                link.textContent.trim();

              if (name && name.length < 100) {
                profileCards.push({
                  element: article,
                  profileUrl: cleanHref,
                  name: name,
                });
              }
            }
          });
        });
      }

      // Process each profile card
      for (const card of profileCards) {
        if (!isRunning) break;

        // Skip if already processed
        if (processedUrls.has(card.profileUrl)) continue;

        const lead = {
          name: card.name || '',
          profileUrl: card.profileUrl,
          email: '',
          phone: '',
          website: '',
          location: '',
          socialLinks: [],
          bio: '',
          workplace: '',
          education: '',
          scrapedAt: new Date().toISOString(),
        };

        // Extract additional info from the card
        if (card.element) {
          const cardText = card.element.textContent || '';

          // Try to extract location from card
          const locMatch = cardText.match(/(?:Lives in|From|Location)[:\s]+([^\n,]+)/i);
          if (locMatch) lead.location = locMatch[1].trim();

          // Try to extract workplace
          const workMatch = cardText.match(/(?:Works at|Workplace)[:\s]+([^\n,]+)/i);
          if (workMatch) lead.workplace = workMatch[1].trim();

          // Try to extract education
          const eduMatch = cardText.match(/(?:Studied at|Went to|Education)[:\s]+([^\n,]+)/i);
          if (eduMatch) lead.education = eduMatch[1].trim();

          // Extract mutual friends (not critical but useful)
          // No explicit field for this in our schema, skip
        }

        processedUrls.add(card.profileUrl);
        leads.push(lead);

        // Human-like delay between processing cards
        await delay(500, 1500);
      }

    } catch (err) {
      console.error('[FB Scraper] Search extraction error:', err);
    }

    return leads;
  }

  // ============================================================
  // EXTRACTION: Group Members Page
  // ============================================================
  async function extractGroupMembers() {
    const leads = [];
    const main = document.querySelector('[role="main"]') || document.body;

    try {
      // Facebook group member lists
      const memberCards = [];
      const seen = new Set();

      // Strategy: Find member cards by looking for profile links within the group member area
      const allLinks = main.querySelectorAll('a[href*="facebook.com/"]');

      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const cleanHref = href.split('?')[0];

        // Match profile links: /username or /profile.php?id=
        if (!cleanHref.match(/facebook\.com\/[\w.]+\/?$/) && !cleanHref.includes('profile.php')) return;
        if (cleanHref.includes('/photo/') || cleanHref.includes('/video/') || cleanHref.includes('/posts/')) return;
        if (seen.has(cleanHref)) return;
        seen.add(cleanHref);

        const name = link.getAttribute('aria-label') ||
          link.querySelector('span')?.textContent?.trim() ||
          link.textContent.trim() ||
          '';

        if (name && name.length > 0 && name.length < 100) {
          const card = link.closest('[role="listitem"]') ||
            link.closest('[role="article"]') ||
            link.closest('div[style]') ||
            null;

          memberCards.push({
            element: card,
            profileUrl: cleanHref,
            name: name,
          });
        }
      });

      // If no direct matches, try role="listitem" containers
      if (memberCards.length === 0) {
        const items = main.querySelectorAll('[role="listitem"]');
        items.forEach(item => {
          const itemLinks = item.querySelectorAll('a[href]');
          itemLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const cleanHref = href.includes('http') ? href.split('?')[0] : 'https://www.facebook.com' + href.split('?')[0];

            if (!cleanHref.match(/facebook\.com\/[\w.]+\/?$/) && !cleanHref.includes('profile.php')) return;
            if (seen.has(cleanHref)) return;
            seen.add(cleanHref);

            const name = link.getAttribute('aria-label') ||
              item.querySelector('span')?.textContent?.trim() ||
              '';

            if (name && name.length < 100) {
              memberCards.push({
                element: item,
                profileUrl: cleanHref,
                name: name,
              });
            }
          });
        });
      }

      // Process each member card
      for (const card of memberCards) {
        if (!isRunning) break;
        if (processedUrls.has(card.profileUrl)) continue;

        const lead = {
          name: card.name || '',
          profileUrl: card.profileUrl,
          email: '',
          phone: '',
          website: '',
          location: '',
          socialLinks: [],
          bio: '',
          workplace: '',
          education: '',
          scrapedAt: new Date().toISOString(),
        };

        // Extract any additional info from the card
        if (card.element) {
          const cardText = card.element.textContent || '';

          const locMatch = cardText.match(/(?:Lives in|From|Location)[:\s]+([^\n,]+)/i);
          if (locMatch) lead.location = locMatch[1].trim();

          const workMatch = cardText.match(/(?:Works at|Workplace)[:\s]+([^\n,]+)/i);
          if (workMatch) lead.workplace = workMatch[1].trim();
        }

        processedUrls.add(card.profileUrl);
        leads.push(lead);
        await delay(300, 1000);
      }

    } catch (err) {
      console.error('[FB Scraper] Group extraction error:', err);
    }

    return leads;
  }

  // ============================================================
  // SCROLL + EXTRACT LOOP (Human emulation batched scrolling)
  // ============================================================
  async function scrapeLoop(mode) {
    const container = getScrollContainer();

    // Initial extraction
    await delay(1000, 3000);

    let batchCount = 0;
    const maxBatches = 30; // Safety limit

    while (isRunning && batchCount < maxBatches) {
      batchCount++;

      let leads = [];

      switch (mode) {
        case 'about':
          const aboutLead = await extractAboutPage();
          if (aboutLead && aboutLead.name && !processedUrls.has(aboutLead.profileUrl)) {
            processedUrls.add(aboutLead.profileUrl);
            leads = [aboutLead];
          }
          break;
        case 'search':
          leads = await extractSearchResults();
          break;
        case 'group':
          leads = await extractGroupMembers();
          break;
        default:
          isRunning = false;
          return;
      }

      // Send batch to background
      if (leads.length > 0) {
        try {
          await chrome.runtime.sendMessage({
            type: 'LEADS_BATCH',
            leads: leads,
            processed: Array.from(processedUrls),
          });
        } catch (err) {
          // Extension context may have been invalidated
          if (err.message.includes('Extension context invalidated')) {
            isRunning = false;
            return;
          }
          console.warn('[FB Scraper] Failed to send batch:', err);
        }

        // Batch pause (human emulation)
        await delay(2000, 5000);
      }

      // Scroll for more content (only for search and group modes)
      if (mode === 'search' || mode === 'group') {
        await humanScroll(container, 3 + Math.floor(Math.random() * 3));

        // Wait for lazy-loaded content to render
        await delay(2000, 4000);
      } else {
        // For about page, we only need one pass
        break;
      }

      // Random longer pause every 5 batches
      if (batchCount % 5 === 0) {
        await delay(4000, 8000);
      }
    }

    // Signal completion
    isRunning = false;
    try {
      await chrome.runtime.sendMessage({ type: 'SCRAPE_COMPLETE' });
    } catch (_) {}
  }

  // ============================================================
  // MESSAGE LISTENER (from background.js)
  // ============================================================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'SCRAPE_START':
        if (isRunning) {
          sendResponse({ success: false, error: 'Scraping already in progress.' });
          return;
        }

        // Load existing processed URLs from storage
        chrome.storage.local.get(['fbscraperProcessed'], (result) => {
          const stored = result.fbscraperProcessed || [];
          processedUrls = new Set(stored);

          currentMode = message.mode;
          isRunning = true;

          // Fire-and-forget the scrape loop (async)
          scrapeLoop(message.mode);

          sendResponse({ success: true });
        });
        return true; // Keep channel open

      case 'SCRAPE_STOP':
        isRunning = false;
        currentMode = null;
        sendResponse({ success: true });
        break;

      default:
        break;
    }
  });

  console.log('[FB Scraper] Content script loaded. Ready.');
})();