export interface InjectionHelpers {
  modifyNodeFont?: (node: any) => any;
  CHAMELEON_SPOOF_f?: () => void;
  originalIntlDateTimeFormat?: any;
}

export type CustomInjectionFn = (spoofContext: any, CHAMELEON_SPOOF: WeakMap<any, any>, modifiedAPIs: any[], helpers: InjectionHelpers) => void;
