const fs = require('fs');

// ==========================================
// 1. UPDATE index.html (5 MODUL DENGAN SIMULASI & KIRIM KE GURU)
// ==========================================
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Update module count badge
indexHtml = indexHtml.replace('4 Modul Pembelajaran', '5 Modul Pembelajaran');

// Update LKM card description to emphasize physical print
indexHtml = indexHtml.replace(
  'Lembar Kerja Murid Digital &amp; Berkas PDF',
  'Lembar Kerja Murid Fisik (Cetak &amp; Unduh Berkas PDF 4 Halaman)'
);

// Add Card 4: Simulasi & Kirim ke Guru (GAS) right before Posttest card
const oldPosttestCardRegex = /<!-- CARD 4: POSTTEST[\s\S]*?<!-- ==================== VIEW 2: QUIZ RUNNER/;

const newCardsSection = `<!-- CARD 4: SIMULASI & KIRIM KE GURU (GAS) (Emerald Squircle with 'S') -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <!-- Squircle with initial letter S (Emerald) -->
            <div class="w-12 h-12 rounded-2xl bg-[#10b981] text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
              S
            </div>
            <div class="min-w-0">
              <h4 class="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                Simulasi &amp; Kirim ke Guru (GAS)
              </h4>
              <p class="text-xs text-slate-500 font-medium mt-0.5 truncate">
                Uji Logika Hasil LKPD Cetak &amp; Kirim ke Google Spreadsheet Guru
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <span id="simulasiStatusBadge" class="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              Tersedia
            </span>
            <a href="simulasi_pseudocode.html" target="_blank" data-track-material="simulasi" class="px-5 py-2.5 rounded-full bg-[#10b981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm shadow-md transition hover:scale-105 active:scale-95 flex items-center gap-1.5">
              <span>Buka Simulasi &amp; Kirim</span>
              <span>🚀</span>
            </a>
            <button type="button" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition" title="Opsi">
              &#8942;
            </button>
          </div>
        </div>

        <!-- CARD 5: POSTTEST (Teal Squircle with 'P') -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <!-- Squircle with initial letter P (Teal) -->
            <div class="w-12 h-12 rounded-2xl bg-[#14b8a6] text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
              P
            </div>
            <div class="min-w-0">
              <h4 class="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                Posttest Pseudocode
              </h4>
              <p class="text-xs text-slate-500 font-medium mt-0.5 truncate">
                10 Soal HOTS (C4–C6) • Evaluasi Formatif &amp; N-Gain
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <span id="posttestStatusBadge" class="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
              Tersedia
            </span>
            <button id="cardStartPosttestBtn" type="button" class="px-5 py-2.5 rounded-full bg-[#14b8a6] hover:bg-[#0d9488] text-white font-bold text-xs sm:text-sm shadow-md transition hover:scale-105 active:scale-95 flex items-center gap-1.5">
              <span>Buka Posttest</span>
              <span>↗</span>
            </button>
            <button type="button" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition" title="Opsi">
              &#8942;
            </button>
          </div>
        </div>

      </div>

    </main>

    <!-- ==================== VIEW 2: QUIZ RUNNER`;

if (oldPosttestCardRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(oldPosttestCardRegex, newCardsSection);
  console.log('index.html updated with 5 modules including Simulasi & Kirim!');
} else {
  console.log('Match failed for oldPosttestCardRegex in index.html');
}

fs.writeFileSync('index.html', indexHtml, 'utf8');

// ==========================================
// 2. UPDATE student.js (5 CHECKPOINTS & BADGE)
// ==========================================
let studentJs = fs.readFileSync('student.js', 'utf8');

const oldStudentMetricsRegex = /\/\/ Evaluasi 4 Checkpoint Modul Tugas[\s\S]*?const totalModulesCount = 4;[\s\S]*?if \(hasPostDone\) \{\s*completedModules \+= 1;\s*\}/;

const newStudentMetrics = `// Evaluasi 5 Checkpoint Modul Tugas (Materi, Pretest, LKM Cetak, Simulasi & Kirim, Posttest):
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
    }`;

