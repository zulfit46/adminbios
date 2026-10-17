/**
 * Helper untuk menerjemahkan kode angka/ID Dapodik menjadi nama yang dapat dibaca manusia.
 */

// Mapping Agama
export const AGAMA_MAP: Record<string, string> = {
  "1": "Islam",
  "01": "Islam",
  "2": "Kristen",
  "02": "Kristen",
  "3": "Katholik",
  "03": "Katholik",
  "4": "Hindu",
  "04": "Hindu",
  "5": "Budha",
  "05": "Budha",
  "6": "Khonghucu",
  "06": "Khonghucu",
  "7": "Kepercayaan kpd Tuhan YME",
  "07": "Kepercayaan kpd Tuhan YME",
  "99": "lainnya",
};

// Mapping Jenis Tinggal
export const JENIS_TINGGAL_MAP: Record<string, string> = {
  "1": "Bersama orang tua",
  "01": "Bersama orang tua",
  "2": "Wali",
  "02": "Wali",
  "3": "Kost",
  "03": "Kost",
  "4": "Asrama",
  "04": "Asrama",
  "5": "Panti asuhan",
  "05": "Panti asuhan",
  "10": "Pesantren",
  "99": "Lainnya",
};

// Mapping Alat Transportasi (Moda Transportasi)
export const ALAT_TRANSPORTASI_MAP: Record<string, string> = {
  "1": "Jalan kaki",
  "01": "Jalan kaki",
  "3": "Angkutan umum/bus/pete-pete",
  "03": "Angkutan umum/bus/pete-pete",
  "4": "Mobil/bus antar jemput",
  "04": "Mobil/bus antar jemput",
  "5": "Kereta api",
  "05": "Kereta api",
  "6": "Ojek",
  "06": "Ojek",
  "7": "Andong/bendi/sado/dokar/delman/becak",
  "07": "Andong/bendi/sado/dokar/delman/becak",
  "8": "Perahu penyeberangan/rakit/getek",
  "08": "Perahu penyeberangan/rakit/getek",
  "11": "Kuda",
  "12": "Sepeda",
  "13": "Sepeda motor",
  "14": "Mobil pribadi",
  "99": "Lainnya",
};

// Mapping Jenjang Pendidikan
export const JENJANG_PENDIDIKAN_MAP: Record<string, string> = {
  "0": "Tidak sekolah",
  "00": "Tidak sekolah",
  "1": "PAUD",
  "01": "PAUD",
  "2": "TK / sederajat",
  "02": "TK / sederajat",
  "3": "Putus SD",
  "03": "Putus SD",
  "4": "SD / sederajat",
  "04": "SD / sederajat",
  "5": "SMP / sederajat",
  "05": "SMP / sederajat",
  "6": "SMA / sederajat",
  "06": "SMA / sederajat",
  "7": "Paket A",
  "07": "Paket A",
  "8": "Paket B",
  "08": "Paket B",
  "9": "Paket C",
  "09": "Paket C",
  "20": "D1",
  "21": "D2",
  "22": "D3",
  "23": "D4",
  "30": "S1",
  "31": "Profesi",
  "32": "Sp-1",
  "35": "S2",
  "36": "S2 Terapan",
  "37": "Sp-2",
  "40": "S3",
  "41": "S3 Terapan",
  "90": "Non formal",
  "91": "Informal",
  "99": "Lainnya",
};

// Mapping Pekerjaan
export const PEKERJAAN_MAP: Record<string, string> = {
  "-1": "Tidak Diisi",
  "0": "Tidak bekerja",
  "00": "Tidak bekerja",
  "1": "Tidak bekerja",
  "01": "Tidak bekerja",
  "2": "Nelayan",
  "02": "Nelayan",
  "3": "Petani",
  "03": "Petani",
  "4": "Peternak",
  "04": "Peternak",
  "5": "PNS/TNI/Polri",
  "05": "PNS/TNI/Polri",
  "6": "Karyawan Swasta",
  "06": "Karyawan Swasta",
  "7": "Pedagang Kecil",
  "07": "Pedagang Kecil",
  "8": "Pedagang Besar",
  "08": "Pedagang Besar",
  "9": "Wiraswasta",
  "09": "Wiraswasta",
  "10": "Wirausaha",
  "11": "Buruh",
  "12": "Pensiunan",
  "13": "Tenaga Kerja Indonesia",
  "14": "Karyawan BUMN",
  "90": "Tidak dapat diterapkan",
  "98": "Sudah Meninggal",
  "99": "Lainnya",
};

