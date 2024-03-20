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

import { html, store } from 'hybrids';

import Activities from '../store/activities.js';

const styles = `
html, body {
  padding: 0;
  margin: 0;
  line-height: 1.6em;
  box-sizing: border-box;
}

ul, ol, li, p {
  list-style: none;
  padding: 0;
  margin: 0;
}

.vstack {
  display: flex;
  flex-direction: column;
}

.hstack {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 2px;
}

article {
  max-height: 100vh;
  overflow: hidden;
}

header {
  flex-shrink: 0;
}

label {
  display: flex;
  padding: 4px;
  margin: 6px 2px;
}

span.label {
  border-radius: 8px;
  border: grey 1px solid;
  padding: 2px 10px;
  margin: 2px 4px;
  background: rgba(0,0,0,.04);
}

header > ul {
  border-bottom: lightgrey solid 1px;
}

ol {
  display: flex;
  flex-direction: column;
  flex-grow: 1;

  overflow: auto;
}

ol > li {
  padding: 4px 8px;
}
`;

/**
 * @param {string} rulePath
 */
async function getDnrRules(rulePath) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        action: 'getDnrRules',
        rulePath,
      },
      function (response) {
        console.log(
          `got ${response.length} bytes from background service worker by requesting getDnrRules:${rulePath}`,
        );

        resolve(response);
      },
    );
  });
}

async function prefetchDnrRules() {
  store.set(Activities, {
    hasLoadedResources: true,
  });

  const resources = [];

  for (const key of ['ads', 'annoyances', 'tracking']) {
    const rules = await getDnrRules(`rule_resources/dnr-${key}.json`);

    if (typeof rules === 'string') {
      continue;
    }

    resources.push({
      name: key,
      rules: JSON.stringify(rules),
    });
  }

  store.set(Activities, {
    resources,
  });
}

function getPrefetchedDnrRules() {
  const { resources } = store.get(Activities);

  return resources.map((resource) => ({
    ...resource,
    rules: JSON.parse(resource.rules),
  }));
}

async function testMatchOutcome(request) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        action: 'testMatchOutcome',
        request,
      },
      function (response) {
        resolve(response);
      },
    );
  });
}

/**
 * @param {string} type
 */
function refineRequestType(type) {
  if (type === 'xhr' || type === 'fetch') {
    return 'xmlhttprequest';
  }

  if (type === 'document') {
    return 'main_frame';
  }

  if (
    type === 'sm-script' ||
    type === 'sm-stylesheet' ||
    type === 'signed-exchange'
  ) {
    return 'others';
  }

  if (type === 'csp-violation-report') {
    return 'csp_report';
  }

  return type;
}

/**
 * @param {string} expression
 */
async function evalInInspectedWindow(expression) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(expression, (result, exception) => {
      if (exception) {
        return reject(exception);
      }

      resolve(result);
    });
  });
}

/**
 * @param {chrome.devtools.network.Request} log
 */
async function addRequest({
  request,
  _resourceType: resourceType,
  response,
  ...log
}) {
  if (resourceType === 'ping') {
    return;
  }

  const initiatorUrl =
    log._initiator.url ?? (await evalInInspectedWindow('location.href'));

  resourceType = refineRequestType(resourceType);

  // Find matched rules
  const resources = getPrefetchedDnrRules();
  const testResult = await testMatchOutcome({
    initiator: initiatorUrl,
    method: request.method.toLowerCase(),
    type: resourceType,
    url: request.url,
  });
  const filters = testResult.matchedRules.map((match) => {
    const resource = resources.find(
      (resource) => resource.name === match.rulesetId,
    );

    if (!resource) {
      return {};
    }

    return resource.rules.find((rule) => rule.id === match.ruleId);
  });

  store.set(Activities, {
    requests: [
      {
        url: request.url,
        method: request.method,
        resourceType,
        initiatorUrl,
        status: response.status,
        filters,
      },
      ...store.get(Activities).requests,
    ],
  });
}

function clearRequests() {
  store.set(Activities, {
    requests: [],
  });
}

chrome.devtools.network.onRequestFinished.addListener(addRequest);
chrome.devtools.network.onNavigated.addListener(clearRequests);

export default {
  activities: store(Activities),
  /**
   * @param {Object} param0
   * @param {Activities} param0.activities
   * @returns
   */
  content: ({ activities }) => {
    if (!activities.hasLoadedResources) {
      void prefetchDnrRules();
    }

    return html`
      <article class="vstack">
        <header>
          <ul class="hstack">
            <li>
              <label>
                <input type="checkbox" />
                Blocked
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" />
                Network filters
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" />
                Cosmetic filters
              </label>
            </li>
          </ul>
        </header>
        <ol>
          ${activities.requests.map(
            (request) => html`<li>
              <p><strong>${request.resourceType}</strong></p>
              <p>${request.url}</p>
            </li>`,
          )}
        </ol>
      </article>
    `.style(styles);
  },
};
