/**
 * shared.js - Konstanta, Bank Soal Berpikir Komputasional & Pseudocode,
 * Data Sesi & Pembantu Bersama untuk Portal Murid (index.html) dan Page Admin Guru (admin.html)
 */

const STORAGE_KEY_SESSION = 'eduassess_active_student_session_v2';
const STORAGE_KEY_RECORDS = 'eduassess_teacher_records_v3';
const STORAGE_KEY_QUESTIONS = 'eduassess_question_bank_v3';
const STORAGE_KEY_ROSTER = 'eduassess_gas_roster_v3';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwuYVpatjOrEPwjaSQMWy79qvKoy2dygctQMZM3YP8XOYXV9vsRK_yDDP-XKWeECSGc/exec';
const QUESTION_TIME_LIMIT = 30;

// Safe localStorage helpers
function safeGetStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function safeSetStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Abaikan error kuota pada iframe tersandbox
  }
}

// Default Student Roster (Daftar 36 Siswa Kelas X E7 Informatika: Absen 1 - 36, Kelompok 1 - 9)
const DEFAULT_ROSTER = [
  { absen: 1, nama: 'ADITYA ALLAY NUGRAHA', kelas: 'Informatika - X E7', nis: '24001', kelompok: 'Kelompok 1' },
  { absen: 2, nama: 'ALEXANDER GIBRALTAR ADISYA SAP', kelas: 'Informatika - X E7', nis: '24002', kelompok: 'Kelompok 1' },
  { absen: 3, nama: 'ANDI SALWA AYU FADHILAH GEMMY', kelas: 'Informatika - X E7', nis: '24003', kelompok: 'Kelompok 1' },
  { absen: 4, nama: 'ANNABELA IKADEWI AZZAHRA', kelas: 'Informatika - X E7', nis: '24004', kelompok: 'Kelompok 1' },
  { absen: 5, nama: 'ARIQAH NAHDAH ARBAIN', kelas: 'Informatika - X E7', nis: '24005', kelompok: 'Kelompok 2' },
  { absen: 6, nama: 'ARUNINDYA ARDHANAYA', kelas: 'Informatika - X E7', nis: '24006', kelompok: 'Kelompok 2' },
  { absen: 7, nama: 'ASTIKA PUTRI ARRAHMA', kelas: 'Informatika - X E7', nis: '24007', kelompok: 'Kelompok 2' },
  { absen: 8, nama: 'ATNAN GASSANI ARHAB', kelas: 'Informatika - X E7', nis: '24008', kelompok: 'Kelompok 2' },
  { absen: 9, nama: 'BIMO RIZKY PUTRA SETYAWAN', kelas: 'Informatika - X E7', nis: '24009', kelompok: 'Kelompok 3' },
  { absen: 10, nama: 'DELLA VISTA MAHARANI', kelas: 'Informatika - X E7', nis: '24010', kelompok: 'Kelompok 3' },
  { absen: 11, nama: 'DEMAS AVILA AZHAR', kelas: 'Informatika - X E7', nis: '24011', kelompok: 'Kelompok 3' },
  { absen: 12, nama: 'DZIVARA OCHIVA ARDIANSYA', kelas: 'Informatika - X E7', nis: '24012', kelompok: 'Kelompok 3' },
  { absen: 13, nama: 'FARHA HANANIA RAZIQ', kelas: 'Informatika - X E7', nis: '24013', kelompok: 'Kelompok 4' },
  { absen: 14, nama: 'FATHIR MUHAMMAD GHAISAN', kelas: 'Informatika - X E7', nis: '24014', kelompok: 'Kelompok 4' },
  { absen: 15, nama: 'FATHURRAHMAN', kelas: 'Informatika - X E7', nis: '24015', kelompok: 'Kelompok 4' },
  { absen: 16, nama: 'GAJENDRA PADMA KUSUMO', kelas: 'Informatika - X E7', nis: '24016', kelompok: 'Kelompok 4' },
  { absen: 17, nama: 'GAVIN RAKA SETIA PUTRA', kelas: 'Informatika - X E7', nis: '24017', kelompok: 'Kelompok 5' },
  { absen: 18, nama: 'GHALIB RAFA ANINDITYA PUTRA', kelas: 'Informatika - X E7', nis: '24018', kelompok: 'Kelompok 5' },
  { absen: 19, nama: 'HABIBI NEIL AUTHOR SYARIFUDIN', kelas: 'Informatika - X E7', nis: '24019', kelompok: 'Kelompok 5' },
  { absen: 20, nama: 'HANAN AINUN NAJIB', kelas: 'Informatika - X E7', nis: '24020', kelompok: 'Kelompok 5' },
  { absen: 21, nama: 'INNE DESVITA SARI', kelas: 'Informatika - X E7', nis: '24021', kelompok: 'Kelompok 6' },
  { absen: 22, nama: 'JAGAD WAHYU KUNCORO', kelas: 'Informatika - X E7', nis: '24022', kelompok: 'Kelompok 6' },
  { absen: 23, nama: 'JANEETA HANUN KHAIRINA SANTOSO', kelas: 'Informatika - X E7', nis: '24023', kelompok: 'Kelompok 6' },
  { absen: 24, nama: 'KANYA BERLIANA', kelas: 'Informatika - X E7', nis: '24024', kelompok: 'Kelompok 6' },
  { absen: 25, nama: 'KEOZA SIELO BANYU BIRU', kelas: 'Informatika - X E7', nis: '24025', kelompok: 'Kelompok 7' },
  { absen: 26, nama: 'LAQUITHA ISHMA SARAH SALISA', kelas: 'Informatika - X E7', nis: '24026', kelompok: 'Kelompok 7' },
  { absen: 27, nama: 'MIFA AFIFATURRAHMA', kelas: 'Informatika - X E7', nis: '24027', kelompok: 'Kelompok 7' },
  { absen: 28, nama: 'MONICA NUR AZIZA', kelas: 'Informatika - X E7', nis: '24028', kelompok: 'Kelompok 7' },
  { absen: 29, nama: 'MUHAMMAD ZIDANE BERLIAN SAPUTRO', kelas: 'Informatika - X E7', nis: '24029', kelompok: 'Kelompok 8' },
  { absen: 30, nama: 'NI LUH KUSUMAWATI', kelas: 'Informatika - X E7', nis: '24030', kelompok: 'Kelompok 8' },
  { absen: 31, nama: 'NUR AFIFAH', kelas: 'Informatika - X E7', nis: '24031', kelompok: 'Kelompok 8' },
  { absen: 32, nama: 'NURCAHYONO DIKI ABDURRAHMAN', kelas: 'Informatika - X E7', nis: '24032', kelompok: 'Kelompok 8' },
  { absen: 33, nama: 'SEILA PUSPA RAMADHANI', kelas: 'Informatika - X E7', nis: '24033', kelompok: 'Kelompok 9' },
  { absen: 34, nama: 'TALITA ARKANA SAKHI', kelas: 'Informatika - X E7', nis: '24034', kelompok: 'Kelompok 9' },
  { absen: 35, nama: 'VALEN ARSA RIFAI', kelas: 'Informatika - X E7', nis: '24035', kelompok: 'Kelompok 9' },
  { absen: 36, nama: 'VANESYA ZAHRA ZAKIA', kelas: 'Informatika - X E7', nis: '24036', kelompok: 'Kelompok 9' }
];

