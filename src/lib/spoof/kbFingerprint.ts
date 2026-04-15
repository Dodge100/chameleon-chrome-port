import { CustomInjectionFn } from './types';

const kbFingerprint: CustomInjectionFn = (spoofContext, CHAMELEON_SPOOF) => {
  let handler = (e: any) => {
    let delay = CHAMELEON_SPOOF.get(spoofContext).kbDelay;
    if (e.target && e.target.nodeName == 'INPUT') {
      if (Math.floor(Math.random() * 2)) {
        let endTime = Date.now() + Math.floor(Math.random() * (30 + (delay || 30)));
        while (Date.now() < endTime) {
          // intentional spin
        }
      }
    }
  };

  spoofContext.document.addEventListener('keyup', handler);
  spoofContext.document.addEventListener('keydown', handler);
};

export default {
  type: 'custom',
  data: kbFingerprint,
};
