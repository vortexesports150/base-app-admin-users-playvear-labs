/**
 * banglaNumberToWords.ts
 * Converts English and Bengali digits, currency, and years into natural spoken Bengali words
 * for flawless, human-sounding AI Voice generation.
 */

const BANGLA_ONES = [
  'শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
  'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ',
  'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ',
  'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ',
  'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ',
  'পঞ্চাশ', 'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট',
  'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর',
  'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি',
  'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'অষ্টআশি', 'ঊননব্বই',
  'নব্বই', 'একানব্বই', 'বানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
];

/** Convert any Bengali digit string to English digits */
export function banglaDigitsToEnglish(str: string): string {
  const map: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (d) => map[d] || d);
}

/** Convert English digits to Bengali digits */
export function englishDigitsToBangla(str: string): string {
  const map: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return str.replace(/[0-9]/g, (d) => map[d] || d);
}

/** Convert a positive integer (up to 99,99,99,999) to spoken Bengali words */
export function numberToBanglaWords(num: number): string {
  if (isNaN(num)) return '';
  if (num === 0) return 'শূন্য';
  if (num < 0) return 'মাইনাস ' + numberToBanglaWords(Math.abs(num));

  // Limit to 99 crore for stability
  num = Math.floor(num);
  if (num >= 1000000000) {
    const higher = Math.floor(num / 10000000);
    const rem = num % 10000000;
    return `${numberToBanglaWords(higher)} কোটি ${rem > 0 ? numberToBanglaWords(rem) : ''}`.trim();
  }

  let words = '';

  // Crores (কোটি)
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  if (crore > 0) {
    words += `${BANGLA_ONES[crore] || crore} কোটি `;
  }

  // Lakhs (লাখ)
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  if (lakh > 0) {
    words += `${BANGLA_ONES[lakh] || lakh} লাখ `;
  }

  // Thousands (হাজার)
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  if (thousand > 0) {
    words += `${BANGLA_ONES[thousand] || thousand} হাজার `;
  }

  // Hundreds (শত)
  const hundred = Math.floor(num / 100);
  num %= 100;
  if (hundred > 0) {
    if (hundred === 1) {
      words += 'একশত ';
    } else {
      words += `${BANGLA_ONES[hundred]} শত `;
    }
  }

  // Remaining 1-99
  if (num > 0) {
    words += BANGLA_ONES[num] || num;
  }

  return words.trim();
}

/**
 * Normalizes text so numbers, currencies, and years sound 100% natural when read by TTS.
 * Examples:
 *  - "২০২৬ সালে" -> "দুই হাজার ছাব্বিশ সালে"
 *  - "৳ ৫০০" or "500 টাকা" -> "পাঁচশত টাকা"
 *  - "১০:৩০" -> "দশটা ত্রিশ"
 */
export function normalizeBanglaScriptForSpeech(text: string): string {
  if (!text) return '';

  let processed = text;

  // 1. Time patterns like ১০:৩০ or 10:30, ৫:৪৫
  processed = processed.replace(/([০-৯0-9]{1,2}):([০-৯0-9]{2})/g, (_, h, m) => {
    const hour = parseInt(banglaDigitsToEnglish(h), 10);
    const min = parseInt(banglaDigitsToEnglish(m), 10);
    const hourWord = BANGLA_ONES[hour] || String(hour);
    if (min === 0) return `${hourWord}টা`;
    if (min === 30) return `${hourWord}টা ত্রিশ`;
    if (min === 15) return `${hourWord}টা পনেরো`;
    if (min === 45) return `${hourWord}টা পঁয়তাল্লিশ`;
    const minWord = BANGLA_ONES[min] || String(min);
    return `${hourWord}টা ${minWord} মিনিট`;
  });

  // 2. Currency like ৳ ৫০০ or ৳500 or 500 টাকা
  processed = processed.replace(/৳\s*([০-৯0-9,]+)/g, (_, val) => {
    const cleanNum = parseInt(banglaDigitsToEnglish(val.replace(/,/g, '')), 10);
    if (isNaN(cleanNum)) return val;
    return `${numberToBanglaWords(cleanNum)} টাকা`;
  });

  // 3. Percentages like ৫০% or 50%
  processed = processed.replace(/([০-৯0-9]+)\s*%/g, (_, val) => {
    const cleanNum = parseInt(banglaDigitsToEnglish(val), 10);
    if (isNaN(cleanNum)) return val;
    return `শতকরা ${numberToBanglaWords(cleanNum)} ভাগ`;
  });

  // 4. Standalone years and numbers (e.g., ১৯৫২, ১৯৭১, ২০২৪, ২০২৬, ৫০০)
  // Match contiguous digits (English or Bangla)
  processed = processed.replace(/([০-৯0-9]{1,10})/g, (match) => {
    const eng = banglaDigitsToEnglish(match);
    const num = parseInt(eng, 10);
    if (isNaN(num)) return match;
    // If year 1900-2099
    if (num >= 1900 && num <= 2099) {
      return numberToBanglaWords(num);
    }
    // Normal number
    return numberToBanglaWords(num);
  });

  // Clean double spaces
  return processed.replace(/\s+/g, ' ').trim();
}
