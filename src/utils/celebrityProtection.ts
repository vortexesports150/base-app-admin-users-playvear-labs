/**
 * Celebrity Protection & Ethical Consent Verification for PlayVear AI Voice Cloning.
 * Protects public figures, national leaders, celebrities, athletes, and media personalities
 * against unauthorized deepfakes and non-consensual voice cloning.
 */

export interface CelebrityMatchResult {
  isBlocked: boolean;
  celebrityName?: string;
  category?: 'political' | 'cultural' | 'sports' | 'media' | 'musician';
  warningMessage?: string;
}

interface CelebrityEntry {
  canonicalNameBn: string;
  canonicalNameEn: string;
  category: 'political' | 'cultural' | 'sports' | 'media' | 'musician';
  keywords: string[];
}

const CELEBRITY_REGISTRY: CelebrityEntry[] = [
  // Political & National Figures
  {
    canonicalNameBn: 'শেখ হাসিনা',
    canonicalNameEn: 'Sheikh Hasina',
    category: 'political',
    keywords: ['sheikh hasina', 'hasina', 'শেখ হাসিনা', 'হাসিনা', 'শেখ মুজিব', 'sheikh mujib', 'mujibur rahman'],
  },
  {
    canonicalNameBn: 'খালেদা জিয়া',
    canonicalNameEn: 'Khaleda Zia',
    category: 'political',
    keywords: ['khaleda zia', 'khaleda', 'খালেদা জিয়া', 'খালেদা', 'তারেক রহমান', 'tarique rahman', 'tarique zia'],
  },
  {
    canonicalNameBn: 'মুহাম্মদ ইউনূস',
    canonicalNameEn: 'Muhammad Yunus',
    category: 'political',
    keywords: ['muhammad yunus', 'dr yunus', 'ড. ইউনূস', 'মুহাম্মদ ইউনূস', 'ইউনূস'],
  },
  {
    canonicalNameBn: 'ওবায়দুল কাদের',
    canonicalNameEn: 'Obaidul Quader',
    category: 'political',
    keywords: ['obaidul quader', 'quader', 'ওবায়দুল কাদের', 'কাদের ভাই'],
  },
  {
    canonicalNameBn: 'মির্জা ফখরুল',
    canonicalNameEn: 'Mirza Fakhrul',
    category: 'political',
    keywords: ['mirza fakhrul', 'মির্জা ফখরুল', 'fakhrul islam alamgir'],
  },
  // Film & Drama Celebrities
  {
    canonicalNameBn: 'শাকিব খান',
    canonicalNameEn: 'Shakib Khan',
    category: 'cultural',
    keywords: ['shakib khan', 'sakib khan', 'শাকিব খান', 'কিং খান', 'king khan'],
  },
  {
    canonicalNameBn: 'হিরো আলম',
    canonicalNameEn: 'Hero Alom',
    category: 'cultural',
    keywords: ['hero alom', 'hero alam', 'ashraful alom', 'হিরো আলম', 'আশরাফুল আলম'],
  },
  {
    canonicalNameBn: 'আফরান নিশো',
    canonicalNameEn: 'Afran Nisho',
    category: 'cultural',
    keywords: ['afran nisho', 'nisho', 'আফরান নিশো', 'নিশো'],
  },
  {
    canonicalNameBn: 'মেহজাবীন চৌধুরী',
    canonicalNameEn: 'Mehazabien Chowdhury',
    category: 'cultural',
    keywords: ['mehazabien', 'mehazabeen', 'মেহজাবীন', 'মেহজাবিন', 'মেহজাবীন চৌধুরী'],
  },
  {
    canonicalNameBn: 'চঞ্চল চৌধুরী',
    canonicalNameEn: 'Chanchal Chowdhury',
    category: 'cultural',
    keywords: ['chanchal chowdhury', 'chanchal', 'চঞ্চল চৌধুরী'],
  },
  {
    canonicalNameBn: 'মোশাররফ করিম',
    canonicalNameEn: 'Mosharraf Karim',
    category: 'cultural',
    keywords: ['mosharraf karim', 'mosharrof', 'মোশাররফ করিম', 'মোশারফ করিম'],
  },
  {
    canonicalNameBn: 'জিয়াউল ফারুক অপূর্ব',
    canonicalNameEn: 'Ziaul Faruq Apurba',
    category: 'cultural',
    keywords: ['apurba', 'ziaul faruq apurba', 'অপূর্ব'],
  },
  {
    canonicalNameBn: 'পরী মনি',
    canonicalNameEn: 'Pori Moni',
    category: 'cultural',
    keywords: ['pori moni', 'porimoni', 'পরী মনি', 'পরীমনী'],
  },
  // Sports Icons
  {
    canonicalNameBn: 'শাকিব আল হাসান',
    canonicalNameEn: 'Shakib Al Hasan',
    category: 'sports',
    keywords: ['shakib al hasan', 'shakib alhasan', 'শাকিব আল হাসান', 'সাকিব আল হাসান', 'shakib75'],
  },
  {
    canonicalNameBn: 'তামিম ইকবাল',
    canonicalNameEn: 'Tamim Iqbal',
    category: 'sports',
    keywords: ['tamim iqbal', 'তামিম ইকবাল', 'tamim'],
  },
  {
    canonicalNameBn: 'মাশরাফি বিন মুর্তজা',
    canonicalNameEn: 'Mashrafe Mortaza',
    category: 'sports',
    keywords: ['mashrafe', 'mashrafe mortaza', 'মাশরাফি', 'মাশরাফী'],
  },
  {
    canonicalNameBn: 'মুশফিকুর রহিম',
    canonicalNameEn: 'Mushfiqur Rahim',
    category: 'sports',
    keywords: ['mushfiqur rahim', 'mushfiq', 'মুশফিকুর রহিম', 'মুশফিক'],
  },
  // Music & Singers
  {
    canonicalNameBn: 'জেমস (নগর বাউল)',
    canonicalNameEn: 'James (Nagar Baul)',
    category: 'musician',
    keywords: ['james', 'nagar baul', 'জেমস', 'নগর বাউল', 'গুরু জেমস'],
  },
  {
    canonicalNameBn: 'আইয়ুব বাচ্চু',
    canonicalNameEn: 'Ayub Bachchu',
    category: 'musician',
    keywords: ['ayub bachchu', 'ayub bacchu', 'আইয়ুব বাচ্চু', 'এলআরবি', 'lrb'],
  },
  {
    canonicalNameBn: 'তাহসান খান',
    canonicalNameEn: 'Tahsan Khan',
    category: 'musician',
    keywords: ['tahsan', 'tahsan khan', 'তাহসান'],
  },
  // Media & TV Anchors
  {
    canonicalNameBn: 'হানিফ সংকেত',
    canonicalNameEn: 'Hanif Sanket',
    category: 'media',
    keywords: ['hanif sanket', 'ittyadi', 'হানিফ সংকেত', 'ইত্যাদি'],
  },
  {
    canonicalNameBn: 'মীর আফসার আলী',
    canonicalNameEn: 'Mir Afsar Ali',
    category: 'media',
    keywords: ['mir afsar ali', 'sunday suspense', 'মীর আফসার আলী', 'সানডে সাসপেন্স'],
  },
  {
    canonicalNameBn: 'সালমান মুক্তাদির / তৌহিদ আফ্রিদি / আয়মান সাদিক',
    canonicalNameEn: 'Popular Influencer',
    category: 'media',
    keywords: ['salman muqtadir', 'tawhid afridi', 'ayman sadiq', 'সালমান মুক্তাদির', 'তৌহিদ আফ্রিদি', 'আয়মান সাদিক', 'munzereen'],
  },
];

