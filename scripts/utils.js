// this is extracted from gorhill/ubol-home.
function toSuperDomain(hostname) {
  const position = hostname.indexOf('.');
  if (position === -1) {
    return undefined;
  }

  return hostname.slice(position + 1);
}

function ownerFromPropertyPath(root, propertyPath) {
  let owner = root;
  let property = propertyPath;

  for (;;) {
    if (owner instanceof Object === false) {
      break;
    }

    const position = property.indexOf('.');
    if (position === -1) {
      break;
    }

    owner = owner[property.slice(0, position)];
    property = property.slice(position + 1);
  }

  return { owner: owner ?? undefined, property };
}

function mergeArrays(rules, propertyPath) {
  const output = [];
  const distinctRules = new Map();

  for (const rule of rules) {
    const { id } = rule;
    const { owner, property } = ownerFromPropertyPath(rule, propertyPath);

    if (owner === undefined || Array.isArray(owner[property]) === false) {
      output.push(rule);
      continue;
    }

    const collection = owner[property] || [];
    owner[property] = undefined;
    rule.id = undefined;

    const hash = JSON.stringify(rule);
    const details = distinctRules.get(hash) ?? { id, collection: new Set() };

    if (details.collection.size === 0) {
      distinctRules.set(hash, details);
    }

    for (const entry of collection) {
      details.collection.add(entry);
    }
  }

  for (const [hash, { id, collection }] of distinctRules) {
    const rule = JSON.parse(hash);

    if (id) {
      rule.id = id;
    }

    if (collection.size !== 0) {
      const { owner, property } = ownerFromPropertyPath(rule, propertyPath);
      owner[property] = Array.from(collection).sort();
    }

    output.push(rule);
  }

  return output;
}

export function minimizeRuleset(rules) {
  rules = mergeArrays(rules, 'condition.requestDomains');
  rules = mergeArrays(rules, 'condition.excludedRequestDomains');
  rules = mergeArrays(rules, 'condition.initiatorDomains');
  rules = mergeArrays(rules, 'condition.excludedInitiatorDomains');
  rules = mergeArrays(rules, 'condition.resourceTypes');
  rules = mergeArrays(rules, 'condition.excludedRequestMethods');
  rules = mergeArrays(rules, 'condition.requestMethods');
  rules = mergeArrays(rules, 'condition.excludedResourceTypes');
  rules = mergeArrays(rules, 'action.redirect.transform.queryTransform.removeParams');

  return rules;
}

export function minimizeRules(rules) {
  const hostnameProperties = [
    'requestDomains',
    'excludedRequestDomains',
    'initiatorDomains',
    'excludedInitiatorDomains',
  ];

  for (const rule of rules) {
    for (const property of hostnameProperties) {
      const hostnames = rule.condition[property];

      if (hostnames === undefined || hostnames.length === 1) {
        continue;
      }

      const hostnameSet = new Set(hostnames);

      for (let hostname of hostnameSet) {
        for (;;) {
          const superDomain = toSuperDomain(hostname);
          if (superDomain === undefined) {
            break;
          }

          if (hostnameSet.has(superDomain)) {
            hostnameSet.delete(hostname);
          }

          hostname = superDomain;
        }
      }

      if (hostnameSet.size === hostnames.length) {
        continue;
      }

      rule.condition[property] = Array.from(hostnameSet).sort();
    }
  }

  return rules;
}