if (oldStudentMetricsRegex.test(studentJs)) {
  studentJs = studentJs.replace(oldStudentMetricsRegex, newStudentMetrics);
  console.log('student.js metrics updated to 5 modules!');
} else {
  console.log('Match failed for oldStudentMetricsRegex in student.js');
}

fs.writeFileSync('student.js', studentJs, 'utf8');

// ==========================================
// 3. UPDATE simulasi_pseudocode.html (PANEL PENGIRIMAN KELOMPOK KE GAS GURU)
// ==========================================
let simCode = fs.readFileSync('simulasi_pseudocode.html', 'utf8');

// Insert Student Group Sender Bar right above Teacher Caller Bar
const oldTeacherBar = `    <!-- Bar Panggil Kode Murid (Laman Guru Mode) -->`;

const newSenderAndTeacherBars = `    <!-- ======================================================== -->
    <!-- BAR PENGIRIMAN KELOMPOK KE GURU & GAS (HASIL LKPD CETAK) -->
    <!-- ======================================================== -->
    <div class="max-w-5xl mx-auto mb-3 p-3.5 sm:p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 rounded-2xl border-2 border-emerald-500/80 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-inner shrink-0">🚀</span>
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">Pengiriman Kelompok 1 - 9</span>
                    <span class="text-[11px] text-slate-300 font-medium hidden sm:inline">Ketikkan hasil dari LKPD Cetak lalu kirim ke Guru</span>
                </div>
                <div class="text-xs sm:text-sm font-extrabold text-white mt-0.5">
                    Kirim Rancangan Pseudocode ke Guru (Google Sheets &amp; Proyektor Kelas)
                </div>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
            <select id="studentGroupSelect" class="bg-slate-900 border border-emerald-500 text-emerald-200 font-bold text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer">
                <option value="1">Kelompok 1</option>
                <option value="2">Kelompok 2</option>
                <option value="3">Kelompok 3</option>
                <option value="4">Kelompok 4</option>
                <option value="5">Kelompok 5</option>
                <option value="6">Kelompok 6</option>
                <option value="7">Kelompok 7</option>
                <option value="8">Kelompok 8</option>
                <option value="9">Kelompok 9</option>
            </select>
            <input id="studentGroupMembersInput" type="text" placeholder="Nama Anggota (Contoh: Aditya, Bagas, Cantika)" class="bg-slate-900 border border-slate-700 focus:border-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 focus:outline-none min-w-[210px]">
            <button type="button" onclick="kirimRancanganKelompokKeGuru()" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer hover:scale-102">
                <span>🚀</span>
                <span>Kirim ke Guru (GAS)</span>
            </button>
        </div>
    </div>

    <!-- Bar Panggil Kode Murid (Laman Guru Mode) -->`;

if (simCode.includes(oldTeacherBar)) {
  simCode = simCode.replace(oldTeacherBar, newSenderAndTeacherBars);
  console.log('simulasi_pseudocode.html updated with student sender bar!');
}

