// util.ts --- Utility definitions
// Author: katahiromz
// License: MIT

"use strict";

// Returns true if ch is a single decimal digit character
function isDigit(ch: string): boolean {
  return ch.length == 1 && '0' <= ch && ch <= '9';
}

// Character entry with associated image
interface DigitEntry {
  img: HTMLImageElement | null;
  src: string;
}

// Mapping of characters to their image assets
const digitInfo: { [key: string]: DigitEntry } = {
  '0': { img: null, src: 'img/0.svg' },
  '1': { img: null, src: 'img/1.svg' },
  '2': { img: null, src: 'img/2.svg' },
  '3': { img: null, src: 'img/3.svg' },
  '4': { img: null, src: 'img/4.svg' },
  '5': { img: null, src: 'img/5.svg' },
  '6': { img: null, src: 'img/6.svg' },
  '7': { img: null, src: 'img/7.svg' },
  '8': { img: null, src: 'img/8.svg' },
  '9': { img: null, src: 'img/9.svg' },
  '+': { img: null, src: 'img/plus.svg' },
  '-': { img: null, src: 'img/minus.svg' },
  '×': { img: null, src: 'img/times.svg' },
  '÷': { img: null, src: 'img/div.svg' },
  '=': { img: null, src: 'img/equal.svg' },
  '/': { img: null, src: 'img/slash.svg' },
  '\\': { img: null, src: 'img/backslash.svg' },
  '(': { img: null, src: 'img/paren-left.svg' },
  ')': { img: null, src: 'img/paren-right.svg' },
  '.': { img: null, src: 'img/dot.svg' },
  '…': { img: null, src: 'img/cdots.svg' },
  'red-0': { img: null, src: 'img/red-0.svg' },
  'red-1': { img: null, src: 'img/red-1.svg' },
  'red-2': { img: null, src: 'img/red-2.svg' },
  'red-3': { img: null, src: 'img/red-3.svg' },
  'red-4': { img: null, src: 'img/red-4.svg' },
  'red-5': { img: null, src: 'img/red-5.svg' },
  'red-6': { img: null, src: 'img/red-6.svg' },
  'red-7': { img: null, src: 'img/red-7.svg' },
  'red-8': { img: null, src: 'img/red-8.svg' },
  'red-9': { img: null, src: 'img/red-9.svg' },
  'red-+': { img: null, src: 'img/red-plus.svg' },
  'red--': { img: null, src: 'img/red-minus.svg' },
  'red-×': { img: null, src: 'img/red-times.svg' },
  'red-÷': { img: null, src: 'img/red-div.svg' },
  'red-=': { img: null, src: 'img/red-equal.svg' },
  'red-/': { img: null, src: 'img/red-slash.svg' },
  'red-\\': { img: null, src: 'img/red-backslash.svg' },
  'red-(': { img: null, src: 'img/red-paren-left.svg' },
  'red-)': { img: null, src: 'img/red-paren-right.svg' },
  'red-.': { img: null, src: 'img/red-dot.svg' },
  'red-…': { img: null, src: 'img/red-cdots.svg' },
};