// Mapping Penghasilan
export const PENGHASILAN_MAP: Record<string, string> = {
  "-1": "Tidak Diisi",
  "0": "Tidak Berpenghasilan",
  "00": "Tidak Berpenghasilan",
  "1": "Kurang dari Rp. 500,000",
  "01": "Kurang dari Rp. 500,000",
  "11": "Kurang dari Rp. 500,000",
  "2": "Rp. 500,000 - Rp. 999,999",
  "02": "Rp. 500,000 - Rp. 999,999",
  "12": "Rp. 500,000 - Rp. 999,999",
  "3": "Rp. 1,000,000 - Rp. 1,999,999",
  "03": "Rp. 1,000,000 - Rp. 1,999,999",
  "13": "Rp. 1,000,000 - Rp. 1,999,999",
  "4": "Rp. 2,000,000 - Rp. 4,999,999",
  "04": "Rp. 2,000,000 - Rp. 4,999,999",
  "14": "Rp. 2,000,000 - Rp. 4,999,999",
  "5": "Rp. 5,000,000 - Rp. 20,000,000",
  "05": "Rp. 5,000,000 - Rp. 20,000,000",
  "15": "Rp. 5,000,000 - Rp. 20,000,000",
  "6": "Lebih dari Rp. 20,000,000",
  "06": "Lebih dari Rp. 20,000,000",
  "16": "Lebih dari Rp. 20,000,000",
  "17": "< Rp1.000.000",
  "18": "Rp1.000.001 – Rp3.000.000",
  "98": "Sudah Meninggal",
  "99": "Tidak Berpenghasilan",
};

// Mapping Status Hidup
export const STATUS_HIDUP_MAP: Record<string, string> = {
  "1": "Masih Hidup",
  "01": "Masih Hidup",
  "2": "Sudah Meninggal",
  "02": "Sudah Meninggal",
  "3": "Sudah Meninggal",
  "03": "Sudah Meninggal",
  "4": "Tidak Diketahui",
  "98": "Sudah Meninggal",
};

// Mapping Hobi
export const HOBI_MAP: Record<string, string> = {
  "-1": "Tidak Diisi",
  "1": "Olah Raga",
  "01": "Olah Raga",
  "2": "Kesenian",
  "02": "Kesenian",
  "3": "Membaca",
  "03": "Membaca",
  "4": "Menulis",
  "04": "Menulis",
  "5": "Traveling",
  "05": "Traveling",
  "6": "Lainnya",
  "06": "Lainnya",
  "11": "Fotografi",
  "12": "Fitness",
  "13": "Belanja",
  "14": "Menggambar",
  "15": "Bermain Musik",
  "16": "mendaki",
  "17": "Jogging",
  "18": "Bermain Gitar",
  "19": "Bermain Bola",
  "20": "Bermain Bulu Tangkis",
  "21": "Bermain Bola Tenis",
  "22": "Bermain Biola",
  "23": "Bermain Piano",
  "24": "Berlari",
  "25": "Berkemah",
  "26": "Memancing",
  "27": "Berselancar",
  "28": "Bermain Gitar",
  "29": "Bermain Boneka",
  "30": "Makan",
  "31": "Menjahit",
  "32": "Main Puzzle",
  "33": "Mewarnai",
  "99": "Lainnya",
};

