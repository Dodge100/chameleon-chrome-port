import * as lang from '../lib/language';
import audioContext from './spoof/audioContext';
import clientRects from './spoof/clientRects';
import cssExfil from './spoof/cssExfil';
import font from './spoof/font';
import history from './spoof/history';
import kbFingerprint from './spoof/kbFingerprint';
import language from './spoof/language';
import media from './spoof/media';
import mediaSpoof from './spoof/mediaSpoof';
import navigatorSpoof from './spoof/navigator';
import quirks from './spoof/quirks';
import referer from './spoof/referer';
import screen from './spoof/screen';
import timezone from './spoof/timezone';
import winName from './spoof/name';
import util from './util';
import whitelisted from './whitelisted';
import { CustomInjectionFn, InjectionHelpers } from './spoof/types';

const moment = require('moment-timezone');

const INJECTION_DATA_EVENT = 'chameleon:injection-data';
const INJECTION_REQUEST_EVENT = 'chameleon:injection-request';

const getTopLocation = (): Location => {
  try {
    return window.top.location;
  } catch (e) {
    return window.location;
  }
};

class Injector {
  public enabled: boolean;
  private randObjName: string;
  private spoof = {
    custom: [] as CustomInjectionFn[],
    overwrite: [],
    metadata: {},
  };

