import { Chameleon } from './lib/chameleon';
import store from './store';
import webext from './lib/webext';

webext.firstTimeInstall();

store.state.version = browser.runtime.getManifest().version;

let chameleonPromise: Promise<Chameleon> | null = null;

let syncPrivacySettings = async (chameleon: Chameleon): Promise<void> => {
  if (!browser.privacy) {
    return;
  }

  if (browser.privacy.websites.cookieConfig) {
    let cookieSettings = await browser.privacy.websites.cookieConfig.get({});
    chameleon.settings.options.cookieNotPersistent = cookieSettings.value.nonPersistentCookies;
    chameleon.settings.options.cookiePolicy = cookieSettings.value.behavior;
  }

  if (browser.privacy.websites.firstPartyIsolate) {
    let firstPartyIsolate = await browser.privacy.websites.firstPartyIsolate.get({});
    chameleon.settings.options.firstPartyIsolate = firstPartyIsolate.value;
  }

  if (browser.privacy.websites.resistFingerprinting) {
    let resistFingerprinting = await browser.privacy.websites.resistFingerprinting.get({});
    chameleon.settings.options.resistFingerprinting = resistFingerprinting.value;
  }

  if (browser.privacy.websites.trackingProtectionMode) {
    let trackingProtectionMode = await browser.privacy.websites.trackingProtectionMode.get({});
    chameleon.settings.options.trackingProtectionMode = trackingProtectionMode.value;
  }

  if (browser.privacy.network.peerConnectionEnabled) {
    let peerConnectionEnabled = await browser.privacy.network.peerConnectionEnabled.get({});
    chameleon.settings.options.disableWebRTC = !peerConnectionEnabled.value;
  }

  if (browser.privacy.network.webRTCIPHandlingPolicy) {
    let webRTCIPHandlingPolicy = await browser.privacy.network.webRTCIPHandlingPolicy.get({});
    chameleon.settings.options.webRTCPolicy = webRTCIPHandlingPolicy.value;
  }
};

let getChameleon = async (reload = false): Promise<Chameleon> => {
  if (!reload && chameleonPromise) {
    return chameleonPromise;
  }

  chameleonPromise = (async () => {
    let chameleon = new Chameleon(JSON.parse(JSON.stringify(store.state)));
    await chameleon.init(await webext.getSettings(null));

    let injectionData = await webext.getInjectionData();
    if (injectionData?.tempStore) {
      chameleon.tempStore = Object.assign({}, chameleon.tempStore, injectionData.tempStore);
    }

    chameleon.updateProfileCache();
    return chameleon;
  })();

  return chameleonPromise;
};

