/** Local bilingual verse bank. Rotated daily by day-of-year. */
export interface Verse {
  textEn: string;
  refEn: string;
  textAr: string;
  refAr: string;
}

export const VERSES: Verse[] = [
  {
    textEn: "The Lord is my shepherd; I shall not want.",
    refEn: "Psalm 23:1",
    textAr: "الرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ.",
    refAr: "مزمور ٢٣:‏١",
  },
  {
    textEn: "I can do all things through Christ who strengthens me.",
    refEn: "Philippians 4:13",
    textAr: "أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي.",
    refAr: "فيلبي ٤:‏١٣",
  },
  {
    textEn: "Trust in the Lord with all your heart, and lean not on your own understanding.",
    refEn: "Proverbs 3:5",
    textAr: "تَوَكَّلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ، وَعَلَى فَهْمِكَ لاَ تَعْتَمِدْ.",
    refAr: "أمثال ٣:‏٥",
  },
  {
    textEn: "Be strong and courageous. Do not be afraid; the Lord your God is with you.",
    refEn: "Joshua 1:9",
    textAr: "تَشَدَّدْ وَتَشَجَّعْ. لاَ تَرْهَبْ، لأَنَّ الرَّبَّ إِلهَكَ مَعَكَ.",
    refAr: "يشوع ١:‏٩",
  },
  {
    textEn: "Come to me, all you who are weary and burdened, and I will give you rest.",
    refEn: "Matthew 11:28",
    textAr: "تَعَالَوْا إِلَيَّ يَا جَمِيعَ الْمُتْعَبِينَ وَالثَّقِيلِي الأَحْمَالِ، وَأَنَا أُرِيحُكُمْ.",
    refAr: "متى ١١:‏٢٨",
  },
  {
    textEn: "For God so loved the world that he gave his one and only Son.",
    refEn: "John 3:16",
    textAr: "لأَنَّهُ هكَذَا أَحَبَّ اللهُ الْعَالَمَ حَتَّى بَذَلَ ابْنَهُ الْوَحِيدَ.",
    refAr: "يوحنا ٣:‏١٦",
  },
  {
    textEn: "The Lord is my light and my salvation; whom shall I fear?",
    refEn: "Psalm 27:1",
    textAr: "الرَّبُّ نُورِي وَخَلاَصِي، مِمَّنْ أَخَافُ؟",
    refAr: "مزمور ٢٧:‏١",
  },
  {
    textEn: "Rejoice in the Lord always. I will say it again: Rejoice!",
    refEn: "Philippians 4:4",
    textAr: "افْرَحُوا فِي الرَّبِّ كُلَّ حِينٍ، وَأَقُولُ أَيْضًا: افْرَحُوا.",
    refAr: "فيلبي ٤:‏٤",
  },
  {
    textEn: "Cast all your anxiety on him because he cares for you.",
    refEn: "1 Peter 5:7",
    textAr: "مُلْقِينَ كُلَّ هَمِّكُمْ عَلَيْهِ، لأَنَّهُ هُوَ يَعْتَنِي بِكُمْ.",
    refAr: "١ بطرس ٥:‏٧",
  },
  {
    textEn: "Your word is a lamp to my feet and a light to my path.",
    refEn: "Psalm 119:105",
    textAr: "سِرَاجٌ لِرِجْلِي كَلاَمُكَ وَنُورٌ لِسَبِيلِي.",
    refAr: "مزمور ١١٩:‏١٠٥",
  },
];

export function verseOfTheDay(date = new Date()): Verse {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return VERSES[dayOfYear % VERSES.length]!;
}
