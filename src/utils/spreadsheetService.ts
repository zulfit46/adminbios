/**
 * Service to fetch and synchronize data between Google Apps Script Web App
 * and Google Spreadsheet directly (high-speed fallback).
 */

export const SPREADSHEET_ID = '1H9K6NnjpADRrGGSlpbn-uj7WmcRmCSFV-4L-3Rxz410';
export const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzi-HtfbXyceKafIsQXTRs62LwxeVdwtgs2QZJzpxNsFA1v0QgFVHH037sTo8pCXfqR/exec';

export function getActiveApiUrl(): string {
  try {
    const customUrl = localStorage.getItem('dapodik_custom_api_url');
    if (customUrl && customUrl.trim().startsWith('http')) {
      return customUrl.trim();
    }
  } catch (_) {}
  return DEFAULT_API_URL;
}

export function setActiveApiUrl(url: string): void {
  try {
    if (!url || url.trim() === '' || url.trim() === DEFAULT_API_URL) {
      localStorage.removeItem('dapodik_custom_api_url');
    } else {
      localStorage.setItem('dapodik_custom_api_url', url.trim());
    }
  } catch (_) {}
}

/**
 * Robust CSV parser supporting quotes, nested commas, and CRLF line breaks.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(current.trim());
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        rows.push(row);
      }
      row = [];
      current = '';
    } else {
      current += c;
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

/**
 * Fetch a specific sheet as CSV directly from Google Spreadsheet Visualization endpoint.
 */
