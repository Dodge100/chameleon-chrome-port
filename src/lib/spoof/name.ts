import { CustomInjectionFn } from './types';

const winName: CustomInjectionFn = spoofContext => {
  spoofContext.name = '';
};

export default {
  type: 'custom',
  data: winName,
};