  constructor(settings: any, tempStore: any, profileCache: any, seed: number, randObjName: string) {
    if (!settings.config.enabled) {
      this.enabled = false;
      return;
    }

    this.enabled = true;
    this.randObjName = randObjName;

    let p: any = null;
    let topLocation = getTopLocation();
    let wl = util.findWhitelistRule(settings.whitelist.rules, topLocation.host, topLocation.href);

    if (wl === null) {
      if (tempStore.profile && tempStore.profile != 'none') {
        p = profileCache[tempStore.profile];
      } else {
        if (settings.profile.selected != 'none') {
          p = profileCache[settings.profile.selected];
        }
      }

      if (p) {
        this.spoof.metadata['profileOS'] = p.osId;
        this.spoof.metadata['browser'] = p.browser;
      } else {
        let profileId: string = '';

        if (window.navigator.userAgent.includes('Windows NT 6.1')) {
          profileId = 'win1';
        } else if (window.navigator.userAgent.includes('Windows NT 6.2')) {
          profileId = 'win2';
        } else if (window.navigator.userAgent.includes('Windows NT 6.3')) {
          profileId = 'win3';
        } else if (window.navigator.userAgent.includes('Windows NT 10.0')) {
          profileId = 'win4';
        } else if (window.navigator.userAgent.includes('Mac OS X 11_')) {
          profileId = 'mac3';
        } else if (window.navigator.userAgent.includes('Mac OS X 10_15')) {
          profileId = 'mac2';
        } else if (window.navigator.userAgent.includes('Mac OS X 10_')) {
          profileId = 'mac1';
        } else if (window.navigator.userAgent.includes('Android 6') || window.navigator.userAgent.includes('Android 5')) {
          profileId = 'and1';
        } else if (window.navigator.userAgent.includes('Android 7')) {
          profileId = 'and2';
        } else if (window.navigator.userAgent.includes('Android 8')) {
          profileId = 'and3';
        } else if (window.navigator.userAgent.includes('Android 9') || window.navigator.userAgent.includes('Android 10')) {
          profileId = 'and4';
        } else if (window.navigator.userAgent.includes('Ubuntu')) {
          profileId = 'lin3';
        } else if (window.navigator.userAgent.includes('Fedora')) {
          profileId = 'lin2';
        } else if (window.navigator.userAgent.includes('Linux')) {
          profileId = 'lin1';
        }

        this.spoof.metadata['profileOS'] = profileId;
        this.spoof.metadata['browser'] = 'firefox';
      }

      if (settings.options.blockMediaDevices) {
        this.updateInjectionData(media);
      } else {
        if (settings.options.spoofMediaDevices) {
          this.updateInjectionData(mediaSpoof);
        }
      }

      if (settings.options.blockCSSExfil) {
        this.updateInjectionData(cssExfil);
      }

      if (settings.options.limitHistory) this.updateInjectionData(history);

      if (settings.options.protectKBFingerprint.enabled) {
        this.spoof.metadata['kbDelay'] = settings.options.protectKBFingerprint.delay;
        this.updateInjectionData(kbFingerprint);
      }

      if (settings.headers.spoofAcceptLang.enabled) {
        if (settings.headers.spoofAcceptLang.value != 'default') {
          let spoofedLang: string;

          if (settings.headers.spoofAcceptLang.value === 'ip') {
            spoofedLang = tempStore.ipInfo.lang;
          } else {
            spoofedLang = settings.headers.spoofAcceptLang.value;
          }

          let l = lang.getLanguage(spoofedLang);
          this.spoof.metadata['language'] = {
            code: spoofedLang,
            nav: l.nav,
          };
          this.updateInjectionData(language);
        }
      }

      if (settings.options.protectWinName) {
        if (!/\.google\.com$/.test(topLocation.host)) {
          this.updateInjectionData(winName);
        }
      }

      if (settings.options.spoofAudioContext) {
        this.spoof.metadata['audioContextSeed'] = seed;
        this.updateInjectionData(audioContext);
      }

      if (settings.options.spoofClientRects) {
        this.spoof.metadata['clientRectsSeed'] = seed;
        this.updateInjectionData(clientRects);
      }

      if (settings.options.spoofFontFingerprint) {
        this.updateInjectionData(font);
      }

      if (settings.options.screenSize != 'default') {
        if (settings.options.screenSize == 'profile' && p) {
          this.spoof.metadata['screen'] = {
            width: p.screen.width,
            height: p.screen.height,
            availHeight: p.screen.availHeight,
            deviceScaleFactor: p.screen.deviceScaleFactor,
            usingProfileRes: true,
            pixelDepth: this.spoof.metadata['profileOS'].includes('ios') ? 32 : 24,
          };
        } else {
          let scr: number[] = settings.options.screenSize.split('x').map(Number);

          this.spoof.metadata['screen'] = {
            width: scr[0],
            height: scr[1],
            usingProfileRes: false,
            pixelDepth: 24,
          };
        }

        if (this.spoof.metadata['screen']) {
          this.updateInjectionData(screen);
        }
      }

      if (settings.options.timeZone != 'default') {
        let tz: string = settings.options.timeZone;

        if (tz === 'ip') {
          tz = tempStore.ipInfo.tz;
        }

        if (tz) {
          this.spoof.metadata['timezone'] = {
            locale: 'en-US',
            zone: moment.tz.zone(tz),
          };

          this.updateInjectionData(timezone);
        }
      }

      if (settings.headers.referer.disabled) {
        this.updateInjectionData(referer);
      }
    } else {
      if (wl.options.name) this.updateInjectionData(winName);

      if (wl.options.audioContext) {
        this.spoof.metadata['audioContextSeed'] = seed;
        this.updateInjectionData(audioContext);
      }

      if (wl.options.clientRects) {
        this.spoof.metadata['clientRectsSeed'] = seed;
        this.updateInjectionData(clientRects);
      }

      if (wl.options.cssExfil) this.updateInjectionData(cssExfil);
      if (wl.options.mediaDevices) this.updateInjectionData(media);

      let l = lang.getLanguage(wl.lang);

      this.spoof.metadata['language'] = {
        code: wl.lang,
        nav: l.nav,
      };
      this.updateInjectionData(language);

      if (wl.profile != 'none') {
        if (wl.profile === 'default' && settings.whitelist.defaultProfile != 'none') {
          p = profileCache[settings.whitelist.defaultProfile];
        } else {
          p = profileCache[wl.profile];
        }
      }
    }

    if (p) {
      for (let i = 0; i < navigatorSpoof.data.length; i++) {
        navigatorSpoof.data[i].value = p.navigator[navigatorSpoof.data[i].prop];
      }

      this.spoof.metadata['profileOS'] = p.osId;
      this.spoof.metadata['browser'] = p.browser;

      this.updateInjectionData(navigatorSpoof);
      this.updateInjectionData(quirks);
    }
  }

