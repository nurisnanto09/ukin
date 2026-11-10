/**
 * student.js - Logika Interaktif Portal Murid (Dashboard LMS & Kuis Soal)
 * Sesuai Desain Mockup SkillSet (Tanpa Sidebar):
 * 1. Pilihan Topik Pelajaran Informatika
 * 2. 4 Isi Modul Topik: Pretest, Materi Simulasi, LKPD, dan Posttest
 * 3. Kuis Runner 10 Soal Bloom C1-C6, Timer 30s & Status ACC Guru
 */

(function () {
  let roster = safeGetStorage(STORAGE_KEY_ROSTER, DEFAULT_ROSTER);
  let questionBank = safeGetStorage(STORAGE_KEY_QUESTIONS, DEFAULT_QUESTION_BANK);
  let teacherRecords = safeGetStorage(STORAGE_KEY_RECORDS, INITIAL_SAMPLE_RECORDS);
  let session = safeGetStorage(STORAGE_KEY_SESSION, createDefaultSession());
  if (!session.kelas || session.kelas === 'X - Informatika') {
    session.kelas = 'Informatika - X E7';
  }

  // Sinkronisasi & pemulihan otomatis blok kode soal pada sesi aktif
  function enrichQuestionsWithCode(questionsList, phase) {
    if (!Array.isArray(questionsList)) return questionsList;
    const bank = (questionBank && questionBank[phase]) || DEFAULT_QUESTION_BANK[phase] || [];
    return questionsList.map(function (q, idx) {
      if (q.codeSnippet && q.promptIntro) return q;
      const found = bank.find(function (b) { return b.id === q.id; }) || bank[idx];
      if (found) {
        return Object.assign({}, q, {
          promptIntro: found.promptIntro || q.promptIntro || '',
          codeSnippet: found.codeSnippet || q.codeSnippet || null,
          codeFilename: found.codeFilename || q.codeFilename || '',
          promptOutro: found.promptOutro || q.promptOutro || ''
        });
      }
      return q;
    });
  }

  if (session.pretestQuestions) {
    session.pretestQuestions = enrichQuestionsWithCode(session.pretestQuestions, 'pretest');
  }
  if (session.posttestQuestions) {
    session.posttestQuestions = enrichQuestionsWithCode(session.posttestQuestions, 'posttest');
  }
  let currentView = 'dashboard'; // 'dashboard' | 'quiz' | 'transition' | 'checkout' | 'result'
  let timerInterval = null;
  const PRETEST_QUESTION_TIME = 30; // 30 detik per butir soal
  let remainingSeconds = PRETEST_QUESTION_TIME;
  let timerQuestionIndex = -1;
  let quizCurrentSubStage = 'identity'; // 'identity' | 'question'

  function saveSession() {
    safeSetStorage(STORAGE_KEY_SESSION, session);
  }

  function saveRecords() {
    safeSetStorage(STORAGE_KEY_RECORDS, teacherRecords);
  }

  // Cek Status ACC Guru untuk Murid Saat Ini
  function getStudentAccStatus(absenNum) {
    const recs = safeGetStorage(STORAGE_KEY_RECORDS, teacherRecords);
    const rec = recs.find(function (r) {
      return Number(r.absen) === Number(absenNum);
    });
    return rec ? (rec.accStatus || 'PENDING') : 'PENDING';
  }

  function getStudentRecord(absenNum) {
    const recs = safeGetStorage(STORAGE_KEY_RECORDS, teacherRecords);
    return recs.find(function (r) {
      return Number(r.absen) === Number(absenNum);
    }) || null;
  }

  // ==================== RENDER DASHBOARD LMS ====================
  function renderDashboard() {
    // 1. Identitas Murid di Header & Hero Banner
    const studentName = session.nama || 'Siswa Informatika';
    const studentAbsen = session.absen ? ('#' + session.absen) : 'Pilih Absen';

    const topName = document.getElementById('topStudentNameDisplay');
    if (topName) topName.textContent = session.nama || 'Murid Belajar';

    const topAbsen = document.getElementById('topStudentAbsenDisplay');
    if (topAbsen) topAbsen.textContent = studentAbsen;

    const heroName = document.getElementById('heroStudentNameDisplay');
    if (heroName) heroName.textContent = studentName;

    const heroAbsen = document.getElementById('heroStudentAbsenDisplay');
    if (heroAbsen) heroAbsen.textContent = session.absen || '-';

    const inputAbsen = document.getElementById('inputAbsen');
    if (inputAbsen) inputAbsen.value = session.absen || '';

    const inputNama = document.getElementById('inputNama');
    if (inputNama) inputNama.value = session.nama || '';

    const inputKelas = document.getElementById('inputKelas');
    if (inputKelas) inputKelas.value = session.kelas || 'Informatika - X E7';

    // 2. Status Modul 4 Isi Topik (Pretest, Simulasi, LKPD, Posttest)
    const evalPre = evaluateAnswers(session.pretestQuestions || questionBank.pretest, 'pretest', session.pretestAnswers);
    const evalPost = evaluateAnswers(session.posttestQuestions || questionBank.posttest, 'posttest', session.posttestAnswers);
    const hasPretest = Object.keys(session.pretestAnswers).length > 0;
    const hasPosttest = Object.keys(session.posttestAnswers).length > 0;
    const rec = getStudentRecord(session.absen);
    const accStatus = rec ? (rec.accStatus || 'PENDING') : 'PENDING';

    // Badge Pretest
    const preBadge = document.getElementById('pretestStatusBadge');
    if (preBadge) {
      if (rec || session.step > 2) {
        const score = rec ? rec.pretestScore : evalPre.score;
        preBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
        preBadge.textContent = '✓ Selesai (' + score + ' Poin)';
      } else if (hasPretest) {
        preBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200';
        preBadge.textContent = 'Sedang Berjalan';
      } else {
        preBadge.className = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600';
        preBadge.textContent = 'Belum Dikerjakan';
      }
    }

    // Badge Posttest
    const postBadge = document.getElementById('posttestStatusBadge');
    if (postBadge) {
      if (rec || session.completed) {
        const score = rec ? rec.posttestScore : evalPost.score;
        postBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
        postBadge.textContent = '✓ Selesai (' + score + ' Poin)';
      } else if (hasPosttest) {
        postBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200';
        postBadge.textContent = 'Sedang Berjalan';
      } else if (session.step >= 3) {
        postBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200';
        postBadge.textContent = 'Siap Dikerjakan';
      } else {
        postBadge.className = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500';
        postBadge.textContent = 'Tersedia';
      }
    }

    // Badge Materi
    const materiBadge = document.getElementById('materiStatusBadge');
    if (materiBadge) {
      const openedMats = session.openedMaterials || {};
      if (openedMats['simulasi'] || openedMats['robot']) {
        materiBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
        materiBadge.textContent = '✓ Sedang Dipelajari';
      } else {
        materiBadge.className = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600';
        materiBadge.textContent = 'Belum Dibuka';
      }
    }

    // Badge LKM
    const lkmBadge = document.getElementById('lkmStatusBadge');
    if (lkmBadge) {
      const openedMats = session.openedMaterials || {};
      if (openedMats['lkm'] || openedMats['pdf']) {
        lkmBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200';
        lkmBadge.textContent = '✓ Sedang Dikerjakan';
      } else {
        lkmBadge.className = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600';
        lkmBadge.textContent = 'Belum Dikerjakan';
      }
    }



    // 3. Overview Metrics Real-Time (Proses Belajar, Tugas Selesai, Nilai Rata-rata, Status ACC Guru)
    session.openedMaterials = session.openedMaterials || {};
    const openedMats = session.openedMaterials;

    // Evaluasi 5 Checkpoint Modul Tugas (Materi, Pretest, LKM Cetak, Simulasi & Kirim, Posttest):
    let completedModules = 0;
    const totalModulesCount = 5;

    // 1. Modul Materi
    const hasMateriDone = Boolean(openedMats['materi'] || openedMats['materi_interaktif']);
    if (hasMateriDone) completedModules += 1;

    // 2. Modul Pretest
    const hasPreDone = Boolean(rec && rec.pretestScore !== undefined) || (session.step > 2);
    if (hasPreDone) completedModules += 1;

    // 3. Modul LKM (Cetak/Unduh)
    const hasLkmDone = Boolean(openedMats['lkm'] || openedMats['pdf']);
    if (hasLkmDone) completedModules += 1;

    // 4. Modul Simulasi & Kirim ke Guru
    const hasSimulasiDone = Boolean(openedMats['simulasi'] || localStorage.getItem('eduassess_student_submissions_v2'));
    if (hasSimulasiDone) completedModules += 1;

    // 5. Modul Posttest
    const hasPostDone = Boolean(rec && rec.posttestScore !== undefined) || Boolean(session.completed);
    if (hasPostDone) completedModules += 1;

    // Update Simulasi Status Badge
    const simulasiBadge = document.getElementById('simulasiStatusBadge');
    if (simulasiBadge) {
      if (hasSimulasiDone) {
        simulasiBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
        simulasiBadge.textContent = 'Sudah Dikirim ✓';
      } else {
        simulasiBadge.className = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600';
        simulasiBadge.textContent = 'Tersedia';
      }
    }

    // 1. PROSES BELAJAR (Persentase 0% - 100%)
    const prosesPercent = Math.min(100, Math.round((completedModules / totalModulesCount) * 100));

    // 2. TUGAS SELESAI (0 / 5 s.d. 5 / 5)
    const tugasSelesaiText = completedModules + ' / ' + totalModulesCount;

    // 3. NILAI RATA-RATA (Pretest & Posttest yang sudah diselesaikan)
    const pScore = rec ? (rec.pretestScore !== undefined ? Number(rec.pretestScore) : null) : (session.step > 2 ? Number(evalPre.score) : null);
    const qScore = rec ? (rec.posttestScore !== undefined ? Number(rec.posttestScore) : null) : (session.completed ? Number(evalPost.score) : null);
    let avgScore = '-';
    if (pScore !== null && qScore !== null) {
      avgScore = Math.round((pScore + qScore) / 2);
    } else if (pScore !== null) {
      avgScore = pScore;
    } else if (qScore !== null) {
      avgScore = qScore;
    }

    // 4. STATUS ACC GURU
    let accStatusText = 'Belum Kuis';
    if (accStatus === 'ACC') {
      accStatusText = 'Sudah di-ACC ✓';
    } else if (hasPostDone) {
      accStatusText = 'Menunggu ACC';
    } else if (hasPreDone) {
      accStatusText = 'Pretest Selesai';
    } else if (completedModules > 0) {
      accStatusText = 'Dalam Proses';
    }

    const openRateEl = document.getElementById('overviewOpenRate');
    if (openRateEl) openRateEl.textContent = prosesPercent + '%';

    const completeRateEl = document.getElementById('overviewCompleteRate');
    if (completeRateEl) completeRateEl.textContent = tugasSelesaiText;

    const scoreEl = document.getElementById('overviewScore');
    if (scoreEl) scoreEl.textContent = avgScore;

    const activityEl = document.getElementById('overviewActivity');
    if (activityEl) activityEl.textContent = accStatusText;

    // Kartu Status Live Murid & ACC
    const liveStatsCard = document.getElementById('studentLiveStatsCard');
    if (liveStatsCard) {
      const displayScorePre = rec ? rec.pretestScore : (session.step > 2 ? evalPre.score : '-');
      const displayScorePost = rec ? rec.posttestScore : (session.completed ? evalPost.score : '-');
      const preCorrect = rec && rec.pretestCorrectCount !== undefined ? rec.pretestCorrectCount : (session.step > 2 ? evalPre.correctCount : null);
      const postCorrect = rec && rec.posttestCorrectCount !== undefined ? rec.posttestCorrectCount : (session.completed ? evalPost.correctCount : null);

      liveStatsCard.innerHTML =
        '<div class="grid grid-cols-2 gap-3 text-center">' +
          '<div class="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100">' +
            '<div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Skor Pretest</div>' +
            '<div class="text-2xl font-black text-indigo-700 mt-0.5">' + displayScorePre + '</div>' +
            '<div class="text-[10px] text-slate-500 font-medium truncate">' + (displayScorePre !== '-' ? 'Benar ' + (preCorrect !== null ? preCorrect : '-') + ' / 10' : 'Belum Kuis') + '</div>' +
          '</div>' +
          '<div class="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">' +
            '<div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Skor Posttest</div>' +
            '<div class="text-2xl font-black text-emerald-700 mt-0.5">' + displayScorePost + '</div>' +
            '<div class="text-[10px] text-slate-500 font-medium truncate">' + (displayScorePost !== '-' ? 'Benar ' + (postCorrect !== null ? postCorrect : '-') + ' / 10' : 'Belum Kuis') + '</div>' +
          '</div>' +
          '<div class="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 col-span-2 text-center">' +
            '<div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Verifikasi Guru</div>' +
            '<div class="mt-1.5 flex items-center justify-center gap-2">' +
              (accStatus === 'ACC'
                ? '<span class="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs">✓ Sudah di-ACC Guru</span>'
                : '<span class="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-xs">⏳ Menunggu ACC Guru</span>') +
            '</div>' +
            '<p class="text-[10px] text-slate-500 mt-1">Diverifikasi langsung oleh guru di Laman Admin.</p>' +
          '</div>' +
        '</div>';
    }
  }

  // ==================== TIMER 30 DETIK PER SOAL KHUSUS PRETEST ====================
  function stopQuestionTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerUI(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const mm = '00';
    const ss = String(s).padStart(2, '0');
    const timeStr = mm + ':' + ss;

    const timerDisplay = document.getElementById('quizTimerDisplay');
    if (timerDisplay) {
      timerDisplay.textContent = timeStr;
      if (s <= 10) {
        timerDisplay.className = 'font-mono text-2xl font-black text-rose-600 tabular-nums animate-pulse';
      } else {
        timerDisplay.className = 'font-mono text-2xl font-black text-rose-600 tabular-nums';
      }
    }

    const timerDisplaySide = document.getElementById('quizTimerDisplaySide');
    if (timerDisplaySide) {
      timerDisplaySide.textContent = timeStr;
      if (s <= 10) {
        timerDisplaySide.className = 'font-mono text-2xl font-black text-rose-600 tracking-tight tabular-nums animate-pulse';
      } else {
        timerDisplaySide.className = 'font-mono text-2xl font-black text-rose-600 tracking-tight tabular-nums';
      }
    }

    const timerBar = document.getElementById('quizTimerBar');
    if (timerBar) {
      const pct = Math.max(0, Math.min(100, (s / PRETEST_QUESTION_TIME) * 100));
      timerBar.style.width = pct + '%';
      if (s <= 10) {
        timerBar.className = 'bg-rose-600 h-2 transition-all duration-1000 ease-linear rounded-full';
      } else {
        timerBar.className = 'bg-rose-500 h-2 transition-all duration-1000 ease-linear rounded-full';
      }
    }
  }

  function startQuestionTimer(questionIdx) {
    stopQuestionTimer();
    if (currentView !== 'quiz') return;
    const isPretest = session.step === 2;
    if (!isPretest) return;

    timerQuestionIndex = questionIdx !== undefined ? questionIdx : (session.pretestIndex || 0);
    remainingSeconds = PRETEST_QUESTION_TIME;
    updateTimerUI(remainingSeconds);

    timerInterval = setInterval(function () {
      if (currentView !== 'quiz' || session.step !== 2) {
        stopQuestionTimer();
        return;
      }
      remainingSeconds -= 1;
      updateTimerUI(remainingSeconds);

      if (remainingSeconds <= 0) {
        stopQuestionTimer();
        handlePretestQuestionTimeout(timerQuestionIndex);
      }
    }, 1000);
  }

  function handlePretestQuestionTimeout(timedOutIndex) {
    stopQuestionTimer();
    if (session.step !== 2) return;

    const questions = questionBank.pretest || [];
    const curIdx = timedOutIndex !== undefined ? timedOutIndex : (session.pretestIndex || 0);
    const hasAnswer = session.pretestAnswers && session.pretestAnswers[curIdx] !== undefined;

    if (curIdx + 1 < questions.length) {
      if (hasAnswer) {
        showToast('Waktu 30 detik habis! Jawaban Soal #' + (curIdx + 1) + ' otomatis terkirim. Lanjut ke Soal #' + (curIdx + 2) + '.', 'info');
      } else {
        showToast('Waktu 30 detik habis! Soal #' + (curIdx + 1) + ' otomatis terkirim kosong (0). Lanjut ke Soal #' + (curIdx + 2) + '.', 'warning');
      }
      session.pretestIndex = curIdx + 1;
      saveSession();
      renderQuizQuestionStage();
    } else {
      if (hasAnswer) {
        showToast('Waktu 30 detik habis! Jawaban Soal #' + (curIdx + 1) + ' terkirim. Pretest selesai!', 'success');
      } else {
        showToast('Waktu 30 detik habis! Soal #' + (curIdx + 1) + ' terkirim kosong. Pretest selesai!', 'warning');
      }
      submitPretest(true);
    }
  }

  function submitPretest(isAutoTimeout) {
    stopQuestionTimer();
    timerQuestionIndex = -1;
    if (session.step !== 2) return;

    // Pastikan session ada data identitas default jika kosong
    if (!session.absen || !session.nama) {
      const defaultStudent = lookupStudentByAbsen(roster, 1) || {
        absen: 1,
        nama: 'Aditya Pratama Putra',
        kelas: 'Informatika - X E7',
        nis: '24001'
      };
      session.absen = defaultStudent.absen;
      session.nama = defaultStudent.nama;
      session.kelas = defaultStudent.kelas;
      session.nis = defaultStudent.nis;
    }

    // Evaluasi seluruh 10 butir soal pretest (dukungan bank acak)
    const questions = session.pretestQuestions || questionBank.pretest;
    const evalPre = evaluateAnswers(questions, 'pretest', session.pretestAnswers);

    session.step = 3;
    quizCurrentSubStage = 'identity';
    saveSession();

    // Sinkronisasi data ke dashboard guru (Kelompok TaRL otomatis dihitung guru)
    const existingIdx = teacherRecords.findIndex(function (r) {
      return Number(r.absen) === Number(session.absen);
    });
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WIB';
    if (existingIdx !== -1) {
      teacherRecords[existingIdx].pretestScore = evalPre.score;
      teacherRecords[existingIdx].pretestCorrectCount = evalPre.correctCount;
      teacherRecords[existingIdx].pretestBloomCorrect = evalPre.bloomCorrect;
      teacherRecords[existingIdx].pretestBloomTotal = evalPre.bloomTotal;
    } else {
      teacherRecords.unshift({
        absen: Number(session.absen),
        nama: session.nama,
        kelas: session.kelas,
        timestamp: timeStr,
        accStatus: 'PENDING',
        accTimestamp: null,
        checkin: Object.assign({}, session.checkin),
        pretestScore: evalPre.score,
        pretestCorrectCount: evalPre.correctCount,
        pretestBloomCorrect: evalPre.bloomCorrect,
        pretestBloomTotal: evalPre.bloomTotal
      });
    }
    saveRecords();

    switchView('transition');
    if (isAutoTimeout) {
      showToast('Pretest selesai! Skor: ' + evalPre.score + ' (' + evalPre.correctCount + '/10 benar).', 'info');
    } else {
      showToast('Pretest berhasil dikirim! Skor: ' + evalPre.score + ' (' + evalPre.correctCount + '/10 benar).', 'success');
    }
  }

  // ==================== TAHAP 1: PENGISIAN IDENTITAS & CEK-IN BELAJAR ====================
  function renderQuizIdentityStage() {
    const isPretest = session.step === 2;

    const badgeEl = document.getElementById('quizIdentityPhaseBadge');
    if (badgeEl) {
      badgeEl.textContent = isPretest ? 'ASESMEN DIAGNOSTIK PRETEST' : 'ASESMEN FORMATIF POSTTEST';
      badgeEl.className = isPretest
        ? 'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800'
        : 'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800';
    }

    const titleEl = document.getElementById('quizIdentityTitle');
    if (titleEl) {
      titleEl.textContent = isPretest ? 'Pengisian Identitas Siswa & Cek-in Pretest' : 'Pengisian Identitas Siswa & Cek-in Posttest';
    }

    const btnTextEl = document.getElementById('btnStartQuizConfirmText');
    if (btnTextEl) {
      btnTextEl.textContent = isPretest ? 'Mulai Kerjakan Pretest' : 'Mulai Kerjakan Posttest';
    }

    // Identitas Siswa: Sinkronisasi Absen, Nama & Kelas
    const inputAbsen = document.getElementById('quizInputAbsen');
    const inputNama = document.getElementById('quizInputNama');
    const selectKelas = document.getElementById('quizSelectKelas');

    if (inputAbsen) {
      inputAbsen.value = session.absen || '';
      if (!inputAbsen.dataset.bound) {
        inputAbsen.dataset.bound = 'true';
        inputAbsen.addEventListener('input', function () {
          const val = this.value.trim();
          session.absen = val;
          const found = lookupStudentByAbsen(roster, val);
          if (found) {
            session.nama = found.nama;
            session.kelas = found.kelas || 'Informatika - X E7';
            session.nis = found.nis || '';
            const namaEl = document.getElementById('quizInputNama');
            if (namaEl) namaEl.value = found.nama;
            const kelasEl = document.getElementById('quizSelectKelas');
            if (kelasEl) kelasEl.value = found.kelas || 'Informatika - X E7';
            saveSession();
            renderDashboard();
            showToast('Absen #' + found.absen + ' ditemukan: ' + found.nama, 'success');
          } else {
            saveSession();
            renderDashboard();
          }
        });
      }
    }

    if (inputNama) {
      inputNama.value = session.nama || '';
      if (!inputNama.dataset.bound) {
        inputNama.dataset.bound = 'true';
        inputNama.addEventListener('input', function () {
          session.nama = this.value.trim();
          saveSession();
          renderDashboard();
        });
      }
    }

    if (selectKelas) {
      if (session.kelas) selectKelas.value = session.kelas;
      if (!selectKelas.dataset.bound) {
        selectKelas.dataset.bound = 'true';
        selectKelas.addEventListener('change', function () {
          session.kelas = this.value;
          saveSession();
          renderDashboard();
        });
      }
    }

    // Cek-in Emotikon Kondisi
    const MOOD_OPTIONS = [
      { id: 'Semangat & Antusias', emoji: '😊' },
      { id: 'Tenang & Fokus', emoji: '😄' },
      { id: 'Penasaran', emoji: '🤔' },
      { id: 'Sedikit Mengantuk', emoji: '😴' },
      { id: 'Gugup / Cemas', emoji: '😰' }
    ];

    const currentMood = (session.checkin && session.checkin.mood) || 'Semangat & Antusias';
    const moodLabel = document.getElementById('quizMoodActiveLabel');
    if (moodLabel) {
      const curObj = MOOD_OPTIONS.find(function (m) { return m.id === currentMood; }) || MOOD_OPTIONS[0];
      moodLabel.textContent = curObj.emoji + ' ' + curObj.id;
    }

    const moodContainer = document.getElementById('quizMoodContainer');
    if (moodContainer) {
      moodContainer.innerHTML = '';
      MOOD_OPTIONS.forEach(function (m) {
        const isSelected = currentMood === m.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ' +
          (isSelected
            ? 'border-2 border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs ring-2 ring-blue-500/20'
            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300');
        btn.innerHTML = '<span class="text-base">' + m.emoji + '</span><span class="truncate">' + m.id + '</span>';
        btn.addEventListener('click', function () {
          session.checkin = session.checkin || {};
          session.checkin.mood = m.id;
          session.checkin.timestamp = new Date().toLocaleTimeString('id-ID');
          saveSession();
          renderQuizIdentityStage();
          showToast('Kondisi cek-in dipilih: ' + m.emoji + ' ' + m.id, 'info');
        });
        moodContainer.appendChild(btn);
      });
    }
  }

  // ==================== MODAL KONFIRMASI KEBENARAN DATA ====================
  function showIdentityConfirmationModal() {
    // Pastikan absen dan nama sudah terisi
    const inputAbsen = document.getElementById('quizInputAbsen');
    const inputNama = document.getElementById('quizInputNama');
    const valAbsen = inputAbsen ? inputAbsen.value.trim() : session.absen;
    const valNama = inputNama ? inputNama.value.trim() : session.nama;

    if (valAbsen && !valNama) {
      const found = lookupStudentByAbsen(roster, valAbsen);
      if (found) {
        session.absen = found.absen;
        session.nama = found.nama;
        session.kelas = found.kelas || 'Informatika - X E7';
        session.nis = found.nis || '';
      } else {
        session.absen = valAbsen;
      }
    } else if (valAbsen && valNama) {
      session.absen = valAbsen;
      session.nama = valNama;
    }

    if (!session.absen || !session.nama) {
      showToast('Silakan lengkapi Nomor Absen dan Nama Lengkap terlebih dahulu!', 'warning');
      if (inputAbsen) inputAbsen.focus();
      return;
    }

    const isPretest = session.step === 2;

    const modalAbsen = document.getElementById('confirmModalAbsen');
    if (modalAbsen) modalAbsen.textContent = 'Absen #' + session.absen;

    const modalNama = document.getElementById('confirmModalNama');
    if (modalNama) modalNama.textContent = session.nama;

    const modalKelas = document.getElementById('confirmModalKelas');
    if (modalKelas) modalKelas.textContent = session.kelas || 'Informatika - X E7';

    const modalMood = document.getElementById('confirmModalMood');
    if (modalMood) {
      const curMood = (session.checkin && session.checkin.mood) || 'Semangat & Antusias';
      modalMood.textContent = curMood;
    }

    const warningText = document.getElementById('confirmModalWarningText');
    if (warningText) {
      warningText.innerHTML = isPretest
        ? 'Setelah Anda menekan tombol <strong>"Ya, Sudah Benar &amp; Mulai"</strong>, Anda akan mulai mengerjakan <strong>10 butir soal asesmen diagnostik pretest</strong> dengan batas waktu <strong>30 detik per butir soal</strong>. Pada setiap butir soal (mulai dari Soal 1), jika waktu 30 detik habis, jawaban akan langsung <strong>otomatis terkirim</strong> dan beralih ke soal berikutnya (atau bernilai 0 jika belum dijawab).'
        : 'Setelah Anda menekan tombol <strong>"Ya, Sudah Benar &amp; Mulai"</strong>, Anda akan mulai mengerjakan 10 butir soal asesmen formatif akhir.';
    }

    const modal = document.getElementById('quizConfirmIdentityModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function confirmIdentityAndStartQuiz() {
    const modal = document.getElementById('quizConfirmIdentityModal');
    if (modal) modal.classList.add('hidden');

    quizCurrentSubStage = 'question';
    const stageIdentity = document.getElementById('quizStageIdentity');
    const stageQuestion = document.getElementById('quizStageQuestion');
    if (stageIdentity) stageIdentity.classList.add('hidden');
    if (stageQuestion) stageQuestion.classList.remove('hidden');

    renderQuizQuestionStage();
  }

  // ==================== TAHAP 2: PENGERJAAN SOAL AKTIF & HITUNGAN MUNDUR ====================
  function renderQuizQuestionStage() {
    const isPretest = session.step === 2;
    // Pastikan susunan soal acak telah dibuat untuk sesi ini
    if (isPretest && (!session.pretestQuestions || session.pretestQuestions.length === 0)) {
      session.pretestQuestions = randomizeQuestions(questionBank.pretest);
      saveSession();
    } else if (!isPretest && (!session.posttestQuestions || session.posttestQuestions.length === 0)) {
      session.posttestQuestions = randomizeQuestions(questionBank.posttest);
      saveSession();
    }

    const questions = isPretest ? (session.pretestQuestions || questionBank.pretest) : (session.posttestQuestions || questionBank.posttest);
    const currentIndex = isPretest ? (session.pretestIndex || 0) : (session.posttestIndex || 0);
    const answersMap = isPretest ? (session.pretestAnswers = session.pretestAnswers || {}) : (session.posttestAnswers = session.posttestAnswers || {});
    const q = questions[currentIndex] || questions[0];

    // Badge & Judul Kuis di Top Bar
    const titleBadge = document.getElementById('quizHeaderPhaseBadge');
    if (titleBadge) {
      titleBadge.textContent = isPretest ? 'ASESMEN DIAGNOSTIK PRETEST' : 'ASESMEN FORMATIF POSTTEST';
      titleBadge.className = isPretest
        ? 'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800'
        : 'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800';
    }

    const headerTitle = document.getElementById('quizHeaderTitle');
    if (headerTitle) {
      headerTitle.textContent = isPretest
        ? ('Pretest Pseudocode (Soal ' + (currentIndex + 1) + ' dari ' + questions.length + ' • 30 Detik)')
        : 'Posttest Notasi Pseudocode (10 Soal)';
    }

    // Toggle timer Pretest
    const timerWrapper = document.getElementById('quizTimerWrapper');
    const timerBarContainer = document.getElementById('quizTimerBarContainer');
    const sideTimerBox = document.getElementById('quizSideTimerBox');

    if (isPretest) {
      if (timerWrapper) timerWrapper.classList.remove('hidden');
      if (timerBarContainer) timerBarContainer.classList.remove('hidden');
      if (sideTimerBox) sideTimerBox.classList.remove('hidden');

      const topTitle = document.getElementById('quizTimerTopTitle');
      if (topTitle) topTitle.textContent = 'Sisa Waktu Soal #' + (currentIndex + 1) + ':';
      const sideTitle = document.getElementById('quizSideTimerTitle');
      if (sideTitle) sideTitle.textContent = 'Sisa Waktu Soal #' + (currentIndex + 1) + ':';
    } else {
      if (timerWrapper) timerWrapper.classList.add('hidden');
      if (timerBarContainer) timerBarContainer.classList.add('hidden');
      if (sideTimerBox) sideTimerBox.classList.add('hidden');
    }

    // Label tombol Kirim Jawaban
    const submitBtnText = document.getElementById('quizSubmitBtnText');
    if (submitBtnText) {
      if (isPretest) {
        const isLastPre = (currentIndex + 1) >= questions.length;
        submitBtnText.textContent = isLastPre ? 'Kirim Seluruh Jawaban Pretest' : ('Kirim Soal #' + (currentIndex + 1) + ' & Lanjut →');
      } else {
        submitBtnText.textContent = 'Kirim Jawaban Posttest';
      }
    }

    // Terjawab counter & Tag
    const answeredCount = Object.keys(answersMap).length;
    const navBadge = document.getElementById('quizNavTerjawabBadge');
    if (navBadge) {
      navBadge.textContent = answeredCount + ' / ' + questions.length + ' Terjawab';
    }

    // Nomor Soal & Topik Pill
    const pill = document.getElementById('quizActiveQuestionPill');
    if (pill) {
      pill.innerHTML = '<span class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">' + (currentIndex + 1) + '</span>' +
        '<span class="uppercase tracking-wider text-xs font-bold text-blue-950">' + (q.topic || 'NOTASI PSEUDOCODE') + '</span>';
    }

    const bloomTag = document.getElementById('quizActiveBloomTag');
    if (bloomTag) {
      bloomTag.textContent = 'Taksonomi Bloom: ' + (BLOOM_DESCRIPTIONS[q.bloomLevel] || q.bloomLevel);
    }

    const statusTag = document.getElementById('quizActiveStatusTag');
    if (statusTag) {
      const isAnswered = answersMap[currentIndex] !== undefined;
      if (isAnswered) {
        statusTag.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
        statusTag.textContent = '✓ Sudah dijawab';
      } else {
        statusTag.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500';
        statusTag.textContent = 'Belum dijawab';
      }
    }

    // Teks Pertanyaan (Stem) dengan Visual Code Terminal Editor
    const questionStem = document.getElementById('quizQuestionStem');
    if (questionStem) {
      questionStem.innerHTML = formatQuestionStemHtml(q);
    }

    // Pilihan Jawaban A, B, C, D, E dengan Sintaks Monospace
    const optsContainer = document.getElementById('quizOptionsContainer');
    if (optsContainer) {
      optsContainer.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D', 'E'];

      (q.options || []).forEach(function (optText, optIdx) {
        const isSelected = answersMap[currentIndex] !== undefined && Number(answersMap[currentIndex]) === optIdx;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 ' +
          (isSelected
            ? 'border-2 border-blue-600 bg-blue-50/80 text-blue-950 font-bold shadow-xs'
            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 text-slate-800');
        btn.innerHTML = '<span class="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 transition-all ' +
          (isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-xs' : 'border-slate-300 bg-slate-50 text-slate-700') + '">' +
          (letters[optIdx] || (optIdx + 1)) +
          '</span>' +
          '<span class="text-sm sm:text-base leading-snug font-medium">' + formatOptionText(optText) + '</span>';

        btn.addEventListener('click', function () {
          answersMap[currentIndex] = optIdx;
          saveSession();
          renderQuizQuestionStage();
        });
        optsContainer.appendChild(btn);
      });
    }

    // Grid Nomor Soal 1 - 10 (Aktif untuk Keduanya: Pretest & Posttest)
    const grid = document.getElementById('quizNavGrid');
    if (grid) {
      grid.innerHTML = '';
      questions.forEach(function (item, idx) {
        const answered = answersMap[idx] !== undefined;
        const isCurrent = idx === currentIndex;
        const cell = document.createElement('button');
        cell.type = 'button';

        if (isPretest) {
          // Khusus Pretest: Mode berurutan 30 detik per butir soal
          const isPassed = idx < currentIndex;
          cell.className = 'w-full aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all ' +
            (isCurrent
              ? 'border-2 border-blue-600 bg-blue-50 text-blue-700 font-black ring-2 ring-blue-500/20 shadow-xs'
              : isPassed
                ? (answered ? 'bg-blue-600 text-white font-bold opacity-80' : 'bg-slate-200 text-slate-500 font-semibold')
                : 'bg-white border border-slate-200 text-slate-400 font-medium');
          cell.textContent = idx + 1;
          cell.addEventListener('click', function () {
            if (isPassed) {
              showToast('Soal #' + (idx + 1) + ' sudah terkirim dan tidak dapat diubah kembali.', 'warning');
            } else if (idx > currentIndex) {
              showToast('Kerjakan soal secara berurutan sesuai batas waktu 30 detik per soal.', 'info');
            }
          });
        } else {
          // Posttest: Bebas navigasi
          cell.className = 'w-full aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all ' +
            (isCurrent
              ? 'border-2 border-blue-600 bg-blue-50 text-blue-700 font-black ring-2 ring-blue-500/20 shadow-xs'
              : answered
                ? 'bg-blue-600 text-white border border-blue-600 font-bold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold');
          cell.textContent = idx + 1;
          cell.addEventListener('click', function () {
            session.posttestIndex = idx;
            saveSession();
            renderQuizQuestionStage();
          });
        }
        grid.appendChild(cell);
      });
    }

    // Navigasi Bawah (Prev / Next aktif untuk Pretest dan Posttest)
    const prevBtn = document.getElementById('quizPrevBtn');
    const nextBtn = document.getElementById('quizNextBtn');

    if (prevBtn) {
      if (isPretest) {
        prevBtn.classList.add('hidden'); // Soal sebelumnya pada Pretest sudah terkunci / terkirim
      } else {
        prevBtn.classList.remove('hidden');
        prevBtn.disabled = currentIndex === 0;
        prevBtn.className = 'px-4 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ' +
          (currentIndex === 0 ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs');
      }
    }

    if (nextBtn) {
      nextBtn.classList.remove('hidden');
      if (isPretest) {
        const isLastPre = (currentIndex + 1) >= questions.length;
        nextBtn.textContent = isLastPre ? 'Kirim Jawaban Pretest ✈' : ('Lanjut Soal #' + (currentIndex + 2) + ' →');
      } else {
        const isLast = currentIndex + 1 >= questions.length;
        nextBtn.textContent = isLast ? 'Selesaikan Tinjauan →' : 'Soal Berikutnya →';
      }
    }

    // Jalankan timer 30 detik untuk Pretest per soal
    if (isPretest) {
      if (timerQuestionIndex !== currentIndex || !timerInterval) {
        startQuestionTimer(currentIndex);
      }
    } else {
      stopQuestionTimer();
    }
  }

  // ==================== DISPATCHER UTAMA KUIS ====================
  function renderQuizRunner() {
    if (quizCurrentSubStage === 'identity') {
      const stageIdentity = document.getElementById('quizStageIdentity');
      const stageQuestion = document.getElementById('quizStageQuestion');
      const confirmModal = document.getElementById('quizConfirmIdentityModal');
      if (stageIdentity) stageIdentity.classList.remove('hidden');
      if (stageQuestion) stageQuestion.classList.add('hidden');
      if (confirmModal) confirmModal.classList.add('hidden');
      stopQuestionTimer();
      renderQuizIdentityStage();
    } else {
      const stageIdentity = document.getElementById('quizStageIdentity');
      const stageQuestion = document.getElementById('quizStageQuestion');
      if (stageIdentity) stageIdentity.classList.add('hidden');
      if (stageQuestion) stageQuestion.classList.remove('hidden');
      renderQuizQuestionStage();
    }
  }

  function advanceCurrentQuestion() {
    const isPretest = session.step === 2;
    if (isPretest) {
      const questions = questionBank.pretest || [];
      let currentIndex = session.pretestIndex || 0;
      stopQuestionTimer();
      if (currentIndex + 1 < questions.length) {
        session.pretestIndex = currentIndex + 1;
        saveSession();
        renderQuizQuestionStage();
        showToast('Lanjut ke Soal #' + (currentIndex + 2), 'info');
      } else {
        submitPretest(false);
      }
      return;
    }

    const questions = questionBank.posttest || [];
    let currentIndex = session.posttestIndex || 0;

    if (currentIndex + 1 < questions.length) {
      currentIndex += 1;
      session.posttestIndex = currentIndex;
      saveSession();
      renderQuizRunner();
      showToast('Soal #' + (currentIndex + 1), 'info');
    } else {
      showToast('Anda berada di nomor soal terakhir. Silakan tinjau dan klik Kirim Jawaban.', 'info');
    }
  }

  function retreatCurrentQuestion() {
    const isPretest = session.step === 2;
    if (isPretest) {
      showToast('Soal sebelumnya pada Pretest sudah terkunci dan tidak dapat diubah.', 'warning');
      return;
    }
    let currentIndex = session.posttestIndex || 0;
    if (currentIndex > 0) {
      currentIndex -= 1;
      session.posttestIndex = currentIndex;
      saveSession();
      renderQuizRunner();
    }
  }

  // ==================== RENDER REVIEW & PEMBAHASAN SOAL LENGKAP ====================
  function renderQuestionsReview(containerId, questionsList, answersMap, phaseKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const questions = questionsList || [];
    const answers = answersMap || {};

    if (questions.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500 py-3 text-center">Belum ada data butir soal yang direkam.</p>';
      return;
    }

    container.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D', 'E'];

    questions.forEach(function (q, idx) {
      const chosen = answers[idx];
      const isAnswered = chosen !== undefined;
      const isCorrect = isAnswered && Number(chosen) === Number(q.correctIndex);

      let statusBadge = '';
      if (!isAnswered) {
        statusBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">⏱️ Tidak Dijawab (0 Poin)</span>';
      } else if (isCorrect) {
        statusBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Jawaban Anda Benar (+10 Poin)</span>';
      } else {
        statusBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">✕ Jawaban Anda Kurang Tepat (0 Poin)</span>';
      }

      const card = document.createElement('div');
      card.className = 'p-5 sm:p-6 rounded-2xl border transition-all space-y-3.5 ' +
        (isCorrect ? 'border-emerald-200 bg-emerald-50/20' : (isAnswered ? 'border-rose-200 bg-rose-50/20' : 'border-amber-200 bg-amber-50/20'));

      // Pilihan Jawaban
      let optionsHtml = '';
      (q.options || []).forEach(function (optText, optIdx) {
        const isOptChosen = isAnswered && Number(chosen) === optIdx;
        const isOptCorrect = Number(q.correctIndex) === optIdx;

        let optClass = 'border-slate-200 bg-white text-slate-700';
        let optBadges = '';

        if (isOptCorrect) {
          optClass = 'border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-xs';
          optBadges += '<span class="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold uppercase">✓ Kunci Jawaban Benar</span>';
        }
        if (isOptChosen) {
          if (!isOptCorrect) {
            optClass = 'border-2 border-rose-400 bg-rose-50 text-rose-950 font-bold';
            optBadges += '<span class="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase">✕ Pilihan Anda</span>';
          } else {
            optBadges += '<span class="px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-extrabold uppercase">Pilihan Anda</span>';
          }
        }

        optionsHtml +=
          '<div class="p-3 sm:p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm ' + optClass + '">' +
            '<div class="flex items-center gap-2.5 min-w-0">' +
              '<span class="w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 ' +
                (isOptCorrect ? 'border-emerald-600 bg-emerald-600 text-white' : (isOptChosen ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300 bg-slate-50 text-slate-700')) + '">' +
                letters[optIdx] +
              '</span>' +
              '<span class="leading-snug break-words">' + formatOptionText(optText) + '</span>' +
            '</div>' +
            (optBadges ? '<div class="shrink-0 flex items-center gap-1.5">' + optBadges + '</div>' : '') +
          '</div>';
      });

      card.innerHTML =
        '<div class="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">' +
          '<div class="flex items-center gap-2 flex-wrap">' +
            '<span class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs">' + (idx + 1) + '</span>' +
            '<span class="text-xs font-black text-slate-800 uppercase tracking-wider">' + (q.topic || 'NOTASI PSEUDOCODE') + '</span>' +
            '<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">' + (q.bloomLevel || 'C1') + '</span>' +
          '</div>' +
          statusBadge +
        '</div>' +
        '<div class="text-sm sm:text-base text-slate-900 leading-relaxed">' + formatQuestionStemHtml(q) + '</div>' +
        '<div class="space-y-2">' + optionsHtml + '</div>' +
        '<div class="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 text-xs sm:text-sm space-y-1.5 shadow-2xs">' +
          '<div class="flex items-center gap-2 font-black text-blue-900">' +
            '<span class="text-base text-blue-600">💡</span>' +
            '<span>Pembahasan Jawaban yang Benar:</span>' +
          '</div>' +
          '<p class="leading-relaxed text-slate-700 pl-6 font-medium">' + formatOptionText(q.explanation || 'Pembahasan belum tersedia.') + '</p>' +
        '</div>';

      container.appendChild(card);
    });
  }

  // ==================== RENDER TRANSISI & CHECKOUT ====================
  function renderTransition() {
    const questions = session.pretestQuestions || questionBank.pretest;
    const evalPre = evaluateAnswers(questions, 'pretest', session.pretestAnswers);
    const summary = document.getElementById('transitionSummaryGrid');
    if (summary) {
      summary.className = 'grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-center';
      const isZero = evalPre.score === 0;
      summary.innerHTML =
        '<div class="p-5 rounded-2xl border-2 ' + (isZero ? 'border-amber-200 bg-amber-50/70' : 'border-blue-200 bg-blue-50/90') + ' shadow-sm space-y-1">' +
          '<div class="text-[11px] font-bold uppercase tracking-wider ' + (isZero ? 'text-amber-800' : 'text-blue-800') + '">Skor Pretest Awal</div>' +
          '<div class="text-3xl sm:text-4xl font-black ' + (isZero ? 'text-amber-700' : 'text-blue-700') + ' tracking-tight">' + evalPre.score + ' <span class="text-xs font-bold text-slate-400">/ 100</span></div>' +
          '<div class="text-xs text-slate-500 font-medium pt-1">Benar ' + evalPre.correctCount + ' dari 10 soal</div>' +
        '</div>' +
        '<div class="p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/90 shadow-sm space-y-1">' +
          '<div class="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Jawaban yang Benar</div>' +
          '<div class="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight">' + evalPre.correctCount + ' <span class="text-xs font-bold text-slate-400">/ 10 Soal</span></div>' +
          '<div class="text-xs text-slate-500 font-medium pt-1">' + (evalPre.correctCount > 0 ? '✓ ' + evalPre.correctCount + ' Soal Terjawab Benar' : '0 Soal Terjawab Benar') + '</div>' +
        '</div>' +
        '<div class="p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/90 shadow-sm space-y-1 text-left">' +
          '<div class="text-[11px] font-bold uppercase tracking-wider text-purple-800 text-center">Sebaran Bloom Benar</div>' +
          '<div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs pt-1.5">' +
            ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map(function (lvl) {
              const c = evalPre.bloomCorrect[lvl] || 0;
              const t = evalPre.bloomTotal[lvl] || 0;
              return '<div class="flex items-center justify-between px-2 py-0.5 rounded bg-white/70 border border-purple-100 font-semibold text-slate-700">' +
                '<span class="text-purple-700 font-bold">' + lvl + ':</span>' +
                '<span>' + c + '/' + t + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    // Render Review Pembahasan Soal Pretest
    renderQuestionsReview('pretestReviewContainer', questions, session.pretestAnswers, 'pretest');
  }

  function renderCheckout() {
    // 1. Pemahaman
    const undGroup = document.getElementById('checkoutUnderstandingGroup');
    if (undGroup) {
      undGroup.innerHTML = '';
      CHECKOUT_UNDERSTANDINGS.forEach(function (u) {
        const active = session.checkout.understanding === u.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'p-3.5 rounded-xl border text-left transition-all space-y-1 ' +
          (active ? 'border-2 border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700');
        btn.innerHTML = '<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">' + u.level + '</span>' +
          '<div class="text-xs font-bold leading-snug pt-1">' + u.id + '</div>' +
          '<div class="text-[11px] text-slate-500">' + u.desc + '</div>';
        btn.addEventListener('click', function () {
          session.checkout.understanding = u.id;
          saveSession();
          renderCheckout();
        });
        undGroup.appendChild(btn);
      });
    }

    // 2. Emosi
    const emoGroup = document.getElementById('checkoutEmotionGroup');
    if (emoGroup) {
      emoGroup.innerHTML = '';
      CHECKOUT_EMOTIONS.forEach(function (em) {
        const active = session.checkout.emotion === em.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ' +
          (active ? 'border-2 border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700');
        btn.innerHTML = '<span class="text-xl">' + em.emoji + '</span><span class="text-xs font-bold">' + em.id + '</span>';
        btn.addEventListener('click', function () {
          session.checkout.emotion = em.id;
          saveSession();
          renderCheckout();
        });
        emoGroup.appendChild(btn);
      });
    }

    // 3. Needs
    const needGroup = document.getElementById('checkoutNeedGroup');
    if (needGroup) {
      needGroup.innerHTML = '';
      CHECKOUT_NEEDS.forEach(function (nd) {
        const selected = (session.checkout.needs || []).indexOf(nd) !== -1;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ' +
          (selected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50');
        btn.textContent = (selected ? '✓ ' : '+ ') + nd;
        btn.addEventListener('click', function () {
          const arr = session.checkout.needs || [];
          const idx = arr.indexOf(nd);
          if (idx === -1) arr.push(nd);
          else arr.splice(idx, 1);
          session.checkout.needs = arr;
          saveSession();
          renderCheckout();
        });
        needGroup.appendChild(btn);
      });
    }

    const note = document.getElementById('checkoutNote');
    if (note) note.value = session.checkout.note || '';
  }

  function renderResultView() {
    const preQuestions = session.pretestQuestions || questionBank.pretest;
    const postQuestions = session.posttestQuestions || questionBank.posttest;
    const evalPre = evaluateAnswers(preQuestions, 'pretest', session.pretestAnswers);
    const evalPost = evaluateAnswers(postQuestions, 'posttest', session.posttestAnswers);
    const kkm = 75;
    const postStatus = evalPost.score >= kkm ? 'Tuntas Kompetensi' : 'Perlu Pendampingan Lanjutan';
    const accStatus = getStudentAccStatus(session.absen);

    const title = document.getElementById('resultStudentTitle');
    if (title) title.textContent = 'Absen #' + session.absen + ' — ' + session.nama + ' (' + session.kelas + ')';

    const metrics = document.getElementById('resultMetricsGrid');
    if (metrics) {
      metrics.innerHTML =
        '<div class="p-4 rounded-2xl border border-slate-200 bg-white text-center">' +
          '<div class="text-xs font-bold uppercase text-slate-400">Nilai Pretest Awal</div>' +
          '<div class="text-2xl font-black text-blue-700 mt-1">' + evalPre.score + ' <span class="text-xs text-slate-400">/ 100</span></div>' +
          '<div class="text-xs text-slate-500 mt-1">Benar ' + evalPre.correctCount + ' dari 10 soal</div>' +
        '</div>' +
        '<div class="p-4 rounded-2xl border border-slate-200 bg-white text-center">' +
          '<div class="text-xs font-bold uppercase text-slate-400">Nilai Posttest Akhir</div>' +
          '<div class="text-2xl font-black text-emerald-700 mt-1">' + evalPost.score + ' <span class="text-xs text-slate-400">/ 100</span></div>' +
          '<div class="text-xs text-slate-500 mt-1">Benar ' + evalPost.correctCount + ' dari 10 soal</div>' +
        '</div>' +
        '<div class="p-4 rounded-2xl border ' + (evalPost.score >= kkm ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950') + ' text-center">' +
          '<div class="text-xs font-bold uppercase opacity-80">Status Kelulusan</div>' +
          '<div class="text-base font-black mt-1">' + postStatus + '</div>' +
        '</div>' +
        '<div class="p-4 rounded-2xl border ' + (accStatus === 'ACC' ? 'bg-indigo-50 border-indigo-200 text-indigo-950' : 'bg-amber-50 border-amber-200 text-amber-950') + ' text-center">' +
          '<div class="text-xs font-bold uppercase opacity-80">Status Verifikasi Guru</div>' +
          '<div class="text-base font-bold mt-1">' +
            (accStatus === 'ACC' ? '<span class="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">✓ Sudah di-ACC</span>' : '<span class="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold">⏳ Menunggu ACC</span>') +
          '</div>' +
        '</div>';
    }

    const bloomBox = document.getElementById('resultBloomBreakdown');
    if (bloomBox) {
      bloomBox.innerHTML =
        '<h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">Rincian Jawaban Benar per Level Taksonomi Bloom (C1–C6)</h4>' +
        '<div class="grid grid-cols-2 sm:grid-cols-6 gap-2">' +
          ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map(function (lvl) {
            return '<div class="p-2.5 rounded-xl bg-white border border-slate-200 text-center">' +
              '<div class="text-xs font-bold text-indigo-700">' + lvl + '</div>' +
              '<div class="text-[11px] text-slate-500 mt-1">Pre: <strong>' + (evalPre.bloomCorrect[lvl] || 0) + '/' + (evalPre.bloomTotal[lvl] || 0) + '</strong></div>' +
              '<div class="text-[11px] text-emerald-700 font-bold">Post: <strong>' + (evalPost.bloomCorrect[lvl] || 0) + '/' + (evalPost.bloomTotal[lvl] || 0) + '</strong></div>' +
            '</div>';
          }).join('') +
        '</div>';
    }

    // Render Review Pembahasan Soal Posttest
    renderQuestionsReview('posttestReviewContainer', postQuestions, session.posttestAnswers, 'posttest');
  }

  // ==================== SWITCH VIEW LOGIC ====================
  function switchView(target) {
    currentView = target;
    const viewDashboard = document.getElementById('viewDashboard');
    const viewQuiz = document.getElementById('viewQuizRunner');
    const viewTransition = document.getElementById('viewTransition');
    const viewCheckout = document.getElementById('viewCheckout');
    const viewResult = document.getElementById('viewResult');

    if (viewDashboard) viewDashboard.classList.add('hidden');
    if (viewQuiz) viewQuiz.classList.add('hidden');
    if (viewTransition) viewTransition.classList.add('hidden');
    if (viewCheckout) viewCheckout.classList.add('hidden');
    if (viewResult) viewResult.classList.add('hidden');
    stopQuestionTimer();

    if (target === 'dashboard') {
      if (viewDashboard) viewDashboard.classList.remove('hidden');
      renderDashboard();
    } else if (target === 'quiz') {
      if (viewQuiz) viewQuiz.classList.remove('hidden');
      renderQuizRunner();
    } else if (target === 'transition') {
      if (viewTransition) viewTransition.classList.remove('hidden');
      renderTransition();
    } else if (target === 'checkout') {
      if (viewCheckout) viewCheckout.classList.remove('hidden');
      renderCheckout();
    } else if (target === 'result') {
      if (viewResult) viewResult.classList.remove('hidden');
      renderResultView();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== BUKA ASESMEN PRETEST & POSTTEST ====================
  function openQuiz(phaseKey) {
    const isPre = phaseKey === 'pretest';
    session.step = isPre ? 2 : 4;
    quizCurrentSubStage = 'identity';

    // Pastikan session memiliki identitas peserta default jika belum diisi
    if (!session.absen || !session.nama) {
      const defaultStudent = lookupStudentByAbsen(roster, 1) || {
        absen: 1,
        nama: 'Aditya Pratama Putra',
        kelas: 'Informatika - X E7',
        nis: '24001'
      };
      session.absen = defaultStudent.absen;
      session.nama = defaultStudent.nama;
      session.kelas = defaultStudent.kelas;
      session.nis = defaultStudent.nis;
      saveSession();
      renderDashboard();
    }

    if (isPre) {
      session.pretestQuestions = randomizeQuestions(questionBank.pretest);
      session.pretestIndex = 0;
      session.pretestAnswers = {};
      remainingSeconds = PRETEST_QUESTION_TIME;
      timerQuestionIndex = -1;
    } else {
      session.posttestQuestions = randomizeQuestions(questionBank.posttest);
      session.posttestIndex = 0;
      session.posttestAnswers = {};
    }
    saveSession();
    stopQuestionTimer();
    switchView('quiz');
  }

  // Alias untuk kompatibilitas
  function openQuizWelcome(phaseKey) {
    openQuiz(phaseKey);
  }

  function trackMaterialOpened(matKey) {
    session.openedMaterials = session.openedMaterials || {};
    const isNew = !session.openedMaterials[matKey];
    session.openedMaterials[matKey] = new Date().toISOString();
    session.activityCount = (session.activityCount || 0) + 1;
    saveSession();
    renderDashboard();
    if (isNew) {
      showToast('Materi dibuka! Progres Open Rate & Complete diperbarui.', 'success');
    }
  }

  // ==================== BINDING EVENTS ====================
  function initEvents() {
    // Tracking Membuka Materi (Open Rate & Aktivitas Belajar)
    document.querySelectorAll('[data-track-material]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const matKey = this.getAttribute('data-track-material');
        if (matKey) {
          trackMaterialOpened(matKey);
        }
      });
    });

    // Absen Lookup
    const inputAbsen = document.getElementById('inputAbsen');
    function handleAbsenLookup() {
      if (!inputAbsen) return;
      const val = inputAbsen.value.trim();
      session.absen = val;
      const found = lookupStudentByAbsen(roster, val);
      if (found) {
        session.nama = found.nama;
        session.kelas = found.kelas || 'Informatika - X E7';
        session.nis = found.nis || '';
        document.getElementById('inputNama').value = found.nama;
        document.getElementById('inputKelas').value = found.kelas || 'Informatika - X E7';
        showToast('Absen #' + found.absen + ' ditemukan: ' + found.nama, 'success');
      } else {
        session.nama = '';
        document.getElementById('inputNama').value = '';
      }
      saveSession();
      renderDashboard();
    }

    if (inputAbsen) inputAbsen.addEventListener('input', handleAbsenLookup);

    // Buka Modal Pilih Absen / Identitas jika klik avatar
    const openIdentityModalBtn = document.getElementById('openIdentityModalBtn');
    const identityModal = document.getElementById('identityModal');
    if (openIdentityModalBtn && identityModal) {
      openIdentityModalBtn.addEventListener('click', function () {
        identityModal.classList.remove('hidden');
      });
    }
    const closeIdentityModalBtn = document.getElementById('closeIdentityModalBtn');
    if (closeIdentityModalBtn && identityModal) {
      closeIdentityModalBtn.addEventListener('click', function () {
        identityModal.classList.add('hidden');
      });
    }

    // Tombol di Hero Banner
    const heroStartBtn = document.getElementById('heroStartBtn');
    if (heroStartBtn) {
      heroStartBtn.addEventListener('click', function () {
        const targetSection = document.getElementById('sectionIsiTopik');
        if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Tombol 4 Isi Topik (Buka Pretest & Buka Posttest)
    const cardStartPretestBtn = document.getElementById('cardStartPretestBtn');
    if (cardStartPretestBtn) {
      cardStartPretestBtn.addEventListener('click', function () {
        openQuiz('pretest');
      });
    }

    const cardStartPosttestBtn = document.getElementById('cardStartPosttestBtn');
    if (cardStartPosttestBtn) {
      cardStartPosttestBtn.addEventListener('click', function () {
        openQuiz('posttest');
      });
    }

    // Tombol di Tahap 1 Identitas
    const btnStartQuizConfirm = document.getElementById('btnStartQuizConfirm');
    if (btnStartQuizConfirm) {
      btnStartQuizConfirm.addEventListener('click', showIdentityConfirmationModal);
    }

    const btnCancelIdentityConfirm = document.getElementById('btnCancelIdentityConfirm');
    if (btnCancelIdentityConfirm) {
      btnCancelIdentityConfirm.addEventListener('click', function () {
        const modal = document.getElementById('quizConfirmIdentityModal');
        if (modal) modal.classList.add('hidden');
      });
    }

    const btnConfirmIdentityAndStart = document.getElementById('btnConfirmIdentityAndStart');
    if (btnConfirmIdentityAndStart) {
      btnConfirmIdentityAndStart.addEventListener('click', confirmIdentityAndStartQuiz);
    }

    const quizIdentityBackBtn = document.getElementById('quizIdentityBackBtn');
    if (quizIdentityBackBtn) {
      quizIdentityBackBtn.addEventListener('click', function () {
        quizCurrentSubStage = 'identity';
        stopQuestionTimer();
        switchView('dashboard');
      });
    }

    const quizIdentityCancelBtn = document.getElementById('quizIdentityCancelBtn');
    if (quizIdentityCancelBtn) {
      quizIdentityCancelBtn.addEventListener('click', function () {
        quizCurrentSubStage = 'identity';
        stopQuestionTimer();
        switchView('dashboard');
      });
    }

    // Tombol Kembali ke Menu Topik dari Kuis Soal (Tahap 2)
    const quizBackToDashboardBtn = document.getElementById('quizBackToDashboardBtn');
    if (quizBackToDashboardBtn) {
      quizBackToDashboardBtn.addEventListener('click', function () {
        const isPretest = session.step === 2;
        if (isPretest && timerInterval) {
          if (!confirm('Pretest sedang berjalan dengan hitungan mundur 30 detik per soal. Yakin ingin membatalkan dan kembali ke Beranda?')) {
            return;
          }
        }
        quizCurrentSubStage = 'identity';
        stopQuestionTimer();
        switchView('dashboard');
      });
    }

    const transitionBackToDashboardBtn = document.getElementById('transitionBackToDashboardBtn');
    if (transitionBackToDashboardBtn) {
      transitionBackToDashboardBtn.addEventListener('click', function () {
        switchView('dashboard');
      });
    }

    const resultBackToDashboardBtn = document.getElementById('resultBackToDashboardBtn');
    if (resultBackToDashboardBtn) {
      resultBackToDashboardBtn.addEventListener('click', function () {
        switchView('dashboard');
      });
    }

    // Kuis Navigasi Prev / Next
    const quizPrevBtn = document.getElementById('quizPrevBtn');
    if (quizPrevBtn) quizPrevBtn.addEventListener('click', retreatCurrentQuestion);

    const quizNextBtn = document.getElementById('quizNextBtn');
    if (quizNextBtn) {
      quizNextBtn.addEventListener('click', function () {
        advanceCurrentQuestion();
      });
    }

    // Submit Pretest (Tombol Khusus Pretest jika ada)
    const quizPretestSubmitBtn = document.getElementById('quizPretestSubmitBtn');
    if (quizPretestSubmitBtn) {
      quizPretestSubmitBtn.addEventListener('click', function () {
        advanceCurrentQuestion();
      });
    }

    // Submit Quiz (Pretest maupun Posttest)
    const quizSubmitBtn = document.getElementById('quizSubmitBtn');
    if (quizSubmitBtn) {
      quizSubmitBtn.addEventListener('click', function () {
        const isPretest = session.step === 2;
        const questions = isPretest ? (questionBank.pretest || []) : (questionBank.posttest || []);
        const answersMap = isPretest ? (session.pretestAnswers || {}) : (session.posttestAnswers || {});
        const answeredCount = Object.keys(answersMap).length;

        // Validasi kelengkapan identitas siswa
        if (!session.absen || !session.nama) {
          showToast('Silakan lengkapi Nomor Absen dan Nama Lengkap pada Identitas Siswa.', 'warning');
          const absenInput = document.getElementById('quizInputAbsen');
          if (absenInput) absenInput.focus();
          return;
        }

        if (isPretest) {
          advanceCurrentQuestion();
          return;
        }

        if (answeredCount < questions.length) {
          if (!confirm('Masih ada ' + (questions.length - answeredCount) + ' butir soal belum dijawab. Yakin ingin mengirim sekarang?')) {
            return;
          }
        }

        stopQuestionTimer();
        session.step = 5;
        saveSession();
        switchView('checkout');
        showToast('Posttest berhasil dikirim! Silakan isi Check-Out Pemahaman.', 'success');
      });
    }

    // Transisi ke Posttest
    const transitionStartPosttestBtn = document.getElementById('transitionStartPosttestBtn');
    if (transitionStartPosttestBtn) {
      transitionStartPosttestBtn.addEventListener('click', function () {
        openQuizWelcome('posttest');
      });
    }

    // Finalize Checkout
    const finalizeAssessmentBtn = document.getElementById('finalizeAssessmentBtn');
    if (finalizeAssessmentBtn) {
      finalizeAssessmentBtn.addEventListener('click', function () {
        const evalPre = evaluateAnswers(session.pretestQuestions || questionBank.pretest, 'pretest', session.pretestAnswers);
        const evalPost = evaluateAnswers(session.posttestQuestions || questionBank.posttest, 'posttest', session.posttestAnswers);
        const now = new Date();
        const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WIB';

        const newRecord = {
          absen: Number(session.absen),
          nama: session.nama,
          kelas: session.kelas,
          timestamp: timeStr,
          accStatus: 'PENDING',
          accTimestamp: null,
          checkin: Object.assign({}, session.checkin),
          checkout: Object.assign({}, session.checkout),
          pretestScore: evalPre.score,
          pretestCorrectCount: evalPre.correctCount,
          posttestScore: evalPost.score,
          posttestCorrectCount: evalPost.correctCount,
          pretestBloomCorrect: evalPre.bloomCorrect,
          pretestBloomTotal: evalPre.bloomTotal,
          posttestBloomCorrect: evalPost.bloomCorrect
        };

        const existingIdx = teacherRecords.findIndex(function (r) {
          return Number(r.absen) === Number(session.absen);
        });
        if (existingIdx !== -1) {
          newRecord.accStatus = teacherRecords[existingIdx].accStatus || 'PENDING';
          newRecord.accTimestamp = teacherRecords[existingIdx].accTimestamp || null;
          teacherRecords[existingIdx] = newRecord;
        } else {
          teacherRecords.unshift(newRecord);
        }

        session.completed = true;
        saveSession();
        saveRecords();
        switchView('result');
        showToast('Asesmen & Check-Out berhasil disimpan! Status terkirim ke Page Admin Guru.', 'success');
      });
    }

    // Toggle Pembahasan Kunci Jawaban Pretest & Posttest
    const togglePretestReviewBtn = document.getElementById('togglePretestReviewBtn');
    const pretestReviewContainer = document.getElementById('pretestReviewContainer');
    const togglePretestReviewText = document.getElementById('togglePretestReviewText');
    const togglePretestReviewIcon = document.getElementById('togglePretestReviewIcon');
    if (togglePretestReviewBtn && pretestReviewContainer) {
      togglePretestReviewBtn.addEventListener('click', function () {
        const isHidden = pretestReviewContainer.classList.contains('hidden');
        if (isHidden) {
          pretestReviewContainer.classList.remove('hidden');
          if (togglePretestReviewText) togglePretestReviewText.textContent = 'Sembunyikan Pembahasan Soal';
          if (togglePretestReviewIcon) togglePretestReviewIcon.textContent = '▲';
        } else {
          pretestReviewContainer.classList.add('hidden');
          if (togglePretestReviewText) togglePretestReviewText.textContent = 'Buka Pembahasan Soal';
          if (togglePretestReviewIcon) togglePretestReviewIcon.textContent = '▼';
        }
      });
    }

    const togglePosttestReviewBtn = document.getElementById('togglePosttestReviewBtn');
    const posttestReviewContainer = document.getElementById('posttestReviewContainer');
    const togglePosttestReviewText = document.getElementById('togglePosttestReviewText');
    const togglePosttestReviewIcon = document.getElementById('togglePosttestReviewIcon');
    if (togglePosttestReviewBtn && posttestReviewContainer) {
      togglePosttestReviewBtn.addEventListener('click', function () {
        const isHidden = posttestReviewContainer.classList.contains('hidden');
        if (isHidden) {
          posttestReviewContainer.classList.remove('hidden');
          if (togglePosttestReviewText) togglePosttestReviewText.textContent = 'Sembunyikan Pembahasan Soal';
          if (togglePosttestReviewIcon) togglePosttestReviewIcon.textContent = '▲';
        } else {
          posttestReviewContainer.classList.add('hidden');
          if (togglePosttestReviewText) togglePosttestReviewText.textContent = 'Buka Pembahasan Soal';
          if (togglePosttestReviewIcon) togglePosttestReviewIcon.textContent = '▼';
        }
      });
    }

    // Reset Modal
    const resetModal = document.getElementById('resetModal');
    function openResetModal() {
      if (resetModal) resetModal.classList.remove('hidden');
    }
    function closeResetModal() {
      if (resetModal) resetModal.classList.add('hidden');
    }

    const openResetModalBtn = document.getElementById('openResetModalBtn');
    if (openResetModalBtn) openResetModalBtn.addEventListener('click', openResetModal);

    const cancelResetModalBtn = document.getElementById('cancelResetModalBtn');
    if (cancelResetModalBtn) cancelResetModalBtn.addEventListener('click', closeResetModal);

    const confirmResetModalBtn = document.getElementById('confirmResetModalBtn');
    if (confirmResetModalBtn) {
      confirmResetModalBtn.addEventListener('click', function () {
        stopQuestionTimer();
        session = createDefaultSession();
        saveSession();
        closeResetModal();
        switchView('dashboard');
        showToast('Sesi belajar berhasil di-reset.', 'info');
      });
    }
  }

  // Helper Accordion Topik Google Classroom
  window.toggleTopicAccordion = function (contentId, chevronId) {
    const content = document.getElementById(contentId);
    const chevron = document.getElementById(chevronId);
    if (!content) return;
    if (content.classList.contains('hidden')) {
      content.classList.remove('hidden');
      if (chevron) chevron.classList.remove('rotate-180');
    } else {
      content.classList.add('hidden');
      if (chevron) chevron.classList.add('rotate-180');
    }
  };

  // Helper Drawer Item Google Classroom
  window.toggleItemDrawer = function (drawerId) {
    const drawer = document.getElementById(drawerId);
    if (!drawer) return;
    drawer.classList.toggle('hidden');
  };

  // Hash Navigation Handler (#pretest & #posttest)
  function handleUrlHash() {
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#pretest') {
      const btn = document.getElementById('cardStartPretestBtn');
      if (btn) btn.click();
    } else if (hash === '#posttest') {
      const btn = document.getElementById('cardStartPosttestBtn');
      if (btn) btn.click();
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    initEvents();
    renderDashboard();
    handleUrlHash();
  });
  window.addEventListener('hashchange', handleUrlHash);
})();
