/**
 * CONFIGURATION ADMIN DASHBOARD
 * Pastikan SPREADSHEET_ID sesuai dengan ID Spreadsheet Anda
 */
const SPREADSHEET_ID = '1H9K6NnjpADRrGGSlpbn-uj7WmcRmCSFV-4L-3Rxz410';
const SHEET_NAME = 'datasiswa';
const SHEET_NOTIFIKASI = 'notifikasi';
const SHEET_LOGIN = 'login';
const SHEET_KURANG_MAMPU = 'kurangmampu';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'get_all_data') return getAllData();
  if (action === 'login') return handleLogin(e.parameter.login);
  return createResponse({ success: false, error: 'Action tidak valid' });
}

function doPost(e) {
  const action = e.parameter.action;
  try {
    const p = e.postData ? JSON.parse(e.postData.contents) : e.parameter;
    if (action === 'send_notif') return sendNotif(p);
    if (action === 'update_notif') return updateNotif(p);
    if (action === 'delete_notif') return deleteNotif(p.row);
    if (action === 'update_verval') return updateVerval(p);
    if (action === 'delete_student') return deleteStudent(p.nisn);
    if (action === 'update_akses_bulk') return updateAksesBulk(p);
    return createResponse({ success: false, error: 'Action tidak valid' });
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

function handleLogin(loginId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_LOGIN);
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().toLowerCase().trim());
    let idIdx = headers.indexOf('login');
    if (idIdx === -1) idIdx = headers.indexOf('id');
    const namaIdx = headers.indexOf('nama');
    const statusIdx = headers.indexOf('status');

    const target = (loginId || '').toString().trim().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const rowId = (data[i][idIdx] || '').toString().trim().toLowerCase();

      // Cocokkan ID persis sesuai kolom login/id di sheet
      if (rowId === target) {
        return createResponse({
          success: true,
          user: {
            login: data[i][idIdx],
            nama: data[i][namaIdx],
            status: data[i][statusIdx].toString().toLowerCase(),
            rombel: data[i][headers.indexOf('rombel')],
            akses_menu: data[i][headers.indexOf('akses_menu')] || ""
          }
        });
      }
    }
    return createResponse({ success: false, error: 'ID Login tidak ditemukan. Periksa kembali ID Anda.' });
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

