import { html, store } from 'hybrids';

import Activities from '../store/activities.js';

const styles = `
html, body {
  padding: 0;
  margin: 0;
}
`;

/**
 * @param {string} expression
 */
function evalInspectedWindow(expression) {
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
    log._initiator.url ?? (await evalInspectedWindow('location.href'));

  store.set(Activities, {
    requests: [
      {
        url: request.url,
        method: request.method,
        resourceType,
        initiatorUrl,
        status: response.status,
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
    return html`
      <div>
        <ul>
          ${activities.requests.map(
            (request) => html` <li>${request.url}</li> `,
          )}
        </ul>
      </div>
    `.style(styles);
  },
};
