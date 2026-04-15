import './compat';
import { INJECTION_DATA_KEY } from './storage-keys';

// helpful functions to handle web extension things
let enableChameleon = (enabled: boolean): void => {
  browser.runtime.getPlatformInfo().then(plat => {
    if (plat.os != 'android' && browser.browserAction?.setIcon) {
      let path = enabled === false ? 'icons/icon_disabled_128.png' : 'icons/icon_128.png';

      try {
        let maybePromise = browser.browserAction.setIcon({ path });

        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch(() => {
            // keep extension functional even if a runtime icon cannot be decoded by Chromium
          });
        }
      } catch (e) {
        // keep extension functional even if a runtime icon cannot be decoded by Chromium
      }
    }
  });
};

let enableContextMenu = (enabled: boolean): void => {
  browser.runtime.sendMessage({
    action: 'contextMenu',
    data: enabled,
  });
};

let firstTimeInstall = (): void => {
  browser.runtime.onInstalled.addListener((details: any) => {
    if (!details.temporary && details.reason === 'install') {
      browser.tabs.create({
        url: 'https://sereneblue.github.io/chameleon/?newinstall',
      });
    }
  });
};

let getSettings = (key: string | null) => {
  return new Promise((resolve: any) => {
    browser.storage.local.get(key, (item: any) => {
      if (typeof key == 'string') {
        resolve(item[key]);
        return;
      }

      let settings = Object.assign({}, item);
      delete settings[INJECTION_DATA_KEY];
      resolve(settings);
    });
  });
};

let getInjectionData = (): Promise<any> => {
  return new Promise((resolve: any) => {
    browser.storage.local.get(INJECTION_DATA_KEY, (item: any) => {
      resolve(item[INJECTION_DATA_KEY] || null);
    });
  });
};

let sendToBackground = (settings: any): void => {
  browser.runtime.sendMessage({
    action: 'save',
    data: settings,
  });
};

let setBrowserConfig = async (setting: string, value: string): Promise<void> => {
  if (!browser.privacy) {
    return;
  }

  if (setting === 'options.cookiePolicy' || setting === 'options.cookieNotPersistent') {
    if (!browser.privacy.websites.cookieConfig) {
      return;
    }

    let settings = await browser.privacy.websites.cookieConfig.get({});

    settings = settings.value;

    if (setting === 'options.cookiePolicy') {
      settings.behavior = value;
    } else {
      settings.nonPersistentCookies = value;
    }

    browser.privacy.websites.cookieConfig.set({
      value: settings,
    });
  } else if (['options.firstPartyIsolate', 'options.resistFingerprinting', 'options.trackingProtectionMode'].includes(setting)) {
    let key: string = setting.split('.')[1];
    if (!browser.privacy.websites[key]) {
      return;
    }

    browser.privacy.websites[key].set({
      value: value,
    });
  } else if (setting === 'options.disableWebRTC') {
    if (!browser.privacy.network.peerConnectionEnabled) {
      return;
    }

    browser.privacy.network.peerConnectionEnabled.set({
      value: !value,
    });
  } else if (setting === 'options.webRTCPolicy') {
    if (!browser.privacy.network.webRTCIPHandlingPolicy) {
      return;
    }

    browser.privacy.network.webRTCIPHandlingPolicy.set({
      value: value,
    });
  }
};

let setSettings = (settings: any) => {
  return new Promise((resolve: any) => {
    browser.storage.local.set(settings, () => {
      resolve();
    });
  });
};

let setInjectionData = (data: any) => {
  return new Promise((resolve: any) => {
    browser.storage.local.set(
      {
        [INJECTION_DATA_KEY]: data,
      },
      () => {
        resolve();
      }
    );
  });
};

export default {
  enableChameleon,
  enableContextMenu,
  firstTimeInstall,
  getInjectionData,
  getSettings,
  sendToBackground,
  setBrowserConfig,
  setInjectionData,
  setSettings,
};
