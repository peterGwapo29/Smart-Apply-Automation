import { ActiveTabDetection } from '../types';

/**
 * Passively inspect the active browser tab without scraping or touching DOM.
 */
export async function detectActiveTabListing(): Promise<ActiveTabDetection> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
    return {
      isJobStreet: false,
      isListingPage: false,
      url: '',
      jobId: null,
    };
  }

  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      const url = activeTab?.url || '';

      if (!url) {
        resolve({
          isJobStreet: false,
          isListingPage: false,
          url: '',
          jobId: null,
        });
        return;
      }

      const isJobStreet = /jobstreet\.com|seek\.com/i.test(url);
      const match = url.match(/\/jobs?\/(\d+)/i);
      const jobId = match ? match[1] : null;
      const isListingPage = isJobStreet && Boolean(jobId);

      resolve({
        isJobStreet,
        isListingPage,
        url,
        jobId,
      });
    });
  });
}