  public injectIntoPage(): void {
    if (!this.enabled) {
      return;
    }

    this.injectContext(window);
  }

  private injectContext(spoofContext: any): void {
    if (!spoofContext || spoofContext[this.randObjName]) {
      return;
    }

    spoofContext[this.randObjName] = this.randObjName;
    spoofContext.CHAMELEON_SPOOF = this.randObjName;

    let CHAMELEON_SPOOF = new WeakMap();
    CHAMELEON_SPOOF.set(spoofContext, JSON.parse(JSON.stringify(this.spoof.metadata)));

    let ORIGINAL_INTL = spoofContext.Intl.DateTimeFormat;
    let ORIGINAL_INTL_PROTO = spoofContext.Intl.DateTimeFormat.prototype;
    let _supportedLocalesOfDTF = spoofContext.Intl.DateTimeFormat.supportedLocalesOf;
    let _supportedLocalesOfRTF = spoofContext.Intl.RelativeTimeFormat && spoofContext.Intl.RelativeTimeFormat.supportedLocalesOf;
    let _supportedLocalesOfLF = spoofContext.Intl.ListFormat && spoofContext.Intl.ListFormat.supportedLocalesOf;
    let _supportedLocalesOfNF = spoofContext.Intl.NumberFormat && spoofContext.Intl.NumberFormat.supportedLocalesOf;
    let _supportedLocalesOfPR = spoofContext.Intl.PluralRules && spoofContext.Intl.PluralRules.supportedLocalesOf;
    let _supportedLocalesOfC = spoofContext.Intl.Collator && spoofContext.Intl.Collator.supportedLocalesOf;
    let _open = spoofContext.open;
    let _enumerateDevices;

    if (spoofContext.navigator.mediaDevices && spoofContext === spoofContext.parent) {
      _enumerateDevices = spoofContext.navigator.mediaDevices.enumerateDevices.bind(spoofContext.navigator.mediaDevices);
    }

    let modifiedAPIs: any[] = [];
    let injectionProperties = JSON.parse(JSON.stringify(this.spoof.overwrite));

    injectionProperties.forEach(injProp => {
      if (injProp.obj === 'window') {
        Object.defineProperty(spoofContext, injProp.prop, {
          get: (() => injProp.value).bind(null),
        });
      } else if (injProp.obj === 'window.navigator' && injProp.value === null) {
        delete spoofContext.navigator.__proto__[injProp.prop];
      } else if (injProp.obj === 'window.navigator' && injProp.prop == 'mimeTypes') {
        let mimes = (() => {
          const mimeArray = {};
          injProp.value.forEach((m, i) => {
            function FakeMimeType() {
              return m;
            }
            const mime = new (FakeMimeType as any)();
            Object.setPrototypeOf(mime, MimeType.prototype);
            Object.defineProperty(mimeArray, i, {
              configurable: false,
              enumerable: true,
              value: mime,
            });
            Object.defineProperty(mimeArray, m.type, {
              configurable: false,
              enumerable: false,
              value: mime,
            });
          });
          Object.setPrototypeOf(mimeArray, MimeTypeArray.prototype);
          Object.defineProperty(mimeArray, 'length', {
            configurable: false,
            enumerable: true,
            value: injProp.value.length,
          });
          Object.defineProperty(mimeArray, 'item', {
            configurable: false,
            enumerable: true,
            value: function item() {
              return this[arguments[0]] || null;
            },
          });
          Object.defineProperty(mimeArray, 'namedItem', {
            configurable: false,
            enumerable: true,
            value: function namedItem() {
              return this[arguments[0]] || null;
            },
          });
          return mimeArray;
        })();
        Object.defineProperty(spoofContext.navigator, 'mimeTypes', {
          configurable: true,
          value: mimes,
        });
      } else if (injProp.obj === 'window.navigator' && injProp.prop == 'plugins') {
        let plugins = (() => {
          const pluginArray = {};
          injProp.value.forEach((p, i) => {
            function FakePlugin() {
              return p;
            }
            const plugin = new (FakePlugin as any)();
            Object.setPrototypeOf(plugin, Plugin.prototype);
            Object.defineProperty(plugin, 'length', {
              configurable: false,
              enumerable: true,
              value: p.__mimeTypes.length,
            });
            Object.defineProperty(plugin, 'version', {
              configurable: false,
              enumerable: false,
              value: undefined,
            });
            Object.defineProperty(plugin, 'item', {
              configurable: false,
              enumerable: true,
              value: function item() {
                return this[arguments[0]] || null;
              },
            });
            Object.defineProperty(plugin, 'namedItem', {
              configurable: false,
              enumerable: true,
              value: function namedItem() {
                return this[arguments[0]] || null;
              },
            });

            for (let j = 0; j < p.__mimeTypes.length; j++) {
              Object.defineProperty(plugin, j, {
                configurable: false,
                enumerable: true,
                value: navigator.mimeTypes[p.__mimeTypes[j]],
              });

              Object.defineProperty(plugin, p.__mimeTypes[j], {
                configurable: false,
                enumerable: false,
                value: navigator.mimeTypes[p.__mimeTypes[j]],
              });
            }

            delete p.__mimeTypes;

            Object.defineProperty(pluginArray, i, {
              configurable: false,
              enumerable: true,
              value: p,
            });

            Object.defineProperty(pluginArray, p.name, {
              configurable: false,
              enumerable: false,
              value: p,
            });
          });
          Object.defineProperty(pluginArray, 'length', {
            configurable: false,
            enumerable: true,
            value: injProp.value.length,
          });
          Object.defineProperty(pluginArray, 'item', {
            configurable: false,
            enumerable: true,
            value: function item() {
              return this[arguments[0]] || null;
            },
          });
          Object.defineProperty(pluginArray, 'namedItem', {
            configurable: false,
            enumerable: true,
            value: function namedItem() {
              return this[arguments[0]] || null;
            },
          });
          Object.defineProperty(pluginArray, 'refresh', {
            configurable: false,
            enumerable: true,
            value: function refresh() {
              return;
            },
          });

          pluginArray[Symbol.iterator] = function() {
            const numPlugins = Object.keys(this).length - 4;
            let index = 0;

            return {
              next: () => {
                if (index < numPlugins) {
                  const value = this[index];
                  index++;
                  return {
                    value,
                    done: false,
                  };
                }
                return {
                  value: undefined,
                  done: true,
                };
              },
            };
          };

          return pluginArray;
        })();

        Object.setPrototypeOf(plugins, PluginArray.prototype);

        Object.defineProperty(spoofContext.navigator, 'plugins', {
          configurable: true,
          value: plugins,
        });

        let pluginsArray = Array.from(navigator.plugins);

        for (let i = 0; i < navigator.mimeTypes.length; i++) {
          let p = pluginsArray.find(p => p[navigator.mimeTypes[i].type] != undefined);
          Object.defineProperty(navigator.mimeTypes[i], 'enabledPlugin', {
            configurable: false,
            enumerable: true,
            value: p,
          });
        }
      } else {
        let tmpObj = injProp.obj.split('.').reduce((p, c) => (p && p[c]) || null, spoofContext);

        if (tmpObj && tmpObj[injProp.prop] != injProp.value) {
          Object.defineProperty(tmpObj, injProp.prop, {
            configurable: true,
            value: injProp.value,
          });
        }
      }
    });

    let helpers: InjectionHelpers & { _enumerateDevices?: any } = {
      modifyNodeFont: null,
      CHAMELEON_SPOOF_f: null,
      originalIntlDateTimeFormat: ORIGINAL_INTL,
      _enumerateDevices,
    };

    this.spoof.custom.forEach(customFn => {
      try {
        customFn(spoofContext, CHAMELEON_SPOOF, modifiedAPIs, helpers);
      } catch (e) {
        console.debug('Custom spoof hook failed', e);
      }
    });

    if (injectionProperties.length > 0 || this.spoof.custom.length > 0) {
      spoofContext.Intl.DateTimeFormat = function(...args) {
        let locale = spoofContext.navigator.language || 'en-US';

        if (CHAMELEON_SPOOF.has(spoofContext)) {
          if (CHAMELEON_SPOOF.get(spoofContext).timezone) {
            let spoofData = Object.assign({}, CHAMELEON_SPOOF.get(spoofContext).timezone);

            if (args.length == 2) {
              if (!args[1].timeZone) {
                args[1].timeZone = spoofData.zone.name;
              }
            } else if (args.length == 1) {
              args.push({
                timeZone: spoofData.zone.name,
              });
            } else {
              args = [locale, { timeZone: spoofData.zone.name }];
            }
          } else if (CHAMELEON_SPOOF.get(spoofContext).language) {
            if (args.length == 0 || !args[0]) {
              args[0] = locale;
            }
          }
        }

        return new (Function.prototype.bind.apply(ORIGINAL_INTL, [null].concat(args)))();
      };

      modifiedAPIs.push([spoofContext.Intl.DateTimeFormat, 'DateTimeFormat']);

      spoofContext.Intl.DateTimeFormat.prototype = ORIGINAL_INTL_PROTO;
      spoofContext.Intl.DateTimeFormat.supportedLocalesOf = _supportedLocalesOfDTF;

      if (spoofContext.Intl.RelativeTimeFormat && _supportedLocalesOfRTF) spoofContext.Intl.RelativeTimeFormat.supportedLocalesOf = _supportedLocalesOfRTF;
      if (spoofContext.Intl.NumberFormat && _supportedLocalesOfNF) spoofContext.Intl.NumberFormat.supportedLocalesOf = _supportedLocalesOfNF;
      if (spoofContext.Intl.PluralRules && _supportedLocalesOfPR) spoofContext.Intl.PluralRules.supportedLocalesOf = _supportedLocalesOfPR;
      if (spoofContext.Intl.ListFormat && _supportedLocalesOfLF) spoofContext.Intl.ListFormat.supportedLocalesOf = _supportedLocalesOfLF;
      if (spoofContext.Intl.Collator && _supportedLocalesOfC) spoofContext.Intl.Collator.supportedLocalesOf = _supportedLocalesOfC;

      spoofContext.open = function() {
        let w;
        if (arguments.length) {
          w = _open.call(this, ...arguments);
        } else {
          w = _open.call(this);
        }

        if (w) {
          try {
            Object.defineProperty(w, 'Date', {
              value: spoofContext.Date,
            });
          } catch (e) {}

          try {
            Object.defineProperty(w.Intl, 'DateTimeFormat', {
              value: spoofContext.Intl.DateTimeFormat,
            });
          } catch (e) {}

          try {
            Object.defineProperty(w, 'screen', {
              value: spoofContext.screen,
            });
          } catch (e) {}

          try {
            Object.defineProperty(w, 'navigator', {
              value: spoofContext.navigator,
            });
          } catch (e) {}

          try {
            Object.defineProperty(w.Element.prototype, 'getBoundingClientRect', {
              value: spoofContext.Element.prototype.getBoundingClientRect,
            });

            Object.defineProperty(w.Element.prototype, 'getClientRects', {
              value: spoofContext.Element.prototype.getClientRects,
            });

            Object.defineProperty(w.Range.prototype, 'getBoundingClientRect', {
              value: spoofContext.Range.prototype.getClientRects,
            });

            Object.defineProperty(w.Range.prototype, 'getClientRects', {
              value: spoofContext.Range.prototype.getClientRects,
            });
          } catch (e) {}
        }

        return w;
      };

      modifiedAPIs.push([spoofContext.open, 'open']);
    }

    const inject = targetContext => {
      this.injectContext(targetContext);
    };

    ['appendChild', 'insertBefore', 'replaceChild'].forEach(method => {
      const _original = spoofContext.Node.prototype[method];

      spoofContext.Node.prototype[method] = function() {
        let e = _original.apply(this, arguments);

        if (e && e.tagName === 'IFRAME') {
          try {
            inject(e.contentWindow);
          } catch (err) {}
        } else {
          for (let i = 0; i < spoofContext.length; i++) {
            try {
              inject(spoofContext[i]);
            } catch (err) {}
          }
        }

        if (e && e.nodeName === 'LINK' && helpers.CHAMELEON_SPOOF_f) {
          helpers.CHAMELEON_SPOOF_f();
        }

        return e;
      };

      modifiedAPIs.push([spoofContext.Node.prototype[method], method]);
    });

    ['append', 'insertAdjacentElement', 'insertAdjacentHTML', 'insertAdjacentText', 'prepend', 'replaceWith'].forEach(method => {
      const _original = spoofContext.Element.prototype[method];

      spoofContext.Element.prototype[method] = function() {
        let e = _original.apply(this, Array.from(arguments));

        if (e && e.tagName === 'IFRAME') {
          try {
            inject(e.contentWindow);
          } catch (err) {}
        } else {
          for (let i = 0; i < spoofContext.length; i++) {
            try {
              inject(spoofContext[i]);
            } catch (err) {}
          }
        }

        return e;
      };

      modifiedAPIs.push([spoofContext.Element.prototype[method], method]);
    });

    ['innerHTML', 'outerHTML'].forEach(propertyName => {
      let obj = Object.getOwnPropertyDescriptor(spoofContext.Element.prototype, propertyName);

      if (!obj || !obj.set) {
        return;
      }

      Object.defineProperty(spoofContext.Element.prototype, propertyName, {
        set(html) {
          obj.set.call(this, html);

          for (let i = 0; i < spoofContext.length; i++) {
            try {
              inject(spoofContext[i]);
            } catch (err) {}
          }

          if (helpers.modifyNodeFont) {
            helpers.modifyNodeFont(this.parentNode);
          }
        },
      });

      modifiedAPIs.push([spoofContext.Element.prototype[propertyName], propertyName]);
    });

    for (let m of modifiedAPIs) {
      if (!m || m.length < 2 || typeof m[0] !== 'function') {
        continue;
      }

      try {
        Object.defineProperty(m[0], 'toString', {
          configurable: false,
          value: function toString() {
            return `function ${m[1]}() {\n    [native code]\n}`;
          },
        });
      } catch (e) {}

      try {
        Object.defineProperty(m[0], 'name', {
          configurable: false,
          value: m[1],
        });
      } catch (e) {}
    }
  }

