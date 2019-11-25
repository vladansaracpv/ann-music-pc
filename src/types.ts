import { IntervalName } from 'ann-music-interval';
import { NoteName } from 'ann-music-note';

export type PcChroma = string;

export type PcNum = number;

export interface PcProperties {
  /**
   * The properties of a pitch class set
   *
   * @member {number} pcnum - a number between 1 and 4095 (both included) that
   * uniquely identifies the set. It's the decimal number of the chroma.
   *
   * @member {string} chroma - a string representation of the set: a 12-char binary string
   *
   * @member {number} length - the number of notes of the pitch class set
   *
   * @member {string} normalized - @chroma rotated so that it starts with '1'
   *
   * @member {boolean} empty
   */
  readonly pcnum: PcNum;
  readonly chroma: PcChroma;
  readonly normalized: PcChroma;
  readonly intervals: IntervalName[];
  readonly length?: number;
  readonly empty: boolean;
}

export type PcSet = PcProperties | PcChroma | PcNum | NoteName[] | IntervalName[];