export async function fetchSheetCSV(sheetName: string, spreadsheetId = SPREADSHEET_ID): Promise<string[][]> {
  const cacheBuster = Date.now();
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&t=${cacheBuster}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal mengambil sheet "${sheetName}": HTTP ${response.status}`);
  }
  const text = await response.text();
  return parseCSV(text);
}

/**
 * Authenticate user: tries Google Apps Script first; if unresponsive/404, verifies against the 'login' sheet directly.
 */
export async function loginWithFallback(loginId: string, customApiUrl?: string): Promise<{ success: boolean; user?: any; error?: string }> {
  const cleanId = (loginId || '').trim();
  if (!cleanId) {
    return { success: false, error: "Masukkan ID Login atau NIP Anda." };
  }

  const apiUrl = customApiUrl || getActiveApiUrl();

  // 1. Try Google Apps Script with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${apiUrl}?action=login&login=${encodeURIComponent(cleanId)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json && typeof json.success === 'boolean') {
          return json;
        }
      } catch (_) {
        // Response was not JSON (e.g. Google error HTML), fall through to direct sheet verification
      }
    }
  } catch (err) {
    console.warn("Apps Script login timeout/error, checking spreadsheet directly...", err);
  }

  // 2. Direct Spreadsheet fallback for login
  try {
    const rows = await fetchSheetCSV('login');
    if (rows.length < 2) {
      return { success: false, error: "Tabel data login di spreadsheet kosong atau tidak dapat diakses." };
    }

    const headers = rows[0].map(h => h.toLowerCase().trim());
    let idIdx = headers.indexOf('login');
    if (idIdx === -1) idIdx = headers.indexOf('id');
    const namaIdx = headers.indexOf('nama');
    const statusIdx = headers.indexOf('status');
    const rombelIdx = headers.indexOf('rombel');
    const aksesIdx = headers.indexOf('akses_menu');

    const target = cleanId.toLowerCase();

    for (let i = 1; i < rows.length; i++) {
      const rowId = (rows[i][idIdx] || '').toLowerCase().trim();
      if (rowId === target) {
        return {
          success: true,
          user: {
            login: rows[i][idIdx],
            nama: namaIdx !== -1 ? rows[i][namaIdx] : "Pengguna",
            status: statusIdx !== -1 ? (rows[i][statusIdx] || "user").toLowerCase().trim() : "user",
            rombel: rombelIdx !== -1 ? rows[i][rombelIdx] : "",
            akses_menu: aksesIdx !== -1 ? rows[i][aksesIdx] : ""
          }
        };
      }
    }

    return { success: false, error: "ID Login atau NIP tidak ditemukan. Periksa kembali ID Anda." };
  } catch (sheetErr: any) {
    console.error("Gagal verifikasi login ke spreadsheet:", sheetErr);
    return { success: false, error: "Gagal memverifikasi login. Pastikan koneksi internet aktif." };
  }
}

/**
 * Checks if a student record is valid (must have non-empty name and NISN,
 * and not be a dummy column reference/test row like name="4" and nisn="3").
 */
export function isValidStudent(s: any): boolean {
  if (!s) return false;
  const nama = (s.nama || '').toString().trim();
  const nisn = (s.nisn || '').toString().trim();
  if (!nama || !nisn) return false;
  // Abaikan baris referensi nomor kolom (contoh: NISN='3' & Nama='4')
  if (nama === '4' && nisn === '3') return false;
  if (/^\d+$/.test(nama) && /^\d+$/.test(nisn) && (nama.length < 3 || nisn.length < 3)) return false;
  if (nama.toLowerCase() === 'nama' && nisn.toLowerCase() === 'nisn') return false;
  return true;
}

export function calculateStudentStats(students: any[]) {
  const stats: any = {
    total_siswa: students.length,
    total_verval: 0,
    total_pending: 0,
    total_login: 0,
    per_jurusan: {}
  };
  for (const s of students) {
    const statusTrimmed = (s.status_verval || '').toString().trim();
    const jurusan = (s.jurusan || '').toString().trim();
    const login = (s.terakhir_login || s.terakhir_login_siswa || '').toString().trim();

    if (statusTrimmed !== '') stats.total_verval++; else stats.total_pending++;
    if (login !== '') stats.total_login++;
    if (jurusan) stats.per_jurusan[jurusan] = (stats.per_jurusan[jurusan] || 0) + 1;
  }
  return stats;
}

/**
 * Fetch all students, notifications, stats, and murid kurang mampu.
 * Tries Google Apps Script first; falls back immediately to Google Spreadsheet directly on 404/failure.
 */
export async function fetchAllDataWithFallback(customApiUrl?: string): Promise<{
  success: boolean;
  students: any[];
  kurangMampu: any[];
  notifications: any[];
  stats: any;
  source: 'gas' | 'sheets';
  error?: string;
}> {
  const apiUrl = customApiUrl || getActiveApiUrl();

  // 1. Try Google Apps Script
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(`${apiUrl}?action=get_all_data`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json") || contentType.includes("text/plain")) {
        const text = await res.text();
        const json = JSON.parse(text);
        if (json && json.success && Array.isArray(json.students)) {
          const validStudents = (json.students || []).filter(isValidStudent);
          const cleanKurangMampu = (json.kurangMampu || []).filter((k: any) => {
            const n = (k.nama || '').toString().trim();
            const id = (k.nisn || '').toString().trim();
            return Boolean(n && id && !(n === '4' && id === '3'));
          });
          return {
            success: true,
            students: validStudents,
            kurangMampu: cleanKurangMampu,
            notifications: json.notifications || [],
            stats: calculateStudentStats(validStudents),
            source: 'gas'
          };
        }
      }
    }
  } catch (gasErr) {
    console.warn("Apps Script get_all_data tidak merespons JSON, beralih ke pembacaan langsung Google Sheet...", gasErr);
  }

  // 2. Fallback: Parse Google Spreadsheet direct CSV data
  try {
    // Fetch datasiswa and optionally kurangmampu & notifikasi in parallel
    const [studentRows, kmRows, notifRows] = await Promise.all([
      fetchSheetCSV('datasiswa'),
      fetchSheetCSV('kurangmampu').catch(() => [] as string[][]),
      fetchSheetCSV('notifikasi').catch(() => [] as string[][])
    ]);

    if (studentRows.length < 2) {
      return {
        success: false,
        students: [],
        kurangMampu: [],
        notifications: [],
        stats: null,
        source: 'sheets',
        error: "Sheet 'datasiswa' kosong."
      };
    }

    // Process datasiswa
    const headers = studentRows[0].map(h => h.toLowerCase().trim());
    const rows = studentRows.slice(1);

    const idx = {
      nisn: headers.indexOf('nisn'),
      nama: headers.indexOf('nama'),
      rombel: headers.indexOf('rombel'),
      jurusan: headers.indexOf('jurusan'),
      status: headers.indexOf('status_verval'),
      status_kk: headers.indexOf('status_kk'),
      update: headers.indexOf('terakhir_update'),
      login: headers.indexOf('terakhir_login'),
      kelas: headers.indexOf('kelas'),
      akses_menu: headers.indexOf('akses_menu'),
      tempat_lahir: headers.indexOf('tempat_lahir'),
      tgl_lahir: headers.indexOf('tanggal_lahir'),
      nik: headers.indexOf('nik'),
      agama: headers.indexOf('agama'),
      no_kk: headers.indexOf('no_kk'),
      reg_akta: headers.indexOf('reg_akta_lahir'),
      jk: headers.indexOf('jk'),
      alamat: headers.indexOf('alamat_jalan'),
      rt: headers.indexOf('rt'),
      rw: headers.indexOf('rw'),
      kel: headers.indexOf('kel'),
      kec: headers.indexOf('kec'),
      kab: headers.indexOf('kab_kota'),
      nama_wil: headers.indexOf('nama_wil') !== -1 ? headers.indexOf('nama_wil') : headers.indexOf('wilayah'),
      kodepos: headers.indexOf('kode_pos'),
      tinggal: headers.indexOf('jenis_tinggal') !== -1 ? headers.indexOf('jenis_tinggal') : headers.indexOf('jenis_tinggal_id'),
      transport: headers.indexOf('alat_transportasi') !== -1 ? headers.indexOf('alat_transportasi') : headers.indexOf('transportasi'),
      hp: headers.indexOf('no_hp'),
      email: headers.indexOf('email'),
      upload_ijazah: headers.indexOf('upload_ijazah'),
      upload_kk: headers.indexOf('upload_kk'),
      status_hidup_ayah: headers.indexOf('status_hidup_ayah'),
      status_hidup_ibu: headers.indexOf('status_hidup_ibu'),
      nama_ayah: headers.indexOf('nama_ayah'),
      nik_ayah: headers.indexOf('nik_ayah'),
      thn_lahir_ayah: headers.indexOf('tahun_lahir_ayah'),
      pend_ayah: headers.indexOf('jenjang_pendidikan_ayah'),
      kerja_ayah: headers.indexOf('pekerjaan_ayah'),
      hasil_ayah: headers.indexOf('penghasilan_ayah'),
      nama_ibu: headers.indexOf('nama_ibu'),
      nik_ibu: headers.indexOf('nik_ibu'),
      thn_lahir_ibu: headers.indexOf('tahun_lahir_ibu'),
      pend_ibu: headers.indexOf('jenjang_pendidikan_ibu'),
      kerja_ibu: headers.indexOf('pekerjaan_ibu'),
      hasil_ibu: headers.indexOf('penghasilan_ibu'),
      sekolah_asal: headers.indexOf('sekolah_asal'),
      hobby: headers.indexOf('id_hobby') !== -1 ? headers.indexOf('id_hobby') : headers.indexOf('hobi'),
      cita: headers.indexOf('id_cita') !== -1 ? headers.indexOf('id_cita') : headers.indexOf('cita_cita'),
      no_ujian: headers.indexOf('no_peserta_ujian'),
      no_ijazah: headers.indexOf('no_seri_ijazah'),
      tinggi: headers.indexOf('tinggi_badan') !== -1 ? headers.indexOf('tinggi_badan') : headers.indexOf('tinggi'),
      berat: headers.indexOf('berat_badan') !== -1 ? headers.indexOf('berat_badan') : headers.indexOf('berat'),
      lingkar: headers.indexOf('lingkar_kepala') !== -1 ? headers.indexOf('lingkar_kepala') : headers.indexOf('lingkar'),
      saudara: headers.indexOf('jumlah_saudara_kandung') !== -1 ? headers.indexOf('jumlah_saudara_kandung') : headers.indexOf('saudara'),
      anak_ke: headers.indexOf('anak_ke'),
      jarak: headers.indexOf('jarak_rumah_ke_sekolah') !== -1 ? headers.indexOf('jarak_rumah_ke_sekolah') : headers.indexOf('jarak'),
      jarak_km: headers.indexOf('sebutkan_(berapa_kilometer)') !== -1 ? headers.indexOf('sebutkan_(berapa_kilometer)') : headers.indexOf('berapa_kilometer'),
      waktu: headers.indexOf('waktu_tempuh_ke_sekolah_(menit)') !== -1 ? headers.indexOf('waktu_tempuh_ke_sekolah_(menit)') : headers.indexOf('waktu_tempuh'),
      data_salah: headers.indexOf('data_salah'),
      nama_verval: headers.indexOf('nama_verval'),
      tempat_lahir_verval: headers.indexOf('tempat_lahir_verval'),
      tanggal_lahir_verval: headers.indexOf('tanggal_lahir_verval'),
      data_salah_kk: headers.indexOf('data_salah_kk'),
      nama_kk: headers.indexOf('nama_kk'),
      tempat_lahir_kk: headers.indexOf('tempat_lahir_kk'),
      tanggal_lahir_kk: headers.indexOf('tanggal_lahir_kk'),
      status_kunci: headers.indexOf('status_kunci')
    };

    const rawStudents = rows.map((row, index) => {
      const statusRaw = idx.status !== -1 ? (row[idx.status] || '') : '';
      const statusTrimmed = statusRaw.trim();
      const jurusan = idx.jurusan !== -1 ? (row[idx.jurusan] || '') : '';
      const login = idx.login !== -1 ? (row[idx.login] || '') : '';

      return {
        row: index + 2,
        nisn: idx.nisn !== -1 ? row[idx.nisn] : '',
        nama: idx.nama !== -1 ? row[idx.nama] : '',
        rombel: idx.rombel !== -1 ? row[idx.rombel] : '',
        jurusan: jurusan,
        status_verval: statusTrimmed,
        status_kk: idx.status_kk !== -1 ? (row[idx.status_kk] || '-') : '-',
        terakhir_update: idx.update !== -1 ? row[idx.update] : '',
        terakhir_login: login,
        kelas: idx.kelas !== -1 ? (row[idx.kelas] || '-') : '-',
        akses_menu: idx.akses_menu !== -1 ? row[idx.akses_menu] : '',
        tempat_lahir: idx.tempat_lahir !== -1 ? row[idx.tempat_lahir] : '',
        tanggal_lahir: idx.tgl_lahir !== -1 ? row[idx.tgl_lahir] : '',
        nik: idx.nik !== -1 ? row[idx.nik] : '',
        agama: idx.agama !== -1 ? row[idx.agama] : '',
        no_kk: idx.no_kk !== -1 ? row[idx.no_kk] : '',
        reg_akta_lahir: idx.reg_akta !== -1 ? row[idx.reg_akta] : '',
        jk: idx.jk !== -1 ? row[idx.jk] : '',
        alamat_jalan: idx.alamat !== -1 ? row[idx.alamat] : '',
        rt: idx.rt !== -1 ? row[idx.rt] : '',
        rw: idx.rw !== -1 ? row[idx.rw] : '',
        kel: idx.kel !== -1 ? row[idx.kel] : '',
        kec: idx.kec !== -1 ? row[idx.kec] : '',
        kab_kota: idx.kab !== -1 ? row[idx.kab] : '',
        nama_wil: idx.nama_wil !== -1 ? row[idx.nama_wil] : '',
        wilayah: idx.nama_wil !== -1 ? row[idx.nama_wil] : '',
        kode_pos: idx.kodepos !== -1 ? row[idx.kodepos] : '',
        jenis_tinggal: idx.tinggal !== -1 ? row[idx.tinggal] : '',
        alat_transportasi: idx.transport !== -1 ? row[idx.transport] : '',
        no_hp: idx.hp !== -1 ? row[idx.hp] : '',
        email: idx.email !== -1 ? row[idx.email] : '',
        upload_ijazah: idx.upload_ijazah !== -1 ? row[idx.upload_ijazah] : '',
        upload_kk: idx.upload_kk !== -1 ? row[idx.upload_kk] : '',
        status_hidup_ayah: idx.status_hidup_ayah !== -1 ? row[idx.status_hidup_ayah] : '',
        status_hidup_ibu: idx.status_hidup_ibu !== -1 ? row[idx.status_hidup_ibu] : '',
        nama_ayah: idx.nama_ayah !== -1 ? row[idx.nama_ayah] : '',
        nik_ayah: idx.nik_ayah !== -1 ? row[idx.nik_ayah] : '',
        tahun_lahir_ayah: idx.thn_lahir_ayah !== -1 ? row[idx.thn_lahir_ayah] : '',
        jenjang_pendidikan_ayah: idx.pend_ayah !== -1 ? row[idx.pend_ayah] : '',
        pekerjaan_ayah: idx.kerja_ayah !== -1 ? row[idx.kerja_ayah] : '',
        penghasilan_ayah: idx.hasil_ayah !== -1 ? row[idx.hasil_ayah] : '',
        nama_ibu: idx.nama_ibu !== -1 ? row[idx.nama_ibu] : '',
        nik_ibu: idx.nik_ibu !== -1 ? row[idx.nik_ibu] : '',
        tahun_lahir_ibu: idx.thn_lahir_ibu !== -1 ? row[idx.thn_lahir_ibu] : '',
        jenjang_pendidikan_ibu: idx.pend_ibu !== -1 ? row[idx.pend_ibu] : '',
        pekerjaan_ibu: idx.kerja_ibu !== -1 ? row[idx.kerja_ibu] : '',
        penghasilan_ibu: idx.hasil_ibu !== -1 ? row[idx.hasil_ibu] : '',
        sekolah_asal: idx.sekolah_asal !== -1 ? row[idx.sekolah_asal] : '',
        id_hobby: idx.hobby !== -1 ? row[idx.hobby] : '',
        id_cita: idx.cita !== -1 ? row[idx.cita] : '',
        no_peserta_ujian: idx.no_ujian !== -1 ? row[idx.no_ujian] : '',
        no_seri_ijazah: idx.no_ijazah !== -1 ? row[idx.no_ijazah] : '',
        tinggi_badan: idx.tinggi !== -1 ? row[idx.tinggi] : '',
        berat_badan: idx.berat !== -1 ? row[idx.berat] : '',
        lingkar_kepala: idx.lingkar !== -1 ? row[idx.lingkar] : '',
        jumlah_saudara_kandung: idx.saudara !== -1 ? row[idx.saudara] : '',
        anak_ke: idx.anak_ke !== -1 ? row[idx.anak_ke] : '',
        jarak_rumah_ke_sekolah: idx.jarak !== -1 ? row[idx.jarak] : '',
        sebutkan_berapa_kilometer: idx.jarak_km !== -1 ? row[idx.jarak_km] : '',
        waktu_tempuh_ke_sekolah_menit: idx.waktu !== -1 ? row[idx.waktu] : '',
        data_salah: idx.data_salah !== -1 ? row[idx.data_salah] : '',
        nama_verval: idx.nama_verval !== -1 ? row[idx.nama_verval] : '',
        tempat_lahir_verval: idx.tempat_lahir_verval !== -1 ? row[idx.tempat_lahir_verval] : '',
        tanggal_lahir_verval: idx.tanggal_lahir_verval !== -1 ? row[idx.tanggal_lahir_verval] : '',
        data_salah_kk: idx.data_salah_kk !== -1 ? row[idx.data_salah_kk] : '',
        nama_kk: idx.nama_kk !== -1 ? row[idx.nama_kk] : '',
        tempat_lahir_kk: idx.tempat_lahir_kk !== -1 ? row[idx.tempat_lahir_kk] : '',
        tanggal_lahir_kk: idx.tanggal_lahir_kk !== -1 ? row[idx.tanggal_lahir_kk] : '',
        status_kunci: idx.status_kunci !== -1 ? row[idx.status_kunci] : ''
      };
    });

    // Saring hanya siswa valid (bukan baris kosong atau baris indeks rumus/header)
    const students = rawStudents.filter(isValidStudent);
    const stats = calculateStudentStats(students);

    // Process kurang mampu
    let kurangMampu: any[] = [];
    if (kmRows.length > 1) {
      const kmHeaders = kmRows[0].map(h => h.toLowerCase().trim());
      const kmIdx = {
        nisn: kmHeaders.indexOf('nisn'),
        nama: kmHeaders.indexOf('nama'),
        rombel: kmHeaders.indexOf('rombel'),
        km: kmHeaders.indexOf('kurang_mampu'),
        ket_kip: kmHeaders.indexOf('ket_kip'),
        no_kip: kmHeaders.indexOf('no_kip'),
        nama_kip: kmHeaders.indexOf('nama_di_kip'),
        kartu_lain: kmHeaders.indexOf('kartu_lain'),
        nama_kartu: kmHeaders.indexOf('nama_dikartu'),
        no_kartu: kmHeaders.indexOf('no_kartu')
      };
      kurangMampu = kmRows.slice(1).map(r => ({
        nisn: kmIdx.nisn !== -1 ? r[kmIdx.nisn] : '',
        nama: kmIdx.nama !== -1 ? r[kmIdx.nama] : '',
        rombel: kmIdx.rombel !== -1 ? r[kmIdx.rombel] : '',
        kurang_mampu: kmIdx.km !== -1 ? r[kmIdx.km] : '',
        ket_kip: kmIdx.ket_kip !== -1 ? r[kmIdx.ket_kip] : '',
        no_kip: kmIdx.no_kip !== -1 ? r[kmIdx.no_kip] : '',
        nama_di_kip: kmIdx.nama_kip !== -1 ? r[kmIdx.nama_kip] : '',
        kartu_lain: kmIdx.kartu_lain !== -1 ? r[kmIdx.kartu_lain] : '',
        nama_dikartu: kmIdx.nama_kartu !== -1 ? r[kmIdx.nama_kartu] : '',
        no_kartu: kmIdx.no_kartu !== -1 ? r[kmIdx.no_kartu] : ''
      })).filter(isValidStudent);
    }

    // Process notifikasi
    let notifications: any[] = [];
    if (notifRows.length > 1) {
      const nHeaders = notifRows[0].map(h => h.toLowerCase().trim());
      const nIdx = {
        tanggal: nHeaders.indexOf('tanggal'),
        judul: nHeaders.indexOf('judul'),
        pesan: nHeaders.indexOf('pesan'),
        tipe: nHeaders.indexOf('tipe'),
        nisn_target: nHeaders.indexOf('nisn_target'),
        target_kelas: nHeaders.indexOf('kelas_target')
      };
      notifications = notifRows.slice(1).map((r, i) => ({
        row: i + 2,
        tanggal: nIdx.tanggal !== -1 ? r[nIdx.tanggal] : '',
        judul: nIdx.judul !== -1 ? r[nIdx.judul] : '',
        pesan: nIdx.pesan !== -1 ? r[nIdx.pesan] : '',
        tipe: nIdx.tipe !== -1 ? r[nIdx.tipe] : 'info',
        nisn_target: nIdx.nisn_target !== -1 ? r[nIdx.nisn_target] : '',
        target_kelas: nIdx.target_kelas !== -1 ? r[nIdx.target_kelas] : ''
      })).reverse();
    }

    return {
      success: true,
      students,
      kurangMampu,
      notifications,
      stats,
      source: 'sheets'
    };
  } catch (sheetErr: any) {
    console.error("Gagal membaca Google Spreadsheet langsung:", sheetErr);
    return {
      success: false,
      students: [],
      kurangMampu: [],
      notifications: [],
      stats: null,
      source: 'sheets',
      error: `Gagal memuat data dari Spreadsheet: ${sheetErr.message}`
    };
  }
}