// Mapping Cita-cita
export const CITA_MAP: Record<string, string> = {
  "-1": "Tidak Diisi",
  "1": "PNS",
  "01": "PNS",
  "2": "TNI/Polri",
  "02": "TNI/Polri",
  "3": "Guru/Dosen",
  "03": "Guru/Dosen",
  "4": "Dokter",
  "04": "Dokter",
  "5": "Politikus",
  "05": "Politikus",
  "6": "Wiraswasta",
  "06": "Wiraswasta",
  "7": "Seni/Lukis/Artis/Sejenis",
  "07": "Seni/Lukis/Artis/Sejenis",
  "8": "Lainnya",
  "08": "Lainnya",
  "11": "Penghafal Al-Qur'an",
  "12": "Atlet E-Sport Profesional",
  "13": "Atlet",
  "14": "Content Creator",
  "15": "Vloger",
  "16": "Koki",
  "17": "Pendeta",
  "18": "Perawat",
  "19": "Pilot",
  "20": "Pembalap",
  "21": "Atlit Olahraga",
  "22": "Pengacara",
  "23": "Da'i / Ustadz",
  "24": "Entertainer / Pekerja Seni",
  "25": "Wartawan",
  "26": "Pengusaha / Bisnismen",
  "27": "Penulis",
  "28": "Penyiar Radio",
  "29": "Pembawa Acara / Master Ceremony",
  "30": "Polisi",
  "31": "Pemadam Kebakaran",
  "32": "Astronot",
  "33": "Masinis Kereta Api",
  "34": "Perawat / Suster",
  "35": "Bidan",
  "36": "Presiden",
  "37": "Pegawai Negeri Sipil / PNS",
  "38": "Translator",
  "39": "Designer",
  "40": "Pelaut",
  "41": "Arsitek",
  "99": "Lainnya",
};

// Mapping Jarak Rumah
export const JARAK_MAP: Record<string, string> = {
  "1": "Kurang dari 1 km",
  "01": "Kurang dari 1 km",
  "2": "Lebih dari 1 km",
  "02": "Lebih dari 1 km",
};

// Helper format generic
function getMappedOrOriginal(val: any, map: Record<string, string>, defaultEmpty = "-"): string {
  if (val === undefined || val === null) return defaultEmpty;
  const str = val.toString().trim();
  if (str === "" || str === "-" || str === "-1") return defaultEmpty;

  // Exact match
  if (map[str]) return map[str];

  // Strip trailing .0 from Google Sheets float formatting (e.g. "99.0" -> "99")
  const cleanNum = str.replace(/\.0+$/, "");
  if (map[cleanNum]) return map[cleanNum];

  // Padded with zero (e.g. "1" -> "01")
  if (/^\d$/.test(cleanNum)) {
    const padded = cleanNum.padStart(2, "0");
    if (map[padded]) return map[padded];
  }

  // Unpadded (e.g. "09" -> "9")
  const unpadded = cleanNum.replace(/^0+/, "");
  if (unpadded && map[unpadded]) return map[unpadded];

  return str;
}

export function formatAgama(val: any): string {
  return getMappedOrOriginal(val, AGAMA_MAP);
}

export function formatJenisKelamin(val: any): string {
  if (val === undefined || val === null) return "-";
  const str = val.toString().trim().toUpperCase();
  if (str === "L" || str === "1" || str === "LAKI-LAKI") return "Laki-laki";
  if (str === "P" || str === "2" || str === "PEREMPUAN") return "Perempuan";
  return val.toString().trim() || "-";
}

export function formatJenisTinggal(val: any): string {
  return getMappedOrOriginal(val, JENIS_TINGGAL_MAP);
}

export function formatAlatTransportasi(val: any): string {
  return getMappedOrOriginal(val, ALAT_TRANSPORTASI_MAP);
}

export function formatJenjangPendidikan(val: any): string {
  return getMappedOrOriginal(val, JENJANG_PENDIDIKAN_MAP);
}

export function formatPekerjaan(val: any): string {
  return getMappedOrOriginal(val, PEKERJAAN_MAP);
}

export function formatPenghasilan(val: any): string {
  return getMappedOrOriginal(val, PENGHASILAN_MAP);
}

export function formatStatusHidup(val: any): string {
  return getMappedOrOriginal(val, STATUS_HIDUP_MAP);
}

export function formatHobi(val: any): string {
  return getMappedOrOriginal(val, HOBI_MAP);
}

export function formatCitaCita(val: any): string {
  return getMappedOrOriginal(val, CITA_MAP);
}

export function formatJarak(val: any): string {
  return getMappedOrOriginal(val, JARAK_MAP);
}

export function formatKurangMampu(val: any): string {
  if (val === undefined || val === null) return "-";
  const str = val.toString().trim().toUpperCase();
  if (str === "1" || str === "Y" || str === "YA") return "Ya";
  if (str === "0" || str === "T" || str === "TIDAK") return "Tidak";
  return val.toString().trim() || "-";
}