// Opsi Check-In & Check-Out
const CHECKIN_MOODS = [
  { id: 'Semangat & Antusias', emoji: '🤩', desc: 'Siap belajar logika pseudocode' },
  { id: 'Tenang & Fokus', emoji: '😊', desc: 'Pikiran jernih dan tenang' },
  { id: 'Penasaran', emoji: '🧐', desc: 'Ingin mencoba algoritma baru' },
  { id: 'Sedikit Mengantuk', emoji: '🥱', desc: 'Butuh pemanasan ringan' },
  { id: 'Gugup / Cemas', emoji: '😟', desc: 'Khawatir materi logika sulit' },
  { id: 'Kurang Fit / Lelah', emoji: '🤒', desc: 'Butuh tempo pelan' }
];

const CHECKIN_ENERGIES = [
  { id: 'Energi Penuh (100%)', badge: 'Tinggi', desc: 'Sudah sarapan & istirahat cukup' },
  { id: 'Cukup Siap (75%)', badge: 'Stabil', desc: 'Kondisi fisik normal & siap menyimak' },
  { id: 'Perlu Pemanasan (50%)', badge: 'Sedang', desc: 'Agak lelah, butuh simulasi interaktif' },
  { id: 'Energi Rendah (<50%)', badge: 'Rendah', desc: 'Kurang tidur / butuh pendampingan ekstra' }
];

const CHECKIN_STYLES = [
  { id: 'Praktik Langsung', desc: 'Suka mencoba simulasi eksekusi baris pseudocode' },
  { id: 'Visual & Notasi', desc: 'Lebih cepat paham lewat struktur teks & blok kode' },
  { id: 'Diskusi Kelompok', desc: 'Nyaman bertukar pikiran dengan teman di LKPD' },
  { id: 'Penjelasan Terbimbing', desc: 'Perlu contoh bertahap dari guru' }
];

const CHECKIN_FACTORS = [
  'Koneksi Internet Lancar',
  'Sudah Membaca Materi Awal',
  'Alat Tulis & Catatan Siap',
  'Suasana Kelas Kondusif',
  'Butuh Duduk di Depan',
  'Perangkat Berbagi dengan Teman'
];

const CHECKOUT_UNDERSTANDINGS = [
  { id: 'Sangat Paham & Bisa Menjelaskan Ulang', level: 'Mandiri', desc: 'Menguasai input, output, percabangan IF-ELSE & tracing' },
  { id: 'Paham Konsep Utama, Perlu Latihan Soal', level: 'Cukup Paham', desc: 'Masih perlu latihan pada soal analisis logika' },
  { id: 'Baru Paham Sebagian Kecil Materi', level: 'Sebagian', desc: 'Bingung saat bertemu percabangan bertingkat' },
  { id: 'Masih Bingung & Butuh Bimbingan Guru', level: 'Butuh Remidi', desc: 'Perlu penjelasan ulang dari konsep dasar notasi semu' }
];

const CHECKOUT_EMOTIONS = [
  { id: 'Lega & Percaya Diri', emoji: '🌟' },
  { id: 'Tertantang Soal HOTS', emoji: '🔥' },
  { id: 'Masih Penasaran', emoji: '💡' },
  { id: 'Perlu Bimbingan Lagi', emoji: '🙏' }
];

const CHECKOUT_NEEDS = [
  'Tantangan Proyek Pengayaan (HOTS)',
  'Pembahasan Soal C4–C6',
  'Ulasan Kembali Konsep Dasar (C1–C2)',
  'Contoh Penerapan Praktis (C3)',
  'Belajar Kelompok Sebaya',
  'Konsultasi Singkat dengan Guru'
];

const BLOOM_DESCRIPTIONS = {
  C1: 'Mengingat (C1)',
  C2: 'Memahami (C2)',
  C3: 'Menerapkan (C3)',
  C4: 'Menganalisis (C4)',
  C5: 'Mengevaluasi (C5)',
  C6: 'Mencipta (C6)'
};

