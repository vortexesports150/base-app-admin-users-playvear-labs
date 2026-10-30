export type EngineMode = 'v2' | 'v3' | 'v4';

export type CharacterId =
  | 'news_anchor'
  | 'attitude_boy'
  | 'nature_poet'
  | 'mystery_teller'
  | 'horror_thriller'
  | 'geopolitics_analyst'
  | 'election_campaigner'
  | 'islamic_storyteller'
  | 'village_food'
  | 'bounty'
  | 'hype_streamer'
  | 'reviewer'
  | 'caster'
  | 'pro_analyst'
  | 'comic_roaster'
  | 'vear';

export interface CharacterOption {
  id: CharacterId;
  name: string;
  role: string;
  category: string;
}

export const CHARACTERS: CharacterOption[] = [
  {
    id: 'news_anchor',
    name: '1. The TV News Anchor (টিভি সংবাদ পাঠক)',
    role: 'সময় টিভি, ৭১ টিভি ও চ্যানেল ২৪ স্টাইল প্রফেশনাল সংবাদ পাঠ, হেডলাইন ও ব্রেকিং নিউজ',
    category: 'TV News Anchor & Breaking News Bulletin',
  },
  {
    id: 'attitude_boy',
    name: '2. Attitude Boy (টিকটক ও রিলস ডায়লগ)',
    role: '১৪ বছর বয়সী কিশোরদের আবেগ, প্রেম-বিচ্ছেদ, বন্ধু ও জীবনের হার্ড অ্যাটিটিউড ও স্যাড ডায়লগ',
    category: 'TikTok, Reels & Shorts Attitude Dialogue',
  },
  {
    id: 'nature_poet',
    name: '3. The Nature Poet (চিত্র মিডিয়া স্টাইল)',
    role: 'গ্রামবাংলা, গাছপালা, পশুপাখি ও প্রকৃতির ছন্দময় মায়াবী গল্প বলা',
    category: 'Chitra Media Nature & Folk Poetry',
  },
  {
    id: 'mystery_teller',
    name: '4. The Mystery Teller (মায়াজাল স্টাইল)',
    role: 'অজানা রহস্য, ডার্ক ফ্যাক্টস, প্রাচীন রহস্য ও সিনেমাটিক সাসপেন্স গল্প',
    category: 'Mayajaal Suspense & Documentary',
  },
  {
    id: 'horror_thriller',
    name: '5. Sunday Suspense (মীর / হরর থ্রিলার)',
    role: 'গা ছমছমে ভৌতিক গল্প, থ্রিলার সাসপেন্স ও রহস্যময় অডিও স্টোরি',
    category: 'Horror Thriller & Sunday Suspense',
  },
  {
    id: 'geopolitics_analyst',
    name: '6. The Defense & Geopolitics Analyst',
    role: 'আন্তর্জাতিক রাজনীতি, যুদ্ধ কৌশল, অস্ত্র ও সামরিক বিশ্লেষণ',
    category: 'Geopolitics & Military Analysis',
  },
  {
    id: 'election_campaigner',
    name: '7. Election Campaigner (গ্রামের নির্বাচনী মাইকিং)',
    role: 'রিকশা-ভ্যানে চোঙ্গা মাইকের নির্বাচনী প্রচারণা, স্লোগান, মার্কা ও গুণগান প্রচার',
    category: 'Desi Election Miking & Loudspeaker Campaign',
  },
  {
    id: 'islamic_storyteller',
    name: '8. The Islamic & Spiritual Storyteller',
    role: 'সাহাবী ও ঐতিহাসিক কাহিনী, কুরআন-হাদিসের গল্প ও আত্মশুদ্ধি',
    category: 'Islamic History & Spiritual Story',
  },
  {
    id: 'village_food',
    name: '9. The Village Food & Lifestyle Vlogger',
    role: 'গ্রামের মাটির রান্না, গ্রামীণ জীবনযাত্রা ও আন্তরিক মেঠোপথ ভ্লগ',
    category: 'Village Cooking & Folk Lifestyle',
  },
  {
    id: 'bounty',
    name: '10. বাউন্টি (Bounty - নিখুঁত ইমোশনাল ন্যারেটর)',
    role: 'অত্যন্ত সুন্দর ও নিখুঁত বর্ণনা এবং নিখুঁত ইমোশন কন্ট্রোল সহ মনোগ্রাহী বাংলা কণ্ঠ (Cartesia Cloned)',
    category: 'Cartesia Cloned Storyteller & Emotional Narrator',
  },
  {
    id: 'hype_streamer',
    name: '11. Rafi (Hype Streamer)',
    role: 'উত্তেজনাপূর্ণ পাবজি/ফ্রি ফায়ার লাইভ স্ট্রিম, ক্ল্যাচ ক্লিপ ও মজার রিঅ্যাকশন',
    category: 'Live Gaming & Hype Streamer',
  },
  {
    id: 'reviewer',
    name: '12. Alex (Social Video Reviewer)',
    role: 'টিকটক, রিলস, শর্টস ও গেমিং শর্ট ভিডিও রিভিউ ও ভয়েসওভার',
    category: 'Gaming & Social Media Video Review',
  },
  {
    id: 'caster',
    name: '13. Marcus (Tournament Caster)',
    role: '২০ বছর বয়সী তরুণ তুর্কি শাউটকাস্টারের তীব্র উত্তেজনাপূর্ণ ক্ল্যাচ ধারাভাষ্য ও রোমাঞ্চকর চিত্কার',
    category: 'High-Energy Esports Live Commentary',
  },
  {
    id: 'pro_analyst',
    name: '14. Tanvir (Pro Analyst)',
    role: 'প্রযুক্তি ও গ্যাজেট রিভিউ, পিসি বিল্ড, গেম অপটিমাইজেশন ও টিউটোরিয়াল',
    category: 'Tech Guru & Pro Gaming Analyst',
  },
  {
    id: 'comic_roaster',
    name: '15. Shuvo (Comic Roaster)',
    role: 'দেশি কমেডি ও স্যাটায়ার, মিম রিভিউ, ট্রোল গেমপ্লে ও ভাইরাল রোস্টিং',
    category: 'Meme Review & Comic Satire',
  },
  {
    id: 'vear',
    name: '16. Vear (TikTok & Shorts Fast Voice)',
    role: 'টিকটক, রিলস ও শর্টস ভিডিওর জন্য হাই-স্পিড নন-স্টপ এনার্জেটিক ভয়েসওভার (Cartesia Cloned Voice)',
    category: 'TikTok, Reels & Shorts Fast Voiceover',
  },
];

export interface VoiceGenerationResponse {
  audioBase64: string;
  mimeType: string;
  format: 'mp3' | 'wav';
  character: CharacterId;
  error?: string;
}
