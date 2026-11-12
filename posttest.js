/**
 * posttest.js - Logika Khusus Halaman Posttest (Asesmen Formatif Akhir)
 * Fitur:
 * - Identitas Siswa
 * - 10 Butir Soal HOTS (Bloom C4-C6)
 * - Navigasi Bebas (Prev, Next, Grid 1-10)
 * - Check-Out Refleksi Pemahaman (Pemahaman, Emosi, Needs, Catatan)
 * - Perhitungan N-Gain vs Pretest & KKM (Remidi vs Pengayaan)
 * - Laporan Hasil Akhir & Pembahasan Tuntas
 * - Auto-Sync ke Google Apps Script (GAS) & localStorage
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

  if (session.posttestQuestions) {
    session.posttestQuestions = enrichQuestionsWithCode(session.posttestQuestions, 'posttest');
  }

  let currentStage = 'identity'; // 'identity' | 'question' | 'checkout' | 'result'

  function saveSession() {
    safeSetStorage(STORAGE_KEY_SESSION, session);
  }

  function saveRecords() {
    safeSetStorage(STORAGE_KEY_RECORDS, teacherRecords);
  }

  function syncToGas() {
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

    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('hidden');
  }

  function startQuizAfterConfirm() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.add('hidden');

    session.step = 4; // Posttest aktif
    if (!session.posttestQuestions || session.posttestQuestions.length === 0) {
      session.posttestQuestions = randomizeQuestions(questionBank.posttest);
    }
    session.posttestIndex = 0;
    session.posttestAnswers = session.posttestAnswers || {};
    saveSession();

    switchStage('question');
  }

  // ==================== TAHAP 2: PENGERJAAN SOAL HOTS ====================
  function renderQuestionStage() {
    const questions = session.posttestQuestions || questionBank.posttest || [];
    const currentIndex = session.posttestIndex || 0;
    const answersMap = session.posttestAnswers || (session.posttestAnswers = {});
    const q = questions[currentIndex] || questions[0];

    // Header Nomor Soal & Bloom
    const pill = document.getElementById('questionActivePill');
    if (pill) {
      pill.innerHTML =
        '<span class="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">' + (currentIndex + 1) + '</span>' +
        '<span class="uppercase tracking-wider text-xs font-bold text-teal-950">' + (q.topic || 'ANALISIS PSEUDOCODE') + '</span>';
    }

    const bloomTag = document.getElementById('questionActiveBloom');
    if (bloomTag) bloomTag.textContent = 'Level HOTS: ' + (q.bloomLevel || 'C4');

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
            ? 'border-2 border-teal-600 bg-teal-50/80 text-teal-950 font-bold shadow-xs ring-2 ring-teal-500/20'
            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50');

        btn.innerHTML =
          '<span class="w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ' +
          (isSelected ? 'border-teal-600 bg-teal-600 text-white shadow-xs' : 'border-slate-300 bg-slate-50 text-slate-700') + '">' +
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

    // Navigasi Prev / Next
    const prevBtn = document.getElementById('btnPrevQuestion');
    if (prevBtn) {
      prevBtn.disabled = currentIndex === 0;
      prevBtn.className = 'px-4 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ' +
        (currentIndex === 0 ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer');
    }

    const nextBtn = document.getElementById('btnNextQuestion');
    if (nextBtn) {
      const isLast = (currentIndex + 1) >= questions.length;
      nextBtn.innerHTML = isLast
        ? '<span>Selesaikan Tinjauan</span><span>&rarr;</span>'
        : ('<span>Soal Berikutnya</span><span>&rarr;</span>');
    }

    // Grid Navigasi (1-10)
    const grid = document.getElementById('questionNavGrid');
    if (grid) {
      grid.innerHTML = '';
      let answeredCount = 0;
      questions.forEach(function (_, idx) {
        const answered = answersMap[idx] !== undefined;
        if (answered) answeredCount += 1;
        const isCurrent = idx === currentIndex;

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'w-full aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all ' +
          (isCurrent
            ? 'border-2 border-teal-600 bg-teal-50 text-teal-700 font-black ring-2 ring-teal-500/20 shadow-xs'
            : (answered ? 'bg-teal-600 text-white font-bold shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold'));
        cell.textContent = idx + 1;
        cell.onclick = function () {
          session.posttestIndex = idx;
          saveSession();
          renderQuestionStage();
        };
        grid.appendChild(cell);
      });

      const terjawabBadge = document.getElementById('navTerjawabBadge');
      if (terjawabBadge) terjawabBadge.textContent = answeredCount + ' / ' + questions.length + ' Terjawab';
    }
  }

  function advanceQuestion() {
    const questions = session.posttestQuestions || questionBank.posttest || [];
    let currentIndex = session.posttestIndex || 0;

    if (currentIndex + 1 < questions.length) {
      session.posttestIndex = currentIndex + 1;
      saveSession();
      renderQuestionStage();
      showToast('Soal #' + (currentIndex + 2), 'info');
    } else {
      showToast('Anda berada di nomor soal terakhir. Silakan tinjau dan klik Kirim Jawaban.', 'info');
    }
  }

  function retreatQuestion() {
    let currentIndex = session.posttestIndex || 0;
    if (currentIndex > 0) {
      session.posttestIndex = currentIndex - 1;
      saveSession();
      renderQuestionStage();
    }
  }

  function proceedToCheckout() {
    const questions = session.posttestQuestions || questionBank.posttest || [];
    const answersMap = session.posttestAnswers || {};
    const answeredCount = Object.keys(answersMap).length;

    if (answeredCount < questions.length) {
      if (!confirm('Anda baru menjawab ' + answeredCount + ' dari ' + questions.length + ' soal. Yakin ingin melanjutkan ke tahap check-out?')) {
        return;
      }
    }
    switchStage('checkout');
  }

  // ==================== TAHAP 3: CHECK-OUT REFLEKSI ====================
  function renderCheckoutStage() {
    session.checkout = session.checkout || {
      understanding: CHECKOUT_UNDERSTANDINGS[0].id,
      emotion: CHECKOUT_EMOTIONS[0].id,
      needs: [],
      note: ''
    };

    // 1. Pemahaman
    const undGroup = document.getElementById('checkoutUnderstandingGroup');
    if (undGroup) {
      undGroup.innerHTML = '';
      CHECKOUT_UNDERSTANDINGS.forEach(function (u) {
        const active = session.checkout.understanding === u.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'p-3.5 rounded-xl border text-left transition-all space-y-1 ' +
          (active ? 'border-2 border-teal-600 bg-teal-50/80 text-teal-950 font-bold shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700');
        btn.innerHTML = '<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">' + u.level + '</span>' +
          '<div class="text-xs font-bold leading-snug pt-1">' + u.id + '</div>' +
          '<div class="text-[11px] text-slate-500">' + u.desc + '</div>';
        btn.onclick = function () {
          session.checkout.understanding = u.id;
          saveSession();
          renderCheckoutStage();
        };
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
          (active ? 'border-2 border-teal-600 bg-teal-50/80 text-teal-950 font-bold shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700');
        btn.innerHTML = '<span class="text-xl">' + em.emoji + '</span><span class="text-xs font-bold">' + em.id + '</span>';
        btn.onclick = function () {
          session.checkout.emotion = em.id;
          saveSession();
          renderCheckoutStage();
        };
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
          (selected ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50');
        btn.textContent = (selected ? '✓ ' : '+ ') + nd;
        btn.onclick = function () {
          session.checkout.needs = session.checkout.needs || [];
          const idx = session.checkout.needs.indexOf(nd);
          if (idx === -1) session.checkout.needs.push(nd);
          else session.checkout.needs.splice(idx, 1);
          saveSession();
          renderCheckoutStage();
        };
        needGroup.appendChild(btn);
      });
    }

    // 4. Catatan
    const noteArea = document.getElementById('checkoutNote');
    if (noteArea) {
      noteArea.value = session.checkout.note || '';
      noteArea.oninput = function () {
        session.checkout.note = this.value;
        saveSession();
      };
    }
  }

  function finalizePosttest() {
    const questions = session.posttestQuestions || questionBank.posttest || [];
    const evalPost = evaluateAnswers(questions, 'posttest', session.posttestAnswers);

    session.step = 5;
    session.completed = true;
    session.posttestScore = evalPost.score;
    session.posttestCorrectCount = evalPost.correctCount;
    session.posttestBloomCorrect = evalPost.bloomCorrect;
    session.posttestBloomTotal = evalPost.bloomTotal;
    saveSession();

    // Hitung N-Gain jika ada skor pretest
    let nGainVal = null;
    if (session.pretestScore !== undefined && session.pretestScore !== null) {
      const pre = Number(session.pretestScore);
      const post = Number(evalPost.score);
      if (100 - pre !== 0) {
        nGainVal = Math.round(((post - pre) / (100 - pre)) * 100) / 100;
      }
    }

    // Simpan ke teacher records
    const existingIdx = teacherRecords.findIndex(function (r) {
      return Number(r.absen) === Number(session.absen);
    });
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WIB';

    if (existingIdx !== -1) {
      teacherRecords[existingIdx].posttestScore = evalPost.score;
      teacherRecords[existingIdx].posttestCorrectCount = evalPost.correctCount;
      teacherRecords[existingIdx].posttestBloomCorrect = evalPost.bloomCorrect;
      teacherRecords[existingIdx].posttestBloomTotal = evalPost.bloomTotal;
      teacherRecords[existingIdx].checkout = Object.assign({}, session.checkout);
      teacherRecords[existingIdx].nGain = nGainVal;
    } else {
      teacherRecords.unshift({
        absen: Number(session.absen || 1),
        nama: session.nama || 'Murid Posttest',
        kelas: session.kelas || 'Informatika - X E7',
        timestamp: timeStr,
        accStatus: 'PENDING',
        accTimestamp: null,
        checkin: Object.assign({}, session.checkin),
        posttestScore: evalPost.score,
        posttestCorrectCount: evalPost.correctCount,
        posttestBloomCorrect: evalPost.bloomCorrect,
        posttestBloomTotal: evalPost.bloomTotal,
        checkout: Object.assign({}, session.checkout),
        nGain: nGainVal
      });
    }
    saveRecords();
    syncToGas();

    switchStage('result');
    showToast('Posttest selesai! Skor: ' + evalPost.score + ' (' + evalPost.correctCount + '/10 benar).', 'success');
  }

  // ==================== TAHAP 4: LAPORAN HASIL & PEMBAHASAN ====================
  function renderResultStage() {
    const questions = session.posttestQuestions || questionBank.posttest || [];
    const evalPost = evaluateAnswers(questions, 'posttest', session.posttestAnswers);
    const preScore = session.pretestScore !== undefined ? Number(session.pretestScore) : null;
    const postScore = Number(evalPost.score);

    // Hitung N-Gain
    let nGainText = '-';
    if (preScore !== null) {
      if (100 - preScore !== 0) {
        const g = Math.round(((postScore - preScore) / (100 - preScore)) * 100) / 100;
        nGainText = g + ' (' + (g >= 0.7 ? 'Tinggi' : (g >= 0.3 ? 'Sedang' : 'Rendah')) + ')';
      } else {
        nGainText = '1.0 (Maksimal)';
      }
    }

    // Status KKM
    const isTuntas = postScore >= 75;

    // Status ACC
    const rec = teacherRecords.find(function (r) {
      return Number(r.absen) === Number(session.absen);
    });
    const isAcc = rec && rec.accStatus === 'ACC';

    // 4 Metric Cards
    const metricsGrid = document.getElementById('resultMetricsGrid');
    if (metricsGrid) {
      metricsGrid.innerHTML =
        '<div class="p-5 rounded-2xl border-2 border-teal-200 bg-teal-50/80 shadow-xs text-center space-y-1">' +
          '<div class="text-[11px] font-bold uppercase tracking-wider text-teal-800">Skor Posttest Akhir</div>' +
          '<div class="text-3xl sm:text-4xl font-black text-teal-700 tracking-tight">' + postScore + ' <span class="text-xs font-bold text-slate-400">/ 100</span></div>' +
          '<div class="text-xs text-slate-500 font-medium pt-1">Benar ' + evalPost.correctCount + ' dari ' + questions.length + ' Soal</div>' +
        '</div>' +

        '<div class="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/80 shadow-xs text-center space-y-1">' +
          '<div class="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Kenaikan &amp; N-Gain</div>' +
          '<div class="text-2xl sm:text-3xl font-black text-indigo-700 tracking-tight">' + (preScore !== null ? (postScore - preScore >= 0 ? '+' : '') + (postScore - preScore) + ' Poin' : '-') + '</div>' +
          '<div class="text-xs text-slate-500 font-medium pt-1">N-Gain: ' + nGainText + '</div>' +
        '</div>' +

        '<div class="p-5 rounded-2xl border-2 ' + (isTuntas ? 'border-emerald-200 bg-emerald-50/80' : 'border-rose-200 bg-rose-50/80') + ' shadow-xs text-center space-y-1">' +
          '<div class="text-[11px] font-bold uppercase tracking-wider ' + (isTuntas ? 'text-emerald-800' : 'text-rose-800') + '">Ketuntasan (KKM 75)</div>' +
          '<div class="text-xl sm:text-2xl font-black ' + (isTuntas ? 'text-emerald-700' : 'text-rose-700') + ' mt-1">' +
            (isTuntas ? '✓ TUNTAS / PENGAYAAN' : 'REMIDI BELAJAR') +
          '</div>' +
          '<div class="text-xs text-slate-500 font-medium pt-1">' + (isTuntas ? 'Memenuhi Standar KKM' : 'Perlu Ulasan Tambahan') + '</div>' +
        '</div>' +

        '<div class="p-5 rounded-2xl border-2 ' + (isAcc ? 'border-emerald-200 bg-emerald-50/80' : 'border-amber-200 bg-amber-50/80') + ' shadow-xs text-center space-y-1">' +
          '<div class="text-[11px] font-bold uppercase tracking-wider ' + (isAcc ? 'text-emerald-800' : 'text-amber-800') + '">Verifikasi Guru</div>' +
          '<div class="text-xl sm:text-2xl font-black ' + (isAcc ? 'text-emerald-700' : 'text-amber-700') + ' mt-1">' +
            (isAcc ? '✓ SUDAH DI-ACC' : '⏳ MENUNGGU ACC') +
          '</div>' +
          '<div class="text-xs text-slate-500 font-medium pt-1">' + (isAcc ? 'Diverifikasi oleh Guru' : 'Sedang Diverifikasi Guru') + '</div>' +
        '</div>';
    }

    // Bloom Breakdown Grid
    const bloomContainer = document.getElementById('resultBloomBreakdown');
    if (bloomContainer) {
      bloomContainer.innerHTML =
        '<div class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">' +
          '<span>Sebaran Capaian Taksonomi Bloom (C1 - C6)</span>' +
          '<span class="text-teal-700 font-black">Posttest Evaluasi</span>' +
        '</div>' +
        '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">' +
          ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map(function (lvl) {
            const c = evalPost.bloomCorrect[lvl] || 0;
            const t = evalPost.bloomTotal[lvl] || 0;
            const pct = t > 0 ? Math.round((c / t) * 100) : 0;
            return '<div class="p-3 rounded-xl bg-white border border-slate-200 text-center space-y-1">' +
              '<div class="text-[10px] font-black text-slate-500">' + lvl + '</div>' +
              '<div class="text-base font-black ' + (pct >= 70 ? 'text-emerald-600' : (pct >= 40 ? 'text-amber-600' : 'text-rose-600')) + '">' + c + ' / ' + t + '</div>' +
              '<div class="text-[10px] text-slate-400 font-semibold">' + pct + '% Tuntas</div>' +
            '</div>';
          }).join('') +
        '</div>';
    }

    // Pembahasan Posttest Lengkap
    const reviewContainer = document.getElementById('resultReviewContainer');
    if (reviewContainer) {
      reviewContainer.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const answersMap = session.posttestAnswers || {};

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
              '<span class="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-black shadow-xs">' + (idx + 1) + '</span>' +
              '<span class="text-xs font-black text-slate-800 uppercase tracking-wider">' + (q.topic || 'ANALISIS LOGIKA') + '</span>' +
              '<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">' + (q.bloomLevel || 'C4') + '</span>' +
            '</div>' +
            statusBadge +
          '</div>' +
          '<div class="text-sm sm:text-base text-slate-900 leading-relaxed">' + formatQuestionStemHtml(q) + '</div>' +
          '<div class="space-y-2">' + optionsHtml + '</div>' +
          '<div class="p-4 rounded-2xl bg-gradient-to-r from-teal-50/90 to-emerald-50/90 border border-teal-200 text-xs sm:text-sm space-y-1.5 shadow-2xs">' +
            '<div class="flex items-center gap-2 font-black text-teal-950">' +
              '<span class="text-base text-teal-600">💡</span>' +
              '<span>Pembahasan Jawaban yang Benar:</span>' +
            '</div>' +
            '<p class="leading-relaxed text-slate-700 pl-6 font-medium">' + formatOptionText(q.explanation || 'Pembahasan belum tersedia.') + '</p>' +
          '</div>';

        reviewContainer.appendChild(card);
      });
    }
  }

  function resetPosttest() {
    if (!confirm('Apakah Anda yakin ingin mengulang asesmen posttest dari awal? Data jawaban posttest sebelumnya akan direset.')) {
      return;
    }
    session.step = 4;
    session.completed = false;
    session.posttestQuestions = randomizeQuestions(questionBank.posttest);
    session.posttestIndex = 0;
    session.posttestAnswers = {};
    delete session.posttestScore;
    delete session.posttestCorrectCount;
    delete session.posttestBloomCorrect;
    delete session.posttestBloomTotal;
    saveSession();
    switchStage('identity');
    showToast('Sesi posttest berhasil direset. Silakan mulai kembali.', 'info');
  }

  // ==================== SWITCH STAGE ====================
  function switchStage(stage) {
    currentStage = stage;
    const stageIdentity = document.getElementById('stageIdentity');
    const stageQuestion = document.getElementById('stageQuestion');
    const stageCheckout = document.getElementById('stageCheckout');
    const stageResult = document.getElementById('stageResult');

    if (stageIdentity) stageIdentity.classList.add('hidden');
    if (stageQuestion) stageQuestion.classList.add('hidden');
    if (stageCheckout) stageCheckout.classList.add('hidden');
    if (stageResult) stageResult.classList.add('hidden');

    if (stage === 'identity') {
      if (stageIdentity) stageIdentity.classList.remove('hidden');
      renderIdentityStage();
    } else if (stage === 'question') {
      if (stageQuestion) stageQuestion.classList.remove('hidden');
      renderQuestionStage();
    } else if (stage === 'checkout') {
      if (stageCheckout) stageCheckout.classList.remove('hidden');
      renderCheckoutStage();
    } else if (stage === 'result') {
      if (stageResult) stageResult.classList.remove('hidden');
      renderResultStage();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== INISIALISASI ====================
  window.addEventListener('DOMContentLoaded', function () {
    // Tombol Mulai Identitas
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

    // Tombol Navigasi Soal Prev / Next
    const btnPrev = document.getElementById('btnPrevQuestion');
    if (btnPrev) btnPrev.onclick = retreatQuestion;
    const btnNext = document.getElementById('btnNextQuestion');
    if (btnNext) btnNext.onclick = advanceQuestion;

    // Tombol Submit Soal ke Checkout
    const btnSubmitQuestion = document.getElementById('btnSubmitQuestion');
    if (btnSubmitQuestion) btnSubmitQuestion.onclick = proceedToCheckout;

    // Tombol Finalize Checkout ke Result
    const btnFinalize = document.getElementById('btnFinalizeAssessment');
    if (btnFinalize) btnFinalize.onclick = finalizePosttest;

    // Tombol Ulang Posttest
    const btnReset = document.getElementById('btnResetPosttest');
    if (btnReset) btnReset.onclick = resetPosttest;

    // Toggle Review Discussion
    const btnToggleReview = document.getElementById('btnToggleReview');
    if (btnToggleReview) {
      btnToggleReview.onclick = function () {
        const c = document.getElementById('resultReviewContainer');
        if (!c) return;
        c.classList.toggle('hidden');
        const icon = document.getElementById('toggleReviewIcon');
        if (icon) icon.textContent = c.classList.contains('hidden') ? '▼' : '▲';
      };
    }

    // Cek apakah siswa sudah pernah selesai posttest
    if (session.completed || (session.posttestScore !== undefined && session.posttestScore !== null)) {
      switchStage('result');
    } else {
      switchStage('identity');
    }
  });

})();