// 10 Soal Pilihan Ganda HOTS (C4–C6) Sesuai Rencana Pembelajaran Berpikir Komputasional & Pseudocode Patbhe Green
const DEFAULT_QUESTION_BANK = {
  pretest: [
  {
    "id": "PRE-1",
    "bloomLevel": "C4",
    "topic": "Analisis Komponen Input, Proses, Output",
    "question": "Perhatikan baris algoritma program Hitung_Poin_Patbhe_Green berikut:\\n(1) INPUT nama_kelas | (2) INPUT berat_kg | (3) INPUT poin_admin | (4) total_poin <- berat_kg * poin_admin | (5) OUTPUT \"Total Poin: \", total_poin\\n\\nPengelompokan nomor baris yang tepat berdasarkan komponen Input, Proses, dan Output secara berurutan adalah...",
    "options": [
      "Input: (1), (2) | Proses: (3), (4) | Output: (5)",
      "Input: (1), (2), (3) | Proses: (4) | Output: (5)",
      "Input: (1) | Proses: (2), (3), (4) | Output: (5)",
      "Input: (1), (2), (3) | Proses: (5) | Output: (4)",
      "Input: (2), (3) | Proses: (1), (4) | Output: (5)"
    ],
    "correctIndex": 1,
    "explanation": "Baris 1–3 membaca masukan data, baris 4 mengolah rumus perkalian, dan baris 5 mencetak hasil."
  },
  {
    "id": "PRE-2",
    "bloomLevel": "C4",
    "topic": "Analisis Ketepatan Tipe Data Variabel",
    "question": "Pada deklarasi tertulis \"berat_kg, poin_admin, total_poin : integer\". Saat Kelas X E2 menyetorkan sampah seberat 3.5 kg dengan poin_admin sebesar 20, hasil perhitungan program menjadi tidak akurat. Penyebab dan solusi perbaikan yang tepat adalah...",
    "options": [
      "Tipe data integer hanya menampung bilangan bulat, sehingga harus diubah menjadi real agar dapat memproses angka desimal 3.5",
      "Tipe data integer hanya untuk teks huruf, sehingga harus diubah menjadi string agar dapat dikalikan",
      "Variabel poin_admin tidak boleh dikalikan dengan berat_kg dan harus diubah menjadi tipe data boolean",
      "Nilai 3.5 terlalu kecil untuk diproses komputer sehingga harus dibulatkan menjadi 40 di bagian Output",
      "Urutan deklarasi variabel salah karena total_poin seharusnya ditulis di bagian Algoritma, bukan di Deklarasi"
    ],
    "correctIndex": 0,
    "explanation": "Angka desimal seperti 3.5 membutuhkan tipe data real/float, bukan integer."
  },
  {
    "id": "PRE-3",
    "bloomLevel": "C4",
    "topic": "Pelacakan (Tracing) Nilai Variabel Sekuensial",
    "question": "Perhatikan urutan instruksi sekuensial berikut:\\n(1) berat_kg <- 4.5 | (2) poin_admin <- 20 | (3) bonus <- 30 | (4) total_poin <- berat_kg * poin_admin | (5) total_poin <- total_poin + bonus\\n\\nNilai yang tersimpan di dalam variabel total_poin saat komputer selesai mengeksekusi baris (4) dan baris (5) secara berturut-turut adalah...",
    "options": [
      "Baris (4) bernilai 75 dan baris (5) bernilai 90",
      "Baris (4) bernilai 90 dan baris (5) bernilai 30",
      "Baris (4) bernilai 90 dan baris (5) bernilai 120",
      "Baris (4) bernilai 120 dan baris (5) bernilai 150",
      "Baris (4) bernilai 64.5 dan baris (5) bernilai 94.5"
    ],
    "correctIndex": 2,
    "explanation": "Baris 4 menghitung 4.5 * 20 = 90, lalu baris 5 memperbarui 90 + 30 = 120."
  },
  {
    "id": "PRE-4",
    "bloomLevel": "C4",
    "topic": "Analisis Kesalahan Urutan Instruksi Sekuensial",
    "question": "Perhatikan susunan baris algoritma yang mengalami kesalahan logika berikut:\\n(1) INPUT nama_kelas | (2) total_poin <- berat_kg * poin_admin | (3) INPUT berat_kg | (4) INPUT poin_admin | (5) OUTPUT total_poin\\n\\nMengapa algoritma tersebut gagal menghasilkan nilai total_poin yang benar saat dijalankan?",
    "options": [
      "Karena perintah OUTPUT total_poin diletakkan pada baris terakhir",
      "Karena variabel nama_kelas tidak diikutsertakan dalam rumus perkalian pada baris (2)",
      "Karena baris (2) mengeksekusi rumus perkalian sebelum variabel berat_kg dan poin_admin menerima nilai masukan pada baris (3) dan (4)",
      "Karena tanda panah <- pada baris (2) tidak dapat digunakan untuk operasi perkalian dua variabel",
      "Karena perintah INPUT hanya boleh digunakan satu kali di dalam sebuah program sekuensial"
    ],
    "correctIndex": 2,
    "explanation": "Komputer mengeksekusi baris dari atas ke bawah; proses perhitungan di baris 2 dilakukan saat variabel input belum memiliki nilai."
  },
  {
    "id": "PRE-5",
    "bloomLevel": "C5",
    "topic": "Evaluasi Keunggulan Variabel Masukan Dinamis",
    "question": "Mengapa nilai tarif poin dirancang sebagai variabel masukan dinamis (INPUT poin_admin), bukan ditulis sebagai angka tetap (total_poin <- berat_kg * 20) di dalam rumus program Patbhe Green?",
    "options": [
      "Agar ukuran file kode program di memori komputer menjadi dua kali lebih kecil",
      "Agar admin dapat langsung memasukkan tarif poin yang berbeda (misal saat Pekan Lingkungan) tanpa harus membongkar dan mengubah kode rumus program",
      "Agar program dapat berjalan otomatis tanpa perlu menimbang berat sampah (berat_kg) dari tiap kelas",
      "Agar komputer tidak memerlukan bagian Deklarasi variabel pada awal penulisan pseudocode",
      "Agar hasil perhitungan total_poin selalu menghasilkan bilangan bulat positif"
    ],
    "correctIndex": 1,
    "explanation": "Variabel input dinamis membuat program fleksibel saat ada perubahan kebijakan tarif poin tanpa perlu mengedit kode sumber."
  },
  {
    "id": "PRE-6",
    "bloomLevel": "C5",
    "topic": "Evaluasi Operator Kondisi Batas Percabangan",
    "question": "Aturan Patbhe Green menetapkan bahwa kelas dengan perolehan minimal 100 poin mendapat predikat \"Juara Hijau\", sedangkan di bawah 100 poin mendapat \"Ayo Tingkatkan\". Jika pada kode semu tertulis IF total_poin > 100 THEN, apa yang terjadi saat Kelas X E7 mendapatkan tepat 100 poin dan bagaimana perbaikannya?",
    "options": [
      "Tercetak \"Juara Hijau\" karena kondisi bernilai TRUE; tidak perlu perbaikan",
      "Tercetak \"Ayo Tingkatkan\" karena 100 > 100 bernilai FALSE; perbaikannya mengubah syarat menjadi IF total_poin >= 100 THEN",
      "Tercetak \"Ayo Tingkatkan\" karena 100 > 100 bernilai TRUE; perbaikannya mengubah syarat menjadi IF total_poin <= 100 THEN",
      "Program berhenti (error) karena angka 100 tidak bisa dibandingkan; perbaikannya menghapus baris ELSE",
      "Tercetak kedua predikat sekaligus; perbaikannya mengganti kata kunci IF menjadi INPUT"
    ],
    "correctIndex": 1,
    "explanation": "Syarat \"minimal 100\" mencakup angka 100 sehingga wajib menggunakan operator >=, bukan >."
  },
  {
    "id": "PRE-7",
    "bloomLevel": "C6",
    "topic": "Merancang Bagian Judul dan Deklarasi Pseudocode Percabangan",
    "question": "Seorang murid akan merancang pseudocode percabangan untuk menentukan predikat kelas berdasarkan variabel nama_kelas (berupa teks contoh \"X E7\") dan total_poin (berupa angka yang bisa memuat desimal contoh 87.5). Penulisan bagian Judul dan Deklarasi yang sesuai aturan baku pseudocode adalah...",
    "options": [
      "Program Predikat Kelas | Deklarasi: nama_kelas : integer; total_poin : real",
      "Program Predikat_Kelas_Patbhe | Deklarasi: nama_kelas : string; total_poin : real",
      "Program 1_Predikat_Kelas | Deklarasi: nama_kelas : real; total_poin : string",
      "Program Predikat_Kelas_Patbhe | Deklarasi: INPUT nama_kelas; OUTPUT total_poin",
      "Program IF_ELSE_Predikat | Deklarasi: nama_kelas, total_poin : boolean"
    ],
    "correctIndex": 1,
    "explanation": "Judul program tidak boleh mengandung spasi/diawali angka, nama_kelas bertipe string, dan total_poin bertipe real."
  },
  {
    "id": "PRE-8",
    "bloomLevel": "C6",
    "topic": "Menyusun Urutan Runtut Algoritma Percabangan",
    "question": "Perhatikan baris-baris acak dari rancangan pseudocode penentuan predikat Patbhe Green berikut:\\n(1) ELSE | (2) IF total_poin >= 100 THEN | (3) INPUT total_poin | (4) OUTPUT \"Predikat: Ayo Tingkatkan\" | (5) OUTPUT \"Predikat: Juara Hijau\" | (6) END IF\\n\\nUrutan baris yang runtut dan logis untuk menyusun bagian Algoritma yang benar adalah...",
    "options": [
      "(2) – (3) – (5) – (1) – (4) – (6)",
      "(3) – (2) – (4) – (1) – (5) – (6)",
      "(3) – (2) – (5) – (1) – (4) – (6)",
      "(3) – (1) – (5) – (2) – (4) – (6)",
      "(2) – (5) – (1) – (4) – (3) – (6)"
    ],
    "correctIndex": 2,
    "explanation": "Urutan logis: INPUT total_poin -> IF total_poin >= 100 THEN -> OUTPUT \"Predikat: Juara Hijau\" -> ELSE -> OUTPUT \"Predikat: Ayo Tingkatkan\" -> END IF."
  },
  {
    "id": "PRE-9",
    "bloomLevel": "C6",
    "topic": "Merancang Logika Percabangan Subsidi Bibit Tanaman",
    "question": "Tim Adiwiyata memberikan bibit tanaman jika setoran berat_kg mencapai 5.0 kg atau lebih. Jika kurang dari 5.0 kg, program menghitung kekurangan berat (kurang_kg <- 5.0 - berat_kg) dan mencetak nilainya. Perhatikan kerangka algoritma rumpang berikut:\\n1. INPUT berat_kg\\n2. [ ... Baris X ... ]\\n3.    OUTPUT \"Berhak Mendapat Bibit Tanaman\"\\n4. ELSE\\n5.    [ ... Baris Y ... ]\\n6.    OUTPUT \"Kurang \", kurang_kg, \" kg lagi\"\\n7. END IF\\n\\nIsian yang tepat untuk melengkapi Baris X dan Baris Y pada rancangan di atas adalah...",
    "options": [
      "Baris X: IF berat_kg > 5.0 THEN | Baris Y: kurang_kg <- berat_kg - 5.0",
      "Baris X: IF berat_kg >= 5.0 THEN | Baris Y: kurang_kg <- 5.0 - berat_kg",
      "Baris X: IF berat_kg <= 5.0 THEN | Baris Y: kurang_kg <- 5.0 + berat_kg",
      "Baris X: IF berat_kg == 5.0 THEN | Baris Y: INPUT kurang_kg",
      "Baris X: IF kurang_kg >= 5.0 THEN | Baris Y: berat_kg <- 5.0 - kurang_kg"
    ],
    "correctIndex": 1,
    "explanation": "Syarat minimal 5.0 kg ditulis IF berat_kg >= 5.0 THEN, dan selisih kekurangan dihitung dengan kurang_kg <- 5.0 - berat_kg."
  },
  {
    "id": "PRE-10",
    "bloomLevel": "C6",
    "topic": "Merancang Solusi Percabangan Validasi Input & Penambahan Bonus",
    "question": "Dalam rancangan sistem baru, setelah menghitung total_poin <- berat_kg * poin_admin, kelas yang menyetorkan sampah dengan berat_kg minimal 10 kg akan mendapat tambahan bonus 50 poin pada total_poin-nya, sedangkan di bawah 10 kg tidak mendapat bonus. Struktur instruksi percabangan yang tepat untuk diletakkan sebelum baris OUTPUT total_poin adalah...",
    "options": [
      "IF berat_kg >= 10 THEN total_poin <- total_poin + 50 ELSE total_poin <- total_poin + 0 END IF",
      "IF total_poin >= 10 THEN berat_kg <- berat_kg + 50 ELSE berat_kg <- 0 END IF",
      "IF berat_kg > 10 THEN total_poin <- 50 ELSE total_poin <- berat_kg * poin_admin END IF",
      "IF berat_kg <= 10 THEN total_poin <- total_poin + 50 ELSE total_poin <- 0 END IF",
      "IF poin_admin >= 10 THEN total_poin <- total_poin * 50 ELSE OUTPUT \"Error\" END IF"
    ],
    "correctIndex": 0,
    "explanation": "Menguji berat_kg >= 10; jika terpenuhi total_poin ditambah 50, jika tidak tetap/ditambah 0."
  }
],
  posttest: [
  {
    "id": "POST-1",
    "bloomLevel": "C4",
    "topic": "Analisis Komponen Input, Proses, Output",
    "question": "Perhatikan baris algoritma program Hitung_Poin_Patbhe_Green berikut:\\n(1) INPUT nama_kelas | (2) INPUT berat_kg | (3) INPUT poin_admin | (4) total_poin <- berat_kg * poin_admin | (5) OUTPUT \"Total Poin: \", total_poin\\n\\nPengelompokan nomor baris yang tepat berdasarkan komponen Input, Proses, dan Output secara berurutan adalah...",
    "options": [
      "Input: (1), (2) | Proses: (3), (4) | Output: (5)",
      "Input: (1), (2), (3) | Proses: (4) | Output: (5)",
      "Input: (1) | Proses: (2), (3), (4) | Output: (5)",
      "Input: (1), (2), (3) | Proses: (5) | Output: (4)",
      "Input: (2), (3) | Proses: (1), (4) | Output: (5)"
    ],
    "correctIndex": 1,
    "explanation": "Baris 1–3 membaca masukan data, baris 4 mengolah rumus perkalian, dan baris 5 mencetak hasil."
  },
  {
    "id": "POST-2",
    "bloomLevel": "C4",
    "topic": "Analisis Ketepatan Tipe Data Variabel",
    "question": "Pada deklarasi tertulis \"berat_kg, poin_admin, total_poin : integer\". Saat Kelas X E2 menyetorkan sampah seberat 3.5 kg dengan poin_admin sebesar 20, hasil perhitungan program menjadi tidak akurat. Penyebab dan solusi perbaikan yang tepat adalah...",
    "options": [
      "Tipe data integer hanya menampung bilangan bulat, sehingga harus diubah menjadi real agar dapat memproses angka desimal 3.5",
      "Tipe data integer hanya untuk teks huruf, sehingga harus diubah menjadi string agar dapat dikalikan",
      "Variabel poin_admin tidak boleh dikalikan dengan berat_kg dan harus diubah menjadi tipe data boolean",
      "Nilai 3.5 terlalu kecil untuk diproses komputer sehingga harus dibulatkan menjadi 40 di bagian Output",
      "Urutan deklarasi variabel salah karena total_poin seharusnya ditulis di bagian Algoritma, bukan di Deklarasi"
    ],
    "correctIndex": 0,
    "explanation": "Angka desimal seperti 3.5 membutuhkan tipe data real/float, bukan integer."
  },
  {
    "id": "POST-3",
    "bloomLevel": "C4",
    "topic": "Pelacakan (Tracing) Nilai Variabel Sekuensial",
    "question": "Perhatikan urutan instruksi sekuensial berikut:\\n(1) berat_kg <- 4.5 | (2) poin_admin <- 20 | (3) bonus <- 30 | (4) total_poin <- berat_kg * poin_admin | (5) total_poin <- total_poin + bonus\\n\\nNilai yang tersimpan di dalam variabel total_poin saat komputer selesai mengeksekusi baris (4) dan baris (5) secara berturut-turut adalah...",
    "options": [
      "Baris (4) bernilai 75 dan baris (5) bernilai 90",
      "Baris (4) bernilai 90 dan baris (5) bernilai 30",
      "Baris (4) bernilai 90 dan baris (5) bernilai 120",
      "Baris (4) bernilai 120 dan baris (5) bernilai 150",
      "Baris (4) bernilai 64.5 dan baris (5) bernilai 94.5"
    ],
    "correctIndex": 2,
    "explanation": "Baris 4 menghitung 4.5 * 20 = 90, lalu baris 5 memperbarui 90 + 30 = 120."
  },
  {
    "id": "POST-4",
    "bloomLevel": "C4",
    "topic": "Analisis Kesalahan Urutan Instruksi Sekuensial",
    "question": "Perhatikan susunan baris algoritma yang mengalami kesalahan logika berikut:\\n(1) INPUT nama_kelas | (2) total_poin <- berat_kg * poin_admin | (3) INPUT berat_kg | (4) INPUT poin_admin | (5) OUTPUT total_poin\\n\\nMengapa algoritma tersebut gagal menghasilkan nilai total_poin yang benar saat dijalankan?",
    "options": [
      "Karena perintah OUTPUT total_poin diletakkan pada baris terakhir",
      "Karena variabel nama_kelas tidak diikutsertakan dalam rumus perkalian pada baris (2)",
      "Karena baris (2) mengeksekusi rumus perkalian sebelum variabel berat_kg dan poin_admin menerima nilai masukan pada baris (3) dan (4)",
      "Karena tanda panah <- pada baris (2) tidak dapat digunakan untuk operasi perkalian dua variabel",
      "Karena perintah INPUT hanya boleh digunakan satu kali di dalam sebuah program sekuensial"
    ],
    "correctIndex": 2,
    "explanation": "Komputer mengeksekusi baris dari atas ke bawah; proses perhitungan di baris 2 dilakukan saat variabel input belum memiliki nilai."
  },
  {
    "id": "POST-5",
    "bloomLevel": "C5",
    "topic": "Evaluasi Keunggulan Variabel Masukan Dinamis",
    "question": "Mengapa nilai tarif poin dirancang sebagai variabel masukan dinamis (INPUT poin_admin), bukan ditulis sebagai angka tetap (total_poin <- berat_kg * 20) di dalam rumus program Patbhe Green?",
    "options": [
      "Agar ukuran file kode program di memori komputer menjadi dua kali lebih kecil",
      "Agar admin dapat langsung memasukkan tarif poin yang berbeda (misal saat Pekan Lingkungan) tanpa harus membongkar dan mengubah kode rumus program",
      "Agar program dapat berjalan otomatis tanpa perlu menimbang berat sampah (berat_kg) dari tiap kelas",
      "Agar komputer tidak memerlukan bagian Deklarasi variabel pada awal penulisan pseudocode",
      "Agar hasil perhitungan total_poin selalu menghasilkan bilangan bulat positif"
    ],
    "correctIndex": 1,
    "explanation": "Variabel input dinamis membuat program fleksibel saat ada perubahan kebijakan tarif poin tanpa perlu mengedit kode sumber."
  },
  {
    "id": "POST-6",
    "bloomLevel": "C5",
    "topic": "Evaluasi Operator Kondisi Batas Percabangan",
    "question": "Aturan Patbhe Green menetapkan bahwa kelas dengan perolehan minimal 100 poin mendapat predikat \"Juara Hijau\", sedangkan di bawah 100 poin mendapat \"Ayo Tingkatkan\". Jika pada kode semu tertulis IF total_poin > 100 THEN, apa yang terjadi saat Kelas X E7 mendapatkan tepat 100 poin dan bagaimana perbaikannya?",
    "options": [
      "Tercetak \"Juara Hijau\" karena kondisi bernilai TRUE; tidak perlu perbaikan",
      "Tercetak \"Ayo Tingkatkan\" karena 100 > 100 bernilai FALSE; perbaikannya mengubah syarat menjadi IF total_poin >= 100 THEN",
      "Tercetak \"Ayo Tingkatkan\" karena 100 > 100 bernilai TRUE; perbaikannya mengubah syarat menjadi IF total_poin <= 100 THEN",
      "Program berhenti (error) karena angka 100 tidak bisa dibandingkan; perbaikannya menghapus baris ELSE",
      "Tercetak kedua predikat sekaligus; perbaikannya mengganti kata kunci IF menjadi INPUT"
    ],
    "correctIndex": 1,
    "explanation": "Syarat \"minimal 100\" mencakup angka 100 sehingga wajib menggunakan operator >=, bukan >."
  },
  {
    "id": "POST-7",
    "bloomLevel": "C6",
    "topic": "Merancang Bagian Judul dan Deklarasi Pseudocode Percabangan",
    "question": "Seorang murid akan merancang pseudocode percabangan untuk menentukan predikat kelas berdasarkan variabel nama_kelas (berupa teks contoh \"X E7\") dan total_poin (berupa angka yang bisa memuat desimal contoh 87.5). Penulisan bagian Judul dan Deklarasi yang sesuai aturan baku pseudocode adalah...",
    "options": [
      "Program Predikat Kelas | Deklarasi: nama_kelas : integer; total_poin : real",
      "Program Predikat_Kelas_Patbhe | Deklarasi: nama_kelas : string; total_poin : real",
      "Program 1_Predikat_Kelas | Deklarasi: nama_kelas : real; total_poin : string",
      "Program Predikat_Kelas_Patbhe | Deklarasi: INPUT nama_kelas; OUTPUT total_poin",
      "Program IF_ELSE_Predikat | Deklarasi: nama_kelas, total_poin : boolean"
    ],
    "correctIndex": 1,
    "explanation": "Judul program tidak boleh mengandung spasi/diawali angka, nama_kelas bertipe string, dan total_poin bertipe real."
  },
  {
    "id": "POST-8",
    "bloomLevel": "C6",
    "topic": "Menyusun Urutan Runtut Algoritma Percabangan",
    "question": "Perhatikan baris-baris acak dari rancangan pseudocode penentuan predikat Patbhe Green berikut:\\n(1) ELSE | (2) IF total_poin >= 100 THEN | (3) INPUT total_poin | (4) OUTPUT \"Predikat: Ayo Tingkatkan\" | (5) OUTPUT \"Predikat: Juara Hijau\" | (6) END IF\\n\\nUrutan baris yang runtut dan logis untuk menyusun bagian Algoritma yang benar adalah...",
    "options": [
      "(2) – (3) – (5) – (1) – (4) – (6)",
      "(3) – (2) – (4) – (1) – (5) – (6)",
      "(3) – (2) – (5) – (1) – (4) – (6)",
      "(3) – (1) – (5) – (2) – (4) – (6)",
      "(2) – (5) – (1) – (4) – (3) – (6)"
    ],
    "correctIndex": 2,
    "explanation": "Urutan logis: INPUT total_poin -> IF total_poin >= 100 THEN -> OUTPUT \"Predikat: Juara Hijau\" -> ELSE -> OUTPUT \"Predikat: Ayo Tingkatkan\" -> END IF."
  },
  {
    "id": "POST-9",
    "bloomLevel": "C6",
    "topic": "Merancang Logika Percabangan Subsidi Bibit Tanaman",
    "question": "Tim Adiwiyata memberikan bibit tanaman jika setoran berat_kg mencapai 5.0 kg atau lebih. Jika kurang dari 5.0 kg, program menghitung kekurangan berat (kurang_kg <- 5.0 - berat_kg) dan mencetak nilainya. Perhatikan kerangka algoritma rumpang berikut:\\n1. INPUT berat_kg\\n2. [ ... Baris X ... ]\\n3.    OUTPUT \"Berhak Mendapat Bibit Tanaman\"\\n4. ELSE\\n5.    [ ... Baris Y ... ]\\n6.    OUTPUT \"Kurang \", kurang_kg, \" kg lagi\"\\n7. END IF\\n\\nIsian yang tepat untuk melengkapi Baris X dan Baris Y pada rancangan di atas adalah...",
    "options": [
      "Baris X: IF berat_kg > 5.0 THEN | Baris Y: kurang_kg <- berat_kg - 5.0",
      "Baris X: IF berat_kg >= 5.0 THEN | Baris Y: kurang_kg <- 5.0 - berat_kg",
      "Baris X: IF berat_kg <= 5.0 THEN | Baris Y: kurang_kg <- 5.0 + berat_kg",
      "Baris X: IF berat_kg == 5.0 THEN | Baris Y: INPUT kurang_kg",
      "Baris X: IF kurang_kg >= 5.0 THEN | Baris Y: berat_kg <- 5.0 - kurang_kg"
    ],
    "correctIndex": 1,
    "explanation": "Syarat minimal 5.0 kg ditulis IF berat_kg >= 5.0 THEN, dan selisih kekurangan dihitung dengan kurang_kg <- 5.0 - berat_kg."
  },
  {
    "id": "POST-10",
    "bloomLevel": "C6",
    "topic": "Merancang Solusi Percabangan Validasi Input & Penambahan Bonus",
    "question": "Dalam rancangan sistem baru, setelah menghitung total_poin <- berat_kg * poin_admin, kelas yang menyetorkan sampah dengan berat_kg minimal 10 kg akan mendapat tambahan bonus 50 poin pada total_poin-nya, sedangkan di bawah 10 kg tidak mendapat bonus. Struktur instruksi percabangan yang tepat untuk diletakkan sebelum baris OUTPUT total_poin adalah...",
    "options": [
      "IF berat_kg >= 10 THEN total_poin <- total_poin + 50 ELSE total_poin <- total_poin + 0 END IF",
      "IF total_poin >= 10 THEN berat_kg <- berat_kg + 50 ELSE berat_kg <- 0 END IF",
      "IF berat_kg > 10 THEN total_poin <- 50 ELSE total_poin <- berat_kg * poin_admin END IF",
      "IF berat_kg <= 10 THEN total_poin <- total_poin + 50 ELSE total_poin <- 0 END IF",
      "IF poin_admin >= 10 THEN total_poin <- total_poin * 50 ELSE OUTPUT \"Error\" END IF"
    ],
    "correctIndex": 0,
    "explanation": "Menguji berat_kg >= 10; jika terpenuhi total_poin ditambah 50, jika tidak tetap/ditambah 0."
  }
]
};

