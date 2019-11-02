import { BaseArray, BaseBoolean, BaseFunctional, BaseRelations, BaseTypings } from 'ann-music-base';
import { NoNote, Note, NOTE, NoteMidi, NoteName, NoteProps } from 'ann-music-note';
import { Interval, INTERVAL, IntervalName, IntervalProps } from 'ann-music-interval';

const { compact, range, rotate, toBinary } = BaseArray;
const { both } = BaseBoolean;
const { curry } = BaseFunctional;
const { inSegment, eq } = BaseRelations;
const { isArray, isNumber, isObject, isUndefinedOrNull } = BaseTypings;

const INTERVALS = INTERVAL.NAMES;

const cache: { [key in string]: PcsetProps } = {};

const PC_SET_REGEX = /^[01]{12}$/;


export type PcsetChroma = string;
export type PcsetNum = number;

/**
 * The properties of a pitch class set
 *
 * @member {number} setNum - a number between 1 and 4095 (both included) that
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
export interface PcsetProps {
  readonly setNum: PcsetNum;
  readonly chroma: PcsetChroma;
  readonly normalized: PcsetChroma;
  readonly intervals: IntervalName[];
  readonly length?: number;
  readonly empty: boolean;
}

/**
 * PcSet is defined by one of the types
 */
export type PcSet = PcsetProps | PcsetChroma | PcsetNum | NoteName[] | IntervalName[];


export const EmptySet: PcsetProps = {
  setNum: 0,
  chroma: '000000000000',
  normalized: '000000000000',
  intervals: [],
  length: 0,
  empty: true,
};

// Validators
const isSetNum = (set: any): set is PcsetNum => isNumber(set) && inSegment(0, 4095, set);
const isSetChroma = (set: any): set is PcsetChroma => PC_SET_REGEX.test(set);
const isPcset = (set: any): set is PcsetProps => isObject(set) && isSetChroma(set.chroma);

// Methods for obtaining PcsetChroma
function setNumToChroma(num: number): string {
  return Number(num).toString(2).padStart(12, '0');
}

/**
 * Converts Note/Inverval array to PcsetChroma string
 * @param {Array<NoteName>|Array<IntervalName>} set
 * @return {PcsetChroma}
 */
function listToSetChroma(set: NoteName[] | IntervalName[]): PcsetChroma {
  if (set.length === 0) {
    return EmptySet.chroma;
  }

  const isNote = NOTE.Validators.isName;
  const isIvl = INTERVAL.Validators.isIntervalName;
  let pitch: NoNote | NoteProps | IntervalProps | null;

  const binary = Array(12).fill(0);

  for (let i = 0; i < set.length; i++) {
    // Is it Note?
    if (isNote(set[i])) {
      pitch = Note(set[i]) as NoteProps;
    }

    // Is it Interval?
    if (isIvl(set[i])) {
      pitch = Interval(set[i]) as IntervalProps;
    }

    // Is it neither Note or Interval?
    if (!pitch || !pitch.valid) {
      return EmptySet.chroma;
    }

    // Is it Note or Interval?
    if (pitch.valid) {
      binary[pitch.chroma] = 1;
    }
  }
  return binary.join('');
}

// Methods for converting PcsetChroma
function chromaToNumber(chroma: string): number {
  return parseInt(chroma, 2);
}

/**
 * Calculate PcsetChroma set from given PcsetChroma string
 * @param {PcsetChroma} chroma
 * @return {PcsetProps}
 */
function chromaToSet(chroma: PcsetChroma): PcsetProps {
  const setNum = chromaToNumber(chroma)
  const normalized = normalize(chroma);
  const intervals = chromaToIntervals(chroma);

  let length = 0;

  for (let i = 0; i < 12; i++) {
    if (chroma.charAt(i) === '1') length++;
  }

  const empty = eq(0, length);

  return { setNum, chroma, normalized, intervals, length, empty };
}

/**
 * Converts PcsetChroma value to array of interval names
 * @param {PcsetChroma} chroma
 * @return {Array<IntervalName>}
 */
function chromaToIntervals(chroma: PcsetChroma): IntervalName[] {
  const notNull = value => !isUndefinedOrNull(value)
  const toIvl = (val, i) => val === '1' ? Interval(i).name : null;
  return chroma.split('').map(toIvl).filter(notNull)
}

/**
 * Calculate PcsetProps from given PcSet
 * @param {PcSet} src
 * @return {PcsetProps}
 */
export function pcset(src: PcSet): PcsetProps {
  const chroma: PcsetChroma = isSetChroma(src)
    ? src
    : isSetNum(src)
      ? setNumToChroma(src)
      : isArray(src)
        ? listToSetChroma(src)
        : isPcset(src)
          ? src.chroma
          : EmptySet.chroma;

  return (cache[chroma] = cache[chroma] || chromaToSet(chroma));
}

/**
 * Rotates chroma string so that it starts with 1
 * @param {PcsetChroma} chroma
 * @return {PcsetChroma}
 */
function normalize(chroma: PcsetChroma): PcsetChroma {
  const first = chroma.indexOf('1');
  return chroma.slice(first, 12) + chroma.slice(0, first);
}

namespace PcUtilities {

  /**
   * Get a list of all possible pitch class sets (all possible chromas) *having C as root*.
   * There are 2048 different chromas.
   * If len is provided it filters to those PcsetChromas of length == len
   *
   * @see http://allthescales.org/
   * @param {number} len
   * @return {Array<PcsetChroma>} an array of possible chromas from '10000000000' to '11111111111'
   */
  export function chromaList(len?: number): PcsetChroma[] {
    const all: PcsetChroma[] = range(2048, 4095).map(toBinary);
    return len === undefined ? all.slice() : all.filter(chroma => pcset(chroma).length === len);
  }

