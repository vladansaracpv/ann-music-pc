import { Interval, INTERVAL, IntervalName, IntervalProps } from 'ann-music-interval';
import { NoNote, Note, NOTE, NoteMidi, NoteName, NoteProps } from 'ann-music-note';
import { BaseArray, BaseBoolean, BaseFunctional, BaseRelations, BaseTypings } from 'ann-music-base';

const { compact, range, rotate, toBinary } = BaseArray;
const { both } = BaseBoolean;
const { curry } = BaseFunctional;
const { inSegment, eq } = BaseRelations;
const { isArray, isNumber, isObject, isUndefinedOrNull } = BaseTypings;

export type PcChroma = string;

export type PcNum = number;

export interface PcProperties {
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
  readonly setNum: PcNum;
  readonly chroma: PcChroma;
  readonly normalized: PcChroma;
  readonly intervals: IntervalName[];
  readonly length?: number;
  readonly empty: boolean;
}

export type PcSet = PcProperties | PcChroma | PcNum | NoteName[] | IntervalName[];

export const PitchClass = {
  Validators: {
    isPcNum: (set: any): set is PcNum => isNumber(set) && inSegment(0, 4095, set),
    isPcChroma: (set: any): set is PcChroma => /^[01]{12}$/.test(set),
    isPcSet: (set: any): set is PcProperties => isObject(set) && PitchClass.Validators.isPcChroma(set.chroma),
  },

  Methods: {
    /**
     * Rotates chroma string so that it starts with 1
     * @param {PcChroma} chroma
     * @return {PcChroma}
     */
    normalize(chroma: PcChroma): PcChroma {
      const first = chroma.indexOf('1');
      return chroma.slice(first, 12) + chroma.slice(0, first);
    },

    /**
     * Get a list of all possible pitch class sets (all possible chromas) *having C as root*.
     * There are 2048 different chromas.
     * If len is provided it filters to those PcsetChromas of length == len
     *
     * @see http://allthescales.org/
     * @param {number} len
     * @return {Array<PcChroma>} an array of possible chromas from '10000000000' to '11111111111'
     */
    chromaList(len?: number): PcChroma[] {
      const all: PcChroma[] = range(2048, 4095).map(toBinary);
      return len === undefined ? all.slice() : all.filter(chroma => PC(chroma).length === len);
    },

    /**
     * Produce the rotations
     * of the chroma discarding the ones that starts with "0" (normalize=true)
     *
     * @param {PcSet} set - the list of notes or pitchChr of the set
     * @param {boolean} [normalize] - Use only strings with leading '1'
     * @return {Array<string>} modes array
     */
    modes(set: PcSet, normalized = true): PcChroma[] {
      const pcs = PC(set);
      const binary = pcs.chroma.split('');

      return compact(
        binary.map((b, i) => {
          // make rotation starting with i
          const r = rotate(i, binary);
          // if we want normalized array, then we accept only those starting with r[0] === '1'
          return normalized && r[0] === '0' ? null : r.join('');
        }),
      );
    },

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
    isEqual(one: PcSet, other: PcSet) {
      return eq(PC(one).setNum, PC(other).setNum);
    },

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
    isSubsetOf: curry((set: PcSet, notes: PcSet) => {
      const s = PC(set).setNum;
      const o = PC(notes).setNum;

      return s !== o && (o & s) === o;
    }),

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
    isSupersetOf: curry((set: PcSet, notes: PcSet) => {
      const s = PC(set).setNum;
      const o = PC(notes).setNum;

      return s !== o && (o | s) === o;
    }),

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
    transpose: (...args: string[]): any => {
      if (args.length === 1) {
        return (name: NoteName) => PitchClass.Methods.transpose(name, args[0]);
      }
      const [n, i] = args;
      const note = Note && Note(n);
      const interval = Interval(i);

      if (!both(note.valid, interval.valid)) return undefined;

      const amount: NoteMidi = note.midi + interval.semitones;

      return Note(amount);
    },
  },

  Chroma: {
    toNum: (chroma: PcChroma): PcNum => parseInt(chroma, 2),
    toIntervals: (chroma: PcChroma): IntervalName[] => {
      const notNull = value => !isUndefinedOrNull(value);
      const toIvl = (val, i) => (val === '1' ? Interval(i).name : null);
      return chroma
        .split('')
        .map(toIvl)
        .filter(notNull);
    },
    toSet: (chroma: PcChroma): PcProperties => {
      const setNum = PitchClass.Chroma.toNum(chroma);
      const normalized = PitchClass.Methods.normalize(chroma);
      const intervals = PitchClass.Chroma.toIntervals(chroma);

      let length = 0;

      for (let i = 0; i < 12; i++) {
        if (chroma.charAt(i) === '1') length++;
      }

      const empty = eq(0, length);

      return { setNum, chroma, normalized, intervals, length, empty };
    },

    fromNum: (num: PcNum): PcChroma =>
      Number(num)
        .toString(2)
        .padStart(12, '0'),
    fromArray: (set: NoteName[] | IntervalName[]): PcChroma => {
      if (set.length === 0) {
        return PitchClass.Empty.chroma;
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
          return PitchClass.Empty.chroma;
        }

        // Is it Note or Interval?
        if (pitch.valid) {
          binary[pitch.chroma] = 1;
        }
      }
      return binary.join('');
    },
  },

  Empty: {
    setNum: 0,
    chroma: '000000000000',
    normalized: '000000000000',
    intervals: [],
    length: 0,
    empty: true,
  },
};

export function PC(src: PcSet) {
  const { isPcChroma, isPcNum, isPcSet } = PitchClass.Validators;
  const { fromNum, fromArray, toNum, toIntervals } = PitchClass.Chroma;
  const { normalize } = PitchClass.Methods;

  const chroma: PcChroma = isPcChroma(src)
    ? src
    : isPcNum(src)
    ? fromNum(src)
    : isArray(src)
    ? fromArray(src)
    : isPcSet(src)
    ? src.chroma
    : PitchClass.Empty.chroma;

  const setNum: PcNum = toNum(chroma);
  const normalized = normalize(chroma);
  const intervals = toIntervals(normalized);
  const length = chroma.split('').filter(c => c === '1').length;
  const empty = eq(0, length);

  function isEqualTo(other: PcSet) {
    return PitchClass.Methods.isEqual(chroma, other);
  }

  function isIn(other: PcSet) {
    return PitchClass.Methods.isSubsetOf(other, this.chroma);
  }

  function contains(other: PcSet) {
    return PitchClass.Methods.isSupersetOf(other, this.chroma);
  }

  return Object.freeze({
    setNum,
    chroma,
    normalized,
    intervals,
    length,
    empty,
    isEqualTo,
    isIn,
    contains,
  });
}