// Paket alternatif untuk pengujian
const ALT_QUESTION_BANK = {
  pretest: DEFAULT_QUESTION_BANK.pretest.map(function (q, i) {
    return Object.assign({}, q, {
      id: 'ALT-PRE-' + (i + 1),
      topic: q.topic + ' (Alternatif)'
    });
  }),
  posttest: DEFAULT_QUESTION_BANK.posttest.map(function (q, i) {
    return Object.assign({}, q, {
      id: 'ALT-POST-' + (i + 1),
      topic: q.topic + ' (Alternatif)'
    });
  })
};

// Sample records guru awal dengan ACC Status (Topik Pseudocode)
const INITIAL_SAMPLE_RECORDS = [
  {
    absen: 1,
    nama: 'ADITYA ALLAY NUGRAHA',
    kelas: 'Informatika - X E7',
    timestamp: '08:15 WIB',
    accStatus: 'ACC',
    accTimestamp: '08:35 WIB',
    checkin: {
      mood: 'Semangat & Antusias',
      energy: 'Energi Penuh (100%)',
      style: 'Praktik Langsung',
      factors: ['Koneksi Internet Lancar', 'Sudah Membaca Materi Awal'],
      note: 'Siap mencoba soal logika pseudocode!'
    },
    checkout: {
      understanding: 'Sangat Paham & Bisa Menjelaskan Ulang',
      emotion: 'Lega & Percaya Diri',
      needs: ['Tantangan Proyek Pengayaan (HOTS)'],
      note: 'Notasi penugasan dan percabangan IF-ELSE sangat seru dan jelas.'
    },
    pretestScore: 90,
    posttestScore: 90,
    pretestBloomCorrect: { C1: 2, C2: 2, C3: 2, C4: 2, C5: 1, C6: 0 },
    pretestBloomTotal: { C1: 0, C2: 0, C3: 0, C4: 4, C5: 2, C6: 4 },
    posttestBloomCorrect: { C1: 2, C2: 2, C3: 2, C4: 2, C5: 1, C6: 0 }
  },
  {
    absen: 2,
    nama: 'ALEXANDER GIBRALTAR ADISYA SAP',
    kelas: 'Informatika - X E7',
    timestamp: '08:17 WIB',
    accStatus: 'ACC',
    accTimestamp: '08:36 WIB',
    checkin: {
      mood: 'Tenang & Fokus',
      energy: 'Energi Penuh (100%)',
      style: 'Visual & Notasi',
      factors: ['Koneksi Internet Lancar', 'Alat Tulis & Catatan Siap'],
      note: 'Suka materi yang ada kode semu dan alur logikanya.'
    },
    checkout: {
      understanding: 'Sangat Paham & Bisa Menjelaskan Ulang',
      emotion: 'Tertantang Soal HOTS',
      needs: ['Tantangan Proyek Pengayaan (HOTS)'],
      note: 'Sudah menguasai tracing variabel dan deteksi infinite loop.'
    },
    pretestScore: 80,
    posttestScore: 100,
    pretestBloomCorrect: { C1: 2, C2: 2, C3: 2, C4: 1, C5: 1, C6: 0 },
    pretestBloomTotal: { C1: 0, C2: 0, C3: 0, C4: 4, C5: 2, C6: 4 },
    posttestBloomCorrect: { C1: 2, C2: 2, C3: 2, C4: 2, C5: 1, C6: 1 }
  },
  {
    absen: 3,
    nama: 'ANDI SALWA AYU FADHILAH GEMMY',
    kelas: 'Informatika - X E7',
    timestamp: '08:20 WIB',
    accStatus: 'PENDING',
    accTimestamp: null,
    checkin: {
      mood: 'Penasaran',
      energy: 'Cukup Siap (75%)',
      style: 'Diskusi Kelompok',
      factors: ['Alat Tulis & Catatan Siap', 'Suasana Kelas Kondusif'],
      note: 'Ingin latihan penelusuran (tracing) perulangan.'
    },
    checkout: {
      understanding: 'Paham Konsep Utama, Perlu Latihan Soal',
      emotion: 'Lega & Percaya Diri',
      needs: ['Pembahasan Soal C4–C6', 'Tantangan Proyek Pengayaan (HOTS)'],
      note: 'Saat posttest jadi lebih paham tentang penukaran variabel dengan temp.'
    },
    pretestScore: 70,
    posttestScore: 80,
    pretestBloomCorrect: { C1: 2, C2: 2, C3: 2, C4: 1, C5: 0, C6: 0 },
    pretestBloomTotal: { C1: 0, C2: 0, C3: 0, C4: 4, C5: 2, C6: 4 },
    posttestBloomCorrect: { C1: 2, C2: 2, C3: 2, C4: 1, C5: 1, C6: 0 }
  },
  {
    absen: 4,
    nama: 'ANNABELA IKADEWI AZZAHRA',
    kelas: 'Informatika - X E7',
    timestamp: '08:22 WIB',
    accStatus: 'PENDING',
    accTimestamp: null,
    checkin: {
      mood: 'Sedikit Mengantuk',
      energy: 'Perlu Pemanasan (50%)',
      style: 'Penjelasan Terbimbing',
      factors: ['Butuh Duduk di Depan'],
      note: 'Masih agak bingung di bagian operator logika AND/OR.'
    },
    checkout: {
      understanding: 'Baru Paham Sebagian Kecil Materi',
      emotion: 'Perlu Bimbingan Lagi',
      needs: ['Contoh Penerapan Praktis (C3)', 'Pembahasan Soal C4–C6'],
      note: 'Masih perlu contoh simulasi langkah demi langkah untuk percabangan IF.'
    },
    pretestScore: 50,
    posttestScore: 60,
    pretestBloomCorrect: { C1: 2, C2: 2, C3: 1, C4: 0, C5: 0, C6: 0 },
    pretestBloomTotal: { C1: 0, C2: 0, C3: 0, C4: 4, C5: 2, C6: 4 },
    posttestBloomCorrect: { C1: 2, C2: 2, C3: 1, C4: 0, C5: 0, C6: 0 }
  },
  {
    absen: 5,
    nama: 'ARIQAH NAHDAH ARBAIN',
    kelas: 'Informatika - X E7',
    timestamp: '08:24 WIB',
    accStatus: 'ACC',
    accTimestamp: '08:40 WIB',
    checkin: {
      mood: 'Gugup / Cemas',
      energy: 'Perlu Pemanasan (50%)',
      style: 'Penjelasan Terbimbing',
      factors: ['Alat Tulis & Catatan Siap'],
      note: 'Khawatir waktu 30 detiknya cepat habis.'
    },
    checkout: {
      understanding: 'Paham Konsep Utama, Perlu Latihan Soal',
      emotion: 'Masih Penasaran',
      needs: ['Pembahasan Soal C4–C6', 'Belajar Kelompok Sebaya'],
      note: 'Setelah belajar LKPD nilai naik, soal C5 dan C6 sangat memicu logika.'
    },
    pretestScore: 60,
    posttestScore: 80,
    pretestBloomCorrect: { C1: 2, C2: 2, C3: 1, C4: 1, C5: 0, C6: 0 },
    pretestBloomTotal: { C1: 0, C2: 0, C3: 0, C4: 4, C5: 2, C6: 4 },
    posttestBloomCorrect: { C1: 2, C2: 2, C3: 2, C4: 2, C5: 0, C6: 0 }
  },
  {
    absen: 6,
    nama: 'ARUNINDYA ARDHANAYA',
    kelas: 'Informatika - X E7',
    timestamp: '08:26 WIB',
    accStatus: 'PENDING',
    accTimestamp: null,
    checkin: {
      mood: 'Kurang Fit / Lelah',
      energy: 'Energi Rendah (<50%)',
      style: 'Visual & Notasi',
      factors: ['Butuh Duduk di Depan', 'Perangkat Berbagi dengan Teman'],
      note: 'Semalam kurang tidur, mohon bimbingan bertahap.'
    },
    checkout: {
      understanding: 'Masih Bingung & Butuh Bimbingan Guru',
      emotion: 'Perlu Bimbingan Lagi',
      needs: ['Ulasan Kembali Konsep Dasar (C1–C2)', 'Konsultasi Singkat dengan Guru'],
      note: 'Perlu remidi pada bagian struktur perulangan WHILE.'
    },
    pretestScore: 40,
    posttestScore: 50,
    pretestBloomCorrect: { C1: 2, C2: 1, C3: 1, C4: 0, C5: 0, C6: 0 },
    pretestBloomTotal: { C1: 0, C2: 0, C3: 0, C4: 4, C5: 2, C6: 4 },
    posttestBloomCorrect: { C1: 2, C2: 2, C3: 1, C4: 0, C5: 0, C6: 0 }
  }
];