// Add kirimRancanganKelompokKeGuru function to simulasi_pseudocode.html
const newSendFunction = `
        // ==========================================
        // PENGIRIMAN RANCANGAN KELOMPOK KE GURU & GAS
        // ==========================================
        function kirimRancanganKelompokKeGuru() {
            const groupSel = document.getElementById('studentGroupSelect');
            const groupNum = parseInt(groupSel ? groupSel.value : '1', 10);
            const namaKelompok = 'Kelompok ' + groupNum;

            const membersInput = document.getElementById('studentGroupMembersInput');
            const memberStr = membersInput ? membersInput.value.trim() : '';

            const progName = document.getElementById('prog-name')?.value.trim() || ('Program_' + namaKelompok);
            const progDesc = document.getElementById('prog-desc')?.value.trim() || ('{ Rancangan: ' + namaKelompok + (memberStr ? ' - ' + memberStr : '') + ' }');
            const progDecl = document.getElementById('prog-decl')?.value.trim() || '';
            const lines = getLines();

            // Pastikan baris algoritma tidak kosong
            const filledLines = lines.filter(l => (l || '').trim() !== '');
            if (filledLines.length === 0) {
                statusText.innerHTML = "⚠️ <b>Baris algoritma masih kosong!</b> Ketikkan baris pseudocode hasil rancangan kelompokmu terlebih dahulu sebelum mengirim ke guru.";
                alert("Baris algoritma masih kosong! Silakan tuliskan baris pseudocode kelompokmu terlebih dahulu.");
                return;
            }

            const now = new Date();
            const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WIB';

            const submission = {
                groupId: groupNum,
                absen: groupNum,
                nama: namaKelompok,
                namaKelompok: namaKelompok,
                memberStr: memberStr || ('Anggota ' + namaKelompok),
                submittedAt: timeStr,
                progName: progName,
                progDesc: progDesc,
                progDecl: progDecl,
                lines: lines
            };

            // 1. Simpan ke localStorage untuk dipanggil guru di proyektor
            let allSubs = {};
            try {
                allSubs = JSON.parse(localStorage.getItem('eduassess_student_submissions_v2') || '{}');
            } catch(e) {}
            allSubs[groupNum] = submission;
            allSubs['kelompok_' + groupNum] = submission;
            localStorage.setItem('eduassess_student_submissions_v2', JSON.stringify(allSubs));

            // Tandai modul simulasi selesai di portal siswa
            try {
                const sessRaw = localStorage.getItem('eduassess_active_student_session_v2');
                if (sessRaw) {
                    const sess = JSON.parse(sessRaw);
                    sess.openedMaterials = sess.openedMaterials || {};
                    sess.openedMaterials['simulasi'] = true;
                    localStorage.setItem('eduassess_active_student_session_v2', JSON.stringify(sess));
                }
            } catch(e) {}

            // Perbarui dropdown pemanggilan guru
            if (typeof populateGroupDropdown === 'function') {
                populateGroupDropdown(false);
            }

            // 2. Kirim ke Google Apps Script (GAS) jika URL sudah terkonfigurasi
            const gasUrl = localStorage.getItem('eduassess_gas_url_v2') || '';
            let gasSent = false;
            if (gasUrl) {
                fetch(gasUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'saveLKPD',
                        submission: submission
                    })
                }).then(function() {
                    console.log('Tersinkron ke Google Apps Script!');
                }).catch(function() {});
                gasSent = true;
            }

            // 3. Tampilkan Pop-up Sukses
            showStudentSubmissionSuccessModal(submission, gasSent);
        }

        function showStudentSubmissionSuccessModal(sub, gasSent) {
            let modal = document.getElementById('modal-student-sent-sukses');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'modal-student-sent-sukses';
                modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4';
                document.body.appendChild(modal);
            }
            modal.innerHTML = \`
                <div class="bg-white text-slate-900 rounded-3xl shadow-2xl border-2 border-emerald-400 max-w-md w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
                    <div class="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                        🎉
                    </div>
                    <div>
                        <span class="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Berhasil Dikirim ke Guru
                        </span>
                        <h3 class="text-lg font-black text-slate-900 mt-2">Rancangan \${escapeHtml(sub.namaKelompok)} Siap!</h3>
                        <p class="text-xs text-slate-600 leading-relaxed mt-1">
                            Rancangan pseudocode kelompokmu telah berhasil tersimpan dan siap dipanggil untuk disimulasikan di proyektor depan kelas.
                        </p>
                    </div>
                    <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left font-mono text-xs space-y-1.5">
                        <div><b>Kelompok:</b> <span class="text-purple-700 font-bold">\${escapeHtml(sub.namaKelompok)}</span></div>
                        <div><b>Anggota:</b> <span class="text-slate-600 font-sans">\${escapeHtml(sub.memberStr || '-')}</span></div>
                        <div><b>Program:</b> <code class="text-blue-700">\${escapeHtml(sub.progName)}</code></div>
                        <div><b>Baris Algoritma:</b> \${sub.lines.length} Baris Logika</div>
                        <div class="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                            \${gasSent ? '🟢 Tersinkron ke Google Sheets Guru (GAS)' : '💾 Tersimpan di Dasbor Guru Lokal'} • \${sub.submittedAt}
                        </div>
                    </div>
                    <button type="button" onclick="document.getElementById('modal-student-sent-sukses').remove()" class="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs transition cursor-pointer shadow-md">
                        Siap, Lanjut Simulasi ▶️
                    </button>
                </div>
            \`;
        }
`;

