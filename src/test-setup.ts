import "@testing-library/jest-dom/vitest";

class MockServiceWorkerRegistration {
  scope = "/";
  active: ServiceWorker | null = null;
  waiting: ServiceWorker | null = null;
  installing: ServiceWorker | null = null;

  async unregister() {}
  async update() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
  pushManager = {
    async subscribe() {
      return {
        endpoint: "https://example.com/push",
        toJSON: () => ({ endpoint: "https://example.com/push", keys: {} }),
      };
    },
    async getSubscription() {
      return null;
    },
    permissionState() {
      return "prompt" as PermissionState;
    },
  };
  sync = {
    async register() {},
    async getTags() {
      return [];
    },
  };
}

Object.defineProperty(globalThis, "ServiceWorkerRegistration", {
  value: MockServiceWorkerRegistration,
});

Object.defineProperty(navigator, "serviceWorker", {
  value: {
    register: async () => new MockServiceWorkerRegistration(),
    getRegistration: async () => null,
    getRegistrations: async () => [],
    ready: Promise.resolve(new MockServiceWorkerRegistration()),
    controller: null,
    addEventListener() {},
    removeEventListener() {},
  },
  configurable: true,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});