// Inisialisasi Sesi Murid Baru
function createDefaultSession() {
  return {
    step: 1, // 1: Identitas & Check-In, 2: Pretest, 3: Transisi & LKPD, 4: Posttest, 5: Check-Out & Hasil
    absen: '',
    nama: '',
    kelas: 'Informatika - X E7',
    nis: '',
    checkin: {
      mood: 'Semangat & Antusias',
      energy: 'Energi Penuh (100%)',
      style: 'Praktik Langsung',
      factors: ['Koneksi Internet Lancar'],
      note: ''
    },
    pretestIndex: 0,
    pretestQuestions: null,
    pretestAnswers: {}, // { questionIndex: selectedOptionIndex }
    posttestIndex: 0,
    posttestQuestions: null,
    posttestAnswers: {}, // { questionIndex: selectedOptionIndex }
    remainingSeconds: QUESTION_TIME_LIMIT,
    checkout: {
      understanding: 'Sangat Paham & Bisa Menjelaskan Ulang',
      emotion: 'Lega & Percaya Diri',
      needs: ['Tantangan Proyek Pengayaan (HOTS)'],
      note: ''
    },
    openedMaterials: {},
    activityCount: 0,
    completed: false
  };
}

// Cari Murid berdasarkan Absen
function lookupStudentByAbsen(roster, absenVal) {
  const num = parseInt(absenVal, 10);
  if (isNaN(num)) return null;
  return roster.find(function (item) {
    return Number(item.absen) === num;
  }) || null;
}