function getAllData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. AMBIL DATA NOTIFIKASI
    const notifSheet = ss.getSheetByName(SHEET_NOTIFIKASI);
    let notifications = [];
    if (notifSheet) {
      const notifValues = notifSheet.getDataRange().getDisplayValues();
      if (notifValues.length > 1) {
        const nHeaders = notifValues[0].map(h => h.toLowerCase().trim());
        const nIdx = {
          tanggal: nHeaders.indexOf('tanggal'), judul: nHeaders.indexOf('judul'),
          pesan: nHeaders.indexOf('pesan'), tipe: nHeaders.indexOf('tipe'),
          nisn_target: nHeaders.indexOf('nisn_target'), target_kelas: nHeaders.indexOf('kelas_target') 
        };
        notifications = notifValues.slice(1).map((row, index) => ({
          row: index + 2, 
          tanggal: nIdx.tanggal !== -1 ? row[nIdx.tanggal] : "",
          judul: nIdx.judul !== -1 ? row[nIdx.judul] : "",
          pesan: nIdx.pesan !== -1 ? row[nIdx.pesan] : "",
          tipe: nIdx.tipe !== -1 ? row[nIdx.tipe] : "info",
          nisn_target: nIdx.nisn_target !== -1 ? row[nIdx.nisn_target] : "",
          target_kelas: nIdx.target_kelas !== -1 ? row[nIdx.target_kelas] : "" 
        })).reverse();
      }
    }

    // 2. AMBIL DATA SISWA (PROFIL LENGKAP)
    const studentSheet = ss.getSheetByName(SHEET_NAME);
    if (!studentSheet) throw new Error("Sheet 'datasiswa' tidak ditemukan");
    const studentData = studentSheet.getDataRange().getDisplayValues();
    const headers = studentData[0].map(h => h.toLowerCase().trim());
    const rows = studentData.slice(1);
    
    // Mapping Index Kolom (Mencakup 22+ kolom profil)
    const idx = {
      nisn: headers.indexOf('nisn'), nama: headers.indexOf('nama'), rombel: headers.indexOf('rombel'),
      jurusan: headers.indexOf('jurusan'), status: headers.indexOf('status_verval'),
      status_kk: headers.indexOf('status_kk'), update: headers.indexOf('terakhir_update'),
      login: headers.indexOf('terakhir_login'), kelas: headers.indexOf('kelas'), akses_menu: headers.indexOf('akses_menu'),
      tempat_lahir: headers.indexOf('tempat_lahir'), tgl_lahir: headers.indexOf('tanggal_lahir'),
      nik: headers.indexOf('nik'), agama: headers.indexOf('agama'), no_kk: headers.indexOf('no_kk'),
      reg_akta: headers.indexOf('reg_akta_lahir'), jk: headers.indexOf('jk'), alamat: headers.indexOf('alamat_jalan'),
      rt: headers.indexOf('rt'), rw: headers.indexOf('rw'), kel: headers.indexOf('kel'), kec: headers.indexOf('kec'),
      kab: headers.indexOf('kab_kota'), nama_wil: headers.indexOf('nama_wil'), wilayah: headers.indexOf('wilayah'), kodepos: headers.indexOf('kode_pos'),
      tinggal: headers.indexOf('jenis_tinggal') !== -1 ? headers.indexOf('jenis_tinggal') : headers.indexOf('jenis_tinggal_id'),
      transport: headers.indexOf('alat_transportasi') !== -1 ? headers.indexOf('alat_transportasi') : (headers.indexOf('alat_transportasi_id') !== -1 ? headers.indexOf('alat_transportasi_id') : headers.indexOf('transportasi')),
      hp: headers.indexOf('no_hp'), email: headers.indexOf('email'),
      upload_ijazah: headers.indexOf('upload_ijazah'),
      upload_kk: headers.indexOf('upload_kk'),
      // Data Orang Tua
      status_hidup_ayah: headers.indexOf('status_hidup_ayah'),
      status_hidup_ibu: headers.indexOf('status_hidup_ibu'),
      nama_ayah: headers.indexOf('nama_ayah'), nik_ayah: headers.indexOf('nik_ayah'), 
      thn_lahir_ayah: headers.indexOf('tahun_lahir_ayah'), pend_ayah: headers.indexOf('jenjang_pendidikan_ayah'),
      kerja_ayah: headers.indexOf('pekerjaan_ayah'), hasil_ayah: headers.indexOf('penghasilan_ayah'),
      nama_ibu: headers.indexOf('nama_ibu'), nik_ibu: headers.indexOf('nik_ibu'),
      thn_lahir_ibu: headers.indexOf('tahun_lahir_ibu'), pend_ibu: headers.indexOf('jenjang_pendidikan_ibu'),
      kerja_ibu: headers.indexOf('pekerjaan_ibu'), hasil_ibu: headers.indexOf('penghasilan_ibu'),
      // Data Registrasi
      sekolah_asal: headers.indexOf('sekolah_asal'), 
      hobby: headers.indexOf('id_hobby') !== -1 ? headers.indexOf('id_hobby') : (headers.indexOf('hobi') !== -1 ? headers.indexOf('hobi') : headers.indexOf('hobby')),
      cita: headers.indexOf('id_cita') !== -1 ? headers.indexOf('id_cita') : (headers.indexOf('id_cita_cita') !== -1 ? headers.indexOf('id_cita_cita') : (headers.indexOf('cita_cita') !== -1 ? headers.indexOf('cita_cita') : headers.indexOf('cita'))),
      no_ujian: headers.indexOf('no_peserta_ujian'),
      no_ijazah: headers.indexOf('no_seri_ijazah'),
      // Data Periodik
      tinggi: headers.indexOf('tinggi_badan') !== -1 ? headers.indexOf('tinggi_badan') : headers.indexOf('tinggi'),
      berat: headers.indexOf('berat_badan') !== -1 ? headers.indexOf('berat_badan') : headers.indexOf('berat'),
      lingkar: headers.indexOf('lingkar_kepala') !== -1 ? headers.indexOf('lingkar_kepala') : headers.indexOf('lingkar'),
      saudara: headers.indexOf('jumlah_saudara_kandung') !== -1 ? headers.indexOf('jumlah_saudara_kandung') : headers.indexOf('saudara'),
      anak_ke: headers.indexOf('anak_ke') !== -1 ? headers.indexOf('anak_ke') : headers.indexOf('anak_ke_berapa'),
      jarak: headers.indexOf('jarak_rumah_ke_sekolah') !== -1 ? headers.indexOf('jarak_rumah_ke_sekolah') : (headers.indexOf('jarak_tempat_tinggal_ke_sekolah') !== -1 ? headers.indexOf('jarak_tempat_tinggal_ke_sekolah') : headers.indexOf('jarak')),
      jarak_km: headers.indexOf('sebutkan_(berapa_kilometer)') !== -1 ? headers.indexOf('sebutkan_(berapa_kilometer)') : (headers.indexOf('sebutkan_berapa_kilometer') !== -1 ? headers.indexOf('sebutkan_berapa_kilometer') : (headers.indexOf('berapa_kilometer') !== -1 ? headers.indexOf('berapa_kilometer') : headers.indexOf('sebutkan_berapa_km'))),
      waktu: headers.indexOf('waktu_tempuh_ke_sekolah_(menit)') !== -1 ? headers.indexOf('waktu_tempuh_ke_sekolah_(menit)') : (headers.indexOf('waktu_tempuh_ke_sekolah_menit') !== -1 ? headers.indexOf('waktu_tempuh_ke_sekolah_menit') : headers.indexOf('waktu_tempuh'))
    };

    // Filter baris kosong dan baris indeks dummy referensi kolom
    const validRows = [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const nisnVal = idx.nisn !== -1 ? (row[idx.nisn] || "").toString().trim() : "";
      const namaVal = idx.nama !== -1 ? (row[idx.nama] || "").toString().trim() : "";
      if (!nisnVal || !namaVal) continue;
      if (nisnVal === "3" && namaVal === "4") continue;
      if (nisnVal.toLowerCase() === "nisn" && namaVal.toLowerCase() === "nama") continue;
      validRows.push({ row: row, rowNumber: r + 2 });
    }

    let stats = { total_siswa: validRows.length, total_verval: 0, total_pending: 0, total_login: 0, per_jurusan: {} };
    
    const students = validRows.map((item) => {
      const row = item.row;
      const statusRaw = idx.status !== -1 ? row[idx.status] : "";
      const statusTrimmed = statusRaw.toString().trim();
      const jurusan = idx.jurusan !== -1 ? row[idx.jurusan] : "";
      const login = idx.login !== -1 ? row[idx.login] : "";
      
      if (statusTrimmed !== "") stats.total_verval++; else stats.total_pending++;
      if (login && login.toString().trim() !== "") stats.total_login++;
      if (jurusan) stats.per_jurusan[jurusan] = (stats.per_jurusan[jurusan] || 0) + 1;
      
      return {
        row: item.rowNumber, 
        nisn: idx.nisn !== -1 ? row[idx.nisn] : "", 
        nama: idx.nama !== -1 ? row[idx.nama] : "",
        rombel: idx.rombel !== -1 ? row[idx.rombel] : "", 
        jurusan: jurusan, 
        status_verval: statusTrimmed,
        status_kk: idx.status_kk !== -1 ? row[idx.status_kk] : "-", 
        terakhir_update: idx.update !== -1 ? row[idx.update] : "",
        terakhir_login: login, 
        kelas: idx.kelas !== -1 ? row[idx.kelas] : "-", 
        akses_menu: idx.akses_menu !== -1 ? row[idx.akses_menu] : "",
        // Data Profil Lengkap
        tempat_lahir: idx.tempat_lahir !== -1 ? row[idx.tempat_lahir] : "",
        tanggal_lahir: idx.tgl_lahir !== -1 ? row[idx.tgl_lahir] : "",
        nik: idx.nik !== -1 ? row[idx.nik] : "",
        agama: idx.agama !== -1 ? row[idx.agama] : "",
        no_kk: idx.no_kk !== -1 ? row[idx.no_kk] : "",
        reg_akta_lahir: idx.reg_akta !== -1 ? row[idx.reg_akta] : "",
        jk: idx.jk !== -1 ? row[idx.jk] : "",
        alamat_jalan: idx.alamat !== -1 ? row[idx.alamat] : "",
        rt: idx.rt !== -1 ? row[idx.rt] : "",
        rw: idx.rw !== -1 ? row[idx.rw] : "",
        kel: idx.kel !== -1 ? row[idx.kel] : "",
        kec: idx.kec !== -1 ? row[idx.kec] : "",
        kab_kota: idx.kab !== -1 ? row[idx.kab] : "",
        nama_wil: idx.nama_wil !== -1 ? row[idx.nama_wil] : (idx.wilayah !== -1 ? row[idx.wilayah] : ""),
        wilayah: idx.wilayah !== -1 ? row[idx.wilayah] : (idx.nama_wil !== -1 ? row[idx.nama_wil] : ""),
        kode_pos: idx.kodepos !== -1 ? row[idx.kodepos] : "",
        jenis_tinggal: idx.tinggal !== -1 ? row[idx.tinggal] : "",
        alat_transportasi: idx.transport !== -1 ? row[idx.transport] : "",
        no_hp: idx.hp !== -1 ? row[idx.hp] : "",
        email: idx.email !== -1 ? row[idx.email] : "",
        upload_ijazah: idx.upload_ijazah !== -1 ? row[idx.upload_ijazah] : "",
        upload_kk: idx.upload_kk !== -1 ? row[idx.upload_kk] : "",
        // Data Orang Tua
        status_hidup_ayah: idx.status_hidup_ayah !== -1 ? row[idx.status_hidup_ayah] : "",
        status_hidup_ibu: idx.status_hidup_ibu !== -1 ? row[idx.status_hidup_ibu] : "",
        nama_ayah: idx.nama_ayah !== -1 ? row[idx.nama_ayah] : "",
        nik_ayah: idx.nik_ayah !== -1 ? row[idx.nik_ayah] : "",
        tahun_lahir_ayah: idx.thn_lahir_ayah !== -1 ? row[idx.thn_lahir_ayah] : "",
        jenjang_pendidikan_ayah: idx.pend_ayah !== -1 ? row[idx.pend_ayah] : "",
        pekerjaan_ayah: idx.kerja_ayah !== -1 ? row[idx.kerja_ayah] : "",
        penghasilan_ayah: idx.hasil_ayah !== -1 ? row[idx.hasil_ayah] : "",
        nama_ibu: idx.nama_ibu !== -1 ? row[idx.nama_ibu] : "",
        nik_ibu: idx.nik_ibu !== -1 ? row[idx.nik_ibu] : "",
        tahun_lahir_ibu: idx.thn_lahir_ibu !== -1 ? row[idx.thn_lahir_ibu] : "",
        jenjang_pendidikan_ibu: idx.pend_ibu !== -1 ? row[idx.pend_ibu] : "",
        pekerjaan_ibu: idx.kerja_ibu !== -1 ? row[idx.kerja_ibu] : "",
        penghasilan_ibu: idx.hasil_ibu !== -1 ? row[idx.hasil_ibu] : "",
        // Data Registrasi
        sekolah_asal: idx.sekolah_asal !== -1 ? row[idx.sekolah_asal] : "",
        id_hobby: idx.hobby !== -1 ? row[idx.hobby] : "",
        id_cita: idx.cita !== -1 ? row[idx.cita] : "",
        no_peserta_ujian: idx.no_ujian !== -1 ? row[idx.no_ujian] : "",
        no_seri_ijazah: idx.no_ijazah !== -1 ? row[idx.no_ijazah] : "",
        // Data Periodik
        tinggi_badan: idx.tinggi !== -1 ? row[idx.tinggi] : "",
        berat_badan: idx.berat !== -1 ? row[idx.berat] : "",
        lingkar_kepala: idx.lingkar !== -1 ? row[idx.lingkar] : "",
        jumlah_saudara_kandung: idx.saudara !== -1 ? row[idx.saudara] : "",
        anak_ke: idx.anak_ke !== -1 ? row[idx.anak_ke] : "",
        jarak_rumah_ke_sekolah: idx.jarak !== -1 ? row[idx.jarak] : "",
        sebutkan_berapa_kilometer: idx.jarak_km !== -1 ? row[idx.jarak_km] : "",
        waktu_tempuh_ke_sekolah_menit: idx.waktu !== -1 ? row[idx.waktu] : ""
      };
    });

    // 3. DATA MURID KURANG MAMPU
    const kmSheet = ss.getSheetByName(SHEET_KURANG_MAMPU);
    let kurangMampu = [];
    if (kmSheet) {
      const kmData = kmSheet.getDataRange().getDisplayValues();
      const kmHeaders = kmData[0].map(h => h.toLowerCase().trim());
      const kmIdx = {
        nisn: kmHeaders.indexOf('nisn'), nama: kmHeaders.indexOf('nama'), rombel: kmHeaders.indexOf('rombel'),
        km: kmHeaders.indexOf('kurang_mampu'), ket_kip: kmHeaders.indexOf('ket_kip'), no_kip: kmHeaders.indexOf('no_kip'),
        nama_kip: kmHeaders.indexOf('nama_di_kip'), kartu_lain: kmHeaders.indexOf('kartu_lain'),
        nama_kartu: kmHeaders.indexOf('nama_dikartu'), no_kartu: kmHeaders.indexOf('no_kartu')
      };
      kurangMampu = kmData.slice(1).map(row => ({
        nisn: kmIdx.nisn !== -1 ? row[kmIdx.nisn] : "",
        nama: kmIdx.nama !== -1 ? row[kmIdx.nama] : "",
        rombel: kmIdx.rombel !== -1 ? row[kmIdx.rombel] : "",
        kurang_mampu: kmIdx.km !== -1 ? row[kmIdx.km] : "",
        ket_kip: kmIdx.ket_kip !== -1 ? row[kmIdx.ket_kip] : "",
        no_kip: kmIdx.no_kip !== -1 ? row[kmIdx.no_kip] : "",
        nama_di_kip: kmIdx.nama_kip !== -1 ? row[kmIdx.nama_kip] : "",
        kartu_lain: kmIdx.kartu_lain !== -1 ? row[kmIdx.kartu_lain] : "",
        nama_dikartu: kmIdx.nama_kartu !== -1 ? row[kmIdx.nama_kartu] : "",
        no_kartu: kmIdx.no_kartu !== -1 ? row[kmIdx.no_kartu] : ""
      })).filter(k => (k.nama || "").toString().trim() !== "" && (k.nisn || "").toString().trim() !== "" && !(k.nama === "4" && k.nisn === "3"));
    }

    return createResponse({ success: true, students, notifications, stats, kurangMampu });
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

