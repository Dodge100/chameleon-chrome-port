const runtimeBrowser = (globalThis as any).browser || (globalThis as any).chrome;

if (!runtimeBrowser) {
  throw new Error('A WebExtension browser API is required to run Chameleon.');
}

if (!(globalThis as any).browser) {
  (globalThis as any).browser = runtimeBrowser;
}

if (!(globalThis as any).chrome) {
  (globalThis as any).chrome = runtimeBrowser;
}

if (!(globalThis as any).browser.browserAction && (globalThis as any).browser.action) {
  (globalThis as any).browser.browserAction = (globalThis as any).browser.action;
}

const browserApi = (globalThis as any).browser;

if (browserApi.i18n?.getMessage) {
  const getMessage = browserApi.i18n.getMessage.bind(browserApi.i18n);

  browserApi.i18n.getMessage = (messageName: string, substitutions?: any) => {
    let message = getMessage(messageName, substitutions);

    if ((!message || message === '') && typeof messageName === 'string') {
      if (messageName.includes('-')) {
        message = getMessage(messageName.replace(/-/g, '_'), substitutions);
      } else if (messageName.includes('_')) {
        message = getMessage(messageName.replace(/_/g, '-'), substitutions);
      }
    }

    return message;
  };
}

let getBrowserInfo = async (): Promise<{ name: string; version: string }> => {
  if (browserApi.runtime?.getBrowserInfo) {
    return browserApi.runtime.getBrowserInfo();
  }

  let version = browserApi.runtime?.getManifest?.().version || '0';
  let name = 'Chrome';
  let ua = globalThis.navigator?.userAgent || '';
  let match = ua.match(/(Edg|Chrome|Chromium)\/([0-9.]+)/);

  if (match) {
    version = match[2];

    if (match[1] === 'Edg') {
      name = 'Microsoft Edge';
    } else if (match[1] === 'Chromium') {
      name = 'Chromium';
    }
  }

  return { name, version };
};

let isFirefox = async (): Promise<boolean> => {
  return (await getBrowserInfo()).name.toLowerCase().includes('firefox');
};

export { browserApi, getBrowserInfo, isFirefox };

export default browserApi;
