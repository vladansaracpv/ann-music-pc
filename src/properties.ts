import { BaseErrors, BaseRelations } from 'ann-music-base';
import { IntervalName } from 'ann-music-interval';
import { NoteName } from 'ann-music-note';

import { Chroma, Methods, Validators } from './methods';
import { EmptyPc } from './theory';
import { PcChroma, PcInit, PcNum, PcProperties } from './types';

const { eq } = BaseRelations;
const { CustomError } = BaseErrors;

const PcError = CustomError('Interval');

export function PC({ pcnum, chroma, intervals, notes, note, interval }: PcInit = {}): PcProperties {
  const { isPcChroma, isPcNum, isNoteArray, isIntervalArray, isNoteName, isIntervalName } = Validators;
  const { fromNum, fromNotes, fromIntervals, toNum, toIntervals } = Chroma;
  const { normalize } = Methods;

  function PcBuild(chroma: PcChroma): PcProperties {
    const pcnum: PcNum = toNum(chroma);
    const normalized = normalize(chroma);
    const intervals = toIntervals(normalized);
    const length = chroma.split('').filter(c => c === '1').length;
    const empty = eq(0, length);

    return {
      pcnum,
      chroma,
      normalized,
      intervals,
      length,
      empty,
    };
  }

  function fromPcNum(num: PcNum): PcProperties {
    const chroma = fromNum(num);
    return PcBuild(chroma);
  }

  function fromNotesList(notes: NoteName[]): PcProperties {
    const chroma = fromNotes(notes);
    return PcBuild(chroma);
  }

  function fromIntervalsList(intervals: IntervalName[]): PcProperties {
    const chroma = fromIntervals(intervals);
    return PcBuild(chroma);
  }

  if (isPcChroma(chroma)) return PcBuild(chroma);
  if (isPcNum(pcnum)) return fromPcNum(pcnum);
  if (isNoteName(note)) return fromNotesList([note]);
  if (isNoteArray(notes)) return fromNotesList(notes);
  if (isIntervalName(interval)) return fromIntervalsList([interval]);
  if (isIntervalArray(intervals)) return fromIntervalsList(intervals);

  return PcError('InvalidIvlConstructor', { pcnum, chroma, intervals, notes }, EmptyPc) as PcProperties;
}
