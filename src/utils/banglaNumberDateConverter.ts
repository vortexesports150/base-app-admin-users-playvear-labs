/**
 * Utility for converting English & Bengali numeric digits, dates, currencies, and percentages
 * into fully spelled-out Bengali words so Cartesia TTS and Gemini TTS pronounce them naturally
 * without stumbling over English syllables or garbling dates/numbers.
 */

const BN_DIGIT_MAP: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

const EN_DIGIT_MAP: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

export function toEnglishDigits(str: string): string {
  return str.replace(/[০-৯]/g, (d) => EN_DIGIT_MAP[d] || d);
}

export function toBengaliDigits(str: string): string {
  return str.replace(/[0-9]/g, (d) => BN_DIGIT_MAP[d] || d);
}

// Bengali words for 0 to 100
const WORDS_0_TO_99: string[] = [
  'শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ',
  'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
  'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'উনত্রিশ', 'ত্রিশ',
  'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ', 'চল্লিশ',
  'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ', 'পঞ্চাশ',
  'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট', 'ষাট',
  'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর', 'সত্তর',
  'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আঠাত্তর', 'উনআশি', 'আশি',
  'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'উননব্বই', 'নব্বই',
  'একানব্বই', 'বানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
];

// Date day ordinals in Bengali
const DAY_WORDS: Record<number, string> = {
  1: 'পহেলা',
  2: 'দোসরা',
  3: 'তেসরা',
  4: 'চৌঠা',
  5: 'পাঁচই',
  6: 'ছয়ই',
  7: 'সাতই',
  8: 'আটই',
  9: 'নয়ই',
  10: 'দশই',
  11: 'এগারোই',
  12: 'বারোই',
  13: 'তেরোই',
  14: 'চৌদ্দই',
  15: 'পনেরোই',
  16: 'ষোলই',
  17: 'সতেরোই',
  18: 'আঠারোই',
  19: 'উনিশে',
  20: 'বিশে',
  21: 'একুশে',
  22: 'বাইশে',
  23: 'তেইশে',
  24: 'চব্বিশে',
  25: 'পঁচিশে',
  26: 'ছাব্বিশে',
  27: 'সাতাশে',
  28: 'আঠাশে',
  29: 'উনত্রিশে',
  30: 'ত্রিশে',
  31: 'একত্রিশে',
};

const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const EN_MONTH_MAP: Record<string, string> = {
  'january': 'জানুয়ারি', 'jan': 'জানুয়ারি',
  'february': 'ফেব্রুয়ারি', 'feb': 'ফেব্রুয়ারি',
  'march': 'মার্চ', 'mar': 'মার্চ',
  'april': 'এপ্রিল', 'apr': 'এপ্রিল',
  'may': 'মে',
  'june': 'জুন', 'jun': 'জুন',
  'july': 'জুলাই', 'jul': 'জুলাই',
  'august': 'আগস্ট', 'aug': 'আগস্ট',
  'september': 'সেপ্টেম্বর', 'sep': 'সেপ্টেম্বর', 'sept': 'সেপ্টেম্বর',
  'october': 'অক্টোবর', 'oct': 'অক্টোবর',
  'november': 'নভেম্বর', 'nov': 'নভেম্বর',
  'december': 'ডিসেম্বর', 'dec': 'ডিসেম্বর',
};

/**
 * Convert an integer number (up to 99,99,99,999) to Bengali words
 */
