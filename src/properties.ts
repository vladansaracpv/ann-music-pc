import { BaseErrors, BaseRelations, BaseFunctional } from 'ann-music-base';

import { Chroma, Methods, Validators } from './methods';
import { EmptyPc } from './theory';
import { PcChroma, PcInit, PcNum, PcProperties } from './types';

const { eq } = BaseRelations;
const { CustomError } = BaseErrors;
const { compose } = BaseFunctional;

const PcError = CustomError('Interval');

/**
 * Get PcProperties from PcInit params
 *
 * @param {PcInit} object
 * @returns PcProperties
 */
export function Pc({ pcnum, chroma, note, notes, interval, intervals }: PcInit = {}): PcProperties {
  const { isPcChroma, isPcNum, isNoteArray, isIntervalArray, isNoteName, isIntervalName } = Validators;
  const { fromNum, fromNotes, fromIntervals, toNum, toIntervals } = Chroma;
  const { normalize } = Methods;

  function PcBuild(chroma: PcChroma): PcProperties {
    const pcnum: PcNum = toNum(chroma);
    const normalized = normalize(chroma);
    const intervals = toIntervals(normalized);
    const length = chroma.split('').filter(c => c === '1').length;

    return {
      pcnum,
      chroma,
      normalized,
      intervals,
      length,
    };
  }

  const fromPcNum = compose(PcBuild, fromNum);

  const fromNoteList = compose(PcBuild, fromNotes);

  const fromIntervalList = compose(PcBuild, fromIntervals);

  if (chroma && isPcChroma(chroma)) return PcBuild(chroma);
  if (pcnum && isPcNum(pcnum)) return fromPcNum(pcnum);
  if (note && isNoteName(note)) return fromNoteList([note]);
  if (notes && isNoteArray(notes)) return fromNoteList(notes);
  if (interval && isIntervalName(interval)) return fromIntervalList([interval]);
  if (intervals && isIntervalArray(intervals)) return fromIntervalList(intervals);

  return PcError('InvalidIvlConstructor', { pcnum, chroma, intervals, notes }, EmptyPc) as PcProperties;
}
