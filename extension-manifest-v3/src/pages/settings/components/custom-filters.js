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
import { detectFilterType } from '@cliqz/adblocker';

function onConvertedRules(host, event) {
  if (!event.data.rules || !event.data.errors) {
    return;
  }

  console.log("DNR converstion", event.data)
  if (event.data.errors.length > 0) {
    // host.conversionResult.errors.push(...event.data.errors);
  }
}

function updateCustomFilters(host) {
  store.submit(host.input);
}

const CustomFiltersInput = {
  id: true,
  text: '',
  [store.connect]: {
    async get() {
      const storage = await chrome.storage.local.get(['custom-filters-input']);
      return {
        text: storage['custom-filters-input'] || '',
        id: 1,
      };
    },
    async set(_, { text }) {
      await chrome.storage.local.set({ 'custom-filters-input': text });
      return { text, id: 1, };
    },
  },
};

export default {
  input: store(CustomFiltersInput, { draft: true, id: () => 1 }),
  errors: { set: (_, values = []) => values },
  output: async (host) => {
    const { text } = await store.resolve(host.input);
    const filters = text.split('\n').map(f => f.trim()).filter(Boolean);

    const output = {
      networkFilters: [],
      cosmeticFilters: [],
      dnrRules: {},
      errors: [],
    };

    for (const filter of filters) {
      const filterType = detectFilterType(filter);
      switch (filterType) {
        case 1: // NETWORK
          output.networkFilters.push(filter);
          break;
        case 2: // COSMETIC
          output.cosmeticFilters.push(filter);
          break;
        default:
          output.errors.push(
            `Filter not supported: '${filter}'`,
          );
      }
    }

    const { convert } = await host.converter;
    for (const networkFilter of output.networkFilters) {
      convert(networkFilter);
    }

    return output;
  },
  converter: {
    async get(host) {
      return new Promise(resolve => {
        const iframe = host.querySelector('iframe');
        const convert = (filter) => {
          iframe.contentWindow.postMessage(
            {
              action: 'convert',
              converter: 'adguard',
              filters: [filter],
            },
            '*',
          );
        };
        iframe.addEventListener('load', () => {
          resolve({ convert });
        });
      })
    },
    connect(host) {
      const onMessage = onConvertedRules.bind(null, host);

      window.addEventListener('message', onMessage);

      return () => {
        window.removeEventListener('message', onMessage);
      };
    },
  },
  content: ({ input, output }) => html`
    <template layout="column gap:3">
      <iframe
        layout="hidden"
        src="https://ghostery.github.io/urlfilter2dnr/"
      ></iframe>
      ${store.ready(input) && html`
        <textarea rows="10" oninput="${html.set(input, 'text')}">${input.text}</textarea>
      `}
      <div layout="row gap items:center">
        <ui-button
          size="small"
          type="outline"
          onclick="${updateCustomFilters}"
          layout="shrink:0"
        >
          <button>Update</button>
        </ui-button>
        ${html.resolve(
          output.then(({ networkFilters, cosmeticFilters, errors }) => html`
            <section layout="row gap items:center">
              <ul>
                ${errors.map(
                  (error) =>
                    html`<li>
                      <ui-text color="danger-500">${error}</ui-text>
                    </li>`,
                )}
              </ul>
            </section>
            <section layout="row gap items:center">
              Network filters: ${networkFilters.length}
              Cosmetic filters: ${cosmeticFilters.length}
            </section>
          `)
        )}
      </div>
    </template>
  `,
};