let messageHandler = (request: any, sender: any, sendResponse: any) => {
  (async () => {
    let chameleon = await getChameleon();

    if (request.action === 'save') {
      chameleon.settings = Object.assign(chameleon.settings, request.data);
      await chameleon.saveSettings(chameleon.settings);
      await chameleon.buildInjectionScript();
      sendResponse('done');
    } else if (request.action === 'tempStore') {
      sendResponse('done');
    } else if (request.action === 'implicitSave') {
      await chameleon.saveSettings(chameleon.settings);
      await chameleon.buildInjectionScript();
      sendResponse('done');
    } else if (request.action === 'contextMenu') {
      chameleon.toggleContextMenu(request.data);
      sendResponse('done');
    } else if (request.action === 'toggleBadgeText') {
      chameleon.updateBadgeText(request.data);
      await chameleon.buildInjectionScript();
      sendResponse('done');
    } else if (request.action === 'getSettings') {
      await syncPrivacySettings(chameleon);

      let settings = Object.assign({}, chameleon.settings);
      settings.config.hasPrivacyPermission = !!browser.privacy;

      sendResponse(settings);
    } else if (request.action === 'init') {
      browser.runtime.sendMessage(
        {
          action: 'tempStore',
          data: chameleon.tempStore,
        },
        () => {
          if (browser.runtime.lastError) return;
        }
      );
      sendResponse('done');
    } else if (request.action === 'reloadInjectionScript') {
      await chameleon.buildInjectionScript();
      sendResponse('done');
    } else if (request.action === 'reloadIPInfo') {
      if (chameleon.settings.options.timeZone === 'ip' || (chameleon.settings.headers.spoofAcceptLang.value === 'ip' && chameleon.settings.headers.spoofAcceptLang.enabled)) {
        await chameleon.updateIPInfo();
      }
      sendResponse('done');
    } else if (request.action === 'reloadProfile') {
      chameleon.setTimer(request.data);
      await chameleon.buildInjectionScript();
      sendResponse('done');
    } else if (request.action === 'reloadSpoofIP') {
      if (request.data[0].name === 'headers.spoofIP.enabled') {
        chameleon.settings.headers.spoofIP.enabled = request.data[0].value;
      } else if (request.data[0].name === 'headers.spoofIP.option') {
        chameleon.settings.headers.spoofIP.option = request.data[0].value;
      } else if (request.data[0].name === 'headers.spoofIP.rangeFrom') {
        chameleon.settings.headers.spoofIP.rangeFrom = request.data[0].value;
        chameleon.settings.headers.spoofIP.rangeTo = request.data[1].value;
      }

      chameleon.updateSpoofIP();
      chameleon.updateProfileCache();
      await chameleon.buildInjectionScript();
      sendResponse('done');
    } else if (request.action === 'reset') {
      chameleon.reset();
      await chameleon.buildInjectionScript();
      sendResponse('done');
      browser.runtime.reload();
    } else if (request.action === 'updateIPRules') {
      chameleon.settings.ipRules = request.data;
      await chameleon.saveSettings(chameleon.settings);
      await chameleon.buildInjectionScript();
      sendResponse('done');
    } else if (request.action === 'updateProfile') {
      chameleon.settings.profile.selected = request.data;
      chameleon.setTimer();
      chameleon.start();
      await chameleon.saveSettings(chameleon.settings);
      sendResponse('done');
    } else if (request.action === 'updateWhitelist') {
      chameleon.settings.whitelist = request.data;
      chameleon.updateProfileCache();
      await chameleon.saveSettings(chameleon.settings);
      await chameleon.buildInjectionScript();
      sendResponse('done');
    } else if (request.action === 'validateSettings') {
      sendResponse(chameleon.validateSettings(request.data));
    }
  })();

  return true;
};

browser.alarms.onAlarm.addListener(async () => {
  let chameleon = await getChameleon();
  chameleon.run();

  if (chameleon.settings.profile.interval.option === -1) {
    chameleon.setTimer();
  }
});

browser.runtime.onMessage.addListener(messageHandler);

(async () => {
  let chameleon = await getChameleon(true);
  let injectionData = await webext.getInjectionData();

  if (!injectionData) {
    chameleon.start();
  }

  if (chameleon.settings.options.timeZone === 'ip' || (chameleon.settings.headers.spoofAcceptLang.value === 'ip' && chameleon.settings.headers.spoofAcceptLang.enabled)) {
    setTimeout(() => {
      getChameleon().then(instance => instance.updateIPInfo());
    }, chameleon.settings.config.reloadIPStartupDelay * 1000);
  }

  if (!!browser.privacy) {
    await chameleon.changeBrowserSettings();
  }

  chameleon.setupHeaderListeners();

  let alarms = await browser.alarms.getAll();
  if (alarms.length === 0 && chameleon.settings.profile.interval.option !== 0) {
    chameleon.setTimer();
  }

  webext.enableChameleon(chameleon.settings.config.enabled);
  chameleon.toggleContextMenu(chameleon.settings.whitelist.enabledContextMenu);

  /*
    Allow Chameleon to be controlled by another extension

    Enabled only in developer builds
  */
  if (browser.runtime.getManifest().version_name.includes('-')) {
    browser.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
      messageHandler(request, sender, sendResponse);

      return true;
    });
  }

  if (chameleon.platform.os != 'android') {
    browser.browserAction.setBadgeBackgroundColor({
      color: 'green',
    });
  }
})();
