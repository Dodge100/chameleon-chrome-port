import { CustomInjectionFn } from './types';

const clientRects: CustomInjectionFn = (spoofContext, CHAMELEON_SPOOF, modifiedAPIs) => {
  let _getBoundingClientRect = spoofContext.Element.prototype.getBoundingClientRect;
  let _getClientRects = spoofContext.Element.prototype.getClientRects;
  let _rgetBoundingClientRect = spoofContext.Range.prototype.getBoundingClientRect;
  let _rgetClientRects = spoofContext.Range.prototype.getClientRects;

  let _fuzzer = (val: any) => {
    return Number.isInteger(val) ? val : val + CHAMELEON_SPOOF.get(spoofContext).clientRectsSeed;
  };

  let createRect = (rect: any) => {
    let x = _fuzzer(rect.x != null ? rect.x : rect.left);
    let y = _fuzzer(rect.y != null ? rect.y : rect.top);
    let width = _fuzzer(rect.width);
    let height = _fuzzer(rect.height);

    if (spoofContext.DOMRect && typeof spoofContext.DOMRect.fromRect === 'function') {
      return spoofContext.DOMRect.fromRect({ x, y, width, height });
    }

    if (spoofContext.DOMRect) {
      return new spoofContext.DOMRect(x, y, width, height);
    }

    return {
      x,
      y,
      width,
      height,
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
      toJSON() {
        return {
          x,
          y,
          width,
          height,
          top: y,
          right: x + width,
          bottom: y + height,
          left: x,
        };
      },
    };
  };

  let replaceFirstRect = (list: any, rect: any) => {
    if (!list || typeof list.length !== 'number' || list.length === 0) {
      return list;
    }

    let proto = Object.getPrototypeOf(list);
    let output = Object.create(proto || null);

    Object.defineProperty(output, 0, {
      configurable: false,
      enumerable: true,
      value: rect,
    });

    for (let i = 1; i < list.length; i++) {
      Object.defineProperty(output, i, {
        configurable: false,
        enumerable: true,
        value: list[i],
      });
    }

    Object.defineProperty(output, 'length', {
      configurable: false,
      enumerable: true,
      value: list.length,
    });

    Object.defineProperty(output, 'item', {
      configurable: false,
      enumerable: true,
      value: function item(index) {
        return this[index] || null;
      },
    });

    if (typeof Symbol !== 'undefined' && Symbol.iterator) {
      Object.defineProperty(output, Symbol.iterator, {
        configurable: false,
        enumerable: false,
        value: function iterator() {
          let index = 0;
          return {
            next: () => {
              if (index < this.length) {
                let value = this[index];
                index++;
                return { value, done: false };
              }

              return { value: undefined, done: true };
            },
          };
        },
      });
    }

    return output;
  };

  spoofContext.Element.prototype.getBoundingClientRect = function() {
    let c = _getBoundingClientRect.apply(this);
    return createRect(c);
  };

  modifiedAPIs.push([spoofContext.Element.prototype.getBoundingClientRect, 'getBoundingClientRect']);

  spoofContext.Element.prototype.getClientRects = function() {
    let a = _getClientRects.apply(this);

    if (!a || a.length === 0) {
      return a;
    }

    let b = this.getBoundingClientRect();

    return replaceFirstRect(a, b);
  };

  modifiedAPIs.push([spoofContext.Element.prototype.getClientRects, 'getClientRects']);

  spoofContext.Range.prototype.getBoundingClientRect = function() {
    let r = _rgetBoundingClientRect.apply(this);
    return createRect(r);
  };

  modifiedAPIs.push([spoofContext.Range.prototype.getBoundingClientRect, 'getBoundingClientRect']);

  spoofContext.Range.prototype.getClientRects = function() {
    let a = _rgetClientRects.apply(this);

    if (!a || a.length === 0) {
      return a;
    }

    let b = this.getBoundingClientRect();

    return replaceFirstRect(a, b);
  };

  modifiedAPIs.push([spoofContext.Range.prototype.getClientRects, 'getClientRects']);
};

export default {
  type: 'custom',
  data: clientRects,
};
