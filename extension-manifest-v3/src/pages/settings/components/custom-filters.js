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

class FilterType {
  NOT_SUPPORTED = 0;
  NETWORK = 1;
  COSMETIC = 2;
}

async function updateCustomFilters(host) {
  const filters = host.querySelector('textarea').value || '';
  host.filters = filters;

  const networkFilters = [];
  const cosmeticFilters = [];

  for (const filter of filters.split('\n')) {
    const filterType = detectFilterType(filter);
    switch (filterType) {
      case FilterType.COSMETIC:
        cosmeticFilters.push(filter);
        break;
      case FilterType.NETWORK:
        networkFilters.push(filter);
        break;
      default:
        host.hasError = true;
        host.status = `${host.status}\nFilter not supported: '${filter}'`;
    }
  }

  host.converter.contentWindow.postMessage(
    {
      action: 'convert',
      converter: 'adguard',
      filters: networkFilters,
    },
    '*',
  );
}

function onConvertedRules(host, event) {
  if (!event.data.rules || !event.data.errors) {
    return;
  }
  if (event.data.errors.length > 0) {
    host.status = event.data.errors.join('\n');
    host.hasError = true;
  } else {
    host.status = 'All filters are correct';
    host.hasError = false;
  }
}

function onTextareaUpdate(host) {
  host.hasError = false;
  host.status = 'Changes not saved';
}

export default {
  status: '',
  hasError: false,
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
  content: ({ filters, status, hasError }) => html`
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
          ${hasError
            ? html`
                <ul>
                  ${status.split('\n').map(
                    (error) =>
                      html`<li>
                        <ui-text color="danger-500">${error}</ui-text>
                      </li>`,
                  )}
                </ul>
              `
            : html`<span>${status}</span>`}
        </section>
      </div>
    </template>
  `,
};