// Load an image asset by its key
function loadImage(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load ${digitInfo[key].src}`));
    img.src = digitInfo[key].src;
    digitInfo[key].img = img;
  });
}

// Check whether a string contains only characters recognized by digitInfo
function validateImageChar(str: string): boolean {
  return str.match(/^[\d\+\-×÷=\/\\\(\)\.… ]*$/i) !== null;
}

// Normalize full-width and Japanese numeric characters to their ASCII equivalents
const replaceJapaneseNumericChars = (numStr: string): string => {
  numStr = numStr.replaceAll('　', ' '); // U+3000 ideographic space
  numStr = numStr.replaceAll('０', '0');
  numStr = numStr.replaceAll('１', '1');
  numStr = numStr.replaceAll('２', '2');
  numStr = numStr.replaceAll('３', '3');
  numStr = numStr.replaceAll('４', '4');
  numStr = numStr.replaceAll('５', '5');
  numStr = numStr.replaceAll('６', '6');
  numStr = numStr.replaceAll('７', '7');
  numStr = numStr.replaceAll('８', '8');
  numStr = numStr.replaceAll('９', '9');
  numStr = numStr.replaceAll('．', '.');
  // Some locales use commas as decimal separators; also guard against comma/period confusion
  numStr = numStr.replaceAll('，', '.');
  numStr = numStr.replaceAll(',', '.');
  // Japanese IMEs may convert a period to a Japanese full stop (。), so handle that too
  numStr = numStr.replaceAll('。', '.');
  numStr = numStr.replaceAll('｡', '.');
  return numStr;
};

interface NumberInfo {
  numeric: number;
  numStr: string;
  integer: string;
  int_len: number;
  fraction: string;
  frac_len: number;
  digits: string;
  digits_len: number;
}

// Parse and return detailed information about a numeric string
const getNumberInfo = (numStr: string): NumberInfo | null => {
  console.assert(typeof numStr === 'string');
  numStr = numStr.trim();
  numStr = replaceJapaneseNumericChars(numStr);
  numStr = numStr.replaceAll(' ', '');
  const found = numStr.match(/^0*(\d+)(\.\d*?)?0*$/);
  if (numStr === '' || found === null) {
    console.log("Invalid number string: " + numStr);
    return null;
  }
  let integer = found[1].toString();
  if (integer === '') integer = '0';
  let fraction = found[2] ? found[2].substr(1) : '';
  let numeric = parseInt(numStr);
  let digits = numStr.replaceAll('.', '');
  return { numeric, numStr, integer, int_len: integer.length, fraction, frac_len: fraction.length, digits, digits_len: digits.length };
};

// Normalize an unsigned number string by stripping unnecessary leading/trailing zeros.
// Signed numbers are not supported, as this tool only handles written arithmetic with positive values.
const normalizeUnsignedNumber = (numStr: string): string => {
  console.assert(typeof numStr === 'string');
  numStr = replaceJapaneseNumericChars(numStr);
  numStr = numStr.replaceAll(' ', '');
  while (numStr.startsWith('0'))
    numStr = numStr.substr(1, numStr.length - 1);
  if (numStr.startsWith('.'))
    numStr = '0' + numStr;
  if (numStr.indexOf('.') >= 0) {
    while (numStr.endsWith('0'))
      numStr = numStr.substr(0, numStr.length - 1);
  }
  if (numStr.endsWith('.'))
    numStr = numStr.substr(0, numStr.length - 1);
  if (numStr.startsWith('.'))
    numStr = '0' + numStr;
  if (numStr.length == 0)
    numStr = '0';
  return numStr;
};

// Test helper for normalizeUnsignedNumber
const normalizeUnsignedNumberTestEntry = (numStr: string, trueAnswer: string): boolean => {
  let answer = normalizeUnsignedNumber(numStr);
  if (answer === trueAnswer)
    return true;
  console.log(`${answer} !== ${trueAnswer}`);
  return false;
}

// Unit tests for normalizeUnsignedNumber
const normalizeUnsignedNumberUnitTest = (): void => {
  console.assert(normalizeUnsignedNumberTestEntry('', '0'));
  console.assert(normalizeUnsignedNumberTestEntry('0', '0'));
  console.assert(normalizeUnsignedNumberTestEntry('0.', '0'));
  console.assert(normalizeUnsignedNumberTestEntry('0.0', '0'));
  console.assert(normalizeUnsignedNumberTestEntry('0.01', '0.01'));
  console.assert(normalizeUnsignedNumberTestEntry('0.010', '0.01'));
  console.assert(normalizeUnsignedNumberTestEntry('10', '10'));
  console.assert(normalizeUnsignedNumberTestEntry('10.', '10'));
  console.assert(normalizeUnsignedNumberTestEntry('10.1', '10.1'));
  console.assert(normalizeUnsignedNumberTestEntry('10.10', '10.1'));
  console.assert(normalizeUnsignedNumberTestEntry('10.100', '10.1'));
  console.assert(normalizeUnsignedNumberTestEntry('000100', '100'));
  console.assert(normalizeUnsignedNumberTestEntry('000100.1', '100.1'));
  console.assert(normalizeUnsignedNumberTestEntry('123456789.0', '123456789'));
  console.assert(normalizeUnsignedNumberTestEntry('0000000000000000000.000', '0'));
  console.assert(normalizeUnsignedNumberTestEntry('10000000000000000000000.000', '10000000000000000000000'));
  console.assert(normalizeUnsignedNumberTestEntry('０', '0'));
  console.assert(normalizeUnsignedNumberTestEntry('０．', '0'));
  console.assert(normalizeUnsignedNumberTestEntry('０．０', '0'));
  console.assert(normalizeUnsignedNumberTestEntry('０．０１', '0.01'));
  console.assert(normalizeUnsignedNumberTestEntry('０．０１０', '0.01'));
  console.assert(normalizeUnsignedNumberTestEntry('１２３４５６７８９．０１０', '123456789.01'));
};
normalizeUnsignedNumberUnitTest();

// Escape HTML special characters
function htmlspecialchars(str: string): string {
  return (str + '').replace(/&/g, '&amp;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&#039;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');
}

/**
 * Compare two positive numbers represented as strings.
 * @return {number} 1 if a > b, -1 if a < b, 0 if equal
 */
function comparePositiveNumbers(a: string, b: string): number {
  // Normalize both values (strip unnecessary leading/trailing zeros)
  const normA = normalizeUnsignedNumber(a);
  const normB = normalizeUnsignedNumber(b);
  
  const partsA = normA.split('.');
  const partsB = normB.split('.');
  
  const intA = partsA[0];
  const intB = partsB[0];
  const fracA = partsA[1] || "";
  const fracB = partsB[1] || "";

  // 1. Compare by the number of digits in the integer part
  if (intA.length > intB.length) return 1;
  if (intA.length < intB.length) return -1;
  
  // 2. Compare the integer part lexicographically
  if (intA > intB) return 1;
  if (intA < intB) return -1;
  
  // 3. Compare the fractional parts (pad the shorter one with trailing zeros)
  const maxFracLen = Math.max(fracA.length, fracB.length);
  const paddedFracA = fracA.padEnd(maxFracLen, '0');
  const paddedFracB = fracB.padEnd(maxFracLen, '0');
  
  if (paddedFracA > paddedFracB) return 1;
  if (paddedFracA < paddedFracB) return -1;
  return 0;
}

// Returns the number of digits after the decimal point
function getFracLen(str: string): number {
    let index = str.indexOf('.');
    if (index == -1)
        return 0;
    return str.length - index - 1;
}