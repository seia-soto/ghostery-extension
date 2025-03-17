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

import { html, store, router, msg } from 'hybrids';

import * as labels from '/ui/labels.js';
import Options from '/store/options.js';
import REGIONS from '/utils/regions.js';

const SAFARI_MAX_RULES = 75000;

function calculateRulesUsed(options) {
  let used = __RULE_COUNTS__.fixes || 0;
  if (options.blockAds) {
    used += __RULE_COUNTS__.ads || 0;
  }
  if (options.blockAnnoyances) {
    used += __RULE_COUNTS__.annoyances || 0;
  }
  for (const region of options.regionalFilters.regions) {
    used += __RULE_COUNTS__[`lang-${region}`] || 0;
  }
  return used;
}

function setRegion(id) {
  return ({ options }, event) => {
    const set = new Set(options.regionalFilters.regions);

    if (event.target.checked) {
      set.add(id);
    } else {
      set.delete(id);
    }

    store.set(options, { regionalFilters: { regions: [...set].sort() } });
  };
}

export default {
  options: store(Options),
  render: ({ options }) => {
    const rulesUsed = calculateRulesUsed(options);

    return html`
      <template layout="contents">
        <settings-page-layout layout="column gap:4">
          ${store.ready(options) &&
          html`
            <section layout="column gap:4">
              <div layout="column gap" layout@992px="margin:bottom">
                <ui-action>
                  <a href="${router.backUrl()}" layout="self:start padding">
                    <ui-text type="label-s" layout="row gap items:center">
                      <ui-icon name="chevron-left"></ui-icon> Back
                    </ui-text>
                  </a>
                </ui-action>
                <ui-text type="headline-m">Regional Filters</ui-text>
                <ui-text type="body-l" mobile-type="body-m" color="secondary">
                  Blocks additional ads, trackers, and pop-ups specific to the
                  language of websites you visit. Enable only the languages you
                  need to avoid slowing down your browser.
                </ui-text>
              </div>
              <settings-card in-content>
                <ui-toggle
                  value="${options.regionalFilters.enabled}"
                  onchange="${html.set(options, 'regionalFilters.enabled')}"
                  data-qa="toggle:regional-filters"
                >
                  <div layout="column grow gap:0.5">
                    <div layout="row gap items:center">
                      <ui-icon
                        name="pin"
                        color="quaternary"
                        layout="size:3"
                      ></ui-icon>
                      <ui-text type="headline-xs">
                        <!-- Enable "feature name" -->
                        Enable ${msg`Regional Filters`}
                      </ui-text>
                    </div>
                  </div>
                </ui-toggle>
              </settings-card>
              ${options.regionalFilters.enabled &&
              html`
                ${__PLATFORM__ === 'safari' &&
                html`<p>${rulesUsed} used of ${SAFARI_MAX_RULES} rules</p>
                  ${rulesUsed > SAFARI_MAX_RULES &&
                  html`<p>Some rules will not be applied!</p>`}
                  <progress
                    max="${SAFARI_MAX_RULES}"
                    value="${calculateRulesUsed(options)}"
                  />`}
                <div
                  layout="grid:repeat(auto-fill,minmax(140px,1fr)) gap:1:0.5"
                >
                  ${REGIONS.map(
                    (id) => html`
                      <label
                        layout="row gap items:center ::user-select:none padding:0.5"
                      >
                        <ui-input>
                          <input
                            type="checkbox"
                            disabled="${!options.regionalFilters.enabled}"
                            checked="${options.regionalFilters.regions.includes(
                              id,
                            )}"
                            onchange="${setRegion(id)}"
                            data-qa="checkbox:regional-filters:${id}"
                          />
                        </ui-input>
                        <ui-text type="body-s" color="secondary">
                          ${labels.languages.of(id.toUpperCase())} (${id})
                        </ui-text>
                      </label>
                    `,
                  )}
                </div>
              `}
            </section>
          `}
        </settings-page-layout>
      </template>
    `;
  },
};
