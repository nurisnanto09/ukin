/**
 * rapor_siswa.js - Logika Halaman Rapor & Rekap Hasil Belajar Siswa
 * Menghitung dan menyajikan:
 * - Skor Pretest (Diagnostik) & Posttest (Formatif HOTS)
 * - Nilai N-Gain Ternormalisasi & Kategorisasinya
 * - Evaluasi Kriteria Ketuntasan Minimal (KKM = 75)
 * - Analisis Penguasaan Taksonomi Bloom (C1 s.d. C6)
 * - Jurnal Refleksi Cek-in & Cek-out Belajar
 * - Cetak / Unduh Dokumen Rapor Belajar
 */

(function () {
  let roster = safeGetStorage(STORAGE_KEY_ROSTER, DEFAULT_ROSTER);
  if (!Array.isArray(roster) || roster.length < DEFAULT_ROSTER.length) {
    roster = DEFAULT_ROSTER;
    safeSetStorage(STORAGE_KEY_ROSTER, roster);
  }

  let teacherRecords = safeGetStorage(STORAGE_KEY_RECORDS, INITIAL_SAMPLE_RECORDS);
  let session = safeGetStorage(STORAGE_KEY_SESSION, createDefaultSession());
  if (!session.kelas || session.kelas === 'X - Informatika') {
    session.kelas = 'Informatika - X E7';
  }

  const KKM_SCORE = 75;

  // Elemen DOM
  const selectAbsen = document.getElementById('selectAbsen');
  const inputAbsen = document.getElementById('inputAbsen');
  const studentNameDisplay = document.getElementById('studentNameDisplay');
  const studentAbsenDisplay = document.getElementById('studentAbsenDisplay');
  const studentKelasDisplay = document.getElementById('studentKelasDisplay');
  const studentKelompokDisplay = document.getElementById('studentKelompokDisplay');

  // Metrik Kartu Atas
  const cardPretestScore = document.getElementById('cardPretestScore');
  const cardPosttestScore = document.getElementById('cardPosttestScore');
  const cardNGainScore = document.getElementById('cardNGainScore');
  const cardKKMStatus = document.getElementById('cardKKMStatus');

  // Badge Status & Indikator
  const pretestDetailBadge = document.getElementById('pretestDetailBadge');
  const posttestDetailBadge = document.getElementById('posttestDetailBadge');
  const nGainCategoryBadge = document.getElementById('nGainCategoryBadge');
  const kkmBadge = document.getElementById('kkmBadge');

  // Bloom Bars
  const bloomContainer = document.getElementById('bloomProgressContainer');

  // Refleksi
  const checkinMoodDisplay = document.getElementById('checkinMoodDisplay');
  const checkinEnergyDisplay = document.getElementById('checkinEnergyDisplay');
  const checkinStyleDisplay = document.getElementById('checkinStyleDisplay');
  const checkoutUnderstandingDisplay = document.getElementById('checkoutUnderstandingDisplay');
  const checkoutEmotionDisplay = document.getElementById('checkoutEmotionDisplay');
  const checkoutNoteDisplay = document.getElementById('checkoutNoteDisplay');

  // Hitung N-Gain: g = (post - pre) / (100 - pre)
  function calculateNGain(pre, post) {
    if (pre === null || pre === undefined || post === null || post === undefined) {
      return null;
    }
    const preVal = Number(pre);
    const postVal = Number(post);
    if (isNaN(preVal) || isNaN(postVal)) return null;

    if (100 - preVal <= 0) {
      return postVal >= 100 ? 1.0 : 0.0;
    }

    const g = (postVal - preVal) / (100 - preVal);
    return Math.round(g * 100) / 100;
  }

  function getNGainCategory(g) {
    if (g === null || isNaN(g)) {
      return { label: 'Belum Lengkap', desc: 'Selesaikan Pretest & Posttest untuk melihat gain', colorClass: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    if (g >= 0.70) {
      return { label: 'Tinggi (g ≥ 0.70)', desc: 'Peningkatan pemahaman konsep sangat signifikan', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (g >= 0.30) {
      return { label: 'Sedang (0.30 ≤ g < 0.70)', desc: 'Peningkatan pemahaman konsep efektif dan optimal', colorClass: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    if (g >= 0) {
      return { label: 'Rendah (g < 0.30)', desc: 'Pemahaman konsep meningkat namun butuh pendalaman', colorClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    return { label: 'Penurunan (g < 0)', desc: 'Perlu bimbingan dan remidi pemahaman logika', colorClass: 'bg-rose-100 text-rose-800 border-rose-300' };
  }

  // Cari data siswa berdasarkan absen
  function getStudentData(absenNum) {
    const num = Number(absenNum);
    const foundRoster = lookupStudentByAbsen(roster, num) || {
      absen: num,
      nama: 'Siswa Belum Terdaftar',
      kelas: 'Informatika - X E7',
      kelompok: 'Kelompok -'
    };

    // Cari dari teacher records
    const record = teacherRecords.find(function (r) {
      return Number(r.absen) === num;
    });

    // Cek apakah ini sesi aktif yang sedang login
    const isCurrentSession = Number(session.absen) === num;

    const pretestScore = isCurrentSession && session.pretestScore !== undefined
      ? session.pretestScore
      : (record && record.pretestScore !== undefined ? record.pretestScore : null);

    const posttestScore = isCurrentSession && session.posttestScore !== undefined
      ? session.posttestScore
      : (record && record.posttestScore !== undefined ? record.posttestScore : null);

    const pretestCorrect = isCurrentSession && session.pretestCorrectCount !== undefined
      ? session.pretestCorrectCount
      : (record && record.pretestCorrectCount !== undefined ? record.pretestCorrectCount : (pretestScore ? Math.round(pretestScore / 10) : null));

    const posttestCorrect = isCurrentSession && session.posttestCorrectCount !== undefined
      ? session.posttestCorrectCount
      : (record && record.posttestCorrectCount !== undefined ? record.posttestCorrectCount : (posttestScore ? Math.round(posttestScore / 10) : null));

    const checkin = isCurrentSession && session.checkin
      ? session.checkin
      : (record && record.checkin ? record.checkin : null);

    const checkout = isCurrentSession && session.checkout
      ? session.checkout
      : (record && record.checkout ? record.checkout : null);

    const preBloom = isCurrentSession && session.pretestBloomCorrect
      ? session.pretestBloomCorrect
      : (record && record.pretestBloomCorrect ? record.pretestBloomCorrect : null);

    const postBloom = isCurrentSession && session.posttestBloomCorrect
      ? session.posttestBloomCorrect
      : (record && record.posttestBloomCorrect ? record.posttestBloomCorrect : null);

    return {
      absen: num,
      nama: foundRoster.nama,
      kelas: foundRoster.kelas || 'Informatika - X E7',
      kelompok: foundRoster.kelompok || 'Kelompok -',
      pretestScore: pretestScore,
      pretestCorrect: pretestCorrect,
      posttestScore: posttestScore,
      posttestCorrect: posttestCorrect,
      checkin: checkin,
      checkout: checkout,
      preBloom: preBloom,
      postBloom: postBloom
    };
  }

  // Render Rapor ke Layar
  function renderStudentReport(absenNum) {
    const data = getStudentData(absenNum);

    // 1. Identitas
    if (studentNameDisplay) studentNameDisplay.textContent = data.nama;
    if (studentAbsenDisplay) studentAbsenDisplay.textContent = 'Absen #' + data.absen;
    if (studentKelasDisplay) studentKelasDisplay.textContent = data.kelas;
    if (studentKelompokDisplay) studentKelompokDisplay.textContent = data.kelompok;

    if (inputAbsen && Number(inputAbsen.value) !== data.absen) {
      inputAbsen.value = data.absen;
    }
    if (selectAbsen && Number(selectAbsen.value) !== data.absen) {
      selectAbsen.value = data.absen;
    }

    // 2. Metrik Pretest
    if (data.pretestScore !== null) {
      if (cardPretestScore) cardPretestScore.textContent = data.pretestScore;
      if (pretestDetailBadge) {
        pretestDetailBadge.textContent = (data.pretestCorrect !== null ? data.pretestCorrect : Math.round(data.pretestScore / 10)) + '/10 Benar (C1–C6)';
        pretestDetailBadge.className = 'text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200';
      }
    } else {
      if (cardPretestScore) cardPretestScore.textContent = '-';
      if (pretestDetailBadge) {
        pretestDetailBadge.textContent = 'Belum Mengerjakan';
        pretestDetailBadge.className = 'text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full';
      }
    }

    // 3. Metrik Posttest
    if (data.posttestScore !== null) {
      if (cardPosttestScore) cardPosttestScore.textContent = data.posttestScore;
      if (posttestDetailBadge) {
        posttestDetailBadge.textContent = (data.posttestCorrect !== null ? data.posttestCorrect : Math.round(data.posttestScore / 10)) + '/10 Benar (HOTS)';
        posttestDetailBadge.className = 'text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200';
      }
    } else {
      if (cardPosttestScore) cardPosttestScore.textContent = '-';
      if (posttestDetailBadge) {
        posttestDetailBadge.textContent = 'Belum Mengerjakan';
        posttestDetailBadge.className = 'text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full';
      }
    }

    // 4. N-Gain
    const nGain = calculateNGain(data.pretestScore, data.posttestScore);
    const nGainCat = getNGainCategory(nGain);

    if (cardNGainScore) {
      cardNGainScore.textContent = nGain !== null ? (nGain > 0 ? '+' + nGain : nGain) : '-';
    }
    if (nGainCategoryBadge) {
      nGainCategoryBadge.textContent = nGainCat.label;
      nGainCategoryBadge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-full border ' + nGainCat.colorClass;
    }
    const nGainDescText = document.getElementById('nGainDescText');
    if (nGainDescText) {
      nGainDescText.textContent = nGainCat.desc;
    }

    // Progress Bar N-Gain
    const nGainProgressBar = document.getElementById('nGainProgressBar');
    if (nGainProgressBar) {
      const pct = nGain !== null ? Math.min(100, Math.max(0, Math.round(nGain * 100))) : 0;
      nGainProgressBar.style.width = pct + '%';
      nGainProgressBar.className = nGain >= 0.7 ? 'h-2.5 rounded-full bg-emerald-500 transition-all duration-500' :
        (nGain >= 0.3 ? 'h-2.5 rounded-full bg-blue-500 transition-all duration-500' : 'h-2.5 rounded-full bg-amber-500 transition-all duration-500');
    }

    // 5. KKM Evaluasi (KKM = 75)
    if (data.posttestScore !== null) {
      const isPass = Number(data.posttestScore) >= KKM_SCORE;
      if (cardKKMStatus) {
        cardKKMStatus.textContent = isPass ? 'TUNTAS' : 'REMIDI';
        cardKKMStatus.className = isPass ? 'text-2xl sm:text-3xl font-black text-emerald-600 leading-tight' : 'text-2xl sm:text-3xl font-black text-rose-600 leading-tight';
      }
      if (kkmBadge) {
        kkmBadge.textContent = isPass ? 'Mencapai KKM 75 (Pengayaan)' : 'Di Bawah KKM 75 (Perlu Remidi)';
        kkmBadge.className = isPass
          ? 'text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200'
          : 'text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200';
      }
    } else {
      if (cardKKMStatus) {
        cardKKMStatus.textContent = '-';
        cardKKMStatus.className = 'text-2xl sm:text-3xl font-black text-slate-400 leading-tight';
      }
      if (kkmBadge) {
        kkmBadge.textContent = 'Menunggu Posttest';
        kkmBadge.className = 'text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full';
      }
    }

    // 6. Analisis Taksonomi Bloom (C1 - C6)
    renderBloomTaxonomy(data);

    // 7. Jurnal Refleksi Cek-in & Cek-out
    renderReflectionData(data);
  }

  // Render Taksonomi Bloom
  function renderBloomTaxonomy(data) {
    if (!bloomContainer) return;

    const bloomLevels = [
      { code: 'C1', name: 'Mengingat (Recall)', desc: 'Notasi judul, deklarasi variabel, assignment panah (<-)' },
      { code: 'C2', name: 'Memahami (Comprehend)', desc: 'Makna blok deskripsi algoritma & tipe data' },
      { code: 'C3', name: 'Menerapkan (Apply)', desc: 'Kalkulasi nilai aritmatika & penugasan berantai' },
      { code: 'C4', name: 'Menganalisis (Analyze)', desc: 'Penelusuran dry run percabangan IF-ELSE bercabang' },
      { code: 'C5', name: 'Mengevaluasi (Evaluate)', desc: 'Mendeteksi letak bug atau output tak terduga' },
      { code: 'C6', name: 'Mencipta (Create)', desc: 'Merumuskan solusi algoritma terstruktur & efisien' }
    ];

    bloomContainer.innerHTML = '';

    bloomLevels.forEach(function (lvl) {
      let postCorrect = 0;
      let totalAssessed = 2; // Rata-rata 2 soal per level

      if (data.postBloom && data.postBloom[lvl.code] !== undefined) {
        postCorrect = data.postBloom[lvl.code];
      } else if (data.posttestScore !== null) {
        // Estimasi jika data granular belum ada
        postCorrect = data.posttestScore >= 80 ? 2 : (data.posttestScore >= 50 ? 1 : 0);
      }

      const percent = Math.min(100, Math.round((postCorrect / totalAssessed) * 100));

      const row = document.createElement('div');
      row.className = 'p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2';

      row.innerHTML =
        '<div class="flex items-center justify-between text-xs">' +
          '<div class="flex items-center gap-2">' +
            '<span class="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">' + lvl.code + '</span>' +
            '<div>' +
              '<div class="font-extrabold text-slate-800">' + lvl.name + '</div>' +
              '<div class="text-[10px] text-slate-500 font-medium hidden sm:block">' + lvl.desc + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<span class="font-black text-xs ' + (percent >= 75 ? 'text-emerald-600' : (percent >= 50 ? 'text-blue-600' : 'text-amber-600')) + '">' + percent + '%</span>' +
            '<div class="text-[10px] text-slate-400 font-semibold">' + postCorrect + ' / ' + totalAssessed + ' Soal</div>' +
          '</div>' +
        '</div>' +
        '<div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">' +
          '<div class="h-2 rounded-full transition-all duration-500 ' + (percent >= 75 ? 'bg-emerald-500' : (percent >= 50 ? 'bg-indigo-500' : 'bg-amber-500')) + '" style="width: ' + percent + '%"></div>' +
        '</div>';

      bloomContainer.appendChild(row);
    });
  }

  // Render Refleksi
  function renderReflectionData(data) {
    if (checkinMoodDisplay) {
      checkinMoodDisplay.textContent = (data.checkin && data.checkin.mood) ? data.checkin.mood : 'Belum Cek-in';
    }
    if (checkinEnergyDisplay) {
      checkinEnergyDisplay.textContent = (data.checkin && data.checkin.energy) ? data.checkin.energy : 'Normal (75%)';
    }
    if (checkinStyleDisplay) {
      checkinStyleDisplay.textContent = (data.checkin && data.checkin.style) ? data.checkin.style : 'Praktik Langsung';
    }

    if (checkoutUnderstandingDisplay) {
      checkoutUnderstandingDisplay.textContent = (data.checkout && data.checkout.understanding) ? data.checkout.understanding : 'Belum Mengisi Check-out';
    }
    if (checkoutEmotionDisplay) {
      checkoutEmotionDisplay.textContent = (data.checkout && data.checkout.emotion) ? data.checkout.emotion : 'Netral';
    }
    if (checkoutNoteDisplay) {
      checkoutNoteDisplay.textContent = (data.checkout && data.checkout.note) ? ('"' + data.checkout.note + '"') : 'Tidak ada catatan refleksi tambahan.';
    }
  }

  // Inisialisasi Dropdown Roster
  function populateSelect() {
    if (!selectAbsen) return;
    selectAbsen.innerHTML = '';

    roster.forEach(function (s) {
      const opt = document.createElement('option');
      opt.value = s.absen;
      opt.textContent = '#' + s.absen + ' - ' + s.nama + ' (' + (s.kelompok || 'Klp') + ')';
      selectAbsen.appendChild(opt);
    });
  }

  // Event Listeners
  window.addEventListener('DOMContentLoaded', function () {
    populateSelect();

    // Tentukan absen awal: dari session aktif atau siswa absen #1
    let initialAbsen = (session && session.absen) ? Number(session.absen) : 1;
    if (isNaN(initialAbsen) || initialAbsen < 1 || initialAbsen > 36) {
      initialAbsen = 1;
    }

    // Input Number Absen
    if (inputAbsen) {
      inputAbsen.value = initialAbsen;
      inputAbsen.addEventListener('input', function () {
        const val = Number(inputAbsen.value);
        if (val >= 1 && val <= 36) {
          renderStudentReport(val);
        }
      });
    }

    // Select Dropdown Absen
    if (selectAbsen) {
      selectAbsen.value = initialAbsen;
      selectAbsen.addEventListener('change', function () {
        const val = Number(selectAbsen.value);
        if (val >= 1 && val <= 36) {
          renderStudentReport(val);
        }
      });
    }

    // Tombol Cetak PDF
    const btnPrintReport = document.getElementById('btnPrintReport');
    if (btnPrintReport) {
      btnPrintReport.addEventListener('click', function () {
        window.print();
      });
    }

    // Tombol Sinkronkan
    const btnSyncReport = document.getElementById('btnSyncReport');
    if (btnSyncReport) {
      btnSyncReport.addEventListener('click', function () {
        teacherRecords = safeGetStorage(STORAGE_KEY_RECORDS, INITIAL_SAMPLE_RECORDS);
        session = safeGetStorage(STORAGE_KEY_SESSION, createDefaultSession());
        const currentAbsen = inputAbsen ? Number(inputAbsen.value) : initialAbsen;
        renderStudentReport(currentAbsen);
        showToast('Data capaian berhasil disinkronkan!', 'success');
      });
    }

    // Render pertama
    renderStudentReport(initialAbsen);
  });

})();