simCode = simCode.replace('window.addEventListener(\'DOMContentLoaded\', () => {', newSendFunction + '\n        window.addEventListener(\'DOMContentLoaded\', () => {');
fs.writeFileSync('simulasi_pseudocode.html', simCode, 'utf8');
console.log('simulasi_pseudocode.html updated with send to guru logic!');

// ==========================================
// 4. UPDATE lkpd_pseudocode.html (LEPAS DARI DIGITAL KE PRINT WORKSHEET)
// ==========================================
let lkpdCode = fs.readFileSync('lkpd_pseudocode.html', 'utf8');

// Remove top nav 'Kirim ke Guru' button
lkpdCode = lkpdCode.replace(
  /<button type="button" onclick="kirimRancanganKeGuru\(\)" class="flex items-center gap-1\.5 px-3 py-1\.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black transition shadow-xs cursor-pointer">[\s\S]*?<\/button>/,
  ''
);

// Update Tahap 4 in LKPD: focus on physical printed worksheet testing
const oldTahap4PromptRegex = /<!-- TAHAP 4: Uji Logika Hasil Rancangan -->[\s\S]*?<\/div>\s*<\/div>\s*<!-- TAHAP 5/;

const newTahap4Prompt = `<!-- TAHAP 4: Uji Logika Hasil Rancangan (Lembar Kerja Cetak Fisik) -->
                            <div class="print-avoid-break p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1.5">
                                <div class="flex items-center gap-1.5">
                                    <span class="w-5 h-5 rounded bg-emerald-600 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0">4</span>
                                    <h5 class="text-xs font-extrabold text-emerald-950 flex items-center gap-1">
                                        <span>🧪</span>
                                        <span>Tahap 4: Uji Logika Hasil Rancanganmu (Verifikasi Alur Komputer):</span>
                                    </h5>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10.5px]">
                                    <div class="bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs">
                                        <span class="font-bold text-slate-800 block">Uji A: Kelas X E7 memperoleh nilai = 120 dan nilai_sebelumnya = 95</span>
                                        <span class="text-slate-600 block text-[10px]">Baris nomor berapa yang dieksekusi dan apa output layarnya?</span>
                                        <textarea rows="1" class="dotted-input mt-1 text-emerald-700 font-mono font-bold" data-save="akt3_uji_a" placeholder=""></textarea>
                                    </div>
                                    <div class="bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs">
                                        <span class="font-bold text-slate-800 block">Uji B: Kelas X E2 memperoleh nilai = 80 dan nilai_sebelumnya = 90</span>
                                        <span class="text-slate-600 block text-[10px]">Baris nomor berapa yang dieksekusi dan apa output layarnya?</span>
                                        <textarea rows="1" class="dotted-input mt-1 text-amber-700 font-mono font-bold" data-save="akt3_uji_b" placeholder=""></textarea>
                                    </div>
                                </div>

                                <div class="no-print mt-1.5 p-2 rounded-lg bg-white border border-emerald-300 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                                    <div class="space-y-0.5">
                                        <div class="font-extrabold flex items-center gap-1 text-emerald-800 text-[11px]">
                                            <span>💡</span>
                                            <span>Langkah Pengujian Bersama di Kelas:</span>
                                        </div>
                                        <p class="text-[10px] text-slate-600">
                                            Setelah mencatat di lembar kertas LKPD ini, buka modul <b>Simulasi &amp; Kirim ke Guru</b> di portal untuk memasukkan rancangan kelompokmu ke proyektor kelas!
                                        </p>
                                    </div>
                                    <a href="simulasi_pseudocode.html" target="_blank" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center justify-center gap-1 shrink-0 shadow-xs">
                                        <span>💻 Buka Simulasi &rarr;</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <!-- TAHAP 5`;

if (oldTahap4PromptRegex.test(lkpdCode)) {
  lkpdCode = lkpdCode.replace(oldTahap4PromptRegex, newTahap4Prompt);
  console.log('lkpd_pseudocode.html Tahap 4 updated for printed worksheet!');
} else {
  console.log('oldTahap4PromptRegex match failed in lkpd_pseudocode.html');
}

fs.writeFileSync('lkpd_pseudocode.html', lkpdCode, 'utf8');
console.log('ALL files successfully patched!');