// Klasifikasi Kelompok TaRL
function classifyPretestGroup(score) {
  if (score >= 80) return 'Mahir';
  if (score >= 60) return 'Menengah';
  return 'Butuh Pendampingan';
}

// Fisher-Yates Shuffle Algoritma
function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

// Acak urutan butir soal DAN acak urutan opsi jawaban per soal (Sinkronisasi Kunci & Pembahasan)
function randomizeQuestions(questionsList) {
  if (!Array.isArray(questionsList)) return [];
  // 1. Acak urutan butir soal
  const shuffledQuestions = shuffleArray(questionsList);

  // 2. Acak urutan pilihan jawaban per butir soal & sesuaikan correctIndex
  return shuffledQuestions.map(function (q, newIdx) {
    const origOpts = q.options ? q.options.slice() : [];
    const correctText = origOpts[q.correctIndex] !== undefined ? origOpts[q.correctIndex] : origOpts[0];
    const shuffledOpts = shuffleArray(origOpts);
    const newCorrectIdx = shuffledOpts.indexOf(correctText);

    return {
      id: q.id,
      originalIndex: newIdx,
      bloomLevel: q.bloomLevel,
      topic: q.topic,
      question: q.question,
      options: shuffledOpts,
      correctIndex: newCorrectIdx !== -1 ? newCorrectIdx : 0,
      explanation: q.explanation || ''
    };
  });
}

