import { BaseRelations, BaseTypings } from 'ann-music-base';

import { Chroma, Methods, Validators } from './methods';
import { EmptyPc } from './theory';
import { PcChroma, PcNum, PcSet } from './types';

const { eq } = BaseRelations;
const { isArray } = BaseTypings;

export function PC(src: PcSet) {
  const { isPcChroma, isPcNum, isPcSet } = Validators;
  const { fromNum, fromArray, toNum, toIntervals } = Chroma;
  const { normalize } = Methods;

  const chroma: PcChroma = isPcChroma(src)
    ? src
    : isPcNum(src)
    ? fromNum(src)
    : isArray(src)
    ? fromArray(src)
    : isPcSet(src)
    ? src.chroma
    : EmptyPc.chroma;

  const pcnum: PcNum = toNum(chroma);
  const normalized = normalize(chroma);
  const intervals = toIntervals(normalized);
  const length = chroma.split('').filter(c => c === '1').length;
  const empty = eq(0, length);

  function isEqualTo(other: PcSet) {
    return Methods.isEqual(chroma, other);
  }

  function isIn(other: PcSet) {
    return Methods.isSubsetOf(other, this.chroma);
  }

  function contains(other: PcSet) {
    return Methods.isSupersetOf(other, this.chroma);
  }

  return {
    pcnum,
    chroma,
    normalized,
    intervals,
    length,
    empty,
    // isEqualTo,
    // isIn,
    // contains,
  };
}
