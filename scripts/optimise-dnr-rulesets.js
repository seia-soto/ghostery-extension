import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const HASH_SKIP = ['urlFilter', 'regexFilter'];

function getKey(rule) {
  const tokens = [];

  tokens.push(rule.action);

  for (const [key, val] of Object.entries(rule.condition)) {
    if (HASH_SKIP.includes(key)) {
      continue;
    }

    tokens.push([key, val]);
  }

  return JSON.stringify(tokens);
}

function refactorRuleset(ruleset, metadata) {
  /**
   * @type {Map<string, object[]>}
   */
  const conditionToRules = new Map();
  const result = [];

  for (const rule of ruleset) {
    // Skip the rule if it has metadata
    if (rule.id in metadata) {
      result.push(rule);
      continue;
    }

    const key = getKey(rule);
    if (conditionToRules.has(key)) {
      conditionToRules.get(key).push(rule);
    } else {
      conditionToRules.set(key, [rule]);
    }
  }

  for (const [hash, rules] of conditionToRules) {
    if (rules.length === 1) {
      result.push(rules[0]);
      continue;
    } else if (hash.toLowerCase().includes('initiator')) {
      result.push(...rules);
      continue;
    }

    const groupable = [];
    for (const rule of rules) {
      if (rule.condition?.regexFilter !== undefined) {
        result.push(rule);
      } else if (!rule.condition?.urlFilter) {
        result.push(rule);
      } else if (rule.condition.urlFilter.includes('/')) {
        result.push(rule);
      } else if (!rule.condition.urlFilter.startsWith('||')) {
        result.push(rule);
      } else if (rule.condition.urlFilter.includes('*')) {
        result.push(rule);
      } else {
        groupable.push(rule);
      }
    }

    if (!groupable.length) {
      continue;
    }

    const baseRule = structuredClone(groupable[0]);

    delete baseRule.condition.urlFilter;
    baseRule.condition.requestDomains = [];

    for (let i = 0; i < groupable.length; i++) {
      const rule = groupable[i];
      let domainLike = rule.condition.urlFilter;

      if (domainLike.startsWith('||')) {
        domainLike = domainLike.slice(2);
      }
      if (domainLike.endsWith('^')) {
        domainLike = domainLike.slice(0, -1);
      }

      baseRule.condition.requestDomains.push(domainLike);
    }

    result.push(baseRule);
  }

  return {
    before: ruleset.length,
    after: result.length,
    groups: conditionToRules.size,
    result,
  };
}

const rulesets = {};

for (const entity of readdirSync('./src/rule_resources', { withFileTypes: true })) {
  if (entity.isFile() === false || !entity.name.endsWith('.json')) {
    continue;
  }

  const key = entity.name.split('.')[0];

  rulesets[key] ??= {
    ruleset: [],
    metadata: {},
  };

  if (entity.name.endsWith('.metadata.json')) {
    rulesets[key].metadata = JSON.parse(
      readFileSync('./src/rule_resources/' + entity.name, 'utf8'),
    );
  } else {
    rulesets[key].ruleset = JSON.parse(readFileSync('./src/rule_resources/' + entity.name, 'utf8'));
  }
}

function fixresolution(n) {
  return ((n * 100) | 0) / 100;
}

let beforetotal = 0;
let aftertotal = 0;

for (const [key, data] of Object.entries(rulesets)) {
  const { before, after, groups, result } = refactorRuleset(data.ruleset, data.metadata);
  beforetotal += before;
  aftertotal += after;
  console.log(
    `${key}: ${before} -> ${after} (ratio: ${fixresolution(after / before)}) using ${groups} groups`,
  );
  writeFileSync(`./src/rule_resources/${key}.json`, JSON.stringify(result), 'utf8');
}

console.log(
  `grand total: ${beforetotal} -> ${aftertotal} (ratio: ${fixresolution(aftertotal / beforetotal)})`,
);