/**
 * Checks text against celebrity registry and returns whether it is blocked
 */
export function checkCelebrityProtection(text: string): CelebrityMatchResult {
  if (!text || text.trim().length === 0) {
    return { isBlocked: false };
  }

  const normalized = text.toLowerCase().trim();

  for (const entry of CELEBRITY_REGISTRY) {
    for (const kw of entry.keywords) {
      const kwLower = kw.toLowerCase();
      // Exact substring or regex boundary match
      if (normalized.includes(kwLower)) {
        return {
          isBlocked: true,
          celebrityName: `${entry.canonicalNameBn} (${entry.canonicalNameEn})`,
          category: entry.category,
          warningMessage: `⚠️ সেলিব্রেটি সুরক্ষা নীতিমালা (Ethics & Legal Safeguard): "${entry.canonicalNameBn}" বা কোনো পাবলিক ফিগার/সেলিব্রেটির কণ্ঠ অনুমতি ছাড়া ক্লোন করা আইনত দণ্ডনীয় ও নিষিদ্ধ। আপনি শুধুমাত্র আপনার নিজের অথবা লিখিত অনুমতিপ্রাপ্ত ব্যক্তির কণ্ঠ ক্লোন করতে পারেন।`,
        };
      }
    }
  }

  return { isBlocked: false };
}

/**
 * Mandatory Consent Agreement Text for Voice Cloning
 */
export const VOICE_CLONING_CONSENT_DECLARATION = {
  title: 'ভয়েস স্বত্বাধিকার ও আইনি সম্মতিপত্র (Voice Ownership & Ethical Consent)',
  shortDeclaration: 'আমি নিশ্চিত করছি যে এটি আমার নিজস্ব কণ্ঠ অথবা ভয়েসটির মালিকের লিখিত অনুমতি রয়েছে। আমি কোনো সেলিব্রেটি বা ব্যক্তির ছদ্মবেশ ধারণ করব না।',
  verificationPhrase: 'আমি স্বেচ্ছায় এবং সজ্ঞানে PlayVear প্ল্যাটফর্মে আমার নিজস্ব কণ্ঠ ক্লোন করার পূর্ণ সম্মতি দিচ্ছি।',
  rules: [
    '১. আপনি শুধুমাত্র আপনার নিজের আসল কণ্ঠ ক্লোন করতে পারবেন।',
    '২. কোনো রাজনৈতিক ব্যক্তিত্ব, সেলিব্রেটি, খেলোয়াড় বা তৃতীয় কোনো ব্যক্তির কণ্ঠ তাদের সম্মতি ছাড়া ক্লোন করা সম্পূর্ণ নিষিদ্ধ।',
    '৩. যেকোনো ক্ষতিকর ডিপফেক, গুজব বা জালিয়াতির জন্য ব্যবহারকারী নিজে ব্যক্তিগতভাবে আইনত দায়ী থাকবেন।',
    '৪. আপনার ক্লোন করা ভয়েস শুধুমাত্র আপনার নিজস্ব একাউন্টেই সংরক্ষিত থাকবে এবং অন্য কারো সাথে শেয়ার করা হবে না।',
  ],
};
