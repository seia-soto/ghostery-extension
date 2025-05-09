/**
 * Ghostery Browser Extension
 * https://www.ghostery.com/
 *
 * Copyright 2017-present Ghostery GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0
 */

import { setLogLevel, describeLoggers } from '@whotracksme/reporting/reporting';

import asyncSetup from '/utils/setup.js';
import debug from '/utils/debug.js';
import * as OptionsObserver from '/utils/options-observer.js';
import { isFirefox } from '/utils/browser-info.js';

import config from './config.js';
import communication from './communication.js';
import urlReporter from './url-reporter.js';
import webRequestReporter from './webrequest-reporter.js';

(async () => {
  try {
    const key = 'ghosteryReportingLoggerConfig';
    const { [key]: config } = (await chrome.storage.local.get(key)) || {};
    if (config) {
      for (const { level, prefix = '*' } of config) {
        setLogLevel(level, { prefix });
      }
    } else {
      setLogLevel('off');
    }
  } catch (e) {
    console.warn('Failed to apply logger overwrites', e);
  }
})();

const setup = asyncSetup('reporting', [
  OptionsObserver.addListener(async function reporting({ terms }) {
    if (terms && !isFirefox()) {
      if (webRequestReporter) {
        webRequestReporter.init().catch((e) => {
          console.warn(
            'Failed to initialize request reporting. Leaving the module disabled and continue.',
            e,
          );
        });
      }
      await urlReporter.init().catch((e) => {
        console.warn(
          'Failed to initialize reporting. Leaving the module disabled and continue.',
          e,
        );
      });
    } else {
      try {
        urlReporter.unload();
      } catch (e) {
        console.error(e);
      }
      try {
        webRequestReporter?.unload();
      } catch (e) {
        console.error(e);
      }
    }
  }),
]);

async function onLocationChange(details) {
  try {
    setup.pending && (await setup.pending);
  } catch (e) {
    console.warn('Reporting is unavailable:', e);
    return;
  }

  if (!urlReporter.isActive) return;

  const { url, frameId, tabId } = details;
  if (frameId !== 0 || url === 'about:blank' || url.startsWith('chrome://')) {
    return;
  }

  // Be aware that the documentation of webNavigation.onCommitted is incomplete
  // (https://developer.chrome.com/docs/extensions/reference/webNavigation/#event-onCommitted):
  //
  // > Fired when a navigation is committed. The document (and the resources
  // > it refers to, such as images and subframes) might still be downloading,
  // > but at least part of the document has been received from the server and
  // > the browser has decided to switch to the new document.
  //
  // In practice, the event may also trigger for prefetch requests for which
  // no tab exists. For instance, it can be reproduced in Chrome by starting
  // a Google search from the address bar. Under certain conditions, the first
  // search result triggers an extra onCommitted event (even if the user didn't
  // click on the link yet).
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab) {
    return;
  }

  // Don't leak information in private tabs (neither by storing on disk nor
  // by initiating HTTP requests).
  if (tab.incognito) {
    return;
  }

  try {
    await urlReporter.analyzeUrl(url);
  } catch (e) {
    console.warn('Unexpected error in reporting module:', e);
  }
}

chrome.webNavigation.onCommitted.addListener(onLocationChange);

if (__PLATFORM__ === 'chromium' || __PLATFORM__ === 'firefox') {
  chrome.webNavigation.onHistoryStateUpdated.addListener(onLocationChange);
}

debug.WTM = {
  communication,
  urlReporter,
  config,
  webRequestReporter,
  extensionStartedAt: new Date(),
  logging: {
    setLogLevel,
    describeLoggers,
  },
};