  /**
   * Produce the rotations
   * of the chroma discarding the ones that starts with "0" (normalize=true)
   *
   * @param {PcSet} set - the list of notes or pitchChr of the set
   * @param {boolean} [normalize] - Use only strings with leading '1'
   * @return {Array<string>} modes array
   */
  export function modes(set: PcSet, normalized = true): PcsetChroma[] {
    const pcs = pcset(set);
    const binary = pcs.chroma.split('');

    return compact(
      binary.map((b, i) => {
        // make rotation starting with i
        const r = rotate(i, binary);
        // if we want normalized array, then we accept only those starting with r[0] === '1'
        return normalized && r[0] === '0' ? null : r.join('');
      }),
    );
  }

  /**
   * Test if two pitch class sets are identical
   *
   * @param {Array<PcSet>} one
   * @param {Array<PcSet>} other
   * @return {boolean} true if they are equal
   * 
   * @example
   * Pcset.isEqual(["c2", "d3"], ["c5", "d2"]) // => true
   */
  export function isEqual(one: PcSet, other: PcSet) {
    return eq(pcset(one).setNum, pcset(other).setNum)
  }

  /**
   * Create a function that test if a collection of notes is a
   * subset of a given set
   *
   * The function is curryfied.
   *
   * @param {PcSet} set - the superset to test against (chroma or list of notes)
   * @param {PcSet} notes - the subset to test (chroma or list of notes)
   * @return {boolean}
   * 
   * @example
   * const inCMajor = Pcset.isSubsetof(["C", "E", "G"])
   * inCMajor(["C"])  // => true
   * inCMajor(["A#"]) // => false
   */
  export const isSubsetOf = curry((set: PcSet, notes: PcSet) => {
    const s = pcset(set).setNum;
    const o = pcset(notes).setNum;

    return s !== o && (o & s) === o;
  });

  /**
   * Create a function that test if a collection of notes is a
   * superset of a given set (it contains all notes and at least one more)
   *
   * @param {PcSet} set - the subset to test against (chroma or list of notes)
   * @param {PcSet} notes - the subset to test (chroma or list of notes)
   * @return {boolean}
   * 
   * @example
   * const extendsCMajor = Pcset.isSupersetOf(["C", "E", "G"])
   * extendsCMajor(["e6", "a", "c4", "g2"]) // => true
   * extendsCMajor(["c6", "e4", "g3"]) // => false
   */
  export const isSupersetOf = curry((set: PcSet, notes: PcSet) => {
    const s = pcset(set).setNum;
    const o = pcset(notes).setNum;
    return s !== o && (o | s) === o;
  });

  /**
   * Test if a given pitch class set includes a note
   *
   * @param {PcSet} set - the base set to test against
   * @param {NoteName} note - the note to test
   * @return {boolean} true if the note is included in the pcset
   *
   * Can be partially applied
   *
   * @example
   * const isNoteInCMajor = isNoteInSet(['C', 'E', 'G'])
   * isNoteInCMajor('C4') // => true
   * isNoteInCMajor('C#4') // => false
   */
  export const isNoteInSet = curry((set: PcSet, note: NoteName): boolean => {
    const s = pcset(set);
    const n = Note && Note(note);
    return s && n.valid && s.chroma.charAt(n.chroma) === '1';
  });

  /**
   * Filter a list with a pitch class set
   *
   * @param {PcSet} set - the pitch class set notes
   * @param {Array<NoteName>} notes - the note list to be filtered
   * @return {Array<NoteName>} the filtered notes
   *
   * @example
   * Pcset.filter(["C", "D", "E"], ["c2", "c#2", "d2", "c3", "c#3", "d3"]) // => [ "c2", "d2", "c3", "d3" ])
   * Pcset.filter(["C2"], ["c2", "c#2", "d2", "c3", "c#3", "d3"]) // => [ "c2", "c3" ])
   */
  export const filterNotes = curry((set: PcSet, notes: NoteName[]) => {
    const memberOfSet = isNoteInSet(set);
    return notes.filter(memberOfSet);
  });

  /**
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   *                 INTERVAL - PC methods                   *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   */

  /**
   * Get the intervals of a pcset *starting from C*
   * @param {PcSet} src - the pitch class set
   * @return {IntervalName[]} an array of interval names or an empty array if not a valid pitch class set
   */
  export function intervals(src: PcSet): IntervalName[] {
    // PcChroma to array
    const chroma = pcset(src).chroma.split('');
    // Map every c == '1' to Interval at position i, then filter existing values
    return compact(chroma.map((c, i) => (c === '1' ? INTERVALS[i] : null)));
  }

  /**
   * Transpose a note by an interval. The note can be a pitch class.
   *
   * This function can be partially applied.
   *
   * @param {NoteName} note
   * @param {IntervalName} interval
   * @return {NoteName} the transposed note
   * @example
   * import { tranpose } from "tonal-distance"
   * transpose("d3", "3M") // => "F#3"
   * // it works with pitch classes
   * transpose("D", "3M") // => "F#"
   * // can be partially applied
   * ["C", "D", "E", "F", "G"].map(transpose("M3")) // => ["E", "F#", "G#", "A", "B"]
   */
  export const transpose = (...args: string[]): any => {
    if (args.length === 1) {
      return (name: NoteName) => transpose(name, args[0]);
    }
    const [n, i] = args;
    const note = Note && Note(n);
    const interval = Interval(i);

    if (!both(note.valid, interval.valid)) return undefined;

    const amount: NoteMidi = note.midi + interval.semitones;

    return Note(amount);
  };

}