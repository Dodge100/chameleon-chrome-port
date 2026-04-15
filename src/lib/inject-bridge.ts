import './compat';
import { INJECTION_DATA_KEY } from './storage-keys';

const INJECTION_DATA_EVENT = 'chameleon:injection-data';
const INJECTION_REQUEST_EVENT = 'chameleon:injection-request';

let sent = false;

const sendInjectionData = async () => {
  try {
    let item = await browser.storage.local.get(INJECTION_DATA_KEY);
    let injectionData = item[INJECTION_DATA_KEY];

    if (!injectionData) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(INJECTION_DATA_EVENT, {
        detail: JSON.stringify(injectionData),
      })
    );

    sent = true;
  } catch (e) {
    console.debug('Unable to bridge injection payload', e);
  }
};

window.addEventListener(INJECTION_REQUEST_EVENT, () => {
  sendInjectionData();
});

sendInjectionData();
setTimeout(() => {
  if (!sent) {
    sendInjectionData();
  }
}, 50);
