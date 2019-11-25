import * as Methods from './methods';
import * as Theory from './theory';

export * from './types';

export * from './properties';

export const PitchClass = {
  ...Theory,
  ...Methods,
};
