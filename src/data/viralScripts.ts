export interface ViralScriptItem {
  id: string;
  category: 'reels_hooks' | 'mystery' | 'motivation' | 'horror' | 'ecommerce' | 'news' | 'gaming' | 'comedy';
  categoryLabelBn: string;
  titleBn: string;
  suggestedCharacter: string;
  suggestedCharacterNameBn: string;
  scriptText: string;
  estDuration: string;
}

export const VIRAL_SCRIPTS: ViralScriptItem[] = [
  // 1. TikTok & Reels Hooks
  {
    id: 'hook_3_mistakes',
    category: 'reels_hooks',
    categoryLabelBn: 'টিকটক ও রিলস হুক',
    titleBn: '৩টি ভুল যা আপনার জীবন ধ্বংস করছে',
    suggestedCharacter: 'vear',
    suggestedCharacterNameBn: 'ভিয়ার (হাই-স্পিড রিলস)',
    estDuration: '২৫ সেকেন্ড',
    scriptText:
      'এই ৩টি ভুল আপনিও হয়তো প্রতিদিন করছেন, কিন্তু আপনি জানেন না এর ফলে আপনার জীবন কোন দিকে যাচ্ছে! ৩ নম্বর ভুলটি ৯৯% মানুষ করে থাকে। মনোযোগ দিয়ে শেষ পর্যন্ত শুনুন। প্রথম ভুল, সকালে ঘুম থেকে উঠেই সোশ্যাল মিডিয়া স্ক্রোল করা...',
  },
  {
    id: 'hook_phone_secret',
    category: 'reels_hooks',
    categoryLabelBn: 'টিকটক ও রিলস হুক',
    titleBn: 'স্মার্টফোনের ভয়ানক গোপন রহস্য',
    suggestedCharacter: 'reviewer',
    suggestedCharacterNameBn: 'তানভির (টেক রিভিউয়ার)',
    estDuration: '২৮ সেকেন্ড',
    scriptText:
      'আপনি কি জানেন আপনার স্মার্টফোন আপনার অজান্তেই আপনার সব গোপন কথা শুনছে? প্রমাণ চান? আজই আপনার ফোনের সেটিংসে গিয়ে গুগল প্রাইভেসি চেক করুন। এই ছোট সেটিংটি এখনি বন্ধ না করলে আপনার ব্যক্তিগত তথ্য পাবলিক হয়ে যেতে পারে!',
  },
  {
    id: 'hook_psychology_trick',
    category: 'reels_hooks',
    categoryLabelBn: 'টিকটক ও রিলস হুক',
    titleBn: 'মনস্তাত্ত্বিক ট্রিক যা সবাই মানতে বাধ্য হবে',
    suggestedCharacter: 'attitude_boy',
    suggestedCharacterNameBn: 'রাকিব (অ্যাটিটিউড বয়)',
    estDuration: '২২ সেকেন্ড',
    scriptText:
      'যদি আপনি কাউকে আপনার কথা মানাতে চান, তাহলে এই মনস্তাত্ত্বিক ট্রিকটি প্রয়োগ করুন। মানুষের মনের ওপর প্রভাব বিস্তার করার জন্য উচ্চস্বরে কথা বলার প্রয়োজন নেই, বরং নিস্তব্ধতার শক্তি ব্যবহার করতে শিখুন।',
  },

  // 2. Mystery & Mayajaal
  {
    id: 'mystery_antarctica',
    category: 'mystery',
    categoryLabelBn: 'রহস্য ও তথ্যচিত্র',
    titleBn: 'অ্যান্টার্কটিকার বরফের নিচের অজানা পৃথিবী',
    suggestedCharacter: 'mystery_teller',
    suggestedCharacterNameBn: 'রহস্য কথক (মায়াজাল স্টাইল)',
    estDuration: '৩৫ সেকেন্ড',
    scriptText:
      'অ্যান্টার্কটিকার বরফের মাইলের পর মাইল নিচে ঠিক কী লুকিয়ে আছে? বিজ্ঞানীরা ড্রিলিং করার সময় এমন এক অদ্ভুত ধাতব শব্দ রেকর্ড করেছিলেন, যার উত্তর আজও কোনো গবেষক দিতে পারেননি। এটি কি কোনো প্রাচীন সভ্যতার নিদর্শন, নাকি সম্পূর্ণ ভিন্ন কিছু?',
  },
  {
    id: 'mystery_deep_ocean',
    category: 'mystery',
    categoryLabelBn: 'রহস্য ও তথ্যচিত্র',
    titleBn: 'মারিয়ানা ট্রেঞ্চের গভীরে পাওয়া দানবীয় সংকেত',
    suggestedCharacter: 'mystery_teller',
    suggestedCharacterNameBn: 'রহস্য কথক (মায়াজাল স্টাইল)',
    estDuration: '৩৩ সেকেন্ড',
    scriptText:
      'সমুদ্রপৃষ্ঠ থেকে প্রায় ১১ হাজার মিটার নিচে মারিয়ানা ট্রেঞ্চ। যেখানে সূর্যের আলো পৌঁছায় না, সেখানে পানির তীব্র চাপের মাঝে এক অদ্ভুত প্রাণীর ছায়া দেখা যায়। বিজ্ঞানীরা যখন ক্যামেরা পাঠালেন, তখন যা দেখতে পেলেন তা দেখে পুরো বিশ্ব চমকে যায়।',
  },

  // 3. Motivation & Emotional
  {
    id: 'motivation_failure',
    category: 'motivation',
    categoryLabelBn: 'ইমোশনাল ও মোটিভেশন',
    titleBn: 'হার মেনে নেওয়ার আগে একবার ভাবুন',
    suggestedCharacter: 'bounty',
    suggestedCharacterNameBn: 'বাউন্টি (ইমোশনাল ন্যারেটর)',
    estDuration: '৩০ সেকেন্ড',
    scriptText:
      'আজ হয়তো পরিস্থিতি আপনার অনুকূলে নেই। চারপাশের মানুষগুলো হয়তো আপনাকে নিয়ে হাসাহাসি করছে। কিন্তু মনে রাখবেন, সূর্য যখন ডোবে তখন পৃথিবী অন্ধকার হয় ঠিকই, কিন্তু পরের দিন সকালে সে আরও দ্বিগুণ তেজ নিয়ে উদিত হয়। আপনার গল্পটা শেষ হয়ে যায়নি, কেবল শুরু হলো।',
  },
  {
    id: 'motivation_silence',
    category: 'motivation',
    categoryLabelBn: 'ইমোশনাল ও মোটিভেশন',
    titleBn: 'নিজের যোগ্যতার প্রমাণ মুখে নয়, কাজে দিন',
    suggestedCharacter: 'attitude_boy',
    suggestedCharacterNameBn: 'রাকিব (অ্যাটিটিউড বয়)',
    estDuration: '২৬ সেকেন্ড',
    scriptText:
      'যারা আজ আপনাকে ছোট ভাবছে, তাদের উত্তর মুখে দিয়ে নিজের সময় নষ্ট করবেন না। নিজেকে এমন এক পর্যায়ে নিয়ে যান, যাতে একসময় আপনাকে দেখার জন্য তাদের সিরিয়াল দিতে হয়। মনে রাখবেন, সিংহের গর্জন না করলেও তার উপস্থিতি সবাই টের পায়।',
  },

  // 4. Horror & Thriller
  {
    id: 'horror_midnight',
    category: 'horror',
    categoryLabelBn: 'সানডে সাসপেন্স হরর',
    titleBn: 'রাত বারোটার পর সেই নির্জন পথ',
    suggestedCharacter: 'horror_thriller',
    suggestedCharacterNameBn: 'হরর মাস্টার (সানডে সাসপেন্স)',
    estDuration: '৩৫ সেকেন্ড',
    scriptText:
      'রাত তখন ঠিক বারোটা বেজে পনেরো মিনিট। চারপাশ যেন অস্বাভাবিকভাবে নিস্তব্ধ। কুয়াশায় ঢাকা সেই বাঁশবাগানের ভেতর থেকে হঠাৎ ভেসে এলো এক মৃদু কান্নার আওয়াজ। টর্চের আলোটা ফেলতেই আমি যা দেখলাম, আমার রক্ত যেন জমে বরফ হয়ে গেল...',
  },

  // 5. E-commerce & Product Ad
  {
    id: 'ecom_mega_sale',
    category: 'ecommerce',
    categoryLabelBn: 'পণ্য বিক্রি ও বিজ্ঞাপন',
    titleBn: 'স্পেশাল ধামাকা অফার ৫০% ছাড়',
    suggestedCharacter: 'female_anchor',
    suggestedCharacterNameBn: 'পূজা (স্পষ্ট ও মিষ্টি কণ্ঠ)',
    estDuration: '২৭ সেকেন্ড',
    scriptText:
      'দারুণ সুখবর! আর নয় চড়া মূল্যে কেনাকাটা। আমাদের প্রিমিয়াম কালেকশনে এখন চলছে আকর্ষণীয় মেগা অফার! প্রথম একশত জন কাস্টমার পাচ্ছেন ফ্রি ডেলিভারি ও ৫০ শতাংশ পর্যন্ত নিশ্চিত ডিসকাউন্ট। স্টক সীমিত, তাই এখনই অর্ডার করতে ইনবক্স করুন!',
  },

  // 6. TV News Bulletin
  {
    id: 'news_breaking_bulletin',
    category: 'news',
    categoryLabelBn: 'টিভি সংবাদ বুলেটিন',
    titleBn: 'এইমাত্র পাওয়া বিশেষ সংবাদ বুলেটিন',
    suggestedCharacter: 'news_anchor',
    suggestedCharacterNameBn: 'কবীর (টিভি নিউজ উপস্থাপক)',
    estDuration: '৩০ সেকেন্ড',
    scriptText:
      'দর্শকদের স্বাগত জানাচ্ছি বিশেষ সংবাদ বুলেটিনে, সাথে আছি আমি। এইমাত্র পাওয়া জরুরি খবরে জানা গেছে, আবহাওয়া অধিদপ্তরের সর্বশেষ পূর্বাভাস অনুযায়ী আগামী চব্বিশ ঘণ্টায় দেশের উত্তর ও পূর্বাঞ্চলে ভারী বর্ষণের সম্ভাবনা রয়েছে। বিস্তারিত আসছে একটু পরেই...',
  },

  // 7. Gaming & Esports Hype
  {
    id: 'gaming_clutch_hype',
    category: 'gaming',
    categoryLabelBn: 'গেমিং ও টুর্নামেন্ট হাইপ',
    titleBn: 'লাস্ট জোনে ১ বনাম ৪ অসম্ভব ক্লাচ',
    suggestedCharacter: 'caster',
    suggestedCharacterNameBn: 'সোহেল (টুর্নামেন্ট কাস্টার)',
    estDuration: '২৫ সেকেন্ড',
    scriptText:
      'ওহ মাই গড! লাস্ট জোনে একা বেঁচে আছে দলের শেষ প্লেয়ার! সামনে চার চারজন এনিমি তাকে ঘিরে ফেলছে! কিন্তু কি দুর্দান্ত রিফ্লেক্স! এক ম্যাগাজিনেই দুজনকে ডাউন করে ফেলল! আর মাত্র দুজন বাকি! পারবে কি সে ঐতিহাসিক এই ক্লাচটা উপহার দিতে?',
  },

  // 8. Comedy & Roasting
  {
    id: 'comedy_viral_roast',
    category: 'comedy',
    categoryLabelBn: 'কমেডি ও হাসির রোস্টিং',
    titleBn: 'সোশ্যাল মিডিয়ার অদ্ভুত কাণ্ডকীর্তি',
    suggestedCharacter: 'comic_roaster',
    suggestedCharacterNameBn: 'শুভ (কমেডি রোস্টার)',
    estDuration: '২৬ সেকেন্ড',
    scriptText:
      'ভাইরে ভাই! ফেসবুক রিলস খুললে আজকাল যা দেখতে পাই, মাঝে মাঝে মনে হয় ফোনটা গঙ্গায় বিসর্জন দিয়ে আসি! নিজেকে সেলিব্রেটি ভাবা পাবলিকদের এই অদ্ভুত অঙ্গভঙ্গি দেখে ডাক্তারের প্রেসক্রিপশনও ফেল মেরে গেছে!',
  },
];