function sendNotif(p) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NOTIFIKASI);
    const headers = sheet.getDataRange().getValues()[0].map(h => h.toLowerCase().trim());
    const colIdx = {
      tanggal: headers.indexOf('tanggal'), judul: headers.indexOf('judul'), pesan: headers.indexOf('pesan'),
      tipe: headers.indexOf('tipe'), nisn_target: headers.indexOf('nisn_target'), kelas_target: headers.indexOf('kelas_target')
    };
    const tanggal = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    const newRow = new Array(headers.length).fill("");
    if (colIdx.tanggal !== -1) newRow[colIdx.tanggal] = tanggal;
    if (colIdx.judul !== -1) newRow[colIdx.judul] = p.judul || "Tanpa Judul";
    if (colIdx.pesan !== -1) newRow[colIdx.pesan] = p.pesan || "";
    if (colIdx.tipe !== -1) newRow[colIdx.tipe] = p.tipe || "info";
    if (colIdx.nisn_target !== -1) newRow[colIdx.nisn_target] = p.nisn_target ? "'" + p.nisn_target : "";
    if (colIdx.kelas_target !== -1) newRow[colIdx.kelas_target] = p.target_kelas || "";
    sheet.appendRow(newRow);
    return createResponse({ success: true, message: 'Notifikasi berhasil disimpan' });
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

