const Request = {
  id: true,
  url: '',
  method: '',
  resourceType: '',
  initiatorUrl: '',
  status: 0,
  filters: [
    {
      id: true,
    },
  ],
};

const Resource = {
  id: true,
  name: '',
  rules: '',
};

const Activities = {
  showOnlyBlockedRequests: false,
  showOnlyNetworkFilters: false,
  showOnlyCosmeticFilters: false,
  requests: [Request],
  hasLoadedResources: false,
  resources: [Resource],
};

export default Activities;
