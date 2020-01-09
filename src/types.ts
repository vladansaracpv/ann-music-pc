import { IntervalName } from 'ann-music-interval';
import { NoteName } from 'ann-music-note';

export type PcChroma = string;

export type PcNum = number;

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
export interface PcProperties {
  readonly pcnum: PcNum;
  chroma: PcChroma;
  readonly normalized: PcChroma;
  readonly intervals: IntervalName[];
  readonly length: number;
}

/**
 * PCProperties object can be made from one of the following:
 */
export type PcInit = Partial<{
  pcnum: PcNum;
  chroma: PcChroma;
  note: NoteName;
  notes: NoteName[];
  interval: IntervalName;
  intervals: IntervalName[];
}>;