function updateNotif(p) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NOTIFIKASI);
    const headers = sheet.getDataRange().getValues()[0].map(h => h.toLowerCase().trim());
    const colIdx = {
      judul: headers.indexOf('judul'), pesan: headers.indexOf('pesan'), tipe: headers.indexOf('tipe'),
      nisn_target: headers.indexOf('nisn_target'), kelas_target: headers.indexOf('kelas_target')
    };
    const row = p.row;
    if (colIdx.judul !== -1) sheet.getRange(row, colIdx.judul + 1).setValue(p.judul);
    if (colIdx.pesan !== -1) sheet.getRange(row, colIdx.pesan + 1).setValue(p.pesan);
    if (colIdx.tipe !== -1) sheet.getRange(row, colIdx.tipe + 1).setValue(p.tipe);
    if (colIdx.nisn_target !== -1) sheet.getRange(row, colIdx.nisn_target + 1).setValue(p.nisn_target ? "'" + p.nisn_target : "");
    if (colIdx.kelas_target !== -1) sheet.getRange(row, colIdx.kelas_target + 1).setValue(p.target_kelas);
    return createResponse({ success: true, message: 'Notifikasi berhasil diperbarui' });
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

function deleteNotif(row) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NOTIFIKASI);
    sheet.deleteRow(row);
    return createResponse({ success: true, message: 'Notifikasi berhasil dihapus' });
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