export function numberToBanglaWords(num: number | string): string {
  const n = typeof num === 'string' ? parseInt(toEnglishDigits(num), 10) : Math.floor(num);
  if (isNaN(n)) return '';
  if (n === 0) return WORDS_0_TO_99[0];
  if (n < 0) return `মাইনাস ${numberToBanglaWords(Math.abs(n))}`;

  // Up to 99
  if (n < 100) {
    return WORDS_0_TO_99[n] || String(n);
  }

  // Hundreds
  if (n < 1000) {
    const hundredDigit = Math.floor(n / 100);
    const remainder = n % 100;
    const hundredWord = hundredDigit === 1 ? 'একশত' : `${WORDS_0_TO_99[hundredDigit]} শত`;
    if (remainder === 0) return hundredWord;
    return `${hundredWord} ${WORDS_0_TO_99[remainder]}`;
  }

  // Years format helper (e.g., 1971 -> উনিশ শত একাত্তর, 2026 -> দুই হাজার ছাব্বিশ)
  // If it's a 4-digit number between 1100 and 1999, commonly read as "X শত Y"
  if (n >= 1100 && n <= 1999) {
    const century = Math.floor(n / 100);
    const rem = n % 100;
    const centuryWord = `${WORDS_0_TO_99[century]} শত`;
    if (rem === 0) return centuryWord;
    return `${centuryWord} ${WORDS_0_TO_99[rem]}`;
  }

  // Thousands (হাজার) - up to 99,999
  if (n < 100000) {
    const thousandPart = Math.floor(n / 1000);
    const remainder = n % 1000;
    const thousandWord = `${WORDS_0_TO_99[thousandPart]} হাজার`;
    if (remainder === 0) return thousandWord;
    return `${thousandWord} ${numberToBanglaWords(remainder)}`;
  }

  // Lakhs (লাখ) - up to 99,99,999
  if (n < 10000000) {
    const lakhPart = Math.floor(n / 100000);
    const remainder = n % 100000;
    const lakhWord = `${WORDS_0_TO_99[lakhPart]} লাখ`;
    if (remainder === 0) return lakhWord;
    return `${lakhWord} ${numberToBanglaWords(remainder)}`;
  }

  // Crores (কোটি)
  const crorePart = Math.floor(n / 10000000);
  const remainder = n % 10000000;
  const croreWord = `${numberToBanglaWords(crorePart)} কোটি`;
  if (remainder === 0) return croreWord;
  return `${croreWord} ${numberToBanglaWords(remainder)}`;
}

/**
 * Convert individual digits for phone numbers or serial codes
 */
export function digitsToBanglaWords(digitsStr: string): string {
  const enDigits = toEnglishDigits(digitsStr);
  return enDigits
    .split('')
    .map((d) => (WORDS_0_TO_99[parseInt(d, 10)] !== undefined ? WORDS_0_TO_99[parseInt(d, 10)] : d))
    .join(' ');
}

/**
 * Master parser and converter for all numeric representations in text
 */