  private updateInjectionData(option: any) {
    if (option.type === 'overwrite') {
      this.spoof.overwrite = this.spoof.overwrite.concat(option.data);
    } else if (option.type === 'custom') {
      this.spoof.custom.push(option.data as CustomInjectionFn);
    } else {
      option.data();
    }
  }
}

const shouldInject = (chameleonInjector: Injector): boolean => {
  if (!chameleonInjector.enabled) {
    return false;
  }

  let topLocation = getTopLocation();

  if (
    whitelisted.findIndex(url => {
      return topLocation.href.startsWith(url) || window.location.href.startsWith(url);
    }) !== -1
  ) {
    return false;
  }

  if (util.isInternalIP(topLocation.hostname)) {
    return false;
  }

  return true;
};

(() => {
  let didInject = false;

  let injectWithData = (injectionData: any) => {
    if (didInject || !injectionData) {
      return;
    }

    let { settings, tempStore, profileCache, seed, randObjName } = injectionData;

    if (!settings || !tempStore || !profileCache || !randObjName) {
      return;
    }

    let chameleonInjector = new Injector(settings, tempStore, profileCache, seed, randObjName);

    if (shouldInject(chameleonInjector)) {
      didInject = true;
      chameleonInjector.injectIntoPage();
    }
  };

  window.addEventListener(INJECTION_DATA_EVENT, (evt: any) => {
    if (!evt || !evt.detail) {
      return;
    }

    try {
      let parsed = typeof evt.detail === 'string' ? JSON.parse(evt.detail) : evt.detail;
      injectWithData(parsed);
    } catch (e) {
      console.debug('Unable to parse injection payload', e);
    }
  });

  const requestInjectionData = () => {
    window.dispatchEvent(
      new CustomEvent(INJECTION_REQUEST_EVENT, {
        detail: {
          href: window.location.href,
        },
      })
    );
  };

  requestInjectionData();
  setTimeout(requestInjectionData, 25);
  setTimeout(requestInjectionData, 100);
})();
