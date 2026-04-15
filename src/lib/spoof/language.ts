import { CustomInjectionFn } from './types';

const language: CustomInjectionFn = (spoofContext, CHAMELEON_SPOOF, modifiedAPIs) => {
  const ORIGINAL_INTL_PR = spoofContext.Intl.PluralRules;

  Object.defineProperty(spoofContext.navigator, 'language', {
    configurable: true,
    value: CHAMELEON_SPOOF.get(spoofContext).language.code,
  });

  Object.defineProperty(spoofContext.navigator, 'languages', {
    configurable: true,
    value: CHAMELEON_SPOOF.get(spoofContext).language.nav,
  });

  spoofContext.Intl.PluralRules = function PluralRules() {
    let args = [...arguments];

    if (arguments.length == 0 || !arguments[0]) {
      args[0] = spoofContext.navigator.language || 'en-US';
    }

    return new (Function.prototype.bind.apply(ORIGINAL_INTL_PR, [null, ...args]))();
  };

  modifiedAPIs.push([spoofContext.Intl.PluralRules, 'PluralRules']);

  if (spoofContext.Intl.ListFormat) {
    const ORIGINAL_INTL_LF = spoofContext.Intl.ListFormat;

    spoofContext.Intl.ListFormat = function ListFormat() {
      let args = [...arguments];

      if (arguments.length == 0 || !arguments[0]) {
        args[0] = spoofContext.navigator.language || 'en-US';
      }

      return new (Function.prototype.bind.apply(ORIGINAL_INTL_LF, [null, ...args]))();
    };

    modifiedAPIs.push([spoofContext.Intl.ListFormat, 'ListFormat']);
  }

  if (spoofContext.Intl.RelativeTimeFormat) {
    const ORIGINAL_INTL_RTF = spoofContext.Intl.RelativeTimeFormat;

    spoofContext.Intl.RelativeTimeFormat = function RelativeTimeFormat() {
      let args = [...arguments];

      if (arguments.length == 0 || !arguments[0]) {
        args[0] = spoofContext.navigator.language || 'en-US';
      }

      return new (Function.prototype.bind.apply(ORIGINAL_INTL_RTF, [null, ...args]))();
    };

    modifiedAPIs.push([spoofContext.Intl.RelativeTimeFormat, 'RelativeTimeFormat']);
  }

  if (spoofContext.Intl.NumberFormat) {
    const ORIGINAL_INTL_NF = spoofContext.Intl.NumberFormat;

    spoofContext.Intl.NumberFormat = function NumberFormat() {
      let args = [...arguments];

      if (arguments.length == 0 || !arguments[0]) {
        args[0] = spoofContext.navigator.language || 'en-US';
      }

      return new (Function.prototype.bind.apply(ORIGINAL_INTL_NF, [null, ...args]))();
    };

    modifiedAPIs.push([spoofContext.Intl.NumberFormat, 'NumberFormat']);
  }

  if (spoofContext.Intl.Collator) {
    const ORIGINAL_INTL_C = spoofContext.Intl.Collator;

    spoofContext.Intl.Collator = function Collator() {
      let args = [...arguments];

      if (arguments.length == 0 || !arguments[0]) {
        args[0] = spoofContext.navigator.language || 'en-US';
      }

      return new (Function.prototype.bind.apply(ORIGINAL_INTL_C, [null, ...args]))();
    };

    modifiedAPIs.push([spoofContext.Intl.Collator, 'Collator']);
  }
};

export default {
  type: 'custom',
  data: language,
};