export function convertNumbersAndDatesToBanglaWords(text: string): string {
  if (!text) return '';

  let result = text;

  // 1. Phone numbers (e.g. 017XXXXXXXX, 018..., +8801...)
  result = result.replace(/(\+?88)?(01[3-9]\d{8})/g, (_match, _p1, phone) => {
    return ' ' + digitsToBanglaWords(phone) + ' ';
  });

  // 2. Dates like 16 December 1971, 16 Dec 1971, 21 February 1952, 26 March 1971
  const monthRegexPart = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর';
  const fullDateRegex = new RegExp(`(\\b[0-9০-৯]{1,2})\\s*(${monthRegexPart})\\s*([0-9০-৯]{4})?\\b`, 'gi');

  result = result.replace(fullDateRegex, (_match, dayStr, monthStr, yearStr) => {
    const day = parseInt(toEnglishDigits(dayStr), 10);
    const dayWord = DAY_WORDS[day] || `${numberToBanglaWords(day)} তারিখ`;
    const cleanMonth = monthStr.toLowerCase();
    const monthWord = EN_MONTH_MAP[cleanMonth] || monthStr;
    const yearWord = yearStr ? ` ${numberToBanglaWords(yearStr)}` : '';
    return `${dayWord} ${monthWord}${yearWord}`;
  });

  // 3. Numeric Dates like 16/12/1971, 21-02-1952, 26.03.1971
  result = result.replace(/\b([0-9০-৯]{1,2})[\/\-\.]([0-9০-৯]{1,2})[\/\-\.]([0-9০-৯]{2,4})\b/g, (_match, d, m, y) => {
    const day = parseInt(toEnglishDigits(d), 10);
    const month = parseInt(toEnglishDigits(m), 10);
    const year = parseInt(toEnglishDigits(y), 10);
    const dayWord = DAY_WORDS[day] || numberToBanglaWords(day);
    const monthWord = (month >= 1 && month <= 12) ? BENGALI_MONTHS[month - 1] : numberToBanglaWords(month);
    const yearWord = year ? numberToBanglaWords(year) : '';
    return `${dayWord} ${monthWord} ${yearWord}`.trim();
  });

  // 4. Currency: ৳500, 500৳, $100, 100$, 500 টাকা, $ 50
  result = result.replace(/([৳$€£])\s*([0-9০-৯,]+)/g, (_match, symbol, numStr) => {
    const cleanNum = numStr.replace(/,/g, '');
    const word = numberToBanglaWords(cleanNum);
    const unit = symbol === '৳' ? 'টাকা' : symbol === '$' ? 'ডলার' : symbol === '€' ? 'ইউরো' : 'পাউন্ড';
    return `${word} ${unit}`;
  });
  result = result.replace(/([0-9০-৯,]+)\s*([৳$€£])/g, (_match, numStr, symbol) => {
    const cleanNum = numStr.replace(/,/g, '');
    const word = numberToBanglaWords(cleanNum);
    const unit = symbol === '৳' ? 'টাকা' : symbol === '$' ? 'ডলার' : symbol === '€' ? 'ইউরো' : 'পাউন্ড';
    return `${word} ${unit}`;
  });

  // 5. Percentages: 50%, ৫০%, 12.5%
  result = result.replace(/([0-9০-৯]+(?:\.[0-9০-৯]+)?)\s*%/g, (_match, numStr) => {
    const enNum = toEnglishDigits(numStr);
    if (enNum.includes('.')) {
      const [intPart, decPart] = enNum.split('.');
      const intWord = numberToBanglaWords(intPart);
      const decWord = digitsToBanglaWords(decPart);
      return `${intWord} দশমিক ${decWord} শতাংশ`;
    }
    return `${numberToBanglaWords(numStr)} শতাংশ`;
  });

  // 6. Decimals: 5.5, ১২.৫
  result = result.replace(/([0-9০-৯]+)\.([0-9০-৯]+)/g, (_match, intPart, decPart) => {
    const intWord = numberToBanglaWords(intPart);
    const decWord = digitsToBanglaWords(decPart);
    return `${intWord} দশমিক ${decWord}`;
  });

  // 7. Ordinals / Day suffixes: যেমন: ১লা, ২রা, ৩রা, ৪ঠা, ৫ই, ২১শে, ৩১শে
  result = result.replace(/([0-9০-৯]{1,2})\s*(লা|রা|ঠা|ই|শে|তম)/g, (_match, numStr, suffix) => {
    const n = parseInt(toEnglishDigits(numStr), 10);
    if (DAY_WORDS[n]) {
      return DAY_WORDS[n];
    }
    return `${numberToBanglaWords(n)}-${suffix}`;
  });

  // 8. Standalone Numbers with commas (e.g., 20,000, 1,00,000, 1971, 2026)
  result = result.replace(/\b([0-9০-৯]{1,3}(?:,[0-9০-৯]{2,3})+)\b/g, (_match, numWithComma) => {
    const clean = numWithComma.replace(/,/g, '');
    return numberToBanglaWords(clean);
  });

  // 9. Any remaining standalone numbers (both English 0-9 and Bengali ০-৯)
  result = result.replace(/([0-9০-৯]+)/g, (_match, rawNum) => {
    return numberToBanglaWords(rawNum);
  });

  // Clean double spaces
  return result.replace(/\s{2,}/g, ' ').trim();
}
