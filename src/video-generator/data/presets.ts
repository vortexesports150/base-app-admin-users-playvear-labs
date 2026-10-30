import { PresetPresenter } from '../types';

export const PRESET_PRESENTERS: PresetPresenter[] = [
  {
    id: 'bd-tv-anchor',
    name: 'Rakib Hasan',
    banglaName: 'রাকিব হাসান',
    title: 'TV Presenter',
    role: 'TV News Anchor',
    imagePath: '/src/assets/images/bd_tv_anchor_presenter_1792633346511.webp',
    recommendedPrompt:
      'রেফারেন্স ছবির ব্যক্তি, চেহারা, দাঁত, হাসি, পোশাক ও ব্যাকগ্রাউন্ড ১০০% অবিকল বজায় রেখে ভিডিও তৈরি করুন। ভিডিও রেফারেন্স থেকে শুধুমাত্র কথা বলার সাবলীল স্টাইল, স্বাভাবিক হাসি, দাঁত ও মুখের নিখুঁত আর্টিকুলেশন, মাথার ত্রিমাত্রিক নড়াচড়া ও বডি ল্যাঙ্গুয়েজ গ্রহণ করুন—ছবির ব্যক্তির শরীর বা চেহারার কোনো অংশ পরিবর্তন বা বিকৃত না করে শতভাগ রিয়েলিস্টিক ভিডিও তৈরি করুন।',
    audioName: 'TV Presenter Bulletin (12s)',
    audioStyle: 'anchor',
    duration: 12,
  },
  {
    id: 'bd-keynote-speaker',
    name: 'Sharmin Akter',
    banglaName: 'শারমিন আক্তার',
    title: 'Keynote Speaker',
    role: 'Summit Keynote Speaker',
    imagePath: '/src/assets/images/sample_presenter_female_1792623750052.webp',
    recommendedPrompt:
      'রেফারেন্স ছবির ব্যক্তি, মুখমণ্ডল, দাঁত, মিষ্টি হাসি ও পোশাক অবিকল রেখে ভিডিও রেফারেন্স থেকে কথা বলার সাবলীল অঙ্গভঙ্গি, হেড মুভমেন্ট, চোখের স্বাভাবিক পলক ও নিখুঁত লিপ-সিঙ্ক নিয়ে উচ্চ মানের রিয়েলিস্টিক কি-নোট স্পিচ ভিডিও তৈরি করুন।',
    audioName: 'Keynote Speaker Speech (12s)',
    audioStyle: 'anchor',
    duration: 12,
  },
  {
    id: 'bd-tech-reviewer',
    name: 'Taniya Rahman',
    banglaName: 'তানিয়া রহমান',
    title: 'Tech Reviewer',
    role: 'Tech Host & Reviewer',
    imagePath: '/src/assets/images/bd_content_creator_presenter_1792633348521.webp',
    recommendedPrompt:
      'রেফারেন্স ছবির চেহারা, পোশাক ও ব্যাকগ্রাউন্ড ১০০% বজায় রেখে ভিডিও রেফারেন্সের মতো আকর্ষণীয় বাচনভঙ্গি, দাঁত ও হাসির স্বাভাবিক অভিব্যক্তি, মাথার সাবলীল নড়াচড়া ও নিখুঁত লিপ-সিঙ্ক সহ প্রফেশনাল টেক ভিডিও তৈরি করুন।',
    audioName: 'Tech Reviewer Podcast (12s)',
    audioStyle: 'creator',
    duration: 12,
  },
];

export const STUDIO_BACKDROP = '/src/assets/images/sample_studio_backdrop_1792623750431.webp';

export const PROMPT_PRESETS = [
  {
    label: 'TV News Bulletin',
    bangla: 'টিভি নিউজ বুলেটিন',
    prompt:
      'রেফারেন্স ছবির ব্যক্তি, মুখমণ্ডল, পোশাক ও ব্যাকগ্রাউন্ড ১০০% অবিকল ও অপরিবর্তিত রাখুন। কোনো প্রকার বিকৃতি ছাড়া প্রফেশনাল টিভি নিউজ প্রেজেন্টারের মতো সাবলীল বাচনভঙ্গি, স্বাভাবিক চোখের পলক, মাথার মৃদু নড়াচড়া ও অডিওর সাথে নিখুঁত লিপ-সিঙ্ক সহ উচ্চ মানের রিয়েলিস্টিক নিউজ বুলেটিন ভিডিও তৈরি করুন।',
  },
  {
    label: 'Creator Studio & Podcast',
    bangla: 'ক্রিয়েটর পডকাস্ট',
    prompt:
      'রেফারেন্স ছবির ক্যারেক্টারের মূল চেহারা, পোশাক এবং স্টুডিও ব্যাকগ্রাউন্ড পরিবেশ ১০০% অবিকল বজায় রাখুন। কথা বলার স্বাভাবিক ভঙ্গিমা, মুখের মিষ্টি ও প্রাঞ্জল অভিব্যক্তি এবং অডিওর সাউন্ডের সাথে নিখুঁত লিপ-সিঙ্ক সহ আকর্ষণীয় পডকাস্ট ও কনটেন্ট ক্রিয়েটর ভিডিও তৈরি করুন।',
  },
  {
    label: 'Corporate Product Review',
    bangla: 'পণ্য রিভিউ ও প্রেজেন্টেশন',
    prompt:
      'রেফারেন্স ছবির ব্যক্তির চেহারা, পোশাক এবং ব্যাকগ্রাউন্ড সম্পূর্ণ পরিবর্তনহীন ও অবিকল বজায় রাখুন। আত্মবিশ্বাসী প্রেজেন্টেশন স্টাইল, আকর্ষণীয় হাসি, স্বাভাবিক মাথার হেলে-দুলে কথা বলা এবং সাউন্ডের সাথে নিখুঁত ও বাস্তবসম্মত মুখের আর্টিকুলেশন সহ প্রোডাক্ট রিভিউ ভিডিও তৈরি করুন।',
  },
];

export const SUPPORTED_MODELS = [
  {
    id: 'heygen/heygen-video/reference-to-video',
    name: 'HeyGen Video (Reference-to-Video)',
    badge: 'Recommended · Gold Standard',
    costPerSec768p: 0.02,
    costPerSec1080p: 0.06,
    description: 'Best-in-class character preservation, lip-sync, and facial emotion for business and news presenters.',
  },
  {
    id: 'minimax/h3-max-turbo/image-to-video',
    name: 'MiniMax H3 Max Turbo',
    badge: 'Fast & Cinematic',
    costPerSec768p: 0.026,
    costPerSec1080p: 0.052,
    description: 'High-speed cinematic motion and lighting dynamics with rich physical simulation.',
  },
  {
    id: 'bytedance/seedance-2.5/us/reference-to-video',
    name: 'ByteDance Seedance 2.5',
    badge: 'Multi-Reference Pro',
    costPerSec768p: 0.5676,
    costPerSec1080p: 1.396,
    description: 'Supports up to 30 images and 10 audio references for deep complex scene composition.',
  },
];
