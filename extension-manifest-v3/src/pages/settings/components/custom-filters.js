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

import { html } from 'hybrids';
import { detectFilterType } from '@cliqz/adblocker';

const filterTypes = {
  NOT_SUPPORTED: 0,
  NETWORK: 1,
  COSMETIC: 2,
};

class ConversionResult {
  errors = [];
  isNetworkConversionReady = false;
  isCosmeticConversionReady = false;

  get isReady() {
    return this.isNetworkConversionReady && this.isCosmeticConversionReady;
  }
}

async function updateCustomFilters(host) {
  const filters = host.querySelector('textarea').value || '';
  host.conversion = filters;
  return;
}

function onConvertedRules(host, event) {
  console.warn('XXXXXadsadas', event.data);
  if (!event.data.rules || !event.data.errors) {
    return;
  }
  host.conversionResult.isNetworkConversionReady = true;
  host.conversionResult.errors.push('asdsasadas');
  if (event.data.errors.length > 0) {
    host.conversionResult.errors.push(...event.data.errors);
  }
}

function onTextareaUpdate(host) {
  host.isEditing = true;
}

export default {
  isEditing: false,
  conversion: {
    set(host, input = '') {
      if (!input) {
        return;
      }
      console.warn('XXXX', host, input);
      host.isEditing = false;
      host.conversionResult = new ConversionResult();

      const networkFilters = [];
      const cosmeticFilters = [];

      for (const filter of input.split('\n')) {
        const filterType = detectFilterType(filter);
        switch (filterType) {
          case filterTypes.COSMETIC:
            cosmeticFilters.push(filter);
            break;
          case filterTypes.NETWORK:
            networkFilters.push(filter);
            break;
          default:
            host.conversionResult.errors.push(
              `Filter not supported: '${filter}'`,
            );
        }
      }
      host.conversionResult.isCosmeticConversionReady = true;
      console.warn('XXXX20')
      host.converter.contentWindow.postMessage(
        {
          action: 'convert',
          converter: 'adguard',
          filters: networkFilters,
        },
        '*',
      );
    },
  },
  converter: {
    get(host) {
      return host.querySelector('iframe');
    },
    connect(host) {
      const onMessage = onConvertedRules.bind(null, host);

      window.addEventListener('message', onMessage);

      return () => {
        window.removeEventListener('message', onMessage);
      };
    },
  },
  filters: {
    get() {
      const filters = localStorage.getItem('filters') || '';
      return filters;
    },
    set(_, value) {
      if (value === undefined) {
        return;
      }
      localStorage.setItem('filters', value);
    },
  },
  content: ({ filters, conversionResult, isEditing, conversion }) => html`
    <template layout="column gap:3">
      <iframe
        layout="hidden"
        src="https://ghostery.github.io/urlfilter2dnr/"
      ></iframe>
      <textarea rows="10" oninput="${onTextareaUpdate}">${filters}</textarea>
      <div layout="row gap items:center">
        <ui-button
          size="small"
          type="outline"
          onclick="${updateCustomFilters}"
          layout="shrink:0"
        >
          <button>Update</button>
        </ui-button>
        <section layout="row gap items:center">
          ${isEditing
            ? html`<span>Changes not saved</span>`
            : conversion &&
              html.resolve(
                conversion
                  .then((value) => html`<div>${value}</div>`)
                  .catch(
                    () => html`
                      <ul>
                        ${conversionResult.errors.map(
                          (error) =>
                            html`<li>
                              <ui-text color="danger-500">${error}</ui-text>
                            </li>`,
                        )}
                      </ul>
                    `,
                  ),
              )}
        </section>
      </div>
    </template>
  `,
};
