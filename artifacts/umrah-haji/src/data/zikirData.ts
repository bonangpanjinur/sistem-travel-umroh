export interface ZikirItem {
  id: string;
  arabic: string;
  latin: string;
  translation: string;
  count: number;
  source?: string;
  benefit?: string;
}

export const ZIKIR_PAGI: ZikirItem[] = [
  {
    id: "pagi-1",
    arabic:
      "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
    latin:
      "Ashbahnaa wa ashbahal mulku lillaah, walhamdu lillaah, laa ilaaha illallaahu wahdahu laa syariika lah",
    translation:
      "Kami berada di waktu pagi dan kerajaan hanya milik Allah. Segala puji bagi Allah. Tidak ada Tuhan selain Allah semata, tiada sekutu bagi-Nya.",
    count: 1,
    source: "HR. Muslim",
  },
  {
    id: "pagi-2",
    arabic:
      "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
    latin:
      "Allaahumma bika ashbahnaa, wa bika amsainaa, wa bika nahyaa, wa bika namuutu, wa ilaikan-nusyuur",
    translation:
      "Ya Allah, dengan-Mu kami memasuki waktu pagi, dan dengan-Mu kami memasuki waktu sore. Dengan-Mu kami hidup, dengan-Mu kami mati, dan kepada-Mu tempat kembali.",
    count: 1,
    source: "HR. Tirmidzi",
  },
  {
    id: "pagi-sayyidul-istighfar",
    arabic:
      "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ",
    latin:
      "Allaahumma anta Rabbii laa ilaaha illaa anta, khalaqtanii wa anaa 'abduk...",
    translation:
      "Ya Allah, Engkaulah Tuhanku, tidak ada Tuhan selain Engkau. Engkau menciptakanku dan aku adalah hamba-Mu... (Sayyidul Istighfar)",
    count: 1,
    source: "HR. Bukhari",
    benefit: "Siapa yang mengucapkan dengan yakin di pagi hari dan meninggal di hari itu sebelum sore, ia masuk surga.",
  },
  {
    id: "pagi-subhanallah",
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    latin: "Subhaanallaahi wa bihamdih",
    translation: "Maha Suci Allah dan segala puji bagi-Nya.",
    count: 100,
    source: "HR. Muslim",
    benefit: "Dihapus dosa-dosanya meski sebanyak buih di lautan.",
  },
  {
    id: "pagi-laailaaha",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ",
    latin: "Laa ilaaha illallaahu wahdahu laa syariika lah, lahul mulku wa lahul hamd",
    translation: "Tiada Tuhan selain Allah semata, tiada sekutu bagi-Nya. Bagi-Nya kerajaan dan segala puji.",
    count: 10,
    source: "HR. Nasa'i",
  },
  {
    id: "pagi-astaghfirullah",
    arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
    latin: "Astaghfirullaaha wa atuubu ilaih",
    translation: "Aku memohon ampun kepada Allah dan bertobat kepada-Nya.",
    count: 100,
    source: "HR. Bukhari",
  },
];

export const ZIKIR_PETANG: ZikirItem[] = [
  {
    id: "petang-1",
    arabic:
      "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
    latin:
      "Amsainaa wa amsal mulku lillaah, walhamdu lillaah, laa ilaaha illallaahu wahdahu laa syariika lah",
    translation:
      "Kami berada di waktu sore dan kerajaan hanya milik Allah. Segala puji bagi Allah. Tidak ada Tuhan selain Allah semata, tiada sekutu bagi-Nya.",
    count: 1,
    source: "HR. Muslim",
  },
  {
    id: "petang-2",
    arabic:
      "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ",
    latin:
      "Allaahumma bika amsainaa, wa bika ashbahnaa, wa bika nahyaa, wa bika namuutu, wa ilaikal mashiir",
    translation:
      "Ya Allah, dengan-Mu kami memasuki sore, dan dengan-Mu kami memasuki pagi. Dengan-Mu kami hidup, dengan-Mu kami mati, dan kepada-Mu tempat kembali.",
    count: 1,
    source: "HR. Tirmidzi",
  },
  {
    id: "petang-aaudzubikalimaat",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    latin: "A'uudzu bikalimaatillaahit-taammaati min syarri maa khalaq",
    translation:
      "Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari kejahatan apa yang Dia ciptakan.",
    count: 3,
    source: "HR. Muslim",
    benefit: "Dilindungi dari sengatan binatang dan kejahatan malam itu.",
  },
  {
    id: "petang-subhanallah",
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    latin: "Subhaanallaahi wa bihamdih",
    translation: "Maha Suci Allah dan segala puji bagi-Nya.",
    count: 100,
    source: "HR. Muslim",
  },
  {
    id: "petang-laailaaha",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ",
    latin: "Laa ilaaha illallaahu wahdahu laa syariika lah, lahul mulku wa lahul hamd",
    translation: "Tiada Tuhan selain Allah semata, tiada sekutu bagi-Nya.",
    count: 10,
    source: "HR. Nasa'i",
  },
];