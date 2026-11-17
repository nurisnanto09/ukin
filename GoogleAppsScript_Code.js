/**
 * ============================================================
 * GOOGLE APPS SCRIPT (Code.gs) - EDUASSESS PATBHE GREEN
 * Informatika Fase E (Kelas X E7) • SMAN 4 Yogyakarta
 * ============================================================
 * Fitur:
 * 1. Otomatis membuat Sheet "Rekap Nilai" dan "Rancangan LKPD" jika belum ada.
 * 2. Mencegah duplikasi data: Update baris jika No Absen sudah pernah tercatat.
 * 3. Mendukung aksi:
 *    - getRecords: Menarik seluruh nilai pretest & posttest 36 murid
 *    - getRoster: Menarik 36 roster murid resmi Kelas X E7
 *    - getSubmissions: Menarik kiriman rancangan LKPD per kelompok
 *    - syncAllRecords: Menerima pengiriman nilai dari dasbor guru/siswa
 *    - saveLKPD: Menerima rancangan pseudocode LKPD kelompok
 */

const SHEET_NAME_REKAP = 'Rekap Nilai';
const SHEET_NAME_LKPD = 'Rancangan LKPD';

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  
  if (action === 'getRecords') {
    return getRecordsResponse();
  } else if (action === 'getRoster') {
    return getRosterResponse();
  } else if (action === 'getSubmissions') {
    return getSubmissionsResponse();
  }
  
  return jsonResponse({
    status: 'success',
    message: 'Endpoint GAS EduAssess Aktif & Terhubung!',
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || '';
    
    if (action === 'syncAllRecords' || action === 'saveRecord') {
      return handleSyncRecords(data);
    } else if (action === 'saveLKPD') {
      return handleSaveLKPD(data.submission);
    } else if (action === 'clearRecords') {
      return handleClearRecords();
    }
    
    return jsonResponse({ status: 'success', message: 'Data diterima' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f4f6');
    }
  }
  return sheet;
}

function getRecordsResponse() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME_REKAP) || ss.getSheets()[0];
  var values = sheet.getDataRange().getValues();
  var records = [];
  
  if (values.length > 1) {
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (row[0] === '' && row[1] === '') continue;
      records.push({
        absen: Number(row[0]) || i,
        nama: String(row[1] || '').trim(),
        kelas: String(row[2] || 'Informatika - X E7').trim(),
        pretestScore: (row[3] !== '' && !isNaN(Number(row[3]))) ? Number(row[3]) : undefined,
        posttestScore: (row[4] !== '' && !isNaN(Number(row[4]))) ? Number(row[4]) : undefined,
        pretest: (row[3] !== '' && !isNaN(Number(row[3]))) ? Number(row[3]) : undefined,
        posttest: (row[4] !== '' && !isNaN(Number(row[4]))) ? Number(row[4]) : undefined,
        kategori: String(row[5] || ''),
        timestamp: String(row[6] || '')
      });
    }
  }
  return jsonResponse(records);
}

function handleSyncRecords(data) {
  var sheet = getOrCreateSheet(SHEET_NAME_REKAP, ['No Absen', 'Nama Lengkap', 'Kelas', 'Skor Pretest', 'Skor Posttest', 'Kategori Tindak Lanjut', 'Waktu']);
  var records = Array.isArray(data.records) ? data.records : (data.record ? [data.record] : []);
  var existingData = sheet.getDataRange().getValues();
  
  // Buat mapping baris berdasarkan No Absen (baris 2 dst)
  var absenRowMap = {};
  for (var r = 1; r < existingData.length; r++) {
    var abs = Number(existingData[r][0]);
    if (abs) absenRowMap[abs] = r + 1; // 1-based index untuk Sheets
  }
  
  var updatedCount = 0;
  var insertedCount = 0;
  
  records.forEach(function (rec) {
    if (!rec) return;
    var abs = Number(rec.absen);
    var nama = String(rec.nama || '');
    var kelas = String(rec.kelas || 'Informatika - X E7');
    var preVal = (rec.pretestScore !== undefined && rec.pretestScore !== null && rec.pretestScore !== '') ? Number(rec.pretestScore) : '';
    var postVal = (rec.posttestScore !== undefined && rec.posttestScore !== null && rec.posttestScore !== '') ? Number(rec.posttestScore) : '';
    
    var kategori = '-';
    if (postVal !== '') {
      kategori = postVal >= 75 ? 'Pengayaan' : 'Remedial';
    } else if (preVal !== '') {
      kategori = 'Pretest Selesai';
    }
    
    var timeStr = rec.timestamp || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
    
    if (abs && absenRowMap[abs]) {
      // UPDATE baris yang sudah ada (mencegah baris duplikat)
      var targetRow = absenRowMap[abs];
      var currentPre = sheet.getRange(targetRow, 4).getValue();
      var currentPost = sheet.getRange(targetRow, 5).getValue();
      
      var finalPre = preVal !== '' ? preVal : currentPre;
      var finalPost = postVal !== '' ? postVal : currentPost;
      var finalKat = finalPost !== '' ? (Number(finalPost) >= 75 ? 'Pengayaan' : 'Remedial') : (finalPre !== '' ? 'Pretest Selesai' : '-');
      
      sheet.getRange(targetRow, 1, 1, 7).setValues([[abs, nama, kelas, finalPre, finalPost, finalKat, timeStr]]);
      updatedCount++;
    } else if (abs) {
      // INSERT baris baru jika belum ada
      sheet.appendRow([abs, nama, kelas, preVal, postVal, kategori, timeStr]);
      absenRowMap[abs] = sheet.getLastRow();
      insertedCount++;
    }
  });
  
  return jsonResponse({
    status: 'success',
    message: 'Tersinkron: ' + updatedCount + ' diupdate, ' + insertedCount + ' ditambahkan.'
  });
}

function handleSaveLKPD(sub) {
  if (!sub) return jsonResponse({ status: 'error', message: 'Data submission kosong' });
  var sheet = getOrCreateSheet(SHEET_NAME_LKPD, ['Waktu', 'Kelompok', 'Anggota', 'Nama Program', 'Keterangan', 'Deklarasi', 'Algoritma']);
  
  var groupNum = sub.groupNum || sub.absen || 1;
  var namaKelompok = sub.namaKelompok || ('Kelompok ' + groupNum);
  var memberStr = sub.memberStr || '';
  var progName = sub.progName || '';
  var progDesc = sub.progDesc || '';
  var progDecl = sub.progDecl || '';
  var linesStr = Array.isArray(sub.lines) ? sub.lines.join('\n') : (sub.lines || '');
  var timeStr = sub.submittedAt || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
  
  // Cari apakah kelompok ini sudah pernah kirim, jika ya update
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === String(namaKelompok).toLowerCase() || String(data[i][1]) === ('Kelompok ' + groupNum)) {
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow !== -1) {
    sheet.getRange(foundRow, 1, 1, 7).setValues([[timeStr, namaKelompok, memberStr, progName, progDesc, progDecl, linesStr]]);
  } else {
    sheet.appendRow([timeStr, namaKelompok, memberStr, progName, progDesc, progDecl, linesStr]);
  }
  
  return jsonResponse({ status: 'success', message: 'Rancangan ' + namaKelompok + ' berhasil disimpan di Google Sheets!' });
}

function handleClearRecords() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME_REKAP);
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  return jsonResponse({ status: 'success', message: 'Seluruh rekap nilai di Google Sheets berhasil dikosongkan!' });
}