// Hitung Skor & Detail Benar per Level Bloom (Dukungan Array Acak atau Object Bank)
function evaluateAnswers(qBank, phase, answersMap) {
  let list = [];
  if (Array.isArray(qBank)) {
    list = qBank;
  } else if (qBank && qBank[phase]) {
    list = qBank[phase];
  }
  let correctCount = 0;
  const bloomCorrect = { C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0 };
  const bloomTotal = { C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0 };

  list.forEach(function (q, idx) {
    const lvl = (q.bloomLevel || 'C1').toUpperCase();
    if (bloomTotal[lvl] === undefined) {
      bloomTotal[lvl] = 0;
      bloomCorrect[lvl] = 0;
    }
    bloomTotal[lvl] += 1;
    const chosen = answersMap[idx];
    if (chosen !== undefined && Number(chosen) === Number(q.correctIndex)) {
      correctCount += 1;
      bloomCorrect[lvl] += 1;
    }
  });

  const totalQuestions = list.length || 10;
  const score = Math.round((correctCount / totalQuestions) * 100);
  return {
    correctCount: correctCount,
    totalQuestions: totalQuestions,
    score: score,
    bloomCorrect: bloomCorrect,
    bloomTotal: bloomTotal
  };
}

// Toast Notification
function showToast(message, type, containerId) {
  const container = document.getElementById(containerId || 'toastContainer');
  if (!container) return;
  const colors = {
    info: 'bg-slate-900 text-white border-slate-700 shadow-lg',
    success: 'bg-emerald-700 text-white border-emerald-600 shadow-lg',
    warning: 'bg-amber-600 text-white border-amber-500 shadow-lg',
    danger: 'bg-rose-700 text-white border-rose-600 shadow-lg'
  };
  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto px-4 py-3 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 fade-in ' + (colors[type] || colors.info);
  toast.innerHTML = '<span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(function () {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3400);
}
