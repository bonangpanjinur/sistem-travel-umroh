import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, BookOpen, Trophy, RotateCcw, ChevronRight, Lightbulb } from "lucide-react";

const QUIZ_SCORES_KEY = "manasik-quiz-scores";

interface Question {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface QuizTopic {
  id: string;
  title: string;
  emoji: string;
  description: string;
  color: string;
  textColor: string;
  questions: Question[];
}

const TOPICS: QuizTopic[] = [
  {
    id: "ihram",
    title: "Ihram & Niat",
    emoji: "🤍",
    description: "Miqat, larangan ihram, dan tata cara niat",
    color: "bg-slate-100 border-slate-200",
    textColor: "text-slate-700",
    questions: [
      {
        q: "Miqat makani bagi jamaah dari Indonesia yang melewati Madinah adalah...",
        options: ["Yalamlam", "Bir Ali (Dzul Hulaifah)", "Qarnul Manazil", "Juhfah"],
        correct: 1,
        explanation: "Bir Ali (Dzul Hulaifah) adalah miqat bagi jamaah yang datang dari arah Madinah, termasuk jamaah Indonesia yang transit Madinah.",
      },
      {
        q: "Pakaian ihram bagi laki-laki terdiri dari...",
        options: [
          "Jubah putih dan surban",
          "Dua helai kain putih tanpa jahitan",
          "Baju koko putih dan sarung",
          "Gamis putih panjang",
        ],
        correct: 1,
        explanation: "Pakaian ihram laki-laki adalah dua helai kain putih tanpa jahitan: satu menutup bagian bawah (izar) dan satu menutup bagian atas (rida').",
      },
      {
        q: "Manakah yang BUKAN termasuk larangan ihram?",
        options: [
          "Memakai wangi-wangian",
          "Memotong rambut",
          "Memakai sandal (alas kaki)",
          "Menikah atau menikahkan",
        ],
        correct: 2,
        explanation: "Memakai sandal diperbolehkan saat ihram. Bahkan dianjurkan agar kaki terlindungi. Yang dilarang adalah menutup kepala (bagi laki-laki) dan wajah (bagi perempuan).",
      },
      {
        q: "Bacaan Talbiyah yang benar adalah...",
        options: [
          "Labbaika Allahumma labbaik, labbaika la syarika laka labbaik...",
          "Subhanakallahumma wabihamdika watabarakasmuka...",
          "Allahumma salli ala Muhammad wa ala ali Muhammad...",
          "Rabbana atina fid dunya hasanah...",
        ],
        correct: 0,
        explanation: "Talbiyah dibaca sejak memakai ihram hingga melempar jumrah aqabah. Bagi laki-laki dianjurkan dikeraskan, bagi perempuan cukup dengan suara lirih.",
      },
      {
        q: "Setelah berihram dari miqat, seorang jamaah umroh...",
        options: [
          "Boleh pulang dulu ke hotel sebelum tawaf",
          "Langsung menuju Masjidil Haram untuk tawaf",
          "Wajib sahur terlebih dahulu",
          "Harus mandi wajib di hotel",
        ],
        correct: 1,
        explanation: "Setelah ihram dari miqat, jamaah dianjurkan segera menuju Masjidil Haram untuk memulai tawaf qudum (tawaf kedatangan) dan dilanjutkan sa'i.",
      },
    ],
  },
  {
    id: "tawaf",
    title: "Tawaf",
    emoji: "🕋",
    description: "Tata cara, jumlah putaran, dan doa tawaf",
    color: "bg-emerald-50 border-emerald-200",
    textColor: "text-emerald-700",
    questions: [
      {
        q: "Tawaf umroh dilakukan sebanyak...",
        options: ["5 putaran", "7 putaran", "3 putaran", "9 putaran"],
        correct: 1,
        explanation: "Tawaf wajib dilakukan 7 putaran mengelilingi Ka'bah, dimulai dan diakhiri di Hajar Aswad.",
      },
      {
        q: "Arah putaran dalam tawaf adalah...",
        options: [
          "Searah jarum jam (Ka'bah di sebelah kanan)",
          "Berlawanan jarum jam (Ka'bah di sebelah kiri)",
          "Boleh keduanya, yang penting 7 putaran",
          "Tergantung kondisi keramaian",
        ],
        correct: 1,
        explanation: "Tawaf harus berlawanan jarum jam dengan Ka'bah selalu berada di sebelah kiri. Ini mengikuti sunnah Nabi ﷺ.",
      },
      {
        q: "Idtiba' (membuka bahu kanan) dalam tawaf dilakukan oleh...",
        options: ["Semua jamaah laki-laki dan perempuan", "Hanya laki-laki", "Hanya perempuan", "Tidak ada ketentuannya"],
        correct: 1,
        explanation: "Idtiba' adalah sunnah bagi laki-laki saja — memasukkan kain ihram di bawah ketiak kanan sehingga bahu kanan terbuka selama tawaf.",
      },
      {
        q: "Raml (berjalan cepat) dalam tawaf dilakukan pada...",
        options: [
          "Semua 7 putaran",
          "3 putaran pertama, kemudian biasa untuk 4 putaran terakhir",
          "4 putaran pertama, kemudian biasa untuk 3 putaran terakhir",
          "Hanya pada putaran terakhir",
        ],
        correct: 1,
        explanation: "Raml (berjalan cepat sambil mengangkat dada dan menggerakkan bahu) dilakukan pada 3 putaran pertama. Empat putaran sisanya berjalan biasa.",
      },
      {
        q: "Setelah selesai tawaf, jamaah dianjurkan shalat...",
        options: [
          "Shalat sunnah 4 rakaat di depan Ka'bah",
          "Shalat sunnah 2 rakaat di belakang Maqam Ibrahim",
          "Shalat fardhu di dalam Ka'bah",
          "Tidak ada shalat khusus setelah tawaf",
        ],
        correct: 1,
        explanation: "Setelah tawaf, dianjurkan shalat 2 rakaat di belakang Maqam Ibrahim (batu bekas pijakan Nabi Ibrahim). Jika tidak memungkinkan, di tempat lain dalam Masjidil Haram.",
      },
    ],
  },
  {
    id: "sai",
    title: "Sa'i",
    emoji: "🏃",
    description: "Tata cara sa'i antara Shafa dan Marwah",
    color: "bg-amber-50 border-amber-200",
    textColor: "text-amber-700",
    questions: [
      {
        q: "Sa'i dilakukan antara dua bukit yaitu...",
        options: ["Uhud dan Arafah", "Shafa dan Marwah", "Thabur dan Qubais", "Mina dan Muzdalifah"],
        correct: 1,
        explanation: "Sa'i dilakukan antara Bukit Shafa dan Bukit Marwah, mengenang perjuangan Siti Hajar mencari air untuk putranya, Nabi Ismail.",
      },
      {
        q: "Jumlah perjalanan (putaran) dalam sa'i adalah...",
        options: ["5 kali", "7 kali", "9 kali", "3 kali"],
        correct: 1,
        explanation: "Sa'i terdiri dari 7 kali perjalanan: dari Shafa ke Marwah dihitung 1 kali, dari Marwah ke Shafa dihitung 1 kali. Dimulai dari Shafa dan berakhir di Marwah.",
      },
      {
        q: "Berlari-lari kecil (harwalah) dalam sa'i dilakukan...",
        options: [
          "Sepanjang seluruh jalur sa'i",
          "Antara dua lampu hijau yang ada di jalur sa'i",
          "Hanya di awal setiap putaran",
          "Hanya pada 3 putaran pertama",
        ],
        correct: 1,
        explanation: "Harwalah dilakukan di area antara dua tiang/lampu hijau yang menandai area rendah antara Shafa dan Marwah. Ini dikhususkan untuk laki-laki.",
      },
      {
        q: "Sa'i dimulai dari...",
        options: ["Marwah menuju Shafa", "Shafa menuju Marwah", "Hajar Aswad menuju Shafa", "Mana saja boleh"],
        correct: 1,
        explanation: "Sa'i harus dimulai dari Bukit Shafa, sesuai hadis Nabi ﷺ: 'Kami mulai dari apa yang Allah mulai' — yaitu Shafa (yang disebutkan pertama dalam Al-Qur'an Surat Al-Baqarah: 158).",
      },
      {
        q: "Apakah sa'i harus dalam kondisi suci (wudhu)?",
        options: [
          "Wajib suci dari hadats kecil maupun besar",
          "Dianjurkan suci, namun tidak wajib",
          "Harus wudhu, tidak perlu suci dari hadats besar",
          "Tidak ada syarat suci dalam sa'i",
        ],
        correct: 1,
        explanation: "Mayoritas ulama menyatakan bahwa suci (thaharah) saat sa'i adalah syarat anjuran (sunnah), bukan wajib. Berbeda dengan tawaf yang wajib dalam keadaan suci.",
      },
    ],
  },
  {
    id: "wukuf",
    title: "Wukuf di Arafah",
    emoji: "⛰️",
    description: "Rukun utama haji yang tidak bisa digantikan",
    color: "bg-sky-50 border-sky-200",
    textColor: "text-sky-700",
    questions: [
      {
        q: "Wukuf di Arafah dilaksanakan pada tanggal...",
        options: ["8 Dzulhijjah", "9 Dzulhijjah", "10 Dzulhijjah", "12 Dzulhijjah"],
        correct: 1,
        explanation: "Wukuf dilaksanakan pada 9 Dzulhijjah — hari Arafah. Ini adalah puncak dan rukun utama ibadah haji. Barang siapa melewatkannya, hajinya batal.",
      },
      {
        q: "Waktu wukuf di Arafah dimulai dari...",
        options: [
          "Terbit fajar (subuh) 9 Dzulhijjah",
          "Setelah matahari tergelincir (waktu dzuhur) 9 Dzulhijjah",
          "Tengah malam 9 Dzulhijjah",
          "Setelah shalat isya 8 Dzulhijjah",
        ],
        correct: 1,
        explanation: "Wukuf sah mulai dari matahari tergelincir (masuk waktu dzuhur) tanggal 9 Dzulhijjah hingga terbit fajar tanggal 10 Dzulhijjah.",
      },
      {
        q: "Yang TIDAK dilakukan saat wukuf di Arafah adalah...",
        options: [
          "Memperbanyak dzikir, doa, dan talbiyah",
          "Mendengarkan khutbah Arafah",
          "Melakukan tawaf di Masjidil Haram",
          "Shalat Dzuhur dan Ashar dijama' dan qashar",
        ],
        correct: 2,
        explanation: "Saat wukuf, jamaah berada di Arafah (bukan Makkah). Tawaf di Masjidil Haram tidak dilakukan saat wukuf. Yang dilakukan adalah banyak berdoa, berdzikir, dan shalat jama' qashar.",
      },
      {
        q: "Hadis masyhur tentang haji berbunyi 'Alhajju Arafat' yang artinya...",
        options: [
          "Haji adalah Ka'bah",
          "Haji adalah (wukuf di) Arafah",
          "Haji adalah jihad",
          "Haji adalah kesabaran",
        ],
        correct: 1,
        explanation: "Hadis ini menunjukkan bahwa wukuf di Arafah adalah inti dari ibadah haji. Jika seseorang hadir di Arafah meski sebentar, hajinya sah. Jika tidak, hajinya batal.",
      },
    ],
  },
  {
    id: "jumrah",
    title: "Lempar Jumrah",
    emoji: "🪨",
    description: "Tata cara, waktu, dan urutan melempar jumrah",
    color: "bg-orange-50 border-orange-200",
    textColor: "text-orange-700",
    questions: [
      {
        q: "Pada tanggal 10 Dzulhijjah, jamaah hanya melempar...",
        options: ["Jumrah Ula saja", "Jumrah Wusta saja", "Jumrah Aqabah saja", "Ketiga jumrah sekaligus"],
        correct: 2,
        explanation: "Pada 10 Dzulhijjah, jamaah hanya melempar Jumrah Aqabah (jumrah besar) sebanyak 7 batu. Jumrah Ula dan Wusta dilempar pada hari-hari tasyrik (11, 12, 13 Dzulhijjah).",
      },
      {
        q: "Setiap kali melempar satu batu ke jumrah, diucapkan...",
        options: [
          "'Bismillah' satu kali di awal",
          "'Allahu Akbar' setiap kali melempar",
          "'Subhanallah' tiga kali",
          "Tidak ada bacaan khusus",
        ],
        correct: 1,
        explanation: "Setiap kali melempar satu batu, diucapkan 'Allahu Akbar'. Jadi selama melempar 7 batu, takbir diucapkan 7 kali.",
      },
      {
        q: "Waktu melempar jumrah aqabah pada 10 Dzulhijjah dimulai dari...",
        options: [
          "Setelah tengah malam",
          "Setelah subuh",
          "Setelah terbit fajar (bagi yang sudah nafar dari Muzdalifah)",
          "Setelah tergelincir matahari (waktu dzuhur)",
        ],
        correct: 2,
        explanation: "Jumrah Aqabah pada 10 Dzulhijjah boleh dilempar mulai terbit fajar setelah mabit di Muzdalifah. Bagi kaum lemah dan wanita boleh lebih awal (tengah malam).",
      },
      {
        q: "Batu yang digunakan untuk melempar jumrah idealnya berukuran...",
        options: ["Sebesar kepalan tangan", "Sebesar biji kacang tanah atau kerikil kecil", "Sebesar batu bata", "Tidak ada ukuran khusus"],
        correct: 1,
        explanation: "Batu jumrah yang ideal berukuran seperti biji kacang atau kerikil kecil. Rasulullah ﷺ menggunakan batu seukuran itu. Menggunakan batu besar dianggap berlebihan.",
      },
      {
        q: "Bagi jamaah yang ingin nafar awal (pulang pada 12 Dzulhijjah), syaratnya adalah...",
        options: [
          "Sudah melempar ketiga jumrah pada 11 dan 12 Dzulhijjah",
          "Sudah melempar jumrah aqabah saja",
          "Membayar dam (denda)",
          "Harus mendapat izin dari pembimbing",
        ],
        correct: 0,
        explanation: "Nafar awal diperbolehkan bagi yang melempar ketiga jumrah (Ula, Wusta, Aqabah) pada hari ke-11 dan ke-12 Dzulhijjah, dan meninggalkan Mina sebelum matahari terbenam tanggal 12.",
      },
    ],
  },
  {
    id: "tahallul",
    title: "Tahallul & Umum",
    emoji: "✂️",
    description: "Tahallul, dam, dan pengetahuan umum",
    color: "bg-purple-50 border-purple-200",
    textColor: "text-purple-700",
    questions: [
      {
        q: "Tahallul awal (pertama) pada haji ditandai dengan...",
        options: [
          "Selesai tawaf ifadhah",
          "Mencukur/memotong rambut setelah melempar jumrah aqabah",
          "Selesai wukuf di Arafah",
          "Selesai sa'i",
        ],
        correct: 1,
        explanation: "Tahallul awal terjadi setelah melempar Jumrah Aqabah dan mencukur/memotong rambut. Setelah ini sebagian larangan ihram sudah boleh (kecuali berhubungan suami-istri).",
      },
      {
        q: "Dam (denda) wajib dibayar jika jamaah...",
        options: [
          "Terlambat datang ke Arafah tapi masih sempat wukuf",
          "Meninggalkan salah satu wajib haji (bukan rukun)",
          "Lupa membaca talbiyah",
          "Tidak hafal bacaan tawaf",
        ],
        correct: 1,
        explanation: "Dam wajib dibayar jika meninggalkan wajib haji (bukan rukun). Contohnya: tidak mabit di Muzdalifah, tidak melempar jumrah, tidak mabit di Mina. Berupa menyembelih kambing.",
      },
      {
        q: "Apakah perbedaan antara rukun haji dan wajib haji?",
        options: [
          "Tidak ada perbedaan, keduanya sama-sama wajib",
          "Rukun haji jika ditinggalkan hajinya batal; wajib haji jika ditinggalkan harus bayar dam",
          "Rukun haji bisa diganti dengan dam; wajib haji tidak bisa",
          "Wajib haji lebih penting dari rukun haji",
        ],
        correct: 1,
        explanation: "Rukun haji (niat ihram, wukuf Arafah, tawaf ifadhah, sa'i) jika ditinggalkan = haji batal. Wajib haji (ihram dari miqat, mabit Muzdalifah, mabit Mina, lempar jumrah, dll) jika ditinggalkan = dosa + bayar dam.",
      },
    ],
  },
];

type QuizState = "select" | "quiz" | "result";

function getStoredScores(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(QUIZ_SCORES_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveScore(topicId: string, score: number) {
  const scores = getStoredScores();
  if (score > (scores[topicId] || 0)) {
    scores[topicId] = score;
    localStorage.setItem(QUIZ_SCORES_KEY, JSON.stringify(scores));
  }
}

export default function JamaahManasikKuis() {
  const [state, setState] = useState<QuizState>("select");
  const [selectedTopic, setSelectedTopic] = useState<QuizTopic | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [scores, setScores] = useState(getStoredScores);

  const startQuiz = (topic: QuizTopic) => {
    setSelectedTopic(topic);
    setCurrentQ(0);
    setAnswered(null);
    setAnswers([]);
    setState("quiz");
  };

  const handleAnswer = (optionIndex: number) => {
    if (answered !== null) return;
    setAnswered(optionIndex);
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (!selectedTopic) return;
    if (currentQ < selectedTopic.questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setAnswered(null);
    } else {
      const correct = answers.filter(
        (a, i) => a === selectedTopic.questions[i].correct
      ).length;
      const score = Math.round((correct / selectedTopic.questions.length) * 100);
      saveScore(selectedTopic.id, score);
      setScores(getStoredScores());
      setState("result");
    }
  };

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const avgScore = Object.keys(scores).length
    ? Math.round(totalScore / Object.keys(scores).length)
    : 0;

  // ── TOPIC SELECT SCREEN ──
  if (state === "select") {
    return (
      <div className="p-4 space-y-4">
        {/* Overall progress */}
        {Object.keys(scores).length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Progres Kuis Anda</span>
              </div>
              <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                {Object.keys(scores).length}/{TOPICS.length} topik
              </Badge>
            </div>
            <Progress value={avgScore} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">Skor rata-rata: {avgScore}%</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Uji pemahaman manasik Anda! Pilih topik untuk mulai kuis. Hasil terbaik tersimpan otomatis.
        </p>

        <div className="space-y-2">
          {TOPICS.map((topic) => {
            const topicScore = scores[topic.id];
            const done = topicScore !== undefined;
            return (
              <button
                key={topic.id}
                onClick={() => startQuiz(topic)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all hover:shadow-sm active:scale-[0.99]",
                  topic.color
                )}
              >
                <span className="text-2xl">{topic.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-semibold text-sm", topic.textColor)}>{topic.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{topic.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{topic.questions.length} soal</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {done ? (
                    <>
                      <Badge
                        className={cn(
                          "text-xs",
                          topicScore >= 80
                            ? "bg-green-100 text-green-700 border-green-200"
                            : topicScore >= 60
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        )}
                      >
                        {topicScore}%
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">Ulangi?</span>
                    </>
                  ) : (
                    <ChevronRight className={cn("h-4 w-4", topic.textColor)} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── QUIZ SCREEN ──
  if (state === "quiz" && selectedTopic) {
    const q = selectedTopic.questions[currentQ];
    const isLast = currentQ === selectedTopic.questions.length - 1;
    const progress = ((currentQ + 1) / selectedTopic.questions.length) * 100;

    return (
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setState("select")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Kembali
          </button>
          <span className="text-xs font-medium text-muted-foreground">
            {currentQ + 1} / {selectedTopic.questions.length}
          </span>
        </div>

        <Progress value={progress} className="h-1.5" />

        <div className="flex items-center gap-2">
          <span className="text-xl">{selectedTopic.emoji}</span>
          <h3 className="font-bold text-sm">{selectedTopic.title}</h3>
        </div>

        {/* Question */}
        <div className="bg-muted/40 rounded-2xl p-4">
          <p className="font-semibold text-sm leading-relaxed">{q.q}</p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isSelected = answered === i;
            const isCorrect = i === q.correct;
            const showResult = answered !== null;

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={answered !== null}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                  !showResult && "hover:border-primary/50 hover:bg-primary/5 border-border",
                  showResult && isCorrect && "bg-green-50 border-green-400 text-green-800",
                  showResult && isSelected && !isCorrect && "bg-red-50 border-red-400 text-red-800",
                  showResult && !isSelected && !isCorrect && "opacity-50 border-border",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {showResult && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {answered !== null && (
          <div className={cn(
            "rounded-2xl p-4 flex gap-3",
            answered === q.correct ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"
          )}>
            <Lightbulb className={cn("h-4 w-4 shrink-0 mt-0.5", answered === q.correct ? "text-green-600" : "text-amber-600")} />
            <div>
              <p className={cn("text-xs font-bold mb-1", answered === q.correct ? "text-green-700" : "text-amber-700")}>
                {answered === q.correct ? "Benar! 🎉" : "Kurang tepat 🤔"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
            </div>
          </div>
        )}

        {answered !== null && (
          <Button onClick={handleNext} className="w-full">
            {isLast ? "Lihat Hasil" : "Soal Berikutnya"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    );
  }

  // ── RESULT SCREEN ──
  if (state === "result" && selectedTopic) {
    const correctCount = answers.filter(
      (a, i) => a === selectedTopic.questions[i].correct
    ).length;
    const score = Math.round((correctCount / selectedTopic.questions.length) * 100);
    const isPerfect = score === 100;
    const isPass = score >= 70;

    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-6">
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4",
            isPerfect ? "bg-yellow-100" : isPass ? "bg-green-100" : "bg-orange-100"
          )}>
            <span className="text-4xl">{isPerfect ? "🏆" : isPass ? "🌟" : "📚"}</span>
          </div>
          <h3 className="text-xl font-bold">
            {isPerfect ? "Sempurna!" : isPass ? "Bagus!" : "Perlu Belajar Lagi"}
          </h3>
          <p className="text-muted-foreground text-sm mt-1">{selectedTopic.title}</p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <div className={cn(
              "text-5xl font-bold",
              isPerfect ? "text-yellow-500" : isPass ? "text-green-600" : "text-orange-500"
            )}>
              {score}
            </div>
            <div className="text-left">
              <p className="text-lg font-semibold">%</p>
              <p className="text-xs text-muted-foreground">skor</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-2">
            {correctCount} dari {selectedTopic.questions.length} soal benar
          </p>
        </div>

        <div className="bg-muted/40 rounded-2xl p-4 space-y-2">
          {selectedTopic.questions.map((q, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {answers[i] === q.correct ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
              )}
              <p className="line-clamp-1 text-muted-foreground">{q.q}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => startQuiz(selectedTopic)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Ulangi
          </Button>
          <Button onClick={() => setState("select")}>
            <BookOpen className="h-4 w-4 mr-2" />
            Topik Lain
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
