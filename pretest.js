/**
 * pretest.js - Logika Khusus Halaman Pretest (Asesmen Diagnostik)
 * Fitur:
 * - Identitas & Cek-in Kondisi Belajar
 * - Modal Konfirmasi
 * - 10 Butir Soal Diagnostik Acak (Bloom C1-C6)
 * - Timer Countdown 30 Detik per Soal (Auto-Submit saat Habis)
 * - Auto-Sync ke Google Apps Script (GAS) & localStorage
 * - Tampilan Hasil & Pembahasan Jawaban Lengkap
 */

(function () {
  let roster = safeGetStorage(STORAGE_KEY_ROSTER, DEFAULT_ROSTER);
  if (!Array.isArray(roster) || roster.length < DEFAULT_ROSTER.length) {
    roster = DEFAULT_ROSTER;
    safeSetStorage(STORAGE_KEY_ROSTER, roster);
  }
  let questionBank = safeGetStorage(STORAGE_KEY_QUESTIONS, DEFAULT_QUESTION_BANK);
  let teacherRecords = safeGetStorage(STORAGE_KEY_RECORDS, INITIAL_SAMPLE_RECORDS);
  let session = safeGetStorage(STORAGE_KEY_SESSION, createDefaultSession());
  if (!session.kelas || session.kelas === 'X - Informatika') {
    session.kelas = 'Informatika - X E7';
  }

  // Sinkronisasi snippet kode soal
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

  const PRETEST_QUESTION_TIME = 30; // 30 detik per soal
  let remainingSeconds = PRETEST_QUESTION_TIME;
  let timerInterval = null;
  let timerQuestionIndex = -1;
  let currentStage = 'identity'; // 'identity' | 'question' | 'review'

  function saveSession() {
    safeSetStorage(STORAGE_KEY_SESSION, session);
  }

  function saveRecords() {
    safeSetStorage(STORAGE_KEY_RECORDS, teacherRecords);
  }

  function syncToGas(recordData) {
    const gasUrl = localStorage.getItem('eduassess_gas_url_v2') || (typeof DEFAULT_GAS_URL !== 'undefined' ? DEFAULT_GAS_URL : '');
    if (gasUrl) {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'syncAllRecords',
          records: teacherRecords
        })
      }).catch(function () {});
    }
  }

  // ==================== TIMER 30 DETIK ====================
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerUI(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const timeStr = '00:' + String(s).padStart(2, '0');

    const topDisplay = document.getElementById('timerDisplayTop');
    if (topDisplay) {
      topDisplay.textContent = timeStr;
      topDisplay.className = s <= 10
        ? 'font-mono text-2xl font-black text-rose-600 tabular-nums animate-pulse'
        : 'font-mono text-2xl font-black text-rose-600 tabular-nums';
    }

    const sideDisplay = document.getElementById('timerDisplaySide');
    if (sideDisplay) {
      sideDisplay.textContent = timeStr;
      sideDisplay.className = s <= 10
        ? 'font-mono text-2xl font-black text-rose-600 tabular-nums animate-pulse'
        : 'font-mono text-2xl font-black text-rose-600 tabular-nums';
    }

    const timerBar = document.getElementById('timerProgressBar');
    if (timerBar) {
      const pct = Math.max(0, Math.min(100, (s / PRETEST_QUESTION_TIME) * 100));
      timerBar.style.width = pct + '%';
      timerBar.className = s <= 10
        ? 'bg-rose-600 h-2 transition-all duration-1000 ease-linear rounded-full'
        : 'bg-rose-500 h-2 transition-all duration-1000 ease-linear rounded-full';
    }
  }

  function startTimer(questionIdx) {
    stopTimer();
    if (currentStage !== 'question') return;

    timerQuestionIndex = questionIdx !== undefined ? questionIdx : (session.pretestIndex || 0);
    remainingSeconds = PRETEST_QUESTION_TIME;
    updateTimerUI(remainingSeconds);

    timerInterval = setInterval(function () {
      if (currentStage !== 'question') {
        stopTimer();
        return;
      }
      remainingSeconds -= 1;
      updateTimerUI(remainingSeconds);

      if (remainingSeconds <= 0) {
        stopTimer();
        handleTimeout(timerQuestionIndex);
      }
    }, 1000);
  }

  function handleTimeout(idx) {
    stopTimer();
    const questions = session.pretestQuestions || questionBank.pretest || [];
    const curIdx = idx !== undefined ? idx : (session.pretestIndex || 0);
    const hasAnswer = session.pretestAnswers && session.pretestAnswers[curIdx] !== undefined;

    if (curIdx + 1 < questions.length) {
      if (hasAnswer) {
        showToast('Waktu 30 detik habis! Jawaban Soal #' + (curIdx + 1) + ' terkirim. Lanjut ke Soal #' + (curIdx + 2) + '.', 'info');
      } else {
        showToast('Waktu 30 detik habis! Soal #' + (curIdx + 1) + ' terkirim kosong (0 Poin). Lanjut ke Soal #' + (curIdx + 2) + '.', 'warning');
      }
      session.pretestIndex = curIdx + 1;
      saveSession();
      renderQuestionStage();
    } else {
      if (hasAnswer) {
        showToast('Waktu 30 detik habis! Jawaban Soal #' + (curIdx + 1) + ' terkirim. Pretest selesai!', 'success');
      } else {
        showToast('Waktu 30 detik habis! Soal #' + (curIdx + 1) + ' terkirim kosong. Pretest selesai!', 'warning');
      }
      finishPretest(true);
    }
  }

  // ==================== TAHAP 1: IDENTITAS ====================
  function renderIdentityStage() {
    const inputAbsen = document.getElementById('inputAbsen');
    const inputNama = document.getElementById('inputNama');
    const inputKelas = document.getElementById('inputKelas');

    if (inputAbsen) {
      inputAbsen.value = session.absen || '';
      inputAbsen.oninput = function () {
        const val = this.value.trim();
        session.absen = val;
        const found = lookupStudentByAbsen(roster, val);
        if (found) {
          session.nama = found.nama;
          session.kelas = found.kelas || 'Informatika - X E7';
          session.nis = found.nis || '';
          if (inputNama) inputNama.value = found.nama;
          if (inputKelas) inputKelas.value = found.kelas || 'Informatika - X E7';
          saveSession();
          showToast('Absen #' + found.absen + ' ditemukan: ' + found.nama, 'success');
        } else {
          saveSession();
        }
      };
    }

    if (inputNama) {
      inputNama.value = session.nama || '';
      inputNama.oninput = function () {
        session.nama = this.value.trim();
        saveSession();
      };
    }

    if (inputKelas) {
      inputKelas.value = session.kelas || 'Informatika - X E7';
    }

    // Mood Selector
    const MOOD_OPTIONS = [
      { id: 'Semangat & Antusias', emoji: '😊' },
      { id: 'Tenang & Fokus', emoji: '😄' },
      { id: 'Penasaran', emoji: '🤔' },
      { id: 'Sedikit Mengantuk', emoji: '😴' },
      { id: 'Gugup / Cemas', emoji: '😰' }
    ];

    const currentMood = (session.checkin && session.checkin.mood) || 'Semangat & Antusias';
    const moodActiveLabel = document.getElementById('moodActiveLabel');
    if (moodActiveLabel) {
      const curObj = MOOD_OPTIONS.find(function (m) { return m.id === currentMood; }) || MOOD_OPTIONS[0];
      moodActiveLabel.textContent = curObj.emoji + ' ' + curObj.id;
    }

    const moodContainer = document.getElementById('moodContainer');
    if (moodContainer) {
      moodContainer.innerHTML = '';
      MOOD_OPTIONS.forEach(function (m) {
        const isSelected = currentMood === m.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ' +
          (isSelected
            ? 'border-2 border-rose-600 bg-rose-50 text-rose-900 font-bold shadow-xs ring-2 ring-rose-500/20'
            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300');
        btn.innerHTML = '<span class="text-base">' + m.emoji + '</span><span class="truncate">' + m.id + '</span>';
        btn.onclick = function () {
          session.checkin = session.checkin || {};
          session.checkin.mood = m.id;
          session.checkin.timestamp = new Date().toLocaleTimeString('id-ID');
          saveSession();
          renderIdentityStage();
          showToast('Kondisi cek-in dipilih: ' + m.emoji + ' ' + m.id, 'info');
        };
        moodContainer.appendChild(btn);
      });
    }
  }

  function showConfirmModal() {
    const inputAbsen = document.getElementById('inputAbsen');
    const inputNama = document.getElementById('inputNama');
    const valAbsen = inputAbsen ? inputAbsen.value.trim() : session.absen;
    const valNama = inputNama ? inputNama.value.trim() : session.nama;

    if (valAbsen && !valNama) {
      const found = lookupStudentByAbsen(roster, valAbsen);
      if (found) {
        session.absen = found.absen;
        session.nama = found.nama;
        session.kelas = found.kelas || 'Informatika - X E7';
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

    const modalAbsen = document.getElementById('modalAbsen');
    if (modalAbsen) modalAbsen.textContent = 'Absen #' + session.absen;

    const modalNama = document.getElementById('modalNama');
    if (modalNama) modalNama.textContent = session.nama;

    const modalKelas = document.getElementById('modalKelas');
    if (modalKelas) modalKelas.textContent = session.kelas || 'Informatika - X E7';

    const modalMood = document.getElementById('modalMood');
    if (modalMood) {
      modalMood.textContent = (session.checkin && session.checkin.mood) || 'Semangat & Antusias';
    }

    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('hidden');
  }

  function startQuizAfterConfirm() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.add('hidden');

    session.step = 2; // Pretest aktif
    if (!session.pretestQuestions || session.pretestQuestions.length === 0) {
      session.pretestQuestions = randomizeQuestions(questionBank.pretest);
    }
    session.pretestIndex = 0;
    session.pretestAnswers = {};
    saveSession();

    switchStage('question');
  }

  // ==================== TAHAP 2: PENGERJAAN SOAL ====================
  function renderQuestionStage() {
    const questions = session.pretestQuestions || questionBank.pretest || [];
    const currentIndex = session.pretestIndex || 0;
    const answersMap = session.pretestAnswers || (session.pretestAnswers = {});
    const q = questions[currentIndex] || questions[0];

    // Header Nomor Soal & Bloom
    const pill = document.getElementById('questionActivePill');
    if (pill) {
      pill.innerHTML =
        '<span class="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">' + (currentIndex + 1) + '</span>' +
        '<span class="uppercase tracking-wider text-xs font-bold text-rose-950">' + (q.topic || 'NOTASI PSEUDOCODE') + '</span>';
    }

    const bloomTag = document.getElementById('questionActiveBloom');
    if (bloomTag) bloomTag.textContent = 'Taksonomi Bloom: ' + (q.bloomLevel || 'C1');

    const isAnswered = answersMap[currentIndex] !== undefined;
    const statusTag = document.getElementById('questionActiveStatus');
    if (statusTag) {
      statusTag.textContent = isAnswered ? 'Sudah dijawab' : 'Belum dijawab';
      statusTag.className = isAnswered
        ? 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500';
    }

    // Stem Pertanyaan
    const stemEl = document.getElementById('questionStem');
    if (stemEl) {
      stemEl.innerHTML = formatQuestionStemHtml(q);
    }

    // Opsi Jawaban
    const optsContainer = document.getElementById('optionsContainer');
    if (optsContainer) {
      optsContainer.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D', 'E'];
      (q.options || []).forEach(function (optText, optIdx) {
        const isSelected = Number(answersMap[currentIndex]) === optIdx;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ' +
          (isSelected
            ? 'border-2 border-rose-600 bg-rose-50/80 text-rose-950 font-bold shadow-xs ring-2 ring-rose-500/20'
            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50');

        btn.innerHTML =
          '<span class="w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ' +
          (isSelected ? 'border-rose-600 bg-rose-600 text-white shadow-xs' : 'border-slate-300 bg-slate-50 text-slate-700') + '">' +
          letters[optIdx] +
          '</span>' +
          '<span class="text-sm sm:text-base leading-snug font-medium">' + formatOptionText(optText) + '</span>';

        btn.onclick = function () {
          answersMap[currentIndex] = optIdx;
          saveSession();
          renderQuestionStage();
          showToast('Jawaban Soal #' + (currentIndex + 1) + ' disimpan: ' + letters[optIdx], 'info');
        };

        optsContainer.appendChild(btn);
      });
    }

    // Navigasi Grid (1-10)
    const grid = document.getElementById('questionNavGrid');
    if (grid) {
      grid.innerHTML = '';
      let answeredCount = 0;
      questions.forEach(function (_, idx) {
        const answered = answersMap[idx] !== undefined;
        if (answered) answeredCount += 1;
        const isCurrent = idx === currentIndex;
        const isLocked = idx < currentIndex;

        const cell = document.createElement('div');
        cell.className = 'w-full aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all ' +
          (isCurrent
            ? 'border-2 border-rose-600 bg-rose-50 text-rose-700 font-black ring-2 ring-rose-500/20 shadow-xs'
            : isLocked
              ? (answered ? 'bg-emerald-600 text-white font-bold opacity-80' : 'bg-slate-200 text-slate-500 font-bold')
              : (answered ? 'bg-rose-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-700 font-semibold'));
        cell.textContent = idx + 1;
        grid.appendChild(cell);
      });

      const terjawabBadge = document.getElementById('navTerjawabBadge');
      if (terjawabBadge) terjawabBadge.textContent = answeredCount + ' / ' + questions.length + ' Terjawab';
    }

    // Tombol Next / Submit
    const nextBtn = document.getElementById('btnNextQuestion');
    if (nextBtn) {
      const isLast = (currentIndex + 1) >= questions.length;
      nextBtn.innerHTML = isLast
        ? '<span>Kirim Jawaban Pretest</span><span>✈</span>'
        : ('<span>Lanjut Soal #' + (currentIndex + 2) + '</span><span>&rarr;</span>');
    }

    // Sisa Waktu Title
    const timerTopTitle = document.getElementById('timerTopTitle');
    if (timerTopTitle) timerTopTitle.textContent = 'Sisa Waktu Soal #' + (currentIndex + 1) + ':';
    const timerSideTitle = document.getElementById('timerSideTitle');
    if (timerSideTitle) timerSideTitle.textContent = 'Sisa Waktu Soal #' + (currentIndex + 1) + ':';

    // Start timer jika nomor berubah
    if (timerQuestionIndex !== currentIndex || !timerInterval) {
      startTimer(currentIndex);
    }
  }

  function advanceQuestion() {
    stopTimer();
    const questions = session.pretestQuestions || questionBank.pretest || [];
    const currentIndex = session.pretestIndex || 0;

    if (currentIndex + 1 < questions.length) {
      session.pretestIndex = currentIndex + 1;
      saveSession();
      renderQuestionStage();
      showToast('Lanjut ke Soal #' + (currentIndex + 2), 'info');
    } else {
      finishPretest(false);
    }
  }

  function finishPretest(isAutoTimeout) {
    stopTimer();
    const questions = session.pretestQuestions || questionBank.pretest || [];
    const evalPre = evaluateAnswers(questions, 'pretest', session.pretestAnswers);

    session.step = 3;
    session.pretestScore = evalPre.score;
    session.pretestCorrectCount = evalPre.correctCount;
    session.pretestBloomCorrect = evalPre.bloomCorrect;
    session.pretestBloomTotal = evalPre.bloomTotal;
    saveSession();

    // Simpan ke teacher records
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
        absen: Number(session.absen || 1),
        nama: session.nama || 'Murid Pretest',
        kelas: session.kelas || 'Informatika - X E7',
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
    syncToGas();

    switchStage('review');
    if (isAutoTimeout) {
      showToast('Pretest selesai! Skor: ' + evalPre.score + ' (' + evalPre.correctCount + '/10 benar).', 'info');
    } else {
      showToast('Pretest berhasil dikirim! Skor: ' + evalPre.score + ' (' + evalPre.correctCount + '/10 benar).', 'success');
    }
  }

  // ==================== TAHAP 3: REVIEW HASIL & PEMBAHASAN ====================
  function renderReviewStage() {
    stopTimer();
    const questions = session.pretestQuestions || questionBank.pretest || [];
    const evalPre = evaluateAnswers(questions, 'pretest', session.pretestAnswers);

    // Summary Score Grid
    const scoreVal = document.getElementById('reviewScoreValue');
    if (scoreVal) scoreVal.textContent = evalPre.score;

    const correctVal = document.getElementById('reviewCorrectValue');
    if (correctVal) correctVal.textContent = evalPre.correctCount + ' / ' + questions.length;

    const bloomGrid = document.getElementById('reviewBloomGrid');
    if (bloomGrid) {
      bloomGrid.innerHTML = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map(function (lvl) {
        const c = evalPre.bloomCorrect[lvl] || 0;
        const t = evalPre.bloomTotal[lvl] || 0;
        return '<div class="flex items-center justify-between px-2.5 py-1 rounded-xl bg-white/80 border border-purple-100 font-bold text-slate-700 text-xs">' +
          '<span class="text-purple-700 font-black">' + lvl + ':</span>' +
          '<span>' + c + '/' + t + '</span>' +
        '</div>';
      }).join('');
    }

    // Detail Butir Pembahasan
    const container = document.getElementById('reviewQuestionsContainer');
    if (container) {
      container.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const answersMap = session.pretestAnswers || {};

      questions.forEach(function (q, idx) {
        const chosen = answersMap[idx];
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
        card.className = 'p-5 sm:p-6 rounded-2xl border transition-all space-y-3.5 bg-white shadow-xs ' +
          (isCorrect ? 'border-emerald-200 bg-emerald-50/20' : (isAnswered ? 'border-rose-200 bg-rose-50/20' : 'border-amber-200 bg-amber-50/20'));

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
              '<span class="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-xs">' + (idx + 1) + '</span>' +
              '<span class="text-xs font-black text-slate-800 uppercase tracking-wider">' + (q.topic || 'NOTASI PSEUDOCODE') + '</span>' +
              '<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">' + (q.bloomLevel || 'C1') + '</span>' +
            '</div>' +
            statusBadge +
          '</div>' +
          '<div class="text-sm sm:text-base text-slate-900 leading-relaxed">' + formatQuestionStemHtml(q) + '</div>' +
          '<div class="space-y-2">' + optionsHtml + '</div>' +
          '<div class="p-4 rounded-2xl bg-gradient-to-r from-rose-50/90 to-amber-50/90 border border-rose-200 text-xs sm:text-sm space-y-1.5 shadow-2xs">' +
            '<div class="flex items-center gap-2 font-black text-rose-950">' +
              '<span class="text-base text-rose-600">💡</span>' +
              '<span>Pembahasan Jawaban yang Benar:</span>' +
            '</div>' +
            '<p class="leading-relaxed text-slate-700 pl-6 font-medium">' + formatOptionText(q.explanation || 'Pembahasan belum tersedia.') + '</p>' +
          '</div>';

        container.appendChild(card);
      });
    }
  }

  function resetPretest() {
    if (!confirm('Apakah Anda yakin ingin mengulang asesmen pretest dari awal? Data jawaban sebelumnya akan direset.')) {
      return;
    }
    stopTimer();
    session.step = 2;
    session.pretestQuestions = randomizeQuestions(questionBank.pretest);
    session.pretestIndex = 0;
    session.pretestAnswers = {};
    delete session.pretestScore;
    delete session.pretestCorrectCount;
    delete session.pretestBloomCorrect;
    delete session.pretestBloomTotal;
    saveSession();
    switchStage('identity');
    showToast('Sesi pretest berhasil direset. Silakan mulai kembali.', 'info');
  }

  // ==================== SWITCH STAGE ====================
  function switchStage(stage) {
    currentStage = stage;
    const stageIdentity = document.getElementById('stageIdentity');
    const stageQuestion = document.getElementById('stageQuestion');
    const stageReview = document.getElementById('stageReview');

    if (stageIdentity) stageIdentity.classList.add('hidden');
    if (stageQuestion) stageQuestion.classList.add('hidden');
    if (stageReview) stageReview.classList.add('hidden');

    if (stage === 'identity') {
      if (stageIdentity) stageIdentity.classList.remove('hidden');
      renderIdentityStage();
    } else if (stage === 'question') {
      if (stageQuestion) stageQuestion.classList.remove('hidden');
      renderQuestionStage();
    } else if (stage === 'review') {
      if (stageReview) stageReview.classList.remove('hidden');
      renderReviewStage();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== INISIALISASI ====================
  window.addEventListener('DOMContentLoaded', function () {
    // Tombol Mulai di Identitas
    const btnStartConfirm = document.getElementById('btnStartConfirm');
    if (btnStartConfirm) btnStartConfirm.onclick = showConfirmModal;

    // Tombol Modal Konfirmasi
    const btnModalCancel = document.getElementById('btnModalCancel');
    if (btnModalCancel) {
      btnModalCancel.onclick = function () {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.add('hidden');
      };
    }
    const btnModalStart = document.getElementById('btnModalStart');
    if (btnModalStart) btnModalStart.onclick = startQuizAfterConfirm;

    // Tombol Next di Soal
    const btnNext = document.getElementById('btnNextQuestion');
    if (btnNext) btnNext.onclick = advanceQuestion;

    // Tombol Submit Manual
    const btnSubmit = document.getElementById('btnSubmitQuestion');
    if (btnSubmit) {
      btnSubmit.onclick = function () {
        if (confirm('Kirim seluruh jawaban pretest sekarang?')) {
          finishPretest(false);
        }
      };
    }

    // Tombol Ulang Pretest
    const btnReset = document.getElementById('btnResetPretest');
    if (btnReset) btnReset.onclick = resetPretest;

    // Toggle Review Discussion
    const btnToggleReview = document.getElementById('btnToggleReview');
    if (btnToggleReview) {
      btnToggleReview.onclick = function () {
        const c = document.getElementById('reviewQuestionsContainer');
        if (!c) return;
        c.classList.toggle('hidden');
        const icon = document.getElementById('toggleReviewIcon');
        if (icon) icon.textContent = c.classList.contains('hidden') ? '▼' : '▲';
      };
    }

    // Cek apakah siswa sudah pernah selesai pretest
    if (session.step > 2 || (session.pretestScore !== undefined && session.pretestScore !== null)) {
      switchStage('review');
    } else {
      switchStage('identity');
    }
  });

})();
