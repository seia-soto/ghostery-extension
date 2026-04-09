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

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { minimizeRules, minimizeRuleset } from './utils.js';

function ptalen2(n) {
  n = n * 100;
  n = n | 0;
  n = n / 100;
  return n;
}

function json(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function getRulesetId(filename) {
  return filename.split('.')[0];
}

function getRulesets(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter(function (entity) {
      return entity.isFile() && entity.name.endsWith('.json') && !entity.name.includes('metadata');
    })
    .reduce(function (arr, entity) {
      const id = getRulesetId(entity.name);
      if (!arr.includes(id)) {
        arr.push(id);
      }
      return arr;
    }, []);
}

const BASE_RULE_ID = 1000000;

function optimise(ruleset, sidecar) {
  // skip rules with preprocessor
  let rules =
    JSON.stringify(sidecar) === '{}'
      ? ruleset
      : ruleset.filter(function (rule) {
          return !(rule.id in sidecar);
        });

  rules = minimizeRuleset(rules);
  rules = minimizeRules(rules);

  return rules.map(function (rule, i) {
    rule.id = BASE_RULE_ID + i;
    return rule;
  });
}

function refactor() {
  const distResourcesPath = join(import.meta.dirname, '../dist/rule_resources');
  const srcResourcesPath = join(import.meta.dirname, '../src/rule_resources');

  // find rulesets
  const rulesetIds = getRulesets(distResourcesPath);
  console.log(`found ${rulesetIds.length} rulesetIds`);

  for (const id of rulesetIds) {
    const rulesetPath = join(srcResourcesPath, id + '.json');
    const sidecarPath = join(srcResourcesPath, id + '.metadata.json');

    const ruleset = json(rulesetPath);
    const sidecar = existsSync(sidecarPath) ? json(sidecarPath) : {};

    const optimised = optimise(ruleset, sidecar);

    console.log(
      `optimised ${id}: before="${ruleset.length}" after="${optimised.length}" ratio="${ptalen2(optimised.length / ruleset.length)}"`,
    );
    writeFileSync(join(distResourcesPath, id + '.json'), JSON.stringify(optimised), 'utf8');
  }
}

void refactor();