function getRosterResponse() {
  var roster = [
    { absen: 1, nama: "ADITYA ALLAY NUGRAHA", kelas: "Informatika - X E7", nis: "24001" },
    { absen: 2, nama: "ALEXANDER GIBRALTAR ADISYA SAP", kelas: "Informatika - X E7", nis: "24002" },
    { absen: 3, nama: "ANDI SALWA AYU FADHILAH GEMMY", kelas: "Informatika - X E7", nis: "24003" },
    { absen: 4, nama: "ANNABELA IKADEWI AZZAHRA", kelas: "Informatika - X E7", nis: "24004" },
    { absen: 5, nama: "ARIQAH NAHDAH ARBAIN", kelas: "Informatika - X E7", nis: "24005" },
    { absen: 6, nama: "ARUNINDYA ARDHANAYA", kelas: "Informatika - X E7", nis: "24006" },
    { absen: 7, nama: "ARYA SATYA RADITYA ARDANI", kelas: "Informatika - X E7", nis: "24007" },
    { absen: 8, nama: "ATNAN GASSANI ARHAB", kelas: "Informatika - X E7", nis: "24008" },
    { absen: 9, nama: "AULIA AZ ZAHRA", kelas: "Informatika - X E7", nis: "24009" },
    { absen: 10, nama: "BIMO ARYO WIBOWO", kelas: "Informatika - X E7", nis: "24010" },
    { absen: 11, nama: "CHELSEA NATHANIA AURA HERVIAN", kelas: "Informatika - X E7", nis: "24011" },
    { absen: 12, nama: "DANENDRA KANAKA SAKTI", kelas: "Informatika - X E7", nis: "24012" },
    { absen: 13, nama: "DANISH DZAKY ARDHANI", kelas: "Informatika - X E7", nis: "24013" },
    { absen: 14, nama: "DAVIN GHANI AL GHIFARI", kelas: "Informatika - X E7", nis: "24014" },
    { absen: 15, nama: "ELVINA SITI NUR HALIZA", kelas: "Informatika - X E7", nis: "24015" },
    { absen: 16, nama: "FATHAN NUR HIDAYAT", kelas: "Informatika - X E7", nis: "24016" },
    { absen: 17, nama: "GAVIN ZADA NAUFAL ARDANI", kelas: "Informatika - X E7", nis: "24017" },
    { absen: 18, nama: "HABIBIE AZZAMY ARSYAD", kelas: "Informatika - X E7", nis: "24018" },
    { absen: 19, nama: "JANITRA JATU JATMIKO", kelas: "Informatika - X E7", nis: "24019" },
    { absen: 20, nama: "KEISHA AURELIA PUTRI", kelas: "Informatika - X E7", nis: "24020" },
    { absen: 21, nama: "KEO SATRIA ARYA PUTRA", kelas: "Informatika - X E7", nis: "24021" },
    { absen: 22, nama: "M RAKHA AL KAUTSAR", kelas: "Informatika - X E7", nis: "24022" },
    { absen: 23, nama: "MUHAMMAD HABIBIE FAHRIEL ALBA", kelas: "Informatika - X E7", nis: "24023" },
    { absen: 24, nama: "NABILA FATHINA ZULFA", kelas: "Informatika - X E7", nis: "24024" },
    { absen: 25, nama: "NAILA NUR DIANA", kelas: "Informatika - X E7", nis: "24025" },
    { absen: 26, nama: "NAURA AGHNA CALLISTA", kelas: "Informatika - X E7", nis: "24026" },
    { absen: 27, nama: "NAZLA PUTRI HERDIANA", kelas: "Informatika - X E7", nis: "24027" },
    { absen: 28, nama: "OCTA DWI RAMADHANI", kelas: "Informatika - X E7", nis: "24028" },
    { absen: 29, nama: "RAFI AHMAD KHAIRULLAH", kelas: "Informatika - X E7", nis: "24029" },
    { absen: 30, nama: "RAISHA ALMIRA SARI", kelas: "Informatika - X E7", nis: "24030" },
    { absen: 31, nama: "RAYHAN KHAIRUL AZZAM", kelas: "Informatika - X E7", nis: "24031" },
    { absen: 32, nama: "ROBBIEL AURA AL FARIZI", kelas: "Informatika - X E7", nis: "24032" },
    { absen: 33, nama: "SEILA PUSPA ASRI", kelas: "Informatika - X E7", nis: "24033" },
    { absen: 34, nama: "TALITA ARKANA INDRIYANI", kelas: "Informatika - X E7", nis: "24034" },
    { absen: 35, nama: "VALEN ARSA WIRATAMA", kelas: "Informatika - X E7", nis: "24035" },
    { absen: 36, nama: "VANESYA ZAHRA ZAKIA", kelas: "Informatika - X E7", nis: "24036" }
  ];
  return jsonResponse(roster);
}

function getSubmissionsResponse() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME_LKPD);
  if (!sheet) return jsonResponse({});
  var values = sheet.getDataRange().getValues();
  var result = {};
  if (values.length > 1) {
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var namaKel = String(row[1] || '');
      var match = namaKel.match(/\d+/);
      var gNum = match ? parseInt(match[0], 10) : i;
      result[gNum] = {
        groupNum: gNum,
        namaKelompok: namaKel,
        memberStr: String(row[2] || ''),
        progName: String(row[3] || ''),
        progDesc: String(row[4] || ''),
        progDecl: String(row[5] || ''),
        lines: String(row[6] || '').split('\n'),
        submittedAt: String(row[0] || '')
      };
    }
  }
  return jsonResponse(result);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
