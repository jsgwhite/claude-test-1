/**
 * TDD tests for scoreGuess — Wordle two-pass scoring algorithm.
 * Written BEFORE the implementation per the TDD contract.
 */
import { describe, it, expect } from 'vitest';
import { scoreGuess } from './scoring.js';

describe('scoreGuess', () => {
  // ---- All correct ----
  it('all correct when guess === answer', () => {
    expect(scoreGuess('crane', 'crane')).toEqual([
      'correct', 'correct', 'correct', 'correct', 'correct',
    ]);
  });

  // ---- All absent ----
  it('all absent when no letters match', () => {
    // answer: "brick", guess: "flops" — no shared letters
    expect(scoreGuess('brick', 'flops')).toEqual([
      'absent', 'absent', 'absent', 'absent', 'absent',
    ]);
  });

  // ---- Basic present (right letter, wrong position) ----
  it('marks present for correct letter in wrong position', () => {
    // answer: "crane" c(0) r(1) a(2) n(3) e(4), guess: "nacre" n(0) a(1) c(2) r(3) e(4)
    // Pass1 exact: pos4 e=e → correct; letterCounts: c=1,r=1,a=1,n=1,e=0
    // Pass2: pos0 n→present, pos1 a→present, pos2 c→present, pos3 r→present
    expect(scoreGuess('crane', 'nacre')).toEqual([
      'present', 'present', 'present', 'present', 'correct',
    ]);
  });

  // ---- Mix of correct, present, absent ----
  it('mixed: correct, present, absent', () => {
    // answer: "crane" c(0) r(1) a(2) n(3) e(4), guess: "crate" c(0) r(1) a(2) t(3) e(4)
    // Pass1: c=c correct, r=r correct, a=a correct, e=e correct; letterCounts: n=1 remaining
    // Pass2: pos3 t → not in counts → absent
    expect(scoreGuess('crane', 'crate')).toEqual([
      'correct', 'correct', 'correct', 'absent', 'correct',
    ]);
  });

  // ---- Duplicate letter in guess, answer has only one ----
  it('excess duplicate in guess is absent when answer has only one instance', () => {
    // answer: "crane" c(0) r(1) a(2) n(3) e(4), guess: "craan" c(0) r(1) a(2) a(3) n(4)
    // Pass1: c=c correct, r=r correct, a=a correct (pos2); letterCounts: n=1, e=1
    // Pass2: pos3 a → a exhausted (0) → absent; pos4 n → n=1 → present
    expect(scoreGuess('crane', 'craan')).toEqual([
      'correct', 'correct', 'correct', 'absent', 'present',
    ]);
  });

  it('only one present when answer has one letter and guess has two (no exact match)', () => {
    // answer: "tiger", guess: "timid"
    // t→correct, i→correct, m→absent, i→absent (second i, answer only has one i at pos 1 already exact-matched), d→absent
    expect(scoreGuess('tiger', 'timid')).toEqual([
      'correct', 'correct', 'absent', 'absent', 'absent',
    ]);
  });

  it('doubled guess letter: one present, one absent when answer has one at different position', () => {
    // answer: "hello", guess: "llama"
    // l→present (l exists in answer), l→correct (pos 3→correct, "l" at index 3 of hello is 'l'), a→absent, m→absent, a→absent
    // answer: h-e-l-l-o, guess: l-l-a-m-a
    // Pass 1 (exact): index 1 → guess[1]='l' answer[1]='e' no; index 3 → guess[3]='m' answer[3]='l' no
    // Actually let's be precise:
    // answer= h(0) e(1) l(2) l(3) o(4)
    // guess=  l(0) l(1) a(2) m(3) a(4)
    // Pass1 exact: none match
    // letterCounts: h=1,e=1,l=2,o=1
    // Pass2: guess[0]='l' → l in letterCounts(2>0) → present, decrement→1
    //        guess[1]='l' → l in letterCounts(1>0) → present, decrement→0
    //        guess[2]='a' → not in counts → absent
    //        guess[3]='m' → not in counts → absent
    //        guess[4]='a' → not in counts → absent
    expect(scoreGuess('hello', 'llama')).toEqual([
      'present', 'present', 'absent', 'absent', 'absent',
    ]);
  });

  // ---- The canonical duplicate edge case: abbey/babes ----
  it('abbey guess babes', () => {
    // answer: a(0) b(1) b(2) e(3) y(4)
    // guess:  b(0) a(1) b(2) e(3) s(4)
    // Pass1 exact: b[2]=b[2]→correct, e[3]=e[3]→correct
    // letterCounts after pass1: a=1, b=2-1=1 (one b used as exact), e=1-1=0, y=1
    // Pass2 (non-exact positions: 0,1,4):
    //   guess[0]='b' → b in counts(1>0)→present, decrement→0
    //   guess[1]='a' → a in counts(1>0)→present, decrement→0
    //   guess[4]='s' → not in counts→absent
    expect(scoreGuess('abbey', 'babes')).toEqual([
      'present', 'present', 'correct', 'correct', 'absent',
    ]);
  });

  // ---- allee/eelam ----
  it('allee guess eelam', () => {
    // answer: a(0) l(1) l(2) e(3) e(4)
    // guess:  e(0) e(1) l(2) a(3) m(4)
    // Pass1 exact: l[2]=l[2]→correct
    // letterCounts: a=1,l=2-1=1,e=2
    // Pass2 (non-exact: 0,1,3,4):
    //   guess[0]='e' → e in counts(2>0)→present, decrement→1
    //   guess[1]='e' → e in counts(1>0)→present, decrement→0
    //   guess[3]='a' → a in counts(1>0)→present, decrement→0
    //   guess[4]='m' → not in counts→absent
    expect(scoreGuess('allee', 'eelam')).toEqual([
      'present', 'present', 'correct', 'present', 'absent',
    ]);
  });

  it('doubled letter in guess where one is exact and one is absent (answer has only one)', () => {
    // answer: "solar", guess: "lolly"
    // answer: s(0) o(1) l(2) a(3) r(4)
    // guess:  l(0) o(1) l(2) l(3) y(4)
    // Pass1: o[1]=o[1]→correct, l[2]=l[2]→correct
    // letterCounts: s=1,o=1-1=0,l=1-1=0,a=1,r=1
    // Pass2 (non-exact: 0,3,4):
    //   guess[0]='l' → l in counts(0)→absent
    //   guess[3]='l' → l in counts(0)→absent
    //   guess[4]='y' → not in counts→absent
    expect(scoreGuess('solar', 'lolly')).toEqual([
      'absent', 'correct', 'correct', 'absent', 'absent',
    ]);
  });

  it('a guess with exactly the right number of duplicates', () => {
    // answer: "speed", guess: "seedy"
    // answer: s(0) p(1) e(2) e(3) d(4)
    // guess:  s(0) e(1) e(2) d(3) y(4)
    // Pass1: s[0]=s[0]→correct, e[2]=e[2]→correct
    // letterCounts: s=1-1=0, p=1, e=2-1=1, d=1
    // Pass2 (non-exact: 1,3,4):
    //   guess[1]='e' → e in counts(1>0)→present, decrement→0
    //   guess[3]='d' → d in counts(1>0)→present, decrement→0
    //   guess[4]='y' → not in counts→absent
    expect(scoreGuess('speed', 'seedy')).toEqual([
      'correct', 'present', 'correct', 'present', 'absent',
    ]);
  });
});