function updateAksesBulk(p) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    const targetList = (p.target_kelas || "").split(',').map(k => k.trim()).filter(Boolean);
    const isOnlyGradeLevel = targetList.every(k => {
      const norm = k.toLowerCase();
      return ['10', '11', '12', 'x', 'xi', 'xii', 'semua'].includes(norm);
    });
    const formattedValue = (p.target_kelas && !isOnlyGradeLevel) ? `${p.target_kelas}: ${p.akses_menu}` : (p.akses_menu || "");

    // 1. Update Sheet 'datasiswa'
    const studentSheet = ss.getSheetByName(SHEET_NAME);
    let countStudents = 0;
    if (studentSheet) {
      const data = studentSheet.getDataRange().getValues();
      if (data.length > 0) {
        const headers = data[0].map(h => h.toString().toLowerCase().trim());
        const kelasIdx = headers.indexOf('kelas');
        const rombelIdx = headers.indexOf('rombel');
        let aksesIdx = headers.indexOf('akses_menu');
        
        if (aksesIdx === -1) {
          aksesIdx = headers.indexOf('akses menu');
        }
        if (aksesIdx === -1) {
          aksesIdx = headers.indexOf('akses');
        }

        // Jika kolom akses_menu belum ada di header, tambahkan otomatis
        if (aksesIdx === -1) {
          aksesIdx = headers.length;
          studentSheet.getRange(1, aksesIdx + 1).setValue('akses_menu');
        }
        
        for (let i = 1; i < data.length; i++) {
          const cellKelas = kelasIdx !== -1 ? data[i][kelasIdx].toString().trim() : '';
          const cellRombel = rombelIdx !== -1 ? data[i][rombelIdx].toString().trim() : '';

          const isMatch = targetList.some(tk => {
            if (!tk) return false;
            
            const normTk = tk.toLowerCase().replace(/[\s\-_.]/g, '');
            const normRombel = cellRombel.toLowerCase().replace(/[\s\-_.]/g, '');
            const normKelas = cellKelas.toLowerCase().replace(/[\s\-_.]/g, '');

            // Roman vs Arabic conversions for rombel (e.g. 10 MPLB 1 vs X MPLB 1)
            const romanTk = normTk.replace(/^10\b/g, 'x').replace(/^11\b/g, 'xi').replace(/^12\b/g, 'xii');
            const arabicTk = normTk.replace(/^x\b/g, '10').replace(/^xi\b/g, '11').replace(/^xii\b/g, '12');
            
            const romanRombel = normRombel.replace(/^10\b/g, 'x').replace(/^11\b/g, 'xi').replace(/^12\b/g, 'xii');
            const arabicRombel = normRombel.replace(/^x\b/g, '10').replace(/^xi\b/g, '11').replace(/^xii\b/g, '12');

            // Direct or normalized match on Rombel
            if (normRombel && (normRombel === normTk || romanRombel === romanTk || arabicRombel === arabicTk)) return true;
            if (cellRombel && (cellRombel.toLowerCase() === tk.toLowerCase())) return true;

            // Direct match on Kelas
            if (normKelas && (normKelas === normTk || normKelas === romanTk || normKelas === arabicTk)) return true;

            // Target is grade level like "10", "11", "12" or "X", "XI", "XII"
            if (['10', 'x'].includes(normTk) && (['10', 'x'].includes(normKelas) || romanRombel.startsWith('x') || arabicRombel.startsWith('10'))) return true;
            if (['11', 'xi'].includes(normTk) && (['11', 'xi'].includes(normKelas) || romanRombel.startsWith('xi') || arabicRombel.startsWith('11'))) return true;
            if (['12', 'xii'].includes(normTk) && (['12', 'xii'].includes(normKelas) || romanRombel.startsWith('xii') || arabicRombel.startsWith('12'))) return true;

            return false;
          });

          if (isMatch) {
            studentSheet.getRange(i + 1, aksesIdx + 1).setValue(formattedValue);
            countStudents++;
          }
        }
      }
    }

    // 2. Update Sheet 'login' (jika ada)
    const loginSheet = ss.getSheetByName(SHEET_LOGIN);
    let countUsers = 0;
    if (loginSheet) {
      const loginData = loginSheet.getDataRange().getValues();
      if (loginData.length > 0) {
        const loginHeaders = loginData[0].map(h => h.toString().toLowerCase().trim());
        const loginRombelIdx = loginHeaders.indexOf('rombel');
        let loginAksesIdx = loginHeaders.indexOf('akses_menu');
        
        if (loginAksesIdx === -1) {
          loginAksesIdx = loginHeaders.indexOf('akses menu');
        }

        if (loginRombelIdx !== -1) {
          if (loginAksesIdx === -1) {
            loginAksesIdx = loginHeaders.length;
            loginSheet.getRange(1, loginAksesIdx + 1).setValue('akses_menu');
          }

          const targetList = p.target_kelas.split(',').map(k => k.trim()).filter(Boolean);
          for (let i = 1; i < loginData.length; i++) {
            const userRombel = loginData[i][loginRombelIdx].toString().trim();
            const userRombelList = userRombel.split(',').map(r => r.trim()).filter(Boolean);

            const isMatch = targetList.some(tk => {
              const normTk = tk.toLowerCase().replace(/[\s\-_.]/g, '');
              const romanTk = normTk.replace(/^10\b/g, 'x').replace(/^11\b/g, 'xi').replace(/^12\b/g, 'xii');
              const arabicTk = normTk.replace(/^x\b/g, '10').replace(/^xi\b/g, '11').replace(/^xii\b/g, '12');

              return userRombelList.some(singleRombel => {
                const normUserRombel = singleRombel.toLowerCase().replace(/[\s\-_.]/g, '');
                const romanUserRombel = normUserRombel.replace(/^10\b/g, 'x').replace(/^11\b/g, 'xi').replace(/^12\b/g, 'xii');
                const arabicUserRombel = normUserRombel.replace(/^x\b/g, '10').replace(/^xi\b/g, '11').replace(/^xii\b/g, '12');

                if (normUserRombel && (normUserRombel === normTk || romanUserRombel === romanTk || arabicUserRombel === arabicTk)) return true;
                if (['10', 'x'].includes(normTk) && (romanUserRombel.startsWith('x') || arabicUserRombel.startsWith('10'))) return true;
                if (['11', 'xi'].includes(normTk) && (romanUserRombel.startsWith('xi') || arabicUserRombel.startsWith('11'))) return true;
                if (['12', 'xii'].includes(normTk) && (romanUserRombel.startsWith('xii') || arabicUserRombel.startsWith('12'))) return true;
                return false;
              });
            });

            if (isMatch) {
              loginSheet.getRange(i + 1, loginAksesIdx + 1).setValue(formattedValue);
              countUsers++;
            }
          }
        }
      }
    }

    return createResponse({ 
      success: true, 
      message: `Berhasil memperbarui akses untuk ${countStudents} siswa` 
    });
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

function updateVerval(p) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toLowerCase().trim());
    const nisnIdx = headers.indexOf('nisn');
    const statusIdx = headers.indexOf('status_verval');
    for (let i = 1; i < data.length; i++) {
      if (data[i][nisnIdx].toString() === p.nisn.toString()) {
        sheet.getRange(i + 1, statusIdx + 1).setValue(p.status);
        return createResponse({ success: true, message: 'Status berhasil diperbarui' });
      }
    }
    return createResponse({ success: false, error: 'Siswa tidak ditemukan' });
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

function deleteStudent(nisn) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toLowerCase().trim());
    const nisnIdx = headers.indexOf('nisn');
    for (let i = 1; i < data.length; i++) {
      if (data[i][nisnIdx].toString() === nisn.toString()) {
        sheet.deleteRow(i + 1);
        return createResponse({ success: true, message: 'Data berhasil dihapus' });
      }
    }
    return createResponse({ success: false, error: 'Siswa tidak ditemukan' });
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

function createResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
