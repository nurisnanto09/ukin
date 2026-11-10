/**
 * admin.js - Logika Interaktif Page Admin & Dasbor Guru LMS
 * Menangani Analitik Pretest & Posttest, TaRL, Taksonomi Bloom (C1-C6), Chart.js, Filter Check-In/Out,
 * Unggah JSON Soal, Sinkronisasi GAS, dan Fitur ACC Langsung Guru.
 */

(function () {
  let roster = safeGetStorage(STORAGE_KEY_ROSTER, DEFAULT_ROSTER);
  roster.forEach(function (r) {
    if (!r.kelas || r.kelas === 'X - Informatika') {
      r.kelas = 'Informatika - X E7';
    }
  });
  let questionBank = safeGetStorage(STORAGE_KEY_QUESTIONS, DEFAULT_QUESTION_BANK);
  let teacherRecords = safeGetStorage(STORAGE_KEY_RECORDS, INITIAL_SAMPLE_RECORDS);
  teacherRecords.forEach(function (r) {
    if (!r.kelas || r.kelas === 'X - Informatika') {
      r.kelas = 'Informatika - X E7';
    }
  });
  let activeTeacherTab = 'pretestTab';
  let bloomChartInstance = null;

  function saveRecords() {
    safeSetStorage(STORAGE_KEY_RECORDS, teacherRecords);
  }

  function saveQuestions() {
    safeSetStorage(STORAGE_KEY_QUESTIONS, questionBank);
  }

  function saveRoster() {
    safeSetStorage(STORAGE_KEY_ROSTER, roster);
  }

  // ==================== FITUR ACC LANGSUNG (APPROVAL GURU) ====================
  function toggleAccStatus(absenNum) {
    const num = Number(absenNum);
    const rec = teacherRecords.find(function (r) {
      return Number(r.absen) === num;
    });
    if (!rec) return;

    if (rec.accStatus === 'ACC') {
      rec.accStatus = 'PENDING';
      rec.accTimestamp = null;
      showToast('Status ACC Murid #' + rec.absen + ' (' + rec.nama + ') dibatalkan.', 'warning');
    } else {
      rec.accStatus = 'ACC';
      const now = new Date();
      rec.accTimestamp = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WIB';
      showToast('Berhasil ACC Murid #' + rec.absen + ' (' + rec.nama + ')!', 'success');
    }

    saveRecords();
    renderAllAdminViews();
  }

  function batchAccAll() {
    if (!teacherRecords.length) {
      showToast('Tidak ada data murid untuk di-ACC.', 'warning');
      return;
    }
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WIB';
    let count = 0;
    teacherRecords.forEach(function (r) {
      if (r.accStatus !== 'ACC') {
        r.accStatus = 'ACC';
        r.accTimestamp = timeStr;
        count += 1;
      }
    });
    saveRecords();
    renderAllAdminViews();
    showToast(count + ' murid berhasil di-ACC sekaligus!', 'success');
  }

  // Export Data ke Format CSV
  function exportRecordsToCsv() {
    if (!teacherRecords.length) {
      showToast('Tidak ada data untuk diekspor.', 'warning');
      return;
    }
    const headers = ['Absen', 'Nama', 'Kelas', 'Waktu Submit', 'Status ACC', 'Waktu ACC', 'Skor Pretest', 'Kelompok Pretest', 'Skor Posttest', 'Status Posttest', 'Mood CheckIn', 'Pemahaman CheckOut'];
    const rows = teacherRecords.map(function (r) {
      const kkm = Number(document.getElementById('kkmThresholdSelect')?.value || 75);
      return [
        r.absen,
        '"' + (r.nama || '') + '"',
        '"' + (r.kelas || '') + '"',
        r.timestamp || '-',
        r.accStatus || 'PENDING',
        r.accTimestamp || '-',
        r.pretestScore,
        classifyPretestGroup(r.pretestScore),
        r.posttestScore,
        r.posttestScore >= kkm ? 'Pengayaan' : 'Remidi',
        '"' + (r.checkin?.mood || '-') + '"',
        '"' + (r.checkout?.understanding || '-') + '"'
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Laporan_Asesmen_OS_LMS_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Laporan CSV berhasil diunduh!', 'success');
  }

  // ==================== TOP KPI CARDS ====================
  function renderTeacherKpis() {
    const kkm = Number(document.getElementById('kkmThresholdSelect')?.value || 75);
    const total = teacherRecords.length;
    const avgPre = total ? Math.round(teacherRecords.reduce(function (acc, r) { return acc + r.pretestScore; }, 0) / total) : 0;
    const avgPost = total ? Math.round(teacherRecords.reduce(function (acc, r) { return acc + r.posttestScore; }, 0) / total) : 0;
    const remidiCount = teacherRecords.filter(function (r) { return r.posttestScore < kkm; }).length;
    const accCount = teacherRecords.filter(function (r) { return r.accStatus === 'ACC'; }).length;

    const kpiWrap = document.getElementById('teacherKpiCards');
    if (!kpiWrap) return;

    kpiWrap.innerHTML =
      '<div class="lms-card p-4">' +
        '<div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Murid Selesai</div>' +
        '<div class="text-2xl font-extrabold text-slate-900 mt-1">' + total + ' <span class="text-xs font-normal text-slate-500">murid</span></div>' +
      '</div>' +
      '<div class="lms-card p-4">' +
        '<div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rata-Rata Pretest</div>' +
        '<div class="text-2xl font-extrabold text-blue-600 mt-1">' + avgPre + ' <span class="text-xs font-normal text-slate-400">/ 100</span></div>' +
      '</div>' +
      '<div class="lms-card p-4">' +
        '<div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rata-Rata Posttest</div>' +
        '<div class="text-2xl font-extrabold text-emerald-600 mt-1">' + avgPost + ' <span class="text-xs font-normal text-slate-400">/ 100</span></div>' +
      '</div>' +
      '<div class="lms-card p-4 border-rose-200">' +
        '<div class="text-[11px] font-bold uppercase tracking-wider text-rose-600">Posttest: Remidi</div>' +
        '<div class="text-2xl font-extrabold text-rose-600 mt-1">' + remidiCount + ' <span class="text-xs font-normal text-slate-400">(&lt;' + kkm + ')</span></div>' +
      '</div>' +
      '<div class="lms-card p-4 border-emerald-200 col-span-2 lg:col-span-1">' +
        '<div class="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Status ACC Guru</div>' +
        '<div class="text-2xl font-extrabold text-emerald-700 mt-1">' + accCount + '/' + total + ' <span class="text-xs font-normal text-slate-400">ter-ACC</span></div>' +
      '</div>';
  }

  // ==================== TAB 1: PRETEST, TARL & ACC ====================
  function renderTeacherPretestTab() {
    const groups = [
      {
        key: 'Mahir',
        title: 'Kelompok Mahir (Pretest ≥ 80)',
        desc: 'Menguasai C1–C4 dengan baik, siap diberikan pengayaan proyek pseudocode kompleks (C5–C6).',
        border: 'border-emerald-200',
        bgHeader: 'bg-emerald-50 text-emerald-950',
        badge: 'bg-emerald-600 text-white'
      },
      {
        key: 'Menengah',
        title: 'Kelompok Menengah (Pretest 60–79)',
        desc: 'Menguasai konsep dasar C1–C3, perlu latihan terapan pada analisis percabangan bertingkat (C4).',
        border: 'border-amber-200',
        bgHeader: 'bg-amber-50 text-amber-950',
        badge: 'bg-amber-500 text-white'
      },
      {
        key: 'Butuh Pendampingan',
        title: 'Butuh Pendampingan (Pretest < 60)',
        desc: 'Perlu bimbingan terstruktur mulai dari pengertian notasi pseudocode dan kata kunci input/output (C1–C2).',
        border: 'border-rose-200',
        bgHeader: 'bg-rose-50 text-rose-950',
        badge: 'bg-rose-600 text-white'
      }
    ];

    const groupCardsWrap = document.getElementById('pretestGroupCards');
    if (groupCardsWrap) {
      groupCardsWrap.innerHTML = '';
      groups.forEach(function (g) {
        const members = teacherRecords.filter(function (r) {
          return classifyPretestGroup(r.pretestScore) === g.key;
        });
        const card = document.createElement('div');
        card.className = 'lms-card ' + g.border + ' overflow-hidden flex flex-col';
        const listHtml = members.length
          ? members.map(function (m) {
              const c46 = (m.pretestBloomCorrect.C4 || 0) + (m.pretestBloomCorrect.C5 || 0) + (m.pretestBloomCorrect.C6 || 0);
              const isAcc = m.accStatus === 'ACC';
              return '<div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">' +
                '<div>' +
                  '<div class="flex items-center gap-1.5">' +
                    '<span class="font-bold text-slate-900">#' + m.absen + ' ' + m.nama + '</span>' +
                    (isAcc ? '<span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">✓ ACC</span>' : '') +
                  '</div>' +
                  '<div class="text-[11px] text-slate-500">LOTS: ' +
                    ((m.pretestBloomCorrect.C1 || 0) + (m.pretestBloomCorrect.C2 || 0) + (m.pretestBloomCorrect.C3 || 0)) + '/6 • HOTS: ' + c46 + '/4</div>' +
                '</div>' +
                '<span class="px-2 py-0.5 rounded-lg font-extrabold bg-white border border-slate-200 text-slate-900">' + m.pretestScore + '</span>' +
              '</div>';
            }).join('')
          : '<p class="text-xs text-slate-400 italic py-4 text-center">Belum ada murid di kelompok ini.</p>';

        card.innerHTML =
          '<div class="p-3.5 ' + g.bgHeader + ' border-b ' + g.border + ' flex items-center justify-between gap-2">' +
            '<div>' +
              '<h4 class="text-xs font-bold">' + g.title + '</h4>' +
              '<p class="text-[11px] opacity-80 mt-0.5">' + g.desc + '</p>' +
            '</div>' +
            '<span class="w-7 h-7 rounded-lg ' + g.badge + ' font-bold text-xs flex items-center justify-center shrink-0">' + members.length + '</span>' +
          '</div>' +
          '<div class="p-3.5 space-y-2 flex-1 max-h-56 overflow-y-auto">' + listHtml + '</div>';
        groupCardsWrap.appendChild(card);
      });
    }

    // 2. Filter Tabel Hasil Pretest
    const groupFilter = document.getElementById('filterPretestGroupSelect')?.value || 'ALL';
    const bloomFilter = document.getElementById('filterBloomFocusSelect')?.value || 'ALL';
    const accFilter = document.getElementById('filterAccSelect')?.value || 'ALL';

    const filtered = teacherRecords.filter(function (r) {
      if (groupFilter !== 'ALL' && classifyPretestGroup(r.pretestScore) !== groupFilter) return false;
      if (accFilter === 'ACC' && r.accStatus !== 'ACC') return false;
      if (accFilter === 'PENDING' && r.accStatus === 'ACC') return false;

      const bc = r.pretestBloomCorrect || {};
      const bt = r.pretestBloomTotal || { C1: 2, C2: 2, C3: 2, C4: 2, C5: 1, C6: 1 };
      if (bloomFilter === 'LOTS') {
        return (bc.C1 || 0) === (bt.C1 || 2) && (bc.C2 || 0) === (bt.C2 || 2);
      }
      if (bloomFilter === 'MOTS') {
        return (bc.C3 || 0) === (bt.C3 || 2);
      }
      if (bloomFilter === 'HOTS') {
        const hotsCorrect = (bc.C4 || 0) + (bc.C5 || 0) + (bc.C6 || 0);
        const hotsTotal = (bt.C4 || 2) + (bt.C5 || 1) + (bt.C6 || 1);
        return hotsTotal > 0 && (hotsCorrect / hotsTotal) >= 0.5;
      }
      if (bloomFilter === 'WEAK_HOTS') {
        const hotsCorrect = (bc.C4 || 0) + (bc.C5 || 0) + (bc.C6 || 0);
        return hotsCorrect === 0;
      }
      return true;
    });

    const tbody = document.getElementById('pretestTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="11" class="py-6 text-center text-xs text-slate-400 italic">Tidak ada data murid yang memenuhi kriteria filter.</td></tr>';
      }
      filtered.forEach(function (r) {
        const grp = classifyPretestGroup(r.pretestScore);
        const grpBadge = grp === 'Mahir'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : grp === 'Menengah'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-rose-50 text-rose-700 border-rose-200';
        const bc = r.pretestBloomCorrect || {};
        const bt = r.pretestBloomTotal || { C1: 2, C2: 2, C3: 2, C4: 2, C5: 1, C6: 1 };
        const isAcc = r.accStatus === 'ACC';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-100 text-xs';
        tr.innerHTML =
          '<td class="py-2.5 px-3 font-semibold text-slate-900">' +
            '<div>#' + r.absen + ' ' + r.nama + '</div>' +
            '<div class="text-[10px] text-slate-400">' + (r.kelas || 'Informatika - X E7') + '</div>' +
          '</td>' +
          '<td class="py-2.5 px-3 text-center font-extrabold text-blue-700 text-sm">' + r.pretestScore + '</td>' +
          ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map(function (lvl) {
            const cor = bc[lvl] || 0;
            const tot = bt[lvl] || 0;
            const full = tot > 0 && cor === tot;
            return '<td class="py-2.5 px-1.5 text-center">' +
              '<span class="px-1.5 py-0.5 rounded text-[11px] font-bold ' + (full ? 'bg-emerald-50 text-emerald-700' : cor > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600') + '">' +
                cor + '/' + tot +
              '</span>' +
            '</td>';
          }).join('') +
          '<td class="py-2.5 px-3 text-center">' +
            '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold border ' + grpBadge + '">' + grp + '</span>' +
          '</td>' +
          '<td class="py-2.5 px-3 text-center">' +
            (isAcc
              ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Ter-ACC</span>'
              : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">⏳ Belum ACC</span>') +
          '</td>' +
          '<td class="py-2.5 px-3 text-center">' +
            '<div class="flex items-center justify-center gap-1.5">' +
              '<button type="button" data-acc-btn="' + r.absen + '" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition ' +
                (isAcc
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs') + '">' +
                (isAcc ? 'Batal ACC' : 'ACC Langsung') +
              '</button>' +
              '<button type="button" onclick="openStudentInSimulator(' + r.absen + ')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition flex items-center gap-1 shadow-2xs" title="Uji Pseudocode Murid Ini di Simulator">' +
                '<span>💻</span><span>Uji Kode</span>' +
              '</button>' +
            '</div>' +
          '</td>';

        const btn = tr.querySelector('[data-acc-btn]');
        if (btn) {
          btn.addEventListener('click', function () {
            toggleAccStatus(r.absen);
          });
        }
        tbody.appendChild(tr);
      });
    }

    renderBloomChart();
  }

  function renderBloomChart() {
    const canvas = document.getElementById('bloomChartCanvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const levels = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
    const percentages = levels.map(function (lvl) {
      if (!teacherRecords.length) return 0;
      let sumCor = 0;
      let sumTot = 0;
      teacherRecords.forEach(function (r) {
        sumCor += (r.pretestBloomCorrect && r.pretestBloomCorrect[lvl]) || 0;
        sumTot += (r.pretestBloomTotal && r.pretestBloomTotal[lvl]) || 1;
      });
      return sumTot ? Math.round((sumCor / sumTot) * 100) : 0;
    });

    if (bloomChartInstance) {
      bloomChartInstance.destroy();
    }

    bloomChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['C1 Ingat', 'C2 Paham', 'C3 Terapkan', 'C4 Analisis', 'C5 Evaluasi', 'C6 Cipta'],
        datasets: [{
          label: '% Jawaban Benar Pretest',
          data: percentages,
          backgroundColor: ['#2563eb', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function (v) { return v + '%'; },
              font: { family: 'Plus Jakarta Sans', size: 10 }
            }
          },
          x: {
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 10, weight: 'bold' }
            }
          }
        }
      }
    });
  }

  // ==================== TAB: PENGACAKAN KELOMPOK (DRAW KELAS) ====================
  let isSecretLevelVisible = false;
  let activeDrawGroups = null;

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  function shuffleArray(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  function generateBalancedDrawGroups() {
    const list = roster.slice();
    const decorated = list.map(function (s) {
      const rec = teacherRecords.find(function (r) { return Number(r.absen) === Number(s.absen); });
      const score = (rec && rec.pretestScore !== undefined) ? Number(rec.pretestScore) : 75;
      const level = classifyPretestGroup(score);
      return {
        absen: s.absen,
        nama: s.nama,
        kelas: s.kelas || 'Informatika - X E7',
        nis: s.nis || '',
        pretestScore: score,
        tarlLevel: level
      };
    });

    let mahir = decorated.filter(function (s) { return s.tarlLevel === 'Mahir'; });
    let menengah = decorated.filter(function (s) { return s.tarlLevel === 'Menengah'; });
    let dasar = decorated.filter(function (s) { return s.tarlLevel === 'Butuh Pendampingan'; });

    if (mahir.length < 9 || dasar.length < 9) {
      decorated.sort(function (a, b) { return b.pretestScore - a.pretestScore; });
      mahir = decorated.slice(0, 9);
      menengah = decorated.slice(9, 27);
      dasar = decorated.slice(27, 36);
    }

    const shufMahir = shuffleArray(mahir);
    const shufMenengah = shuffleArray(menengah);
    const shufDasar = shuffleArray(dasar);

    const groups = [];
    for (let g = 1; g <= 9; g++) {
      const m1 = shufMahir[g - 1] || decorated[(g - 1) % decorated.length];
      const m2 = shufMenengah[(g - 1) * 2] || decorated[((g - 1) * 2) % decorated.length];
      const m3 = shufMenengah[(g - 1) * 2 + 1] || decorated[((g - 1) * 2 + 1) % decorated.length];
      const m4 = shufDasar[g - 1] || decorated[(g + 18) % decorated.length];

      const members = shuffleArray([
        Object.assign({}, m1, { role: '🌟 Ketua Diskusi' }),
        Object.assign({}, m2, { role: '📝 Juru Tulis' }),
        Object.assign({}, m3, { role: '🔍 Analis Logika' }),
        Object.assign({}, m4, { role: '🎤 Juru Bicara' })
      ]);

      groups.push({
        groupId: g,
        namaKelompok: 'Kelompok ' + g,
        meja: 'Meja Diskusi ' + g,
        members: members
      });
    }

    return groups;
  }

  function renderTeacherDrawGroupTab() {
    const container = document.getElementById('drawGroupCardsGrid');
    if (!container) return;

    if (!activeDrawGroups) {
      try {
        const saved = localStorage.getItem('eduassess_active_draw_groups_v1');
        if (saved) activeDrawGroups = JSON.parse(saved);
      } catch (e) {}
      if (!activeDrawGroups || !activeDrawGroups.length) {
        activeDrawGroups = generateBalancedDrawGroups();
      }
    }

    const groupThemes = [
      { border: 'border-blue-300', headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-700' },
      { border: 'border-emerald-300', headerBg: 'bg-gradient-to-r from-emerald-600 to-teal-700' },
      { border: 'border-amber-300', headerBg: 'bg-gradient-to-r from-amber-500 to-orange-600' },
      { border: 'border-purple-300', headerBg: 'bg-gradient-to-r from-purple-600 to-violet-700' },
      { border: 'border-rose-300', headerBg: 'bg-gradient-to-r from-rose-500 to-pink-700' },
      { border: 'border-cyan-300', headerBg: 'bg-gradient-to-r from-cyan-600 to-blue-700' },
      { border: 'border-indigo-300', headerBg: 'bg-gradient-to-r from-indigo-600 to-purple-700' },
      { border: 'border-teal-300', headerBg: 'bg-gradient-to-r from-teal-600 to-emerald-700' },
      { border: 'border-fuchsia-300', headerBg: 'bg-gradient-to-r from-fuchsia-600 to-rose-700' }
    ];

    container.innerHTML = activeDrawGroups.map(function (grp, idx) {
      const theme = groupThemes[idx % groupThemes.length];
      const membersHtml = grp.members.map(function (m, mIdx) {
        let levelBadge = '';
        if (isSecretLevelVisible) {
          const lvlColor = m.tarlLevel === 'Mahir' ? 'bg-emerald-100 text-emerald-800' : (m.tarlLevel === 'Menengah' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800');
          levelBadge = '<span class="text-[10px] px-1.5 py-0.5 rounded font-extrabold ' + lvlColor + ' ml-1">(' + m.tarlLevel + ' • ' + m.pretestScore + ')</span>';
        }

        return '<div class="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs transition hover:bg-white">' +
          '<div class="flex items-center gap-2 min-w-0">' +
            '<span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">' + (mIdx + 1) + '</span>' +
            '<div class="truncate">' +
              '<span class="font-bold text-slate-900">#' + m.absen + ' ' + escapeHtml(m.nama) + '</span>' +
              levelBadge +
            '</div>' +
          '</div>' +
          '<span class="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">' + m.role + '</span>' +
        '</div>';
      }).join('');

      return '<div class="bg-white rounded-2xl border-2 ' + theme.border + ' shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">' +
        '<div class="' + theme.headerBg + ' text-white p-3.5 px-4 flex items-center justify-between gap-2 shadow-xs">' +
          '<div>' +
            '<div class="text-[10px] font-black uppercase tracking-wider text-white/80">' + grp.meja + '</div>' +
            '<h4 class="text-base font-black text-white leading-tight">' + grp.namaKelompok + '</h4>' +
          '</div>' +
          '<div class="flex items-center gap-1.5">' +
            '<span class="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-black">' + grp.members.length + ' Siswa</span>' +
            '<button type="button" onclick="openGroupInSimulator(' + grp.groupId + ')" class="px-2.5 py-1 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-[11px] transition shadow-xs cursor-pointer flex items-center gap-1" title="Buka rancangan kelompok ini di simulator proyektor">' +
              '<span>💻</span><span>Simulator</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="p-3.5 space-y-2 flex-1">' +
          membersHtml +
        '</div>' +
      '</div>';
    }).join('');

    const toggleIcon = document.getElementById('secretToggleIcon');
    const toggleText = document.getElementById('secretToggleText');
    if (toggleIcon && toggleText) {
      if (isSecretLevelVisible) {
        toggleIcon.textContent = '🔒';
        toggleText.textContent = 'Sembunyikan Level (Mode Proyektor)';
      } else {
        toggleIcon.textContent = '👁️';
        toggleText.textContent = 'Intip Level (Rahasia Guru)';
      }
    }
  }

  // ==================== TAB 2: POSTTEST (REMIDI & PENGAYAAN) ====================
  function renderTeacherPosttestTab() {
    const kkm = Number(document.getElementById('kkmThresholdSelect')?.value || 75);
    const remedialStudents = teacherRecords.filter(function (r) { return r.posttestScore < kkm; });
    const enrichmentStudents = teacherRecords.filter(function (r) { return r.posttestScore >= kkm; });

    const remBadge = document.getElementById('remedialCountBadge');
    if (remBadge) remBadge.textContent = remedialStudents.length;

    const enrBadge = document.getElementById('enrichmentCountBadge');
    if (enrBadge) enrBadge.textContent = enrichmentStudents.length;

    const remWrap = document.getElementById('remedialListContainer');
    const enrWrap = document.getElementById('enrichmentListContainer');

    if (remWrap) {
      remWrap.innerHTML = remedialStudents.length
        ? remedialStudents.map(function (r) {
            const weakLevels = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].filter(function (lvl) {
              const c = (r.posttestBloomCorrect && r.posttestBloomCorrect[lvl]) || 0;
              const t = (r.pretestBloomTotal && r.pretestBloomTotal[lvl]) || 1;
              return c < t;
            });
            const isAcc = r.accStatus === 'ACC';
            return '<div class="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">' +
              '<div class="space-y-1">' +
                '<div class="flex items-center gap-2">' +
                  '<span class="px-2 py-0.5 rounded bg-rose-600 text-white font-bold">#' + r.absen + '</span>' +
                  '<span class="font-bold text-slate-900">' + r.nama + '</span>' +
                  (isAcc ? '<span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">✓ ACC</span>' : '') +
                '</div>' +
                '<p class="text-slate-600">Refleksi: ' + (r.checkout?.understanding || '-') + '</p>' +
                '<p class="text-rose-700 font-semibold">Fokus Remidi: ' + (weakLevels.join(', ') || 'C3–C6') + '</p>' +
              '</div>' +
              '<div class="flex items-center gap-3 self-end sm:self-auto">' +
                '<div class="text-right shrink-0">' +
                  '<div class="text-[10px] text-slate-400">Skor Posttest</div>' +
                  '<div class="text-xl font-extrabold text-rose-600 leading-none">' + r.posttestScore + '</div>' +
                '</div>' +
                '<button type="button" data-posttest-acc="' + r.absen + '" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition ' +
                  (isAcc ? 'bg-rose-100 text-rose-800' : 'bg-emerald-600 text-white') + '">' +
                  (isAcc ? 'Batal' : 'ACC') +
                '</button>' +
              '</div>' +
            '</div>';
          }).join('')
        : '<div class="p-6 text-center text-xs text-slate-400 italic">Tidak ada murid yang perlu remidi.</div>';

      remWrap.querySelectorAll('[data-posttest-acc]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          toggleAccStatus(btn.getAttribute('data-posttest-acc'));
        });
      });
    }

    if (enrWrap) {
      enrWrap.innerHTML = enrichmentStudents.length
        ? enrichmentStudents.map(function (r) {
            const gain = r.posttestScore - r.pretestScore;
            const gainText = gain >= 0 ? ('+' + gain + ' poin') : (gain + ' poin');
            const isAcc = r.accStatus === 'ACC';
            return '<div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">' +
              '<div class="space-y-1">' +
                '<div class="flex items-center gap-2">' +
                  '<span class="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">#' + r.absen + '</span>' +
                  '<span class="font-bold text-slate-900">' + r.nama + '</span>' +
                  (isAcc ? '<span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">✓ ACC</span>' : '') +
                '</div>' +
                '<p class="text-slate-600">Refleksi: ' + (r.checkout?.understanding || '-') + '</p>' +
                '<p class="text-emerald-700 font-semibold">Progres: ' + gainText + ' • Siap Pengayaan</p>' +
              '</div>' +
              '<div class="flex items-center gap-3 self-end sm:self-auto">' +
                '<div class="text-right shrink-0">' +
                  '<div class="text-[10px] text-slate-400">Skor Posttest</div>' +
                  '<div class="text-xl font-extrabold text-emerald-700 leading-none">' + r.posttestScore + '</div>' +
                '</div>' +
                '<button type="button" data-posttest-acc="' + r.absen + '" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition ' +
                  (isAcc ? 'bg-rose-100 text-rose-800' : 'bg-emerald-600 text-white') + '">' +
                  (isAcc ? 'Batal' : 'ACC') +
                '</button>' +
              '</div>' +
            '</div>';
          }).join('')
        : '<div class="p-6 text-center text-xs text-slate-400 italic">Belum ada murid di kelompok pengayaan.</div>';

      enrWrap.querySelectorAll('[data-posttest-acc]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          toggleAccStatus(btn.getAttribute('data-posttest-acc'));
        });
      });
    }
  }

  // ==================== TAB 3: FILTER CHECK-IN & CHECK-OUT ====================
  function populateCheckinFilterDropdowns() {
    const moodSel = document.getElementById('filterMoodSelect');
    const energySel = document.getElementById('filterEnergySelect');
    const styleSel = document.getElementById('filterStyleSelect');
    const checkoutSel = document.getElementById('filterCheckoutSelect');

    if (moodSel && moodSel.options.length <= 1) {
      CHECKIN_MOODS.forEach(function (m) {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.emoji + ' ' + m.id;
        moodSel.appendChild(opt);
      });
    }
    if (energySel && energySel.options.length <= 1) {
      CHECKIN_ENERGIES.forEach(function (e) {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.id;
        energySel.appendChild(opt);
      });
    }
    if (styleSel && styleSel.options.length <= 1) {
      CHECKIN_STYLES.forEach(function (s) {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.id;
        styleSel.appendChild(opt);
      });
    }
    if (checkoutSel && checkoutSel.options.length <= 1) {
      CHECKOUT_UNDERSTANDINGS.forEach(function (u) {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.level + ' — ' + u.id;
        checkoutSel.appendChild(opt);
      });
    }
  }

  function renderTeacherCheckinTab() {
    populateCheckinFilterDropdowns();

    const moodVal = document.getElementById('filterMoodSelect')?.value || 'ALL';
    const energyVal = document.getElementById('filterEnergySelect')?.value || 'ALL';
    const styleVal = document.getElementById('filterStyleSelect')?.value || 'ALL';
    const checkoutVal = document.getElementById('filterCheckoutSelect')?.value || 'ALL';
    const accFilter = document.getElementById('filterCheckinAccSelect')?.value || 'ALL';

    const countersWrap = document.getElementById('checkinSummaryCounters');
    if (countersWrap) {
      countersWrap.innerHTML = '';
      CHECKIN_MOODS.forEach(function (m) {
        const count = teacherRecords.filter(function (r) { return r.checkin?.mood === m.id; }).length;
        const isSelected = moodVal === m.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'p-2.5 rounded-xl border text-left transition flex items-center justify-between ' +
          (isSelected ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700');
        btn.innerHTML = '<span class="text-xs truncate">' + m.emoji + ' ' + m.id + '</span>' +
          '<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">' + count + '</span>';
        btn.addEventListener('click', function () {
          document.getElementById('filterMoodSelect').value = isSelected ? 'ALL' : m.id;
          renderTeacherCheckinTab();
        });
        countersWrap.appendChild(btn);
      });
    }

    const filtered = teacherRecords.filter(function (r) {
      if (moodVal !== 'ALL' && r.checkin?.mood !== moodVal) return false;
      if (energyVal !== 'ALL' && r.checkin?.energy !== energyVal) return false;
      if (styleVal !== 'ALL' && r.checkin?.style !== styleVal) return false;
      if (checkoutVal !== 'ALL' && r.checkout?.understanding !== checkoutVal) return false;
      if (accFilter === 'ACC' && r.accStatus !== 'ACC') return false;
      if (accFilter === 'PENDING' && r.accStatus === 'ACC') return false;
      return true;
    });

    const grid = document.getElementById('checkinFilteredGrid');
    if (grid) {
      grid.innerHTML = filtered.length
        ? filtered.map(function (r) {
            const factorsHtml = (r.checkin?.factors || []).map(function (f) {
              return '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">' + f + '</span>';
            }).join('');
            const needsHtml = (r.checkout?.needs || []).map(function (n) {
              return '<span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">' + n + '</span>';
            }).join('');
            const isAcc = r.accStatus === 'ACC';

            return '<div class="lms-card p-4 space-y-3 flex flex-col justify-between text-xs">' +
              '<div class="space-y-2">' +
                '<div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">' +
                  '<div>' +
                    '<span class="text-xs font-bold text-blue-600">#' + r.absen + '</span> ' +
                    '<strong class="text-slate-900">' + r.nama + '</strong>' +
                  '</div>' +
                  '<div>' +
                    '<span class="px-2 py-0.5 rounded bg-slate-100 font-bold">Pre: ' + r.pretestScore + '</span> ' +
                    '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">Post: ' + r.posttestScore + '</span>' +
                  '</div>' +
                '</div>' +
                '<div class="space-y-1">' +
                  '<div><span class="text-slate-400">Mood:</span> <strong>' + (r.checkin?.mood || '-') + '</strong></div>' +
                  '<div><span class="text-slate-400">Energi:</span> ' + (r.checkin?.energy || '-') + '</div>' +
                  '<div><span class="text-slate-400">Gaya:</span> <span class="text-blue-700 font-semibold">' + (r.checkin?.style || '-') + '</span></div>' +
                  (r.checkin?.note ? '<div class="italic text-slate-500 bg-slate-50 p-2 rounded-lg text-[11px]">"' + r.checkin.note + '"</div>' : '') +
                  '<div class="flex flex-wrap gap-1 pt-1">' + factorsHtml + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="pt-2.5 border-t border-slate-100 space-y-1.5">' +
                '<div>' +
                  '<div class="font-bold text-emerald-800">Check-Out: ' + (r.checkout?.understanding || '-') + '</div>' +
                  '<div class="text-slate-500">Perasaan: ' + (r.checkout?.emotion || '-') + '</div>' +
                  (r.checkout?.note ? '<div class="italic text-slate-500 bg-emerald-50/50 p-2 rounded-lg text-[11px] mt-1">"' + r.checkout.note + '"</div>' : '') +
                  '<div class="flex flex-wrap gap-1 pt-1">' + needsHtml + '</div>' +
                '</div>' +
                '<div class="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">' +
                  '<div>' +
                    (isAcc
                      ? '<span class="text-[11px] font-bold text-emerald-700">✓ Ter-ACC</span>'
                      : '<span class="text-[11px] font-semibold text-amber-600">⏳ Belum ACC</span>') +
                  '</div>' +
                  '<button type="button" data-checkin-acc="' + r.absen + '" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition ' +
                    (isAcc ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-600 text-white') + '">' +
                    (isAcc ? 'Batal' : 'ACC') +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('')
        : '<div class="col-span-full lms-card p-6 text-center text-xs text-slate-400 italic">Tidak ada murid yang cocok dengan kombinasi filter ini.</div>';

      grid.querySelectorAll('[data-checkin-acc]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          toggleAccStatus(btn.getAttribute('data-checkin-acc'));
        });
      });
    }
  }

  // ==================== TAB 4: UPLOAD JSON SOAL & GAS ====================
  function renderTeacherUploadJsonTab() {
    const textarea = document.getElementById('jsonPasteTextarea');
    if (textarea && !textarea.dataset.edited) {
      textarea.value = JSON.stringify(questionBank, null, 2);
    }

    const rosterCount = document.getElementById('rosterCountLabel');
    if (rosterCount) rosterCount.textContent = roster.length;

    const rosterList = document.getElementById('rosterPreviewList');
    if (rosterList) {
      rosterList.innerHTML = roster.map(function (m) {
        return '<div class="px-3 py-1.5 flex items-center justify-between text-xs border-b border-slate-100 last:border-0">' +
          '<span><strong>Absen #' + m.absen + '</strong> — ' + m.nama + '</span>' +
          '<span class="text-slate-400">' + m.kelas + '</span>' +
        '</div>';
      }).join('');
    }

    const previewWrap = document.getElementById('activeQuestionBankPreview');
    if (previewWrap) {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const renderPhaseBox = function (title, items, badgeColor) {
        return '<div class="lms-card p-4 space-y-3">' +
          '<div class="flex items-center justify-between border-b border-slate-100 pb-2">' +
            '<h4 class="text-xs font-black uppercase tracking-wider text-slate-800">' + title + ' (' + items.length + ' Soal HOTS C4–C6)</h4>' +
            '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Opsi A–E Singkat</span>' +
          '</div>' +
          '<div class="space-y-3 max-h-[32rem] overflow-y-auto pr-1.5">' +
            items.map(function (q, i) {
              const optsHtml = (q.options || []).map(function (opt, oIdx) {
                const isKey = q.correctIndex === oIdx;
                return '<div class="p-2 rounded-lg text-[11px] flex items-start gap-2 ' +
                  (isKey ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-300' : 'bg-white text-slate-700 border border-slate-200') + '">' +
                  '<span class="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black shrink-0 ' +
                    (isKey ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600') + '">' +
                    letters[oIdx] +
                  '</span>' +
                  '<span class="leading-relaxed flex-1">' + opt + (isKey ? ' <span class="text-emerald-700 font-black ml-1">✓ (Kunci)</span>' : '') + '</span>' +
                '</div>';
              }).join('');

              return '<div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">' +
                '<div class="flex items-center justify-between">' +
                  '<span class="font-extrabold text-slate-900 text-xs">#' + (i + 1) + ' • ' + (q.topic || 'Soal') + '</span>' +
                  '<span class="px-2 py-0.5 rounded-md text-[10px] font-black ' + badgeColor + '">' + q.bloomLevel + '</span>' +
                '</div>' +
                '<p class="text-slate-800 font-medium whitespace-pre-line leading-relaxed">' + q.question + '</p>' +
                '<div class="space-y-1 pt-1">' + optsHtml + '</div>' +
                (q.explanation ? '<div class="text-[10.5px] p-2 bg-blue-50/60 rounded-lg text-blue-900 border border-blue-200/80 leading-relaxed"><b>💡 Pembahasan:</b> ' + q.explanation + '</div>' : '') +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>';
      };

      previewWrap.innerHTML =
        renderPhaseBox('Bank Soal Pretest', questionBank.pretest || [], 'bg-blue-100 text-blue-800') +
        renderPhaseBox('Bank Soal Posttest', questionBank.posttest || [], 'bg-emerald-100 text-emerald-800');
    }
  }

  function renderAllAdminViews() {
    renderTeacherKpis();
    renderTeacherPretestTab();
    renderTeacherDrawGroupTab();
    renderTeacherPosttestTab();
    renderTeacherCheckinTab();
    renderTeacherUploadJsonTab();
  }

  // ==================== BINDING EVENT LISTENERS ====================
  function initAdminEvents() {
    const tabButtons = document.querySelectorAll('.teacher-tab-btn');
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTeacherTab = btn.getAttribute('data-teacher-tab');
        tabButtons.forEach(function (b) {
          if (b.getAttribute('data-teacher-tab') === activeTeacherTab) {
            b.className = 'teacher-tab-btn px-3.5 py-1.5 rounded-lg bg-white text-blue-700 shadow-xs transition';
          } else {
            b.className = 'teacher-tab-btn px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition';
          }
        });
        document.querySelectorAll('.teacher-tab-panel').forEach(function (panel) {
          if (panel.id === activeTeacherTab) panel.classList.remove('hidden');
          else panel.classList.add('hidden');
        });
        renderAllAdminViews();
      });
    });

    const batchAccBtn = document.getElementById('batchAccAllBtn');
    if (batchAccBtn) batchAccBtn.addEventListener('click', batchAccAll);

    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportRecordsToCsv);

    const filterPretestGroupSelect = document.getElementById('filterPretestGroupSelect');
    if (filterPretestGroupSelect) filterPretestGroupSelect.addEventListener('change', renderTeacherPretestTab);

    const filterBloomFocusSelect = document.getElementById('filterBloomFocusSelect');
    if (filterBloomFocusSelect) filterBloomFocusSelect.addEventListener('change', renderTeacherPretestTab);

    const filterAccSelect = document.getElementById('filterAccSelect');
    if (filterAccSelect) filterAccSelect.addEventListener('change', renderTeacherPretestTab);

    const kkmThresholdSelect = document.getElementById('kkmThresholdSelect');
    if (kkmThresholdSelect) {
      kkmThresholdSelect.addEventListener('change', function () {
        renderTeacherKpis();
        renderTeacherPosttestTab();
      });
    }

    const filterMoodSelect = document.getElementById('filterMoodSelect');
    if (filterMoodSelect) filterMoodSelect.addEventListener('change', renderTeacherCheckinTab);

    const filterEnergySelect = document.getElementById('filterEnergySelect');
    if (filterEnergySelect) filterEnergySelect.addEventListener('change', renderTeacherCheckinTab);

    const filterStyleSelect = document.getElementById('filterStyleSelect');
    if (filterStyleSelect) filterStyleSelect.addEventListener('change', renderTeacherCheckinTab);

    const filterCheckoutSelect = document.getElementById('filterCheckoutSelect');
    if (filterCheckoutSelect) filterCheckoutSelect.addEventListener('change', renderTeacherCheckinTab);

    const filterCheckinAccSelect = document.getElementById('filterCheckinAccSelect');
    if (filterCheckinAccSelect) filterCheckinAccSelect.addEventListener('change', renderTeacherCheckinTab);

    const resetCheckinFiltersBtn = document.getElementById('resetCheckinFiltersBtn');
    if (resetCheckinFiltersBtn) {
      resetCheckinFiltersBtn.addEventListener('click', function () {
        if (filterMoodSelect) filterMoodSelect.value = 'ALL';
        if (filterEnergySelect) filterEnergySelect.value = 'ALL';
        if (filterStyleSelect) filterStyleSelect.value = 'ALL';
        if (filterCheckoutSelect) filterCheckoutSelect.value = 'ALL';
        if (filterCheckinAccSelect) filterCheckinAccSelect.value = 'ALL';
        renderTeacherCheckinTab();
      });
    }

    const jsonFileInput = document.getElementById('jsonFileInput');
    if (jsonFileInput) {
      jsonFileInput.addEventListener('change', function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
          const content = evt.target.result;
          const textarea = document.getElementById('jsonPasteTextarea');
          if (textarea) {
            textarea.value = content;
            textarea.dataset.edited = 'true';
          }
          applyJsonString(content);
        };
        reader.readAsText(file);
      });
    }

    function applyJsonString(rawStr) {
      try {
        const parsed = JSON.parse(rawStr);
        if (!Array.isArray(parsed.pretest) || !Array.isArray(parsed.posttest)) {
          showToast('JSON harus berisi array "pretest" dan "posttest".', 'danger');
          return;
        }
        questionBank = parsed;
        saveQuestions();
        renderTeacherUploadJsonTab();
        showToast('Paket Soal (' + parsed.pretest.length + ' Pretest & ' + parsed.posttest.length + ' Posttest) berhasil diterapkan!', 'success');
      } catch (err) {
        showToast('Format JSON salah: ' + err.message, 'danger');
      }
    }

    const applyJsonQuestionsBtn = document.getElementById('applyJsonQuestionsBtn');
    if (applyJsonQuestionsBtn) {
      applyJsonQuestionsBtn.addEventListener('click', function () {
        const raw = document.getElementById('jsonPasteTextarea').value;
        applyJsonString(raw);
      });
    }

    const loadSampleAlternativeJsonBtn = document.getElementById('loadSampleAlternativeJsonBtn');
    if (loadSampleAlternativeJsonBtn) {
      loadSampleAlternativeJsonBtn.addEventListener('click', function () {
        questionBank = ALT_QUESTION_BANK;
        saveQuestions();
        const textarea = document.getElementById('jsonPasteTextarea');
        if (textarea) textarea.value = JSON.stringify(questionBank, null, 2);
        renderTeacherUploadJsonTab();
        showToast('Contoh paket alternatif Bloom C1–C6 berhasil dimuat!', 'success');
      });
    }

    const downloadTemplateJsonBtn = document.getElementById('downloadTemplateJsonBtn');
    if (downloadTemplateJsonBtn) {
      downloadTemplateJsonBtn.addEventListener('click', function () {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(DEFAULT_QUESTION_BANK, null, 2));
        const a = document.createElement('a');
        a.setAttribute('href', dataStr);
        a.setAttribute('download', 'template_soal_pretest_posttest_bloom_c1_c6.json');
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Template JSON Soal berhasil diunduh.', 'info');
      });
    }

    // Restore saved GAS URL
    const savedGasUrl = localStorage.getItem('eduassess_gas_url_v2') || '';
    const gasUrlInput = document.getElementById('gasUrlInput');
    if (gasUrlInput && savedGasUrl) {
      gasUrlInput.value = savedGasUrl;
      const statusBadge = document.getElementById('gasLiveStatusBadge');
      if (statusBadge) {
        statusBadge.textContent = '🟢 URL Tersimpan';
        statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0';
      }
    }

    // Tombol Simpan URL GAS
    const saveGasUrlBtn = document.getElementById('saveGasUrlBtn');
    if (saveGasUrlBtn) {
      saveGasUrlBtn.addEventListener('click', function () {
        const url = gasUrlInput ? gasUrlInput.value.trim() : '';
        if (!url) {
          showToast('Ketik atau tempel URL Web App GAS terlebih dahulu.', 'warning');
          return;
        }
        localStorage.setItem('eduassess_gas_url_v2', url);
        const statusBadge = document.getElementById('gasLiveStatusBadge');
        if (statusBadge) {
          statusBadge.textContent = '🟢 URL Tersimpan';
          statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0';
        }
        showToast('URL Google Apps Script berhasil disimpan!', 'success');
      });
    }

    // Tombol Tes Koneksi GAS
    const testGasConnectionBtn = document.getElementById('testGasConnectionBtn');
    if (testGasConnectionBtn) {
      testGasConnectionBtn.addEventListener('click', function () {
        const url = gasUrlInput ? gasUrlInput.value.trim() : '';
        if (!url) {
          showToast('Masukkan URL Web App GAS terlebih dahulu.', 'warning');
          return;
        }
        showToast('Menguji koneksi ke Google Apps Script...', 'info');
        fetch(url + (url.indexOf('?') === -1 ? '?action=ping' : '&action=ping'))
          .then(function(res) { return res.json(); })
          .then(function(resData) {
            const statusBadge = document.getElementById('gasLiveStatusBadge');
            if (statusBadge) {
              statusBadge.textContent = '🟢 Terhubung ke Google Spreadsheet';
              statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-400 shrink-0';
            }
            document.getElementById('gasStatusText').innerHTML = '✅ <b>Koneksi Sukses:</b> ' + (resData.message || 'Endpoint aktif!') + ' (' + new Date().toLocaleTimeString('id-ID') + ')';
            showToast('Koneksi Google Apps Script Berhasil!', 'success');
          })
          .catch(function(err) {
            showToast('Koneksi gagal. Pastikan deployment diatur ke "Anyone (Siapa saja)".', 'danger');
            document.getElementById('gasStatusText').innerHTML = '❌ <b>Gagal terhubung.</b> Periksa apakah deployment sudah Anyone.';
          });
      });
    }

    // Tombol Ekspor Rekap Nilai ke GAS
    const exportRecordsToGasBtn = document.getElementById('exportRecordsToGasBtn');
    if (exportRecordsToGasBtn) {
      exportRecordsToGasBtn.addEventListener('click', function () {
        const url = gasUrlInput ? gasUrlInput.value.trim() : '';
        if (!url) {
          showToast('Masukkan URL Web App GAS terlebih dahulu.', 'warning');
          return;
        }
        showToast('Mengirim ' + teacherRecords.length + ' rekap nilai ke Google Sheets...', 'info');
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'syncAllRecords',
            records: teacherRecords
          })
        })
        .then(function(res) { return res.json(); })
        .then(function(resData) {
          showToast(resData.message || 'Rekap nilai berhasil dicatat ke Google Sheets!', 'success');
          document.getElementById('gasStatusText').innerHTML = '✅ <b>Ekspor Berhasil:</b> ' + (resData.message || 'Tersinkron ke Sheets') + ' (' + new Date().toLocaleTimeString('id-ID') + ')';
        })
        .catch(function() {
          showToast('Pengiriman nilai gagal. Pastikan URL GAS benar & deployment aktif.', 'danger');
        });
      });
    }

    // Tombol Ekspor Roster 36 Murid ke GAS
    const exportRosterToGasBtn = document.getElementById('exportRosterToGasBtn');
    if (exportRosterToGasBtn) {
      exportRosterToGasBtn.addEventListener('click', function () {
        const url = gasUrlInput ? gasUrlInput.value.trim() : '';
        if (!url) {
          showToast('Masukkan URL Web App GAS terlebih dahulu.', 'warning');
          return;
        }
        showToast('Mengirim data ' + roster.length + ' murid ke Google Sheets...', 'info');
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'saveRoster',
            roster: roster
          })
        })
        .then(function(res) { return res.json(); })
        .then(function(resData) {
          showToast(resData.message || 'Roster 36 murid berhasil disimpan ke Sheets!', 'success');
          document.getElementById('gasStatusText').innerHTML = '✅ <b>Roster Tersimpan ke Sheets:</b> ' + (resData.message || '36 Murid') + ' (' + new Date().toLocaleTimeString('id-ID') + ')';
        })
        .catch(function() {
          showToast('Pengiriman roster gagal. Pastikan URL GAS benar & deployment aktif.', 'danger');
        });
      });
    }

    // Tombol Tarik Roster Murid dari GAS
    const fetchGasRosterBtn = document.getElementById('fetchGasRosterBtn');
    if (fetchGasRosterBtn) {
      fetchGasRosterBtn.addEventListener('click', function () {
        const url = gasUrlInput ? gasUrlInput.value.trim() : '';
        if (!url) {
          showToast('Masukkan URL Web App Google Apps Script terlebih dahulu.', 'warning');
          return;
        }
        showToast('Menghubungi endpoint Google Apps Script...', 'info');
        fetch(url + (url.indexOf('?') === -1 ? '?action=getRoster' : '&action=getRoster'))
          .then(function (res) { return res.json(); })
          .then(function (payload) {
            const list = Array.isArray(payload) ? payload : payload.data;
            if (Array.isArray(list) && list.length > 0) {
              roster = list;
              saveRoster();
              document.getElementById('gasStatusText').textContent = 'Terhubung ke GAS (' + roster.length + ' Murid)';
              renderTeacherUploadJsonTab();
              showToast('Berhasil mengimpor ' + roster.length + ' murid dari Google Sheets!', 'success');
            } else {
              showToast('Respons diterima, namun data array murid kosong.', 'warning');
            }
          })
          .catch(function () {
            showToast('Gagal mengakses URL GAS. Pastikan deployment diatur ke "Anyone".', 'danger');
          });
      });
    }

    const copyGasCodeBtn = document.getElementById('copyGasCodeBtn');
    if (copyGasCodeBtn) {
      copyGasCodeBtn.addEventListener('click', function () {
        const codeBlock = document.getElementById('gasCodeBlock');
        const code = codeBlock ? codeBlock.innerText : '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(function () {
            showToast('Kode Google Apps Script disalin!', 'success');
          }).catch(function () {
            fallbackCopy(code);
          });
        } else {
          fallbackCopy(code);
        }
      });
    }

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('Kode Google Apps Script disalin!', 'success');
      } catch (e) {
        showToast('Silakan blok dan salin kode secara manual.', 'info');
      }
      ta.remove();
    }

    const addRosterBtn = document.getElementById('addRosterBtn');
    if (addRosterBtn) {
      addRosterBtn.addEventListener('click', function () {
        const absenInput = document.getElementById('newRosterAbsen');
        const namaInput = document.getElementById('newRosterNama');
        const absenVal = parseInt(absenInput.value, 10);
        const namaVal = namaInput.value.trim();
        if (isNaN(absenVal) || !namaVal) {
          showToast('Isi Nomor Absen dan Nama Murid terlebih dahulu.', 'warning');
          return;
        }
        const idx = roster.findIndex(function (r) { return Number(r.absen) === absenVal; });
        if (idx !== -1) {
          roster[idx].nama = namaVal;
        } else {
          roster.push({ absen: absenVal, nama: namaVal, kelas: 'Informatika - X E7', nis: '240' + String(absenVal).padStart(2, '0') });
          roster.sort(function (a, b) { return a.absen - b.absen; });
        }
        saveRoster();
        absenInput.value = '';
        namaInput.value = '';
        renderTeacherUploadJsonTab();
        showToast('Absen #' + absenVal + ' (' + namaVal + ') berhasil disimpan!', 'success');
      });
    }

    // Tombol Roll Draw Groups (Undian Kelompok Proyektor)
    const rollDrawBtn = document.getElementById('btnRollDrawGroups');
    if (rollDrawBtn) {
      rollDrawBtn.addEventListener('click', function () {
        const announceBox = document.getElementById('drawAnnounceBox');
        if (announceBox) announceBox.classList.remove('hidden');
        rollDrawBtn.disabled = true;
        rollDrawBtn.classList.add('opacity-50');

        setTimeout(function () {
          activeDrawGroups = generateBalancedDrawGroups();
          renderTeacherDrawGroupTab();
          if (announceBox) announceBox.classList.add('hidden');
          rollDrawBtn.disabled = false;
          rollDrawBtn.classList.remove('opacity-50');
          showToast('🎲 Berhasil mengundi 36 siswa ke Kelompok 1 - 9 secara seimbang! Siap ditayangkan di layar.', 'success');
        }, 700);
      });
    }

    // Tombol Save Draw Groups
    const saveDrawBtn = document.getElementById('btnSaveDrawGroups');
    if (saveDrawBtn) {
      saveDrawBtn.addEventListener('click', function () {
        if (!activeDrawGroups || !activeDrawGroups.length) {
          showToast('Belum ada susunan kelompok untuk disimpan.', 'warning');
          return;
        }
        localStorage.setItem('eduassess_active_draw_groups_v1', JSON.stringify(activeDrawGroups));
        // Sinkronkan ke roster kelompok siswa
        activeDrawGroups.forEach(function (grp) {
          grp.members.forEach(function (m) {
            const found = roster.find(function (r) { return Number(r.absen) === Number(m.absen); });
            if (found) found.kelompok = grp.namaKelompok;
          });
        });
        saveRoster();
        showToast('💾 Susunan Kelompok 1 - 9 berhasil disimpan dan tersinkron ke Simulator & GAS!', 'success');
      });
    }

    // Tombol Toggle Secret Teacher Level
    const toggleSecretBtn = document.getElementById('btnToggleSecretTeacherLevel');
    if (toggleSecretBtn) {
      toggleSecretBtn.addEventListener('click', function () {
        isSecretLevelVisible = !isSecretLevelVisible;
        renderTeacherDrawGroupTab();
        if (isSecretLevelVisible) {
          showToast('Mode rahasia guru aktif: Level TaRL ditampilkan (Hanya untuk monitor pribadi).', 'info');
        } else {
          showToast('Mode proyektor aktif: Level siswa disembunyikan sepenuhnya.', 'success');
        }
      });
    }

    // Tombol Print Draw Groups
    const printDrawBtn = document.getElementById('btnPrintDrawGroups');
    if (printDrawBtn) {
      printDrawBtn.addEventListener('click', function () {
        if (!activeDrawGroups || !activeDrawGroups.length) return;
        const printWindow = window.open('', '_blank');
        const rows = activeDrawGroups.map(function (grp) {
          return '<div style="margin-bottom: 16px; border: 1.5px solid #000; border-radius: 8px; padding: 12px; page-break-inside: avoid;">' +
            '<h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase;">' + grp.meja + ' — ' + grp.namaKelompok + '</h3>' +
            '<ol style="margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.6;">' +
              grp.members.map(function (m) { return '<li><strong>#' + m.absen + '</strong> ' + m.nama + ' <em>(' + m.role + ')</em></li>'; }).join('') +
            '</ol>' +
          '</div>';
        }).join('');

        printWindow.document.write('<!DOCTYPE html><html><head><title>Daftar Kelompok Diskusi X E7</title><style>body{font-family: Arial, sans-serif; padding: 20px;} h2{text-align: center; margin-bottom: 4px;} p{text-align: center; color: #555; margin-bottom: 20px; font-size: 12px;}</style></head><body>' +
          '<h2>DAFTAR PEMBAGIAN KELOMPOK DISKUSI</h2><p>Informatika Kelas X E7 • Materi Pseudocode &amp; Berpikir Komputasional</p>' +
          '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">' + rows + '</div>' +
          '</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(function () { printWindow.print(); }, 400);
      });
    }
  }

  // ==================== SISTEM AUTENTIKASI LOGIN GURU (PASSWORD PROTECTION) ====================
  const TEACHER_AUTH_KEY = 'lms_teacher_auth_token_v1';
  const VALID_TEACHER_USER = 'guru';
  const VALID_TEACHER_PASS = 'pti12345';
  let adminEventsInitialized = false;

  function isTeacherAuthenticated() {
    try {
      return sessionStorage.getItem(TEACHER_AUTH_KEY) === 'true' || localStorage.getItem(TEACHER_AUTH_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function setTeacherAuthenticated(remember) {
    try {
      sessionStorage.setItem(TEACHER_AUTH_KEY, 'true');
      if (remember) {
        localStorage.setItem(TEACHER_AUTH_KEY, 'true');
      } else {
        localStorage.removeItem(TEACHER_AUTH_KEY);
      }
    } catch (e) {}
  }

  function logoutTeacher() {
    try {
      sessionStorage.removeItem(TEACHER_AUTH_KEY);
      localStorage.removeItem(TEACHER_AUTH_KEY);
    } catch (e) {}
    showLoginGate();
    showToast('Anda telah keluar. Dasbor guru terkunci.', 'info');
  }

  function showLoginGate() {
    const loginGate = document.getElementById('adminLoginGate');
    const appContent = document.getElementById('adminAppContent');
    if (loginGate) loginGate.classList.remove('hidden');
    if (appContent) appContent.classList.add('hidden');

    const usernameInput = document.getElementById('teacherUsernameInput');
    const passwordInput = document.getElementById('teacherPasswordInput');
    const errorAlert = document.getElementById('teacherLoginError');
    if (errorAlert) errorAlert.classList.add('hidden');
    if (passwordInput) passwordInput.value = '';
    if (usernameInput) {
      if (!usernameInput.value) usernameInput.value = '';
      setTimeout(function () {
        usernameInput.focus();
      }, 100);
    }
  }

  function showDashboard() {
    const loginGate = document.getElementById('adminLoginGate');
    const appContent = document.getElementById('adminAppContent');
    if (loginGate) loginGate.classList.add('hidden');
    if (appContent) appContent.classList.remove('hidden');

    ensureAdminEvents();
    renderAllAdminViews();
  }

  function ensureAdminEvents() {
    if (adminEventsInitialized) return;
    initAdminEvents();
    adminEventsInitialized = true;
  }

  function initAuthEvents() {
    const form = document.getElementById('teacherLoginForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const usernameInput = document.getElementById('teacherUsernameInput');
        const passwordInput = document.getElementById('teacherPasswordInput');
        const rememberCheckbox = document.getElementById('teacherRememberMe');
        const errorAlert = document.getElementById('teacherLoginError');
        const errorMsg = document.getElementById('teacherLoginErrorMsg');

        const uVal = (usernameInput?.value || '').trim().toLowerCase();
        const pVal = (passwordInput?.value || '').trim();

        if (uVal === VALID_TEACHER_USER && pVal === VALID_TEACHER_PASS) {
          if (errorAlert) errorAlert.classList.add('hidden');
          setTeacherAuthenticated(rememberCheckbox?.checked);
          showDashboard();
          showToast('Selamat datang, Bapak/Ibu Guru! Akses dasbor terbuka.', 'success');
        } else {
          if (errorAlert) {
            if (errorMsg) errorMsg.textContent = 'Username atau Password salah! Periksa kembali kredensial Anda.';
            errorAlert.classList.remove('hidden');
          }
          if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
          }
        }
      });
    }

    // Toggle Password Visibility
    const togglePassBtn = document.getElementById('togglePasswordVisibilityBtn');
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', function () {
        const passwordInput = document.getElementById('teacherPasswordInput');
        if (!passwordInput) return;
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          togglePassBtn.classList.add('text-indigo-600');
          togglePassBtn.classList.remove('text-slate-400');
        } else {
          passwordInput.type = 'password';
          togglePassBtn.classList.remove('text-indigo-600');
          togglePassBtn.classList.add('text-slate-400');
        }
      });
    }

    // Tombol Logout di Header Dasbor
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        if (confirm('Yakin ingin mengunci dan keluar dari Dasbor Guru?')) {
          logoutTeacher();
        }
      });
    }
  }

  // ==================== BUKA KODE KELOMPOK DI SIMULATOR ====================
  window.openGroupInSimulator = function (groupNum) {
    const simTabBtn = document.querySelector('[data-teacher-tab="simulatorTab"]');
    if (simTabBtn) {
      simTabBtn.click();
    }
    const iframe = document.getElementById('adminSimulatorIframe');
    if (iframe) {
      iframe.src = 'simulasi_pseudocode.html?kelompok=' + groupNum;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Memanggil rancangan pseudocode Kelompok ' + groupNum + ' ke simulator...', 'info');

    // Update active state on group buttons
    document.querySelectorAll('#groupSimulatorButtons button').forEach(function(b, idx) {
      if (idx + 1 === Number(groupNum)) {
        b.className = 'px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-xs transition';
      } else {
        b.className = 'px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs border border-indigo-200 transition shadow-2xs';
      }
    });
  };
  window.openStudentInSimulator = window.openGroupInSimulator;

  function renderGroupSimulatorButtons() {
    const container = document.getElementById('groupSimulatorButtons');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs border border-indigo-200 transition shadow-2xs cursor-pointer';
      btn.textContent = 'Kelompok ' + i;
      btn.onclick = (function (n) {
        return function () {
          window.openGroupInSimulator(n);
        };
      })(i);
      container.appendChild(btn);
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    initAuthEvents();
    if (isTeacherAuthenticated()) {
      showDashboard();
      renderGroupSimulatorButtons();
    } else {
      showLoginGate();
    }
  });
})();
