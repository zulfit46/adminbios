/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Bell, Search, 
  CheckCircle, Clock, Send, LogIn, AlertCircle,
  Trash2, RefreshCw, ChevronRight, LogOut,
  Menu, X, TrendingUp, TrendingDown,
  MoreHorizontal, Globe, User, Settings,
  FileText, CreditCard, Layout, ShieldCheck,
  Edit2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend
} from 'recharts';

// GANTI DENGAN URL DEPLOY ADMIN BACKEND ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbzi-HtfbXyceKafIsQXTRs62LwxeVdwtgs2QZJzpxNsFA1v0QgFVHH037sTo8pCXfqR/exec";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('data');
  const [activeSubTab, setActiveSubTab] = useState('rekap');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [kurangMampu, setKurangMampu] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [rombelFilter, setRombelFilter] = useState("Semua");
  const [vervalFilter, setVervalFilter] = useState("Semua");
  const [statusVervalFilter, setStatusVervalFilter] = useState("Semua");
  const [statusKKFilter, setStatusKKFilter] = useState("Semua");
  const [loginFilter, setLoginFilter] = useState("Semua");
  const [notifForm, setNotifForm] = useState({ judul: '', pesan: '', tipe: 'info', nisn_target: '', target_kelas: '' });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditingNotif, setIsEditingNotif] = useState(false);
  const [editingNotifRow, setEditingNotifRow] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notifRowToDelete, setNotifRowToDelete] = useState<number | null>(null);
  const [siswaToDelete, setSiswaToDelete] = useState<string | null>(null);
  const [showSiswaDeleteConfirm, setShowSiswaDeleteConfirm] = useState(false);
  const [aksesForm, setAksesForm] = useState({ target_kelas: '', selected_menus: [] as string[] });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Login Logic
  const handleLogin = async (loginId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}?action=login&login=${loginId}`);
      const result = await res.json();
      if (result.success) {
        setUser(result.user);
        if (result.user.status !== 'admin' && result.user.rombel) {
          const rList = result.user.rombel.toString().split(',').map((r: string) => r.trim()).filter(Boolean);
          if (rList.length > 1) {
            setRombelFilter("Semua");
          } else if (rList.length === 1) {
            setRombelFilter(rList[0]);
          }
        }
        // Langsung tampilkan menu Data Siswa dan sub-menu Rekap Inputan
        setActiveTab('data');
        if (result.user.status !== 'admin' && result.user.akses_menu) {
          let rawAkses = result.user.akses_menu.toString();
          if (rawAkses.includes(':')) {
            rawAkses = rawAkses.split(':')[1].trim();
          }
          const allowed = rawAkses.split(',').map((m: string) => m.trim().toLowerCase());
          const hasRekap = allowed.includes('rekap') || allowed.includes('rekap_inputan');
          if (hasRekap || allowed.length === 0) {
            setActiveSubTab('rekap');
          } else {
            const validMenus = ['rekap', 'profil', 'ortu', 'registrasi', 'periodik', 'kurang_mampu', 'verval'];
            const firstMenu = allowed.find((m: string) => validMenus.includes(m));
            setActiveSubTab(firstMenu || 'rekap');
          }
        } else {
          setActiveSubTab('rekap');
        }
        fetchData();
      } else {
        setError(result.error || "Login gagal. Periksa ID Login Anda.");
      }
    } catch (e: any) {
      setError("Gagal terhubung ke server login.");
    }
    setLoading(false);
  };

  const handleSendNotif = async () => {
    if (!notifForm.judul || !notifForm.pesan) {
      setError("Judul dan Pesan harus diisi!");
      return;
    }
    setLoading(true);
    try {
      const action = isEditingNotif ? 'update_notif' : 'send_notif';
      const body = isEditingNotif ? { ...notifForm, row: editingNotifRow } : notifForm;
      
      const res = await fetch(`${API_URL}?action=${action}`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.success) {
        setNotifForm({ judul: '', pesan: '', tipe: 'info', nisn_target: '', target_kelas: '' });
        setIsEditingNotif(false);
        setEditingNotifRow(null);
        fetchData();
      } else {
        setError(result.error || "Gagal memproses notifikasi");
      }
    } catch (e: any) {
      setError("Gagal terhubung ke server.");
    }
    setLoading(false);
  };

  const handleDeleteNotif = (row: number) => {
    setNotifRowToDelete(row);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteNotif = async () => {
    if (notifRowToDelete === null) return;
    setLoading(true);
    setShowDeleteConfirm(false);
    try {
      const res = await fetch(`${API_URL}?action=delete_notif`, {
        method: 'POST',
        body: JSON.stringify({ row: notifRowToDelete })
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        setError(result.error || "Gagal menghapus notifikasi");
      }
    } catch (e: any) {
      setError("Gagal terhubung ke server.");
    }
    setNotifRowToDelete(null);
    setLoading(false);
  };

  const handleDeleteSiswa = (nisn: string) => {
    setSiswaToDelete(nisn);
    setShowSiswaDeleteConfirm(true);
  };

  const confirmDeleteSiswa = async () => {
    if (!siswaToDelete) return;
    setLoading(true);
    setShowSiswaDeleteConfirm(false);
    try {
      const res = await fetch(`${API_URL}?action=delete_student`, {
        method: 'POST',
        body: JSON.stringify({ nisn: siswaToDelete })
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        setError(result.error || "Gagal menghapus data siswa");
      }
    } catch (e: any) {
      setError("Gagal terhubung ke server.");
    }
    setSiswaToDelete(null);
    setLoading(false);
  };

  const handleUpdateAkses = async () => {
    if (!aksesForm.target_kelas) {
      setError("Pilih minimal satu kelas target");
      return;
    }
    setLoading(true);
    try {
      // Jika memilih "ortu" di UI, disimpan sebagai "orangtua" di spreadsheet
      const formattedMenus = aksesForm.selected_menus.map((m: string) => m === 'ortu' ? 'orangtua' : m);
      const res = await fetch(`${API_URL}?action=update_akses_bulk`, {
        method: 'POST',
        body: JSON.stringify({
          target_kelas: aksesForm.target_kelas,
          akses_menu: formattedMenus.join(',')
        })
      });
      const result = await res.json();
      if (result.success) {
        setError(null);
        setSuccessMessage(result.message || "Pengaturan akses menu berhasil disimpan!");
        fetchData();
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        setError(result.error || "Gagal memperbarui akses");
      }
    } catch (err) {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}?action=get_all_data`);
      
      // Cek apakah respon sukses (200 OK)
      if (!res.ok) {
        throw new Error(`Server kembali dengan status ${res.status}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server tidak mengirimkan data JSON. Pastikan Web App sudah di-deploy dengan benar sebagai 'Anyone'.");
      }

      const result = await res.json();
      if (result.success) {
        setStudents(result.students || []);
        setKurangMampu(result.kurangMampu || []);
        setNotifications(result.notifications || []);
        setStats(result.stats || {});
      } else {
        setError(result.error || result.message || "Gagal mengambil data dari server.");
      }
    } catch (e: any) { 
      console.error("Fetch Error:", e);
      if (e.message.includes("Unexpected token")) {
        setError("Format data salah (Bukan JSON). Ini biasanya karena script Google Apps Script Anda error atau belum di-deploy sebagai 'Anyone'.");
      } else {
        setError(e.message || "Gagal terhubung ke server.");
      }
    }
    setLoading(false);
  };

  useEffect(() => { 
    if (user) fetchData(); 
  }, [user]);

  const userRombelList = useMemo(() => {
    if (!user || user.status === 'admin' || !user.rombel) return null;
    const list = user.rombel.toString().split(',').map((r: string) => r.trim()).filter(Boolean);
    return list.length > 0 ? list : null;
  }, [user]);

  const filteredStudents = students
    .filter(s => {
      const matchesSearch = (s.nama || "").toLowerCase().includes(search.toLowerCase()) || 
                           (s.nisn || "").includes(search);
      
      // Filter Rombel
      let matchesRombel = true;
      const sRombel = (s.rombel || "").toString().trim();
      if (userRombelList) {
        if (rombelFilter === "Semua") {
          matchesRombel = userRombelList.includes(sRombel);
        } else {
          matchesRombel = sRombel === rombelFilter && userRombelList.includes(sRombel);
        }
      } else {
        matchesRombel = rombelFilter === "Semua" || sRombel === rombelFilter;
      }

      // Filter Verval
      const matchesVerval = vervalFilter === "Semua" || 
                           (vervalFilter === "Sudah Verval" && (s.status_verval || "").toString().trim() !== "") ||
                           (vervalFilter === "Belum Verval" && (s.status_verval || "").toString().trim() === "");

      // Filter Status Verval (Admin Only)
      const matchesStatusVerval = user?.status !== 'admin' || statusVervalFilter === "Semua" || s.status_verval === statusVervalFilter;
      
      // Filter Status KK (Admin Only)
      const matchesStatusKK = user?.status !== 'admin' || statusKKFilter === "Semua" || s.status_kk === statusKKFilter;
      
      // Filter Login
      const loginData = s.terakhir_login || s.terakhir_login_siswa || "";
      const hasLoggedIn = loginData.toString().trim() !== "";
      const matchesLogin = loginFilter === "Semua" || 
                          (loginFilter === "Sudah Login" && hasLoggedIn) ||
                          (loginFilter === "Belum Login" && !hasLoggedIn);
      
      return matchesSearch && matchesRombel && matchesVerval && matchesStatusVerval && matchesStatusKK && matchesLogin;
    })
    .sort((a, b) => {
      const rombelA = (a.rombel || "").toString();
      const rombelB = (b.rombel || "").toString();
      const res = rombelA.localeCompare(rombelB, undefined, { numeric: true, sensitivity: 'base' });
      if (res !== 0) return res;
      
      const jurusanA = (a.jurusan || "").toString();
      const jurusanB = (b.jurusan || "").toString();
      return jurusanA.localeCompare(jurusanB, undefined, { numeric: true, sensitivity: 'base' });
    });

  const filteredKurangMampu = kurangMampu
    .filter(s => {
      const matchesSearch = (s.nama || "").toLowerCase().includes(search.toLowerCase()) || 
                           (s.nisn || "").includes(search);
      
      let matchesRombel = true;
      const sRombel = (s.rombel || "").toString().trim();
      if (userRombelList) {
        if (rombelFilter === "Semua") {
          matchesRombel = userRombelList.includes(sRombel);
        } else {
          matchesRombel = sRombel === rombelFilter && userRombelList.includes(sRombel);
        }
      } else {
        matchesRombel = rombelFilter === "Semua" || sRombel === rombelFilter;
      }
      
      return matchesSearch && matchesRombel;
    })
    .sort((a, b) => {
      const rombelA = (a.rombel || "").toString();
      const rombelB = (b.rombel || "").toString();
      return rombelA.localeCompare(rombelB, undefined, { numeric: true, sensitivity: 'base' });
    });

  const getClassFromStudent = (s: any) => {
    if (s.kelas && s.kelas !== "-" && s.kelas.toString().trim() !== "") {
      return s.kelas.toString().trim();
    }
    if (s.rombel && s.rombel !== "-" && s.rombel.toString().trim() !== "") {
      const r = s.rombel.toString().trim();
      const numMatch = r.match(/^(10|11|12|[789])/);
      if (numMatch) return numMatch[0];
      
      const romanMatch = r.match(/^(XII|XI|X|VII|VIII|IX)\b/i);
      if (romanMatch) {
        const rm = romanMatch[0].toUpperCase();
        if (rm === 'X') return '10';
        if (rm === 'XI') return '11';
        if (rm === 'XII') return '12';
        return rm;
      }
      return r;
    }
    return null;
  };

  const uniqueRombels = useMemo(() => {
    const allDbRombels = Array.from(new Set(students.map(s => s.rombel).filter(Boolean))).sort();
    if (user?.status === 'admin' || !userRombelList) {
      return ["Semua", ...allDbRombels];
    }
    if (userRombelList.length > 1) {
      return ["Semua", ...Array.from(new Set(userRombelList)).sort()];
    }
    return userRombelList;
  }, [students, user, userRombelList]);

  const uniqueStatusVerval = ["Semua", ...new Set(students.map(s => s.status_verval).filter(Boolean))].sort();
  const uniqueStatusKK = ["Semua", ...new Set(students.map(s => s.status_kk).filter(Boolean))].sort();

  const extractedClasses: string[] = Array.from(
    new Set(
      students
        .map(s => getClassFromStudent(s))
        .filter((c): c is string => typeof c === 'string' && c.length > 0 && c !== "-")
    )
  );
  const defaultClasses: string[] = ["10", "11", "12"];
  const validClasses: string[] = Array.from(new Set<string>([...extractedClasses, ...defaultClasses]))
    .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const uniqueClasses = ["Semua", ...validClasses];

  // Calculate stats based on user scope (Admin = All, User/Kaprog = Their Assigned Rombels)
  const studentsInScope = useMemo(() => {
    if (userRombelList) {
      return students.filter(s => userRombelList.includes((s.rombel || "").toString().trim()));
    }
    return students;
  }, [students, userRombelList]);

  const displayStats = useMemo(() => {
    if (!studentsInScope.length) return null;
    
    const statsObj = {
      total_siswa: studentsInScope.length,
      total_verval: 0,
      total_pending: 0,
      total_login: 0,
      per_jurusan: {} as any
    };

    studentsInScope.forEach(s => {
      const status = (s.status_verval || "").toString().trim();
      if (status !== "") statsObj.total_verval++;
      else statsObj.total_pending++;

      if (s.terakhir_login && s.terakhir_login.toString().trim() !== "") {
        statsObj.total_login++;
      }

      if (s.jurusan) {
        statsObj.per_jurusan[s.jurusan] = (statsObj.per_jurusan[s.jurusan] || 0) + 1;
      }
    });

    return statsObj;
  }, [studentsInScope]);

  const userNotifications = useMemo(() => {
    if (user?.status === 'admin') return notifications;
    
    return notifications.filter(n => {
      // Jika ada NISN target, harus cocok
      if (n.nisn_target && n.nisn_target.toString().trim() !== "") {
        return n.nisn_target.toString() === user?.login?.toString() || n.nisn_target.toString() === user?.nisn?.toString();
      }
      
      // Jika ada target kelas, harus cocok
      if (n.target_kelas && n.target_kelas.toString().trim() !== "") {
        const targets = n.target_kelas.toString().split(',').map((t: string) => t.trim());
        return targets.includes(user?.kelas?.toString());
      }
      
      // Jika kosong semua, berarti untuk semua
      return true;
    });
  }, [notifications, user]);

  const isAllowed = (menu: string) => {
    if (user?.status === 'admin') return true;
    if (!user?.akses_menu) return true;
    let rawAkses = user.akses_menu.toString();
    if (rawAkses.includes(':')) {
      rawAkses = rawAkses.split(':')[1].trim();
    }
    const allowed = rawAkses.split(',').map((m: any) => m.trim().toLowerCase());
    const mLower = menu.toLowerCase();
    return allowed.includes(mLower) ||
           (mLower === 'ortu' && (allowed.includes('orangtua') || allowed.includes('ortu'))) ||
           (mLower === 'orangtua' && (allowed.includes('ortu') || allowed.includes('orangtua'))) ||
           (mLower === 'rekap' && (allowed.includes('rekap_inputan') || allowed.includes('rekap')));
  };

  if (!user) {
    return <LoginView onLogin={handleLogin} loading={loading} error={error} />;
  }

  return (
    <div className="min-h-screen bg-[#080a1a] text-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-[#111633] border-b border-white/10 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Layout className="text-white" size={20} />
          </div>
          <h1 className="text-lg font-bold text-white">
            {user.status === 'user' ? 'Wali Kelas' : 'Admin Dapodik'}
          </h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* SIDEBAR OVERLAY (MOBILE) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50 w-72 bg-[#0d1117] border-r border-white/5 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#3b82f6] tracking-tight">
              {user.status === 'user' ? 'Wali Kelas' : 'Admin Dapodik'}
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Management System</p>
          </div>

          <div className="bg-[#161b22] rounded-2xl p-4 mb-8 border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Logged in as</p>
            <p className="text-sm font-bold text-[#3b82f6] truncate">{user.nama}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{user.status}</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          
          <div className="space-y-1">
            <NavItem 
              active={activeTab === 'data'} 
              onClick={() => { setActiveTab('data'); setIsSidebarOpen(false); }} 
              icon={<Users size={20}/>} 
              label="Data Siswa" 
              hasSubmenu 
              isOpen={activeTab === 'data'}
            />
            
            {activeTab === 'data' && (
              <div className="ml-6 pl-4 border-l border-white/10 space-y-1 mt-1 mb-2">
                {isAllowed('rekap') && <SubNavItem active={activeSubTab === 'rekap'} onClick={() => { setActiveSubTab('rekap'); setIsSidebarOpen(false); }} label="Rekap Inputan" />}
                {isAllowed('profil') && <SubNavItem active={activeSubTab === 'profil'} onClick={() => { setActiveSubTab('profil'); setIsSidebarOpen(false); }} label="Profil Siswa" />}
                {isAllowed('ortu') && <SubNavItem active={activeSubTab === 'ortu'} onClick={() => { setActiveSubTab('ortu'); setIsSidebarOpen(false); }} label="Data Orang Tua" />}
                {isAllowed('registrasi') && <SubNavItem active={activeSubTab === 'registrasi'} onClick={() => { setActiveSubTab('registrasi'); setIsSidebarOpen(false); }} label="Registrasi" />}
                {isAllowed('periodik') && <SubNavItem active={activeSubTab === 'periodik'} onClick={() => { setActiveSubTab('periodik'); setIsSidebarOpen(false); }} label="Data Periodik" />}
                {isAllowed('kurang_mampu') && <SubNavItem active={activeSubTab === 'kurang_mampu'} onClick={() => { setActiveSubTab('kurang_mampu'); setIsSidebarOpen(false); }} label="Murid Kurang Mampu" />}
                {isAllowed('verval') && <SubNavItem active={activeSubTab === 'verval'} onClick={() => { setActiveSubTab('verval'); setIsSidebarOpen(false); }} label="Verval Data" />}
              </div>
            )}
          </div>

          {isAllowed('notifikasi') && (
            <NavItem active={activeTab === 'notif'} onClick={() => { setActiveTab('notif'); setIsSidebarOpen(false); }} icon={<Bell size={20}/>} label="Notifikasi" />
          )}
          {isAllowed('akses_kontrol') && (
            <NavItem active={activeTab === 'akses'} onClick={() => { setActiveTab('akses'); setIsSidebarOpen(false); }} icon={<ShieldCheck size={20}/>} label="Akses Menu" />
          )}
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={() => { setUser(null); setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className="w-full py-3 bg-[#161b22] hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5"
          >
            Sign Out <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#080a1a]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {activeTab === 'data' && activeSubTab === 'verval' ? <div /> : (
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {activeTab === 'dashboard' ? 'Ringkasan Data' : 
                 activeTab === 'notif' ? 'Notifikasi' : 'Analytics'}
              </h1>
            )}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#111633] border border-white/10 rounded-lg text-[10px] font-bold text-slate-400">
                <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white">UK</span>
                <span>English</span>
              </div>
              <button className="p-2 bg-[#111633] border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full border-2 border-[#111633]"></span>
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-white">{user.nama}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">{user.status}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full border border-white/10 flex items-center justify-center text-white font-bold">
                  {user.nama.charAt(0)}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4">
              <AlertCircle className="text-red-500 shrink-0" size={24} />
              <div>
                <h3 className="text-red-500 font-bold">Terjadi Kesalahan</h3>
                <p className="text-sm text-red-400/80 mt-1">{error}</p>
                <button 
                  onClick={fetchData}
                  className="mt-3 text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Coba Lagi
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="h-full flex items-center justify-center py-20">
              <RefreshCw className="animate-spin text-purple-500" size={32} />
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardView stats={displayStats} notifications={userNotifications} user={user} students={students} />}
              {activeTab === 'data' && (
                <>
                  {activeSubTab === 'verval' && (
                    <DataSiswaView 
                      students={filteredStudents} 
                      search={search} 
                      setSearch={setSearch} 
                      rombelFilter={rombelFilter}
                      setRombelFilter={setRombelFilter}
                      vervalFilter={vervalFilter}
                      setVervalFilter={setVervalFilter}
                      statusVervalFilter={statusVervalFilter}
                      setStatusVervalFilter={setStatusVervalFilter}
                      statusKKFilter={statusKKFilter}
                      setStatusKKFilter={setStatusKKFilter}
                      loginFilter={loginFilter}
                      setLoginFilter={setLoginFilter}
                      uniqueRombels={uniqueRombels}
                      uniqueStatusVerval={uniqueStatusVerval}
                      uniqueStatusKK={uniqueStatusKK}
                      onRefresh={fetchData}
                      user={user}
                    />
                  )}
                  {activeSubTab === 'profil' && (
                    <ProfilSiswaView 
                      students={filteredStudents} 
                      search={search} 
                      setSearch={setSearch} 
                      rombelFilter={rombelFilter}
                      setRombelFilter={setRombelFilter}
                      uniqueRombels={uniqueRombels}
                      onRefresh={fetchData}
                      onDelete={handleDeleteSiswa}
                      user={user}
                    />
                  )}
                  {activeSubTab === 'ortu' && (
                    <OrangTuaView 
                      students={filteredStudents} 
                      search={search} 
                      setSearch={setSearch} 
                      rombelFilter={rombelFilter}
                      setRombelFilter={setRombelFilter}
                      uniqueRombels={uniqueRombels}
                      onRefresh={fetchData}
                      user={user}
                    />
                  )}
                  {activeSubTab === 'registrasi' && (
                    <RegistrasiView 
                      students={filteredStudents} 
                      search={search} 
                      setSearch={setSearch} 
                      rombelFilter={rombelFilter}
                      setRombelFilter={setRombelFilter}
                      uniqueRombels={uniqueRombels}
                      onRefresh={fetchData}
                      user={user}
                    />
                  )}
                  {activeSubTab === 'periodik' && (
                    <PeriodikView 
                      students={filteredStudents} 
                      search={search} 
                      setSearch={setSearch} 
                      rombelFilter={rombelFilter}
                      setRombelFilter={setRombelFilter}
                      uniqueRombels={uniqueRombels}
                      onRefresh={fetchData}
                      user={user}
                    />
                  )}
                  {activeSubTab === 'rekap' && (
                    <RekapInputanView 
                      students={filteredStudents} 
                      search={search} 
                      setSearch={setSearch} 
                      rombelFilter={rombelFilter}
                      setRombelFilter={setRombelFilter}
                      uniqueRombels={uniqueRombels}
                      onRefresh={fetchData}
                      user={user}
                    />
                  )}
                  {activeSubTab === 'kurang_mampu' && (
                    <KurangMampuView 
                      data={filteredKurangMampu} 
                      search={search} 
                      setSearch={setSearch} 
                      rombelFilter={rombelFilter}
                      setRombelFilter={setRombelFilter}
                      uniqueRombels={uniqueRombels}
                      onRefresh={fetchData}
                      user={user}
                    />
                  )}
                  {!['verval', 'profil', 'ortu', 'registrasi', 'periodik', 'rekap', 'kurang_mampu'].includes(activeSubTab) && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
                      <Clock size={48} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium">Menu Sedang Dikembangkan</p>
                      <p className="text-sm opacity-60">Sub menu ini akan segera tersedia.</p>
                    </div>
                  )}
                </>
              )}
              {activeTab === 'notif' && (
                <NotifView 
                  form={notifForm} 
                  setForm={setNotifForm} 
                  notifications={notifications} 
                  onSend={handleSendNotif}
                  onDelete={handleDeleteNotif}
                  onEdit={(notif: any) => {
                    setNotifForm({
                      judul: notif.judul,
                      pesan: notif.pesan,
                      tipe: notif.tipe,
                      nisn_target: notif.nisn_target,
                      target_kelas: notif.target_kelas
                    });
                    setIsEditingNotif(true);
                    setEditingNotifRow(notif.row);
                  }}
                  isEditing={isEditingNotif}
                  onCancelEdit={() => {
                    setNotifForm({ judul: '', pesan: '', tipe: 'info', nisn_target: '', target_kelas: '' });
                    setIsEditingNotif(false);
                    setEditingNotifRow(null);
                  }}
                  uniqueClasses={uniqueClasses}
                  loading={loading}
                />
              )}
              {activeTab === 'akses' && (
                <AksesMenuView 
                  form={aksesForm}
                  setForm={setAksesForm}
                  onSave={handleUpdateAkses}
                  uniqueClasses={uniqueClasses}
                  uniqueRombels={uniqueRombels}
                  loading={loading}
                  students={students}
                  successMessage={successMessage}
                  setSuccessMessage={setSuccessMessage}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Konfirmasi Hapus */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#111633] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">Hapus Pengumuman?</h3>
            <p className="text-slate-400 text-center text-sm mb-8">
              Tindakan ini tidak dapat dibatalkan. Pesan akan dihapus permanen dari riwayat.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-all"
              >
                Batal
              </button>
              <button 
                onClick={confirmDeleteNotif}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Siswa */}
      {showSiswaDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#111633] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">Hapus Data Siswa?</h3>
            <p className="text-slate-400 text-center text-sm mb-8">
              Tindakan ini tidak dapat dibatalkan. Data siswa dengan NISN {siswaToDelete} akan dihapus permanen.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSiswaDeleteConfirm(false)}
                className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-all"
              >
                Batal
              </button>
              <button 
                onClick={confirmDeleteSiswa}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---
function LoginView({ onLogin, loading, error }: any) {
  const [loginId, setLoginId] = useState("");

  return (
    <div className="min-h-screen bg-[#080a1a] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#111633]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-600/30">
            <Layout className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Form Login</h1>
          <p className="text-slate-400 text-sm mt-3">Silakan login untuk melanjutkan ke dashboard</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm animate-pulse">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); onLogin(loginId); }} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">ID Login</label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={20} />
              <input 
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Masukkan ID Login Anda"
                className="w-full bg-[#080a1a] border border-white/10 rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-purple-500/50 text-slate-200 transition-all placeholder:text-slate-600 shadow-inner"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-600/20 active:scale-[0.98] border border-white/10"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : (
              <>
                Masuk Sekarang <ChevronRight size={20} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-600 uppercase tracking-[0.2em] mt-12 font-bold">
          &copy; 2026 - App By Zulfitrah
        </p>
      </div>
    </div>
  );
}

function DashboardView({ stats, notifications, user, students }: { stats: any, notifications: any[], user?: any, students?: any[] }) {
  const isUser = user?.status === 'user';

  if (isUser) {
    const student = students?.find(s => s.nisn?.toString() === user?.login?.toString() || s.nama === user?.nama) || user || {};

    const REQUIRED_FIELDS = {
      profil: [
        'nama', 'jk', 'nipd', 'nisn', 'nik', 'agama',
        'tempat_lahir', 'tanggal_lahir', 'no_kk',
        'alamat_jalan', 'wilayah',
        'jenis_tinggal', 'alat_transportasi', 'no_hp', 'jurusan'
      ],
      ortu: [
        'nama_ayah', 'nik_ayah', 'tahun_lahir_ayah', 'jenjang_pendidikan_ayah', 'pekerjaan_ayah', 'penghasilan_ayah',
        'nama_ibu', 'nik_ibu', 'tahun_lahir_ibu', 'jenjang_pendidikan_ibu', 'pekerjaan_ibu', 'penghasilan_ibu'
      ],
      registrasi: [
        'sekolah_asal', 'id_hobby', 'id_cita'
      ],
      periodik: [
        'tinggi_badan', 'berat_badan', 'lingkar_kepala', 'jumlah_saudara_kandung', 
        'anak_ke', 'jarak_rumah_ke_sekolah', 'sebutkan_berapa_kilometer', 'waktu_tempuh_ke_sekolah_menit'
      ]
    };

    const isValValid = (val: any) => {
      if (val === undefined || val === null) return false;
      const str = val.toString().trim();
      return str !== "" && str !== "-";
    };

    const isParentMeninggal = (statusVal: any, kerjaVal: any) => {
      const s = statusVal ? statusVal.toString().trim().toLowerCase() : "";
      const k = kerjaVal ? kerjaVal.toString().trim().toLowerCase() : "";
      return s.includes("wafat") || s.includes("meninggal") || k.includes("meninggal") || k.includes("wafat");
    };

    const getOrtuCompletion = (st: any) => {
      if (!st) return 0;

      // Ayah
      const ayahWafat = isParentMeninggal(st.status_hidup_ayah, st.pekerjaan_ayah);
      let ayahTotal = 0;
      let ayahValid = 0;

      if (ayahWafat) {
        ayahTotal = 2;
        if (isValValid(st.nama_ayah)) ayahValid++;
        if (isValValid(st.status_hidup_ayah) || isParentMeninggal(st.status_hidup_ayah, st.pekerjaan_ayah)) ayahValid++;
      } else {
        ayahTotal = 7;
        if (isValValid(st.status_hidup_ayah)) ayahValid++;
        if (isValValid(st.nama_ayah)) ayahValid++;
        if (isValValid(st.nik_ayah)) ayahValid++;
        if (isValValid(st.tahun_lahir_ayah)) ayahValid++;
        if (isValValid(st.jenjang_pendidikan_ayah)) ayahValid++;
        if (isValValid(st.pekerjaan_ayah)) ayahValid++;
        if (isValValid(st.penghasilan_ayah)) ayahValid++;
      }

      // Ibu
      const ibuWafat = isParentMeninggal(st.status_hidup_ibu, st.pekerjaan_ibu);
      let ibuTotal = 0;
      let ibuValid = 0;

      if (ibuWafat) {
        ibuTotal = 2;
        if (isValValid(st.nama_ibu)) ibuValid++;
        if (isValValid(st.status_hidup_ibu) || isParentMeninggal(st.status_hidup_ibu, st.pekerjaan_ibu)) ibuValid++;
      } else {
        ibuTotal = 7;
        if (isValValid(st.status_hidup_ibu)) ibuValid++;
        if (isValValid(st.nama_ibu)) ibuValid++;
        if (isValValid(st.nik_ibu)) ibuValid++;
        if (isValValid(st.tahun_lahir_ibu)) ibuValid++;
        if (isValValid(st.jenjang_pendidikan_ibu)) ibuValid++;
        if (isValValid(st.pekerjaan_ibu)) ibuValid++;
        if (isValValid(st.penghasilan_ibu)) ibuValid++;
      }

      const totalReq = ayahTotal + ibuTotal;
      const totalVal = ayahValid + ibuValid;
      return totalReq > 0 ? Math.round((totalVal / totalReq) * 100) : 0;
    };

    const getPeriodikCompletion = (st: any) => {
      if (!st) return 0;
      let validCount = 0;

      // 1. Tinggi Badan (cm)
      if (isValValid(st.tinggi_badan) || isValValid(st.tinggi)) validCount++;
      // 2. Berat Badan (kg)
      if (isValValid(st.berat_badan) || isValValid(st.berat)) validCount++;
      // 3. Lingkar Kepala (cm)
      if (isValValid(st.lingkar_kepala) || isValValid(st.lingkar)) validCount++;
      // 4. Jumlah Saudara Kandung
      if (isValValid(st.jumlah_saudara_kandung) || isValValid(st.saudara)) validCount++;
      // 5. Anak Ke-
      if (isValValid(st.anak_ke) || isValValid(st.anak_ke_berapa)) validCount++;
      // 6. Jarak Tempat Tinggal ke Sekolah
      const jarakVal = (st.jarak_rumah_ke_sekolah || st.jarak_tempat_tinggal_ke_sekolah || st.jarak || "").toString().trim();
      if (isValValid(jarakVal)) validCount++;
      // 7. Waktu Tempuh ke Sekolah (Menit)
      if (isValValid(st.waktu_tempuh_ke_sekolah_menit) || isValValid(st.waktu_tempuh)) validCount++;

      // Logika Kondisional untuk Jarak
      const jarakLower = jarakVal.toLowerCase();
      const isLebihDari1Km = jarakLower.includes("lebih") || jarakLower.includes(">") || jarakLower.includes("lebih dari 1");

      let totalFields = 7;
      if (isLebihDari1Km) {
        totalFields = 8;
        if (isValValid(st.sebutkan_berapa_kilometer) || isValValid(st.sebutkan_berapa_km) || isValValid(st.jarak_km)) {
          validCount++;
        }
      }

      return Math.round((validCount / totalFields) * 100);
    };

    const getCompletion = (fields: string[]): number => {
      if (!fields || fields.length === 0) return 0;
      let count = 0;
      fields.forEach(f => {
        if (f === 'wilayah') {
          if (isValValid(student.nama_wil) || isValValid(student.wilayah) || isValValid(student.kel) || isValValid(student.kec) || isValValid(student.kab_kota)) count++;
        } else if (f === 'nipd') {
          if (isValValid(student.nipd) || isValValid(student.nipd_nisn) || isValValid(student.login) || isValValid(student.nisn)) count++;
        } else if (f === 'jurusan') {
          if (isValValid(student.jurusan) || isValValid(student.rombel)) count++;
        } else if (f === 'sebutkan_berapa_kilometer') {
          if (isValValid(student.sebutkan_berapa_kilometer) || isValValid(student.jarak_rumah_ke_sekolah)) count++;
        } else if (f === 'waktu_tempuh_ke_sekolah_menit') {
          if (isValValid(student.waktu_tempuh_ke_sekolah_menit) || isValValid(student.waktu_tempuh)) count++;
        } else if (f === 'id_hobby') {
          if (isValValid(student.id_hobby) || isValValid(student.hobi) || isValValid(student.hobby)) count++;
        } else if (f === 'id_cita') {
          if (isValValid(student.id_cita) || isValValid(student.id_cita_cita) || isValValid(student.cita_cita) || isValValid(student.cita)) count++;
        } else {
          if (isValValid(student[f])) count++;
        }
      });
      return Math.round((count / fields.length) * 100);
    };

    const profilPct = getCompletion(REQUIRED_FIELDS.profil);
    const ortuPct = getOrtuCompletion(student);
    const regPct = getCompletion(REQUIRED_FIELDS.registrasi);
    const periodikPct = getPeriodikCompletion(student);
    const totalPct = Math.round((profilPct + ortuPct + regPct + periodikPct) / 4);

    return (
      <div className="space-y-8 pb-10 animate-in fade-in duration-700">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Halo, {user?.nama || 'Siswa'}!</h2>
          <p className="text-slate-400 text-sm mt-1">Selamat datang di portal mandiri Dapodik SMKN 1 Palopo.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#111633] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Kelengkapan Data</p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-white">{totalPct}%</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                totalPct === 100 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {totalPct === 100 ? 'Sempurna' : 'Perlu Dilengkapi'}
              </span>
            </div>
          </div>

          <div className="bg-[#111633] border border-white/10 rounded-2xl p-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">NIPD</p>
            <span className="text-3xl font-bold text-white">{student.nipd || student.login || user?.login || '-'}</span>
          </div>

          <div className="bg-[#111633] border border-white/10 rounded-2xl p-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">NISN</p>
            <span className="text-3xl font-bold text-white">{student.nisn || user?.login || '-'}</span>
          </div>

          <div className="bg-[#111633] border border-white/10 rounded-2xl p-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rombel</p>
            <span className="text-3xl font-bold text-white">{student.rombel || user?.rombel || '-'}</span>
          </div>
        </div>

        <div className="bg-[#111633] border border-white/10 rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-white">Status Kelengkapan Data (Field Wajib)</h3>
            <span className="text-xs text-slate-500 italic">Dihitung otomatis berdasarkan keterisian data</span>
          </div>

          <div className="space-y-4">
            <div className="bg-[#080a1a] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Profil Saya
                </p>
                <p className="text-xs text-slate-500 mt-1">15 Field Wajib</p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-1/2">
                <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${profilPct}%` }}></div>
                </div>
                <span className={`text-xs font-bold shrink-0 ${profilPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  Lengkap ({profilPct}%)
                </span>
              </div>
            </div>

            <div className="bg-[#080a1a] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Data Orang Tua
                </p>
                <p className="text-xs text-slate-500 mt-1">12 Field Wajib</p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-1/2">
                <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${ortuPct}%` }}></div>
                </div>
                <span className={`text-xs font-bold shrink-0 ${ortuPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  Lengkap ({ortuPct}%)
                </span>
              </div>
            </div>

            <div className="bg-[#080a1a] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Registrasi Peserta Didik
                </p>
                <p className="text-xs text-slate-500 mt-1">3 Field Wajib</p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-1/2">
                <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${regPct}%` }}></div>
                </div>
                <span className={`text-xs font-bold shrink-0 ${regPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  Lengkap ({regPct}%)
                </span>
              </div>
            </div>

            <div className="bg-[#080a1a] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Data Periodik
                </p>
                <p className="text-xs text-slate-500 mt-1">8 Field Wajib</p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-1/2">
                <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${periodikPct}%` }}></div>
                </div>
                <span className={`text-xs font-bold shrink-0 ${periodikPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  Lengkap ({periodikPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const revenueData = [
    { name: 'Jan', current: 4000, subscribers: 2400, new: 2400 },
    { name: 'Feb', current: 3000, subscribers: 1398, new: 2210 },
    { name: 'Mar', current: 2000, subscribers: 9800, new: 2290 },
    { name: 'Apr', current: 2780, subscribers: 3908, new: 2000 },
    { name: 'May', current: 1890, subscribers: 4800, new: 2181 },
    { name: 'Jun', current: 2390, subscribers: 3800, new: 2500 },
    { name: 'Jul', current: 3490, subscribers: 4300, new: 2100 },
    { name: 'Aug', current: 4000, subscribers: 2400, new: 2400 },
    { name: 'Sep', current: 3000, subscribers: 1398, new: 2210 },
    { name: 'Oct', current: 2000, subscribers: 9800, new: 2290 },
    { name: 'Nov', current: 2780, subscribers: 3908, new: 2000 },
    { name: 'Dec', current: 1890, subscribers: 4800, new: 2181 },
  ];

  const visitorData = [
    { name: 'Total Siswa', value: stats?.total_siswa || 0, fill: '#3b82f6' },
    { name: 'Sudah Verval', value: stats?.total_verval || 0, fill: '#06b6d4' },
    { name: 'Belum Verval', value: stats?.total_pending || 0, fill: '#f59e0b' },
    { name: 'Sudah Login', value: stats?.total_login || 0, fill: '#10b981' },
  ];

  const taskData = [
    { name: '1', value: 100 },
    { name: '2', value: 150 },
    { name: '3', value: 120 },
    { name: '4', value: 200 },
    { name: '5', value: 180 },
    { name: '6', value: 250 },
    { name: '7', value: 220 },
  ];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users className="text-blue-400"/>} label="Total Siswa" value={stats?.total_siswa} trend="+28.4%" isUp={true} />
        <StatCard icon={<CheckCircle className="text-blue-400"/>} label="Sudah Verval" value={stats?.total_verval} trend="+12.6%" isUp={true} />
        <StatCard icon={<Clock className="text-cyan-400"/>} label="Belum Verval" value={stats?.total_pending} trend="-3.1%" isUp={false} />
        <StatCard icon={<LogIn className="text-blue-400"/>} label="Sudah Login" value={stats?.total_login} trend="+11.3%" isUp={true} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 bg-[#111633] border border-white/10 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg text-white">Statistik Siswa</h3>
            <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white transition-colors">
              Export <ChevronRight size={14} className="rotate-90" />
            </button>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="h-64 w-full lg:w-1/2 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="30%" 
                  outerRadius="100%" 
                  barSize={12} 
                  data={visitorData}
                  startAngle={180}
                  endAngle={-180}
                >
                  <RadialBar
                    background={{ fill: 'rgba(255,255,255,0.03)' }}
                    dataKey="value"
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-4xl font-bold text-white">{stats?.total_siswa || 0}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Siswa</p>
              </div>
            </div>

            <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {visitorData.map((item) => (
                <div key={item.name} className="bg-[#080a1a] border border-white/5 rounded-2xl p-6 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                    <span className="text-sm text-slate-400 font-medium">{item.name}</span>
                  </div>
                  <span className="text-2xl font-bold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataSiswaView({ 
  students, search, setSearch, 
  rombelFilter, setRombelFilter, 
  vervalFilter, setVervalFilter, 
  statusVervalFilter, setStatusVervalFilter,
  statusKKFilter, setStatusKKFilter,
  loginFilter, setLoginFilter,
  uniqueRombels, uniqueStatusVerval, uniqueStatusKK,
  onRefresh, user 
}: any) {
  const isUser = user?.status === 'user';
  const isAdmin = user?.status === 'admin';

  return (
    <div className="space-y-6 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Verval Data Siswa</h2>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <select 
            value={vervalFilter}
            onChange={(e) => setVervalFilter(e.target.value)}
            className="flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200"
          >
            <option value="Semua">Status Verval</option>
            <option value="Sudah Verval">Sudah Verval</option>
            <option value="Belum Verval">Belum Verval</option>
          </select>

          <select 
            value={loginFilter}
            onChange={(e) => setLoginFilter(e.target.value)}
            className="flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200"
          >
            <option value="Semua">Status Login</option>
            <option value="Sudah Login">Sudah Login</option>
            <option value="Belum Login">Belum Login</option>
          </select>
          
          {isAdmin && (
            <>
              <select 
                value={statusVervalFilter}
                onChange={(e) => setStatusVervalFilter(e.target.value)}
                className="flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200"
              >
                <option value="Semua">Verval Ijazah</option>
                {uniqueStatusVerval.filter((v: string) => v !== "Semua").map((v: string) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <select 
                value={statusKKFilter}
                onChange={(e) => setStatusKKFilter(e.target.value)}
                className="flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200"
              >
                <option value="Semua">Verval KK</option>
                {uniqueStatusKK.filter((v: string) => v !== "Semua").map((v: string) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </>
          )}

          <select 
            value={rombelFilter}
            onChange={(e) => setRombelFilter(e.target.value)}
            disabled={uniqueRombels.length <= 1}
            className={`flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200 ${uniqueRombels.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uniqueRombels.map((r: string) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama atau NISN..."
              className="bg-[#111633] border border-white/10 rounded-xl py-2.5 pl-12 pr-4 w-full focus:outline-none focus:border-purple-500/50 text-slate-200"
            />
          </div>
          <button onClick={onRefresh} className="p-2.5 bg-[#111633] hover:bg-white/5 border border-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="bg-[#111633] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="max-h-[600px] overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-20 bg-[#161b40] shadow-[0_1px_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 w-12">No</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Siswa</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Rombel / Jurusan</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Login</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Status Verval</th>
                {user.status === 'admin' && (
                  <>
                    <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Verval Ijazah</th>
                    <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Verval KK</th>
                  </>
                )}
                {user.status === 'admin' && (
                  <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {students.map((s: any, idx: number) => (
              <tr key={s.nisn} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-5 text-sm font-bold text-slate-500">{idx + 1}</td>
                <td className="p-5">
                  <p className="font-bold text-white group-hover:text-purple-400 transition-colors">{s.nama}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.nisn}</p>
                </td>
                <td className="p-5">
                  <p className="text-sm font-bold text-slate-300">{s.rombel}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.jurusan}</p>
                </td>
                <td className="p-5">
                  {(() => {
                    const loginData = s.terakhir_login || s.terakhir_login_siswa || "";
                    const hasLoggedIn = loginData.toString().trim() !== "";
                    return (
                      <>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          hasLoggedIn ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-500/10 text-slate-500'
                        }`}>
                          {hasLoggedIn ? 'SUDAH' : 'BELUM'}
                        </span>
                        {hasLoggedIn && (
                          <p className="text-[10px] text-slate-500 mt-1.5 font-bold uppercase tracking-widest">{loginData}</p>
                        )}
                      </>
                    );
                  })()}
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    (s.status_verval || "").toString().trim() !== "" ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {(s.status_verval || "").toString().trim() !== "" ? 'Sudah Verval' : 'Belum Verval'}
                  </span>
                </td>
                {user.status === 'admin' && (
                  <>
                    <td className="p-5">
                      {s.status_verval === "Tidak" && s.upload_ijazah ? (
                        <a 
                          href={s.upload_ijazah} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-red-400 hover:text-red-300 underline underline-offset-4 decoration-red-400/30 transition-colors"
                        >
                          Tidak
                        </a>
                      ) : (
                        <p className="text-sm font-bold text-slate-300">{s.status_verval || "-"}</p>
                      )}
                    </td>
                    <td className="p-5">
                      {s.status_kk === "Tidak" && s.upload_kk ? (
                        <a 
                          href={s.upload_kk} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-red-400 hover:text-red-300 underline underline-offset-4 decoration-red-400/30 transition-colors"
                        >
                          Tidak
                        </a>
                      ) : (
                        <p className="text-sm font-bold text-slate-300">{s.status_kk || "-"}</p>
                      )}
                    </td>
                  </>
                )}
                {user.status === 'admin' && (
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-500 hover:text-purple-400 transition-colors"><ChevronRight size={18}/></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function ProfilSiswaView({ 
  students, search, setSearch, 
  rombelFilter, setRombelFilter, 
  uniqueRombels,
  onRefresh, onDelete, user 
}: any) {
  const isUser = user?.status === 'user';
  const isAdmin = user?.status === 'admin';

  return (
    <div className="space-y-6 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Profil Lengkap Siswa</h2>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <select 
            value={rombelFilter}
            onChange={(e) => setRombelFilter(e.target.value)}
            disabled={uniqueRombels.length <= 1}
            className={`flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200 ${uniqueRombels.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uniqueRombels.map((r: string) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama atau NISN..."
              className="bg-[#111633] border border-white/10 rounded-xl py-2.5 pl-12 pr-4 w-full focus:outline-none focus:border-purple-500/50 text-slate-200"
            />
          </div>
          <button onClick={onRefresh} className="p-2.5 bg-[#111633] hover:bg-white/5 border border-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="bg-[#111633] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="max-h-[600px] overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[2500px]">
            <thead className="sticky top-0 z-20 bg-[#161b40] shadow-[0_1px_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 sticky left-0 bg-[#161b40] z-30">NISN & Nama</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Tempat Lahir</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Tanggal Lahir</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">NIK</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Agama</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">No. KK</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Reg. Akta</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">JK</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Alamat</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">RT/RW</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Kel-Kec-Kab/Kota</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Kodepos</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Tinggal</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Transportasi</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">No. HP</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Email</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Rombel</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Jurusan</th>
                {isAdmin && <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 text-right sticky right-0 bg-[#161b40] z-30">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {students.map((s: any) => (
              <tr key={s.nisn} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-5 sticky left-0 bg-[#111633] group-hover:bg-[#1a1f3d] z-10 border-r border-white/5">
                  <p className="font-bold text-white group-hover:text-purple-400 transition-colors">{s.nama}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.nisn}</p>
                </td>
                <td className="p-5 text-sm text-slate-300">{s.tempat_lahir || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.tanggal_lahir || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.nik || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.agama || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.no_kk || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.reg_akta_lahir || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.jk || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.alamat_jalan || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.rt || "0"}/{s.rw || "0"}</td>
                <td className="p-5 text-sm text-slate-300">{s.nama_wil || s.wilayah || (s.kel || s.kec || s.kab_kota ? [s.kel, s.kec, s.kab_kota].filter(Boolean).join(', ') : "-")}</td>
                <td className="p-5 text-sm text-slate-300">{s.kode_pos || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.jenis_tinggal || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.alat_transportasi || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.no_hp || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.email || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.rombel || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.jurusan || "-"}</td>
                {isAdmin && (
                  <td className="p-5 text-right sticky right-0 bg-[#111633] group-hover:bg-[#1a1f3d] z-10 border-l border-white/5">
                    <button 
                      onClick={() => onDelete(s.nisn)}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      title="Hapus Siswa"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function KurangMampuView({ 
  data, search, setSearch, 
  rombelFilter, setRombelFilter, 
  uniqueRombels,
  onRefresh, user 
}: any) {
  const isUser = user?.status === 'user';

  return (
    <div className="space-y-6 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Murid Kurang Mampu</h2>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <select 
            value={rombelFilter}
            onChange={(e) => setRombelFilter(e.target.value)}
            disabled={uniqueRombels.length <= 1}
            className={`flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200 ${uniqueRombels.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uniqueRombels.map((r: string) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama atau NISN..."
              className="bg-[#111633] border border-white/10 rounded-xl py-2.5 pl-12 pr-4 w-full focus:outline-none focus:border-purple-500/50 text-slate-200"
            />
          </div>
          <button onClick={onRefresh} className="p-2.5 bg-[#111633] hover:bg-white/5 border border-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="bg-[#111633] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="max-h-[600px] overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className={`w-full text-left border-collapse ${isUser ? 'min-w-[500px]' : 'min-w-[1500px]'}`}>
            <thead className="sticky top-0 z-20 bg-[#161b40] shadow-[0_1px_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 sticky left-0 bg-[#161b40] z-30">NISN & Nama</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Rombel</th>
                {!isUser && (
                  <>
                    <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Kurang Mampu</th>
                    <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Ket. KIP</th>
                    <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">No. KIP</th>
                    <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Nama di KIP</th>
                    <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Kartu Lain</th>
                    <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Nama di Kartu</th>
                    <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">No. Kartu</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {data.map((s: any) => (
              <tr key={s.nisn} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-5 sticky left-0 bg-[#111633] group-hover:bg-[#1a1f3d] z-10 border-r border-white/5">
                  <p className="font-bold text-white group-hover:text-purple-400 transition-colors">{s.nama}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.nisn}</p>
                </td>
                <td className="p-5 text-sm text-slate-300">{s.rombel || "-"}</td>
                {!isUser && (
                  <>
                    <td className="p-5 text-sm text-slate-300">{s.kurang_mampu || "-"}</td>
                    <td className="p-5 text-sm text-slate-300">{s.ket_kip || "-"}</td>
                    <td className="p-5 text-sm text-slate-300">{s.no_kip || "-"}</td>
                    <td className="p-5 text-sm text-slate-300">{s.nama_di_kip || "-"}</td>
                    <td className="p-5 text-sm text-slate-300">{s.kartu_lain || "-"}</td>
                    <td className="p-5 text-sm text-slate-300">{s.nama_dikartu || "-"}</td>
                    <td className="p-5 text-sm text-slate-300">{s.no_kartu || "-"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function AksesMenuView({ form, setForm, onSave, uniqueClasses, uniqueRombels = [], loading, students, successMessage, setSuccessMessage }: any) {
  const menuOptions = [
    'dashboard', 'rekap', 'profil', 'ortu', 'registrasi', 'periodik',
    'kurang_mampu', 'notifikasi', 'verval', 'cetak'
  ];

  const availableRombels = (uniqueRombels || []).filter((r: string) => r && r !== "Semua");
  const availableClasses = (uniqueClasses || []).filter((c: string) => c && c !== "Semua");

  const [rombelClassFilter, setRombelClassFilter] = useState("Semua");

  const filteredRombels = availableRombels.filter((r: string) => {
    if (rombelClassFilter === "Semua") return true;
    const rLower = r.toLowerCase();
    if (rombelClassFilter === "10") return rLower.startsWith("10") || rLower.startsWith("x ");
    if (rombelClassFilter === "11") return rLower.startsWith("11") || rLower.startsWith("xi ");
    if (rombelClassFilter === "12") return rLower.startsWith("12") || rLower.startsWith("xii ");
    return true;
  });

  // Helper to extract clean menu list from stored string (which may have "Target: menu1, menu2")
  const getCleanMenuList = (val: string) => {
    if (!val) return "";
    const str = val.toString();
    return str.includes(':') ? str.split(':')[1].trim() : str;
  };

  // Hitung ringkasan akses per rombel
  const rombelAccessSummary = availableRombels.map((r: string) => {
    const studentInRombel = students.find((s: any) => (s.rombel || "").toString().trim().toLowerCase() === r.trim().toLowerCase());
    const rawAccess = studentInRombel?.akses_menu || "";
    const cleanAccess = getCleanMenuList(rawAccess);
    return {
      rombel: r,
      rawAccess: cleanAccess,
      access: cleanAccess 
        ? cleanAccess.split(',').map((m: string) => {
            const trimmed = m.trim().toLowerCase();
            if (trimmed === 'orangtua') return 'ortu';
            return trimmed.replace('_', ' ');
          }).join(', ') 
        : 'Belum diatur'
    };
  });

  // Hitung ringkasan akses per kelas
  const classAccessSummary = availableClasses.map((c: string) => {
    const studentInClass = students.find((s: any) => {
      const studentClass = (s.kelas && s.kelas !== "-") ? s.kelas.toString().trim() : "";
      const studentRombel = (s.rombel || "").toString().trim();
      return studentClass === c || studentRombel.startsWith(c) || (c === "10" && studentRombel.startsWith("X ")) || (c === "11" && studentRombel.startsWith("XI ")) || (c === "12" && studentRombel.startsWith("XII "));
    });
    const rawAccess = studentInClass?.akses_menu || "";
    const cleanAccess = getCleanMenuList(rawAccess);
    return {
      kelas: c,
      rawAccess: cleanAccess,
      access: cleanAccess 
        ? cleanAccess.split(',').map((m: string) => {
            const trimmed = m.trim().toLowerCase();
            if (trimmed === 'orangtua') return 'ortu';
            return trimmed.replace('_', ' ');
          }).join(', ') 
        : 'Belum diatur'
    };
  });

  const selectedTargets = form.target_kelas ? form.target_kelas.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  const toggleTarget = (targetVal: string) => {
    let next;
    if (selectedTargets.includes(targetVal)) {
      next = selectedTargets.filter((item: string) => item !== targetVal);
    } else {
      next = [...selectedTargets, targetVal];
    }
    setForm({...form, target_kelas: next.join(',')});
  };

  return (
    <div className="space-y-10 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Kontrol Akses Menu</h2>
            <p className="text-slate-500 text-sm mb-6">Atur menu apa saja yang bisa diakses oleh wali kelas atau siswa berdasarkan Kelas atau Rombel spesifik mereka.</p>
            
            {successMessage && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle className="shrink-0 text-emerald-400" size={22} />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-400">Berhasil Disimpan!</h4>
                    <p className="text-xs text-emerald-300/80">{successMessage}</p>
                  </div>
                </div>
                {setSuccessMessage && (
                  <button 
                    onClick={() => setSuccessMessage(null)}
                    className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            <div className="bg-[#111633] border border-white/10 rounded-3xl p-6 md:p-8 space-y-10 shadow-xl">
              {/* Target Tingkat Kelas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Pilih Target Tingkat Kelas (Semua Rombel di Kelas ini)</label>
                  <div className="flex gap-2 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        const merged = Array.from(new Set([...selectedTargets, ...availableClasses]));
                        setForm({...form, target_kelas: merged.join(',')});
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors font-semibold"
                    >
                      Pilih Semua Kelas
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setForm({...form, target_kelas: ''})}
                      className="text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableClasses.map((c: string) => {
                    const isSelected = selectedTargets.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleTarget(c)}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2 ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                            : 'bg-[#080a1a] border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-600'}`} />
                        Kelas {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Rombel Spesifik */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest ml-1">Pilih Target Rombel Spesifik</label>
                    <p className="text-[11px] text-slate-400 ml-1">Pilih rombel tertentu jika ingin memberikan akses khusus per rombel (contoh: 10 AKL 1)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Filter:</span>
                    <div className="flex gap-1 bg-[#080a1a] p-1 rounded-xl border border-white/10 text-xs">
                      {["Semua", ...availableClasses].map((cf: string) => (
                        <button
                          key={cf}
                          type="button"
                          onClick={() => setRombelClassFilter(cf)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                            rombelClassFilter === cf
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {cf === "Semua" ? "Semua" : `Kls ${cf}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                  {filteredRombels.length === 0 ? (
                    <span className="text-xs text-slate-500 italic p-2">Tidak ada data Rombel ditemukan</span>
                  ) : (
                    filteredRombels.map((r: string) => {
                      const isSelected = selectedTargets.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => toggleTarget(r)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                            isSelected 
                              ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30' 
                              : 'bg-[#080a1a] border-white/10 text-slate-300 hover:border-purple-500/40 hover:text-white'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center ${
                            isSelected ? 'bg-white border-white text-purple-600' : 'border-slate-600'
                          }`}>
                            {isSelected && <CheckCircle size={10} className="fill-purple-600 text-white" />}
                          </div>
                          <span>{r}</span>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedTargets.length > 0 && (
                  <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-3 flex items-center justify-between text-xs text-purple-200">
                    <div>
                      <span className="font-bold text-purple-300">Target terpilih ({selectedTargets.length}):</span>{" "}
                      <span className="text-slate-300">{selectedTargets.join(', ')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({...form, target_kelas: ''})}
                      className="text-red-400 hover:text-red-300 text-[11px] font-bold underline ml-2 shrink-0"
                    >
                      Hapus Semua Target
                    </button>
                  </div>
                )}
              </div>

              {/* Pilih Menu */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Pilih Menu yang Diizinkan</label>
                  <div className="flex gap-2 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => setForm({...form, selected_menus: [...menuOptions]})}
                      className="text-blue-400 hover:text-blue-300 transition-colors font-semibold"
                    >
                      Pilih Semua Menu
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setForm({...form, selected_menus: []})}
                      className="text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {menuOptions.map((menu) => {
                    const isSelected = form.selected_menus.includes(menu);
                    return (
                      <button
                        key={menu}
                        type="button"
                        onClick={() => {
                          let next;
                          if (form.selected_menus.includes(menu)) {
                            next = form.selected_menus.filter((m: string) => m !== menu);
                          } else {
                            next = [...form.selected_menus, menu];
                          }
                          setForm({...form, selected_menus: next});
                        }}
                        className={`flex items-center gap-3 p-4 rounded-2xl text-xs font-bold transition-all border ${
                          isSelected 
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                            : 'bg-[#080a1a] border-white/10 text-slate-500 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'
                        }`}>
                          {isSelected && <CheckCircle size={10} className="text-white" />}
                        </div>
                        <span className="capitalize">{menu.replace('_', ' ')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={onSave}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-50 text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-[0.98]"
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : (
                  <>
                    <ShieldCheck size={20} /> Simpan Pengaturan Akses
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Ringkasan Akses */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white tracking-tight">Ringkasan Akses Saat Ini</h3>
          
          {/* Summary Rombel */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest">Akses Per Rombel</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {rombelAccessSummary.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada data rombel</p>
              ) : (
                rombelAccessSummary.map((item: any) => (
                  <div key={item.rombel} className="bg-[#111633] border border-white/10 rounded-2xl p-4 space-y-1.5 hover:border-purple-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
                        {item.rombel}
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          setForm({
                            target_kelas: item.rombel,
                            selected_menus: item.rawAccess && item.rawAccess !== 'Belum diatur'
                              ? item.rawAccess.split(',').map((a: string) => {
                                  const trimmed = a.trim().toLowerCase().replace(/\s+/g, '_');
                                  return trimmed === 'ortu' ? 'ortu' : trimmed;
                                })
                              : []
                          });
                        }}
                        className="text-[10px] font-bold text-purple-400 hover:underline"
                      >
                        Edit Akses
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 capitalize truncate">{item.access}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Summary Kelas */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Akses Per Tingkat Kelas</h4>
            <div className="space-y-2">
              {classAccessSummary.map((item: any) => (
                <div key={item.kelas} className="bg-[#111633] border border-white/10 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Kelas {item.kelas}</span>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </div>
                  <p className="text-xs text-slate-400 capitalize truncate">{item.access}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotifView({ form, setForm, notifications, onSend, onDelete, onEdit, isEditing, onCancelEdit, uniqueClasses, loading }: any) {
  return (
    <div className="space-y-10 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-6">{isEditing ? 'Edit Pengumuman' : 'Kirim Pengumuman'}</h2>
        <div className="bg-[#111633] border border-white/10 rounded-3xl p-8 space-y-8 shadow-xl">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Judul Pesan</label>
            <input 
              value={form.judul} onChange={(e) => setForm({...form, judul: e.target.value})}
              className="w-full bg-[#080a1a] border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-purple-500/50 text-slate-200 transition-all"
              placeholder="Contoh: Pengumuman Libur"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Isi Pesan</label>
            <textarea 
              value={form.pesan} onChange={(e) => setForm({...form, pesan: e.target.value})}
              rows={5}
              className="w-full bg-[#080a1a] border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-purple-500/50 text-slate-200 transition-all"
              placeholder="Tulis pesan lengkap di sini..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Target Kelas</label>
              <div className="flex flex-wrap gap-2">
                {uniqueClasses.map((c: string) => {
                  const isSelected = c === "Semua" 
                    ? (form.target_kelas === "" || form.target_kelas === "Semua")
                    : form.target_kelas.split(',').filter(Boolean).includes(c);
                  
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        if (c === "Semua") {
                          setForm({...form, target_kelas: ""});
                        } else {
                          const current = form.target_kelas ? form.target_kelas.split(',').filter(Boolean) : [];
                          let next;
                          if (current.includes(c)) {
                            next = current.filter((item: string) => item !== c);
                          } else {
                            next = [...current, c];
                          }
                          setForm({...form, target_kelas: next.join(',')});
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isSelected 
                          ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20' 
                          : 'bg-[#080a1a] border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {c === "Semua" ? "Semua Kelas" : c}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">NISN Target (Opsional)</label>
              <input 
                value={form.nisn_target} onChange={(e) => setForm({...form, nisn_target: e.target.value})}
                maxLength={10}
                className="w-full bg-[#080a1a] border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-purple-500/50 text-slate-200 transition-all"
                placeholder="Kosongkan untuk semua"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tipe</label>
              <select 
                value={form.tipe} onChange={(e) => setForm({...form, tipe: e.target.value})}
                className="w-full bg-[#080a1a] border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-purple-500/50 text-slate-200 transition-all"
              >
                <option value="info">Informasi (Biru)</option>
                <option value="warning">Peringatan (Kuning)</option>
                <option value="error">Penting (Merah)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            {isEditing && (
              <button 
                onClick={onCancelEdit}
                className="flex-1 bg-[#080a1a] border border-white/10 hover:border-white/20 text-slate-400 font-bold py-5 rounded-2xl transition-all active:scale-[0.98]"
              >
                Batal
              </button>
            )}
            <button 
              onClick={onSend}
              disabled={loading}
              className="flex-[2] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-600/20 active:scale-[0.98] border border-white/10"
            >
              {loading ? <RefreshCw className="animate-spin" size={20} /> : (
                <>
                  <Send size={20} /> {isEditing ? 'Update Pesan' : 'Kirim Sekarang'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Riwayat Pengumuman</h2>
        <div className="bg-[#111633] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tanggal</th>
                  <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Judul</th>
                  <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target</th>
                  <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipe</th>
                  <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500 font-medium italic">
                      Belum ada riwayat pengumuman.
                    </td>
                  </tr>
                ) : (
                  notifications.map((notif: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-5 text-sm text-slate-400 font-medium">
                        {notif.tanggal ? new Date(notif.tanggal).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="p-5">
                        <div className="text-sm font-bold text-white mb-1">{notif.judul}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[300px]">{notif.pesan}</div>
                      </td>
                      <td className="p-5 text-sm text-slate-400">
                        {notif.nisn_target ? `NISN: ${notif.nisn_target}` : (notif.target_kelas ? `Kelas: ${notif.target_kelas}` : 'Semua')}
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          notif.tipe === 'info' ? 'bg-blue-500/10 text-blue-400' :
                          notif.tipe === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {notif.tipe}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => onEdit(notif)}
                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => onDelete(notif.row)}
                            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, hasSubmenu, isOpen }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-3.5 rounded-xl transition-all duration-300 group relative ${
        active 
          ? 'bg-blue-600/10 text-blue-400' 
          : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      <div className={`${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
        {icon}
      </div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {hasSubmenu && <ChevronRight size={14} className={`ml-auto text-slate-600 group-hover:text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />}
    </button>
  );
}

function OrangTuaView({ 
  students, search, setSearch, 
  rombelFilter, setRombelFilter, 
  uniqueRombels,
  onRefresh, user 
}: any) {
  const isUser = user?.status === 'user';

  return (
    <div className="space-y-6 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Data Orang Tua</h2>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <select 
            value={rombelFilter}
            onChange={(e) => setRombelFilter(e.target.value)}
            disabled={uniqueRombels.length <= 1}
            className={`flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200 ${uniqueRombels.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uniqueRombels.map((r: string) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama atau NISN..."
              className="bg-[#111633] border border-white/10 rounded-xl py-2.5 pl-12 pr-4 w-full focus:outline-none focus:border-purple-500/50 text-slate-200"
            />
          </div>
          <button onClick={onRefresh} className="p-2.5 bg-[#111633] hover:bg-white/5 border border-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="bg-[#111633] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="max-h-[600px] overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[2300px]">
            <thead className="sticky top-0 z-20 bg-[#161b40] shadow-[0_1px_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 sticky left-0 bg-[#161b40] z-30">NISN & Nama</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Status Hidup Ayah</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Nama Ayah</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">NIK Ayah</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Tahun Lahir Ayah</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Pendidikan Ayah</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Pekerjaan Ayah</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Penghasilan Ayah</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Status Hidup Ibu</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Nama Ibu</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">NIK Ibu</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Tahun Lahir Ibu</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Pendidikan Ibu</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Pekerjaan Ibu</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Penghasilan Ibu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {students.map((s: any) => {
              const isAyahMeninggal = (s.status_hidup_ayah || "").toString().toLowerCase().includes("wafat") || 
                                      (s.status_hidup_ayah || "").toString().toLowerCase().includes("meninggal") || 
                                      (s.pekerjaan_ayah || "").toString().toLowerCase().includes("meninggal");
              const isIbuMeninggal = (s.status_hidup_ibu || "").toString().toLowerCase().includes("wafat") || 
                                     (s.status_hidup_ibu || "").toString().toLowerCase().includes("meninggal") || 
                                     (s.pekerjaan_ibu || "").toString().toLowerCase().includes("meninggal");

              const hasStatusAyah = s.status_hidup_ayah && s.status_hidup_ayah.toString().trim() !== "" && s.status_hidup_ayah.toString().trim() !== "-";
              const hasStatusIbu = s.status_hidup_ibu && s.status_hidup_ibu.toString().trim() !== "" && s.status_hidup_ibu.toString().trim() !== "-";

              const statusAyahDisplay = hasStatusAyah ? s.status_hidup_ayah : (isAyahMeninggal ? "Wafat" : "-");
              const statusIbuDisplay = hasStatusIbu ? s.status_hidup_ibu : (isIbuMeninggal ? "Wafat" : "-");

              return (
                <tr key={s.nisn} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-5 sticky left-0 bg-[#111633] group-hover:bg-[#1a1f3d] z-10 border-r border-white/5">
                    <p className="font-bold text-white group-hover:text-purple-400 transition-colors">{s.nama}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.nisn}</p>
                  </td>
                  <td className="p-5 text-sm text-slate-300">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${statusAyahDisplay === 'Wafat' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : statusAyahDisplay === 'Hidup' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400'}`}>
                      {statusAyahDisplay}
                    </span>
                  </td>
                  <td className="p-5 text-sm text-slate-300">{s.nama_ayah || "-"}</td>
                  <td className="p-5 text-sm text-slate-300">{s.nik_ayah || "-"}</td>
                  <td className="p-5 text-sm text-slate-300">{s.tahun_lahir_ayah || "-"}</td>
                  <td className="p-5 text-sm text-slate-300">{s.jenjang_pendidikan_ayah || "-"}</td>
                  <td className="p-5 text-sm text-slate-300">{s.pekerjaan_ayah || (isAyahMeninggal ? "Sudah Meninggal" : "-")}</td>
                  <td className="p-5 text-sm text-slate-300">{s.penghasilan_ayah || (isAyahMeninggal ? "Tidak Berpenghasilan" : "-")}</td>
                  <td className="p-5 text-sm text-slate-300">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${statusIbuDisplay === 'Wafat' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : statusIbuDisplay === 'Hidup' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400'}`}>
                      {statusIbuDisplay}
                    </span>
                  </td>
                  <td className="p-5 text-sm text-slate-300">{s.nama_ibu || "-"}</td>
                  <td className="p-5 text-sm text-slate-300">{s.nik_ibu || "-"}</td>
                  <td className="p-5 text-sm text-slate-300">{s.tahun_lahir_ibu || "-"}</td>
                  <td className="p-5 text-sm text-slate-300">{s.jenjang_pendidikan_ibu || "-"}</td>
                  <td className="p-5 text-sm text-slate-300">{s.pekerjaan_ibu || (isIbuMeninggal ? "Sudah Meninggal" : "-")}</td>
                  <td className="p-5 text-sm text-slate-300">{s.penghasilan_ibu || (isIbuMeninggal ? "Tidak Berpenghasilan" : "-")}</td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RegistrasiView({ 
  students, search, setSearch, 
  rombelFilter, setRombelFilter, 
  uniqueRombels,
  onRefresh, user 
}: any) {
  const isUser = user?.status === 'user';

  return (
    <div className="space-y-6 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Data Registrasi</h2>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <select 
            value={rombelFilter}
            onChange={(e) => setRombelFilter(e.target.value)}
            disabled={uniqueRombels.length <= 1}
            className={`flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200 ${uniqueRombels.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uniqueRombels.map((r: string) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama atau NISN..."
              className="bg-[#111633] border border-white/10 rounded-xl py-2.5 pl-12 pr-4 w-full focus:outline-none focus:border-purple-500/50 text-slate-200"
            />
          </div>
          <button onClick={onRefresh} className="p-2.5 bg-[#111633] hover:bg-white/5 border border-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="bg-[#111633] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="max-h-[600px] overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-20 bg-[#161b40] shadow-[0_1px_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 sticky left-0 bg-[#161b40] z-30">NISN & Nama</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Sekolah Asal</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Hobby</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Cita-cita</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">No. Peserta Ujian</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">No. Seri Ijazah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {students.map((s: any) => (
              <tr key={s.nisn} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-5 sticky left-0 bg-[#111633] group-hover:bg-[#1a1f3d] z-10 border-r border-white/5">
                  <p className="font-bold text-white group-hover:text-purple-400 transition-colors">{s.nama}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.nisn}</p>
                </td>
                <td className="p-5 text-sm text-slate-300">{s.sekolah_asal || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.id_hobby || s.hobi || s.hobby || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.id_cita || s.id_cita_cita || s.cita_cita || s.cita || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.no_peserta_ujian || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.no_seri_ijazah || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function PeriodikView({ 
  students, search, setSearch, 
  rombelFilter, setRombelFilter, 
  uniqueRombels,
  onRefresh, user 
}: any) {
  const isUser = user?.status === 'user';

  return (
    <div className="space-y-6 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Data Periodik</h2>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <select 
            value={rombelFilter}
            onChange={(e) => setRombelFilter(e.target.value)}
            disabled={uniqueRombels.length <= 1}
            className={`flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200 ${uniqueRombels.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uniqueRombels.map((r: string) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama atau NISN..."
              className="bg-[#111633] border border-white/10 rounded-xl py-2.5 pl-12 pr-4 w-full focus:outline-none focus:border-purple-500/50 text-slate-200"
            />
          </div>
          <button onClick={onRefresh} className="p-2.5 bg-[#111633] hover:bg-white/5 border border-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="bg-[#111633] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="max-h-[600px] overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-20 bg-[#161b40] shadow-[0_1px_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 sticky left-0 bg-[#161b40] z-30">NISN & Nama</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Tinggi Badan</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Berat Badan</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Lingkar Kepala</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Saudara Kandung</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Anak Ke</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Jarak Rumah</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Jarak (KM)</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Waktu Tempuh (Menit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {students.map((s: any) => (
              <tr key={s.nisn} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-5 sticky left-0 bg-[#111633] group-hover:bg-[#1a1f3d] z-10 border-r border-white/5">
                  <p className="font-bold text-white group-hover:text-purple-400 transition-colors">{s.nama}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.nisn}</p>
                </td>
                <td className="p-5 text-sm text-slate-300">{s.tinggi_badan || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.berat_badan || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.lingkar_kepala || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.jumlah_saudara_kandung || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.anak_ke || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.jarak_rumah_ke_sekolah || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.sebutkan_berapa_kilometer || "-"}</td>
                <td className="p-5 text-sm text-slate-300">{s.waktu_tempuh_ke_sekolah_menit || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function SubNavItem({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-lg text-[13px] transition-all duration-200 ${
        active 
          ? 'text-blue-400 font-bold' 
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-blue-400 shadow-[0_0_8px_#3b82f6]' : 'bg-transparent'}`} />
      <span>{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, trend, isUp }: any) {
  return (
    <div className="bg-[#111633] border border-white/10 p-8 rounded-3xl relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-lg">
      <div className="flex items-start justify-between mb-6">
        <div className="p-3.5 rounded-2xl bg-[#080a1a] border border-white/10 text-blue-400 shadow-inner group-hover:bg-blue-600/10 transition-colors">
          {icon}
        </div>
        <button className="text-slate-600 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>
      
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">{label}</p>
      <div className="flex items-end gap-3">
        <h4 className="text-3xl font-bold text-white tracking-tight">{value || 0}</h4>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold mb-1 ${
          isUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trend}
        </div>
      </div>
      
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-all"></div>
    </div>
  );
}

function RekapInputanView({ 
  students, search, setSearch, 
  rombelFilter, setRombelFilter, 
  uniqueRombels,
  onRefresh, user 
}: any) {
  const isUser = user?.status === 'user';
  const [completionFilter, setCompletionFilter] = useState("Semua");
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

  // Daftar field wajib per menu/kategori (Hanya field bertanda bintang *)
  const REQUIRED_FIELDS = {
    profil: [
      'nama', 'jk', 'nipd', 'nisn', 'nik', 'agama',
      'tempat_lahir', 'tanggal_lahir', 'no_kk',
      'alamat_jalan', 'wilayah',
      'jenis_tinggal', 'alat_transportasi', 'no_hp', 'jurusan'
    ],
    ortu: [
      'nama_ayah', 'nik_ayah', 'tahun_lahir_ayah', 'jenjang_pendidikan_ayah', 'pekerjaan_ayah', 'penghasilan_ayah',
      'nama_ibu', 'nik_ibu', 'tahun_lahir_ibu', 'jenjang_pendidikan_ibu', 'pekerjaan_ibu', 'penghasilan_ibu'
    ],
    registrasi: [
      'sekolah_asal', 'id_hobby', 'id_cita'
    ],
    periodik: [
      'tinggi_badan', 'berat_badan', 'lingkar_kepala', 'jumlah_saudara_kandung', 
      'anak_ke', 'jarak_rumah_ke_sekolah', 'sebutkan_berapa_kilometer', 'waktu_tempuh_ke_sekolah_menit'
    ]
  };

  const isValValid = (val: any) => {
    if (val === undefined || val === null) return false;
    const str = val.toString().trim();
    return str !== "" && str !== "-";
  };

  const isParentMeninggal = (statusVal: any, kerjaVal: any) => {
    const s = statusVal ? statusVal.toString().trim().toLowerCase() : "";
    const k = kerjaVal ? kerjaVal.toString().trim().toLowerCase() : "";
    return s.includes("wafat") || s.includes("meninggal") || k.includes("meninggal") || k.includes("wafat");
  };

  const getMissingFields = (st: any, category: 'profil' | 'ortu' | 'registrasi' | 'periodik'): string[] => {
    if (!st) return [];
    const missing: string[] = [];

    if (category === 'profil') {
      const PROFIL_MAP: Record<string, string> = {
        nama: 'Nama Lengkap',
        jk: 'Jenis Kelamin',
        nipd: 'NIPD',
        nisn: 'NISN',
        nik: 'NIK',
        agama: 'Agama',
        tempat_lahir: 'Tempat Lahir',
        tanggal_lahir: 'Tanggal Lahir',
        no_kk: 'No. KK',
        alamat_jalan: 'Alamat Jalan',
        wilayah: 'Wilayah / Kecamatan',
        jenis_tinggal: 'Jenis Tempat Tinggal',
        alat_transportasi: 'Alat Transportasi',
        no_hp: 'No. HP / Kontak',
        jurusan: 'Jurusan / Rombel'
      };

      REQUIRED_FIELDS.profil.forEach(f => {
        let valid = isValValid(st[f]);
        if (f === 'wilayah') {
          valid = isValValid(st.nama_wil) || isValValid(st.wilayah) || isValValid(st.kel) || isValValid(st.kec) || isValValid(st.kab_kota);
        } else if (f === 'nipd') {
          valid = isValValid(st.nipd) || isValValid(st.nipd_nisn) || isValValid(st.login) || isValValid(st.nisn);
        } else if (f === 'jurusan') {
          valid = isValValid(st.jurusan) || isValValid(st.rombel);
        } else if (f === 'no_hp') {
          valid = isValValid(st.no_hp) || isValValid(st.nomor_telepon);
        }
        if (!valid) {
          missing.push(PROFIL_MAP[f] || f);
        }
      });
    } else if (category === 'ortu') {
      // Ayah
      const ayahWafat = isParentMeninggal(st.status_hidup_ayah, st.pekerjaan_ayah);
      if (ayahWafat) {
        if (!isValValid(st.nama_ayah)) missing.push('Nama Ayah');
        if (!isValValid(st.status_hidup_ayah) && !isParentMeninggal(st.status_hidup_ayah, st.pekerjaan_ayah)) {
          missing.push('Status Hidup Ayah');
        }
      } else {
        if (!isValValid(st.status_hidup_ayah)) missing.push('Status Hidup Ayah');
        if (!isValValid(st.nama_ayah)) missing.push('Nama Ayah');
        if (!isValValid(st.nik_ayah)) missing.push('NIK Ayah');
        if (!isValValid(st.tahun_lahir_ayah)) missing.push('Tahun Lahir Ayah');
        if (!isValValid(st.jenjang_pendidikan_ayah)) missing.push('Pendidikan Ayah');
        if (!isValValid(st.pekerjaan_ayah)) missing.push('Pekerjaan Ayah');
        if (!isValValid(st.penghasilan_ayah)) missing.push('Penghasilan Ayah');
      }

      // Ibu
      const ibuWafat = isParentMeninggal(st.status_hidup_ibu, st.pekerjaan_ibu);
      if (ibuWafat) {
        if (!isValValid(st.nama_ibu)) missing.push('Nama Ibu');
        if (!isValValid(st.status_hidup_ibu) && !isParentMeninggal(st.status_hidup_ibu, st.pekerjaan_ibu)) {
          missing.push('Status Hidup Ibu');
        }
      } else {
        if (!isValValid(st.status_hidup_ibu)) missing.push('Status Hidup Ibu');
        if (!isValValid(st.nama_ibu)) missing.push('Nama Ibu');
        if (!isValValid(st.nik_ibu)) missing.push('NIK Ibu');
        if (!isValValid(st.tahun_lahir_ibu)) missing.push('Tahun Lahir Ibu');
        if (!isValValid(st.jenjang_pendidikan_ibu)) missing.push('Pendidikan Ibu');
        if (!isValValid(st.pekerjaan_ibu)) missing.push('Pekerjaan Ibu');
        if (!isValValid(st.penghasilan_ibu)) missing.push('Penghasilan Ibu');
      }
    } else if (category === 'registrasi') {
      if (!isValValid(st.sekolah_asal)) missing.push('Sekolah Asal');
      if (!isValValid(st.id_hobby) && !isValValid(st.hobi) && !isValValid(st.hobby)) missing.push('Hobi');
      if (!isValValid(st.id_cita) && !isValValid(st.id_cita_cita) && !isValValid(st.cita_cita) && !isValValid(st.cita)) missing.push('Cita-cita');
    } else if (category === 'periodik') {
      if (!isValValid(st.tinggi_badan) && !isValValid(st.tinggi)) missing.push('Tinggi Badan (cm)');
      if (!isValValid(st.berat_badan) && !isValValid(st.berat)) missing.push('Berat Badan (kg)');
      if (!isValValid(st.lingkar_kepala) && !isValValid(st.lingkar)) missing.push('Lingkar Kepala (cm)');
      if (!isValValid(st.jumlah_saudara_kandung) && !isValValid(st.saudara)) missing.push('Jumlah Saudara Kandung');
      if (!isValValid(st.anak_ke) && !isValValid(st.anak_ke_berapa)) missing.push('Anak Ke-');

      const jarakVal = (st.jarak_rumah_ke_sekolah || st.jarak_tempat_tinggal_ke_sekolah || st.jarak || "").toString().trim();
      if (!isValValid(jarakVal)) missing.push('Jarak Tempat Tinggal ke Sekolah');

      if (!isValValid(st.waktu_tempuh_ke_sekolah_menit) && !isValValid(st.waktu_tempuh)) missing.push('Waktu Tempuh ke Sekolah (Menit)');

      const jarakLower = jarakVal.toLowerCase();
      const isLebihDari1Km = jarakLower.includes("lebih") || jarakLower.includes(">") || jarakLower.includes("lebih dari 1");
      if (isLebihDari1Km) {
        if (!isValValid(st.sebutkan_berapa_kilometer) && !isValValid(st.sebutkan_berapa_km) && !isValValid(st.jarak_km)) {
          missing.push('Sebutkan (Berapa Kilometer)');
        }
      }
    }

    return missing;
  };

  const getOrtuCompletion = (st: any) => {
    if (!st) return 0;

    // Ayah
    const ayahWafat = isParentMeninggal(st.status_hidup_ayah, st.pekerjaan_ayah);
    let ayahTotal = 0;
    let ayahValid = 0;

      if (ayahWafat) {
        ayahTotal = 2;
        if (isValValid(st.nama_ayah)) ayahValid++;
        if (isValValid(st.status_hidup_ayah) || isParentMeninggal(st.status_hidup_ayah, st.pekerjaan_ayah)) ayahValid++;
      } else {
        ayahTotal = 7;
        if (isValValid(st.status_hidup_ayah)) ayahValid++;
        if (isValValid(st.nama_ayah)) ayahValid++;
        if (isValValid(st.nik_ayah)) ayahValid++;
        if (isValValid(st.tahun_lahir_ayah)) ayahValid++;
        if (isValValid(st.jenjang_pendidikan_ayah)) ayahValid++;
        if (isValValid(st.pekerjaan_ayah)) ayahValid++;
        if (isValValid(st.penghasilan_ayah)) ayahValid++;
      }

      // Ibu
      const ibuWafat = isParentMeninggal(st.status_hidup_ibu, st.pekerjaan_ibu);
      let ibuTotal = 0;
      let ibuValid = 0;

      if (ibuWafat) {
        ibuTotal = 2;
        if (isValValid(st.nama_ibu)) ibuValid++;
        if (isValValid(st.status_hidup_ibu) || isParentMeninggal(st.status_hidup_ibu, st.pekerjaan_ibu)) ibuValid++;
      } else {
        ibuTotal = 7;
        if (isValValid(st.status_hidup_ibu)) ibuValid++;
        if (isValValid(st.nama_ibu)) ibuValid++;
        if (isValValid(st.nik_ibu)) ibuValid++;
        if (isValValid(st.tahun_lahir_ibu)) ibuValid++;
        if (isValValid(st.jenjang_pendidikan_ibu)) ibuValid++;
        if (isValValid(st.pekerjaan_ibu)) ibuValid++;
        if (isValValid(st.penghasilan_ibu)) ibuValid++;
      }

    const totalReq = ayahTotal + ibuTotal;
    const totalVal = ayahValid + ibuValid;
    return totalReq > 0 ? Math.round((totalVal / totalReq) * 100) : 0;
  };

  const getPeriodikCompletion = (st: any) => {
    if (!st) return 0;
    let validCount = 0;

    // 1. Tinggi Badan (cm)
    if (isValValid(st.tinggi_badan) || isValValid(st.tinggi)) validCount++;
    // 2. Berat Badan (kg)
    if (isValValid(st.berat_badan) || isValValid(st.berat)) validCount++;
    // 3. Lingkar Kepala (cm)
    if (isValValid(st.lingkar_kepala) || isValValid(st.lingkar)) validCount++;
    // 4. Jumlah Saudara Kandung
    if (isValValid(st.jumlah_saudara_kandung) || isValValid(st.saudara)) validCount++;
    // 5. Anak Ke-
    if (isValValid(st.anak_ke) || isValValid(st.anak_ke_berapa)) validCount++;
    // 6. Jarak Tempat Tinggal ke Sekolah
    const jarakVal = (st.jarak_rumah_ke_sekolah || st.jarak_tempat_tinggal_ke_sekolah || st.jarak || "").toString().trim();
    if (isValValid(jarakVal)) validCount++;
    // 7. Waktu Tempuh ke Sekolah (Menit)
    if (isValValid(st.waktu_tempuh_ke_sekolah_menit) || isValValid(st.waktu_tempuh)) validCount++;

    // Logika Kondisional untuk Jarak
    const jarakLower = jarakVal.toLowerCase();
    const isLebihDari1Km = jarakLower.includes("lebih") || jarakLower.includes(">") || jarakLower.includes("lebih dari 1");

    let totalFields = 7;
    if (isLebihDari1Km) {
      totalFields = 8;
      if (isValValid(st.sebutkan_berapa_kilometer) || isValValid(st.sebutkan_berapa_km) || isValValid(st.jarak_km)) {
        validCount++;
      }
    }

    return Math.round((validCount / totalFields) * 100);
  };

  const getCompletion = (student: any, fields: string[]): number => {
    if (!student || !fields || fields.length === 0) return 0;
    let count = 0;
    fields.forEach(f => {
      if (f === 'wilayah') {
        if (isValValid(student.nama_wil) || isValValid(student.wilayah) || isValValid(student.kel) || isValValid(student.kec) || isValValid(student.kab_kota)) {
          count++;
        }
      } else if (f === 'nipd') {
        if (isValValid(student.nipd) || isValValid(student.nipd_nisn) || isValValid(student.login) || isValValid(student.nisn)) {
          count++;
        }
      } else if (f === 'jurusan') {
        if (isValValid(student.jurusan) || isValValid(student.rombel)) {
          count++;
        }
      } else if (f === 'sebutkan_berapa_kilometer') {
        if (isValValid(student.sebutkan_berapa_kilometer) || isValValid(student.jarak_rumah_ke_sekolah)) {
          count++;
        }
      } else if (f === 'waktu_tempuh_ke_sekolah_menit') {
        if (isValValid(student.waktu_tempuh_ke_sekolah_menit) || isValValid(student.waktu_tempuh)) {
          count++;
        }
      } else if (f === 'id_hobby') {
        if (isValValid(student.id_hobby) || isValValid(student.hobi) || isValValid(student.hobby)) {
          count++;
        }
      } else if (f === 'id_cita') {
        if (isValValid(student.id_cita) || isValValid(student.id_cita_cita) || isValValid(student.cita_cita) || isValValid(student.cita)) {
          count++;
        }
      } else {
        if (isValValid(student[f])) {
          count++;
        }
      }
    });
    return Math.round((count / fields.length) * 100);
  };

  const studentStats = useMemo(() => {
    return students.map((s: any) => {
      const profilPct = getCompletion(s, REQUIRED_FIELDS.profil);
      const ortuPct = getOrtuCompletion(s);
      const regPct = getCompletion(s, REQUIRED_FIELDS.registrasi);
      const periodikPct = getPeriodikCompletion(s);
      const overallPct = Math.round((profilPct + ortuPct + regPct + periodikPct) / 4);

      return {
        ...s,
        profilPct,
        ortuPct,
        regPct,
        periodikPct,
        overallPct
      };
    });
  }, [students]);

  const filteredStats = useMemo(() => {
    if (completionFilter === "Lengkap") {
      return studentStats.filter((s: any) => s.overallPct === 100);
    }
    if (completionFilter === "Belum Lengkap") {
      return studentStats.filter((s: any) => s.overallPct < 100);
    }
    return studentStats;
  }, [studentStats, completionFilter]);

  // Rata-rata kelas / total
  const avgStats = useMemo(() => {
    if (studentStats.length === 0) return { profil: 0, ortu: 0, reg: 0, periodik: 0, overall: 0 };
    const sumProfil = studentStats.reduce((acc: number, s: any) => acc + s.profilPct, 0);
    const sumOrtu = studentStats.reduce((acc: number, s: any) => acc + s.ortuPct, 0);
    const sumReg = studentStats.reduce((acc: number, s: any) => acc + s.regPct, 0);
    const sumPeriodik = studentStats.reduce((acc: number, s: any) => acc + s.periodikPct, 0);
    const count = studentStats.length;

    return {
      profil: Math.round(sumProfil / count),
      ortu: Math.round(sumOrtu / count),
      reg: Math.round(sumReg / count),
      periodik: Math.round(sumPeriodik / count),
      overall: Math.round((sumProfil + sumOrtu + sumReg + sumPeriodik) / (count * 4))
    };
  }, [studentStats]);

  const renderBadge = (pct: number, student: any, categoryKey: 'profil' | 'ortu' | 'registrasi' | 'periodik', categoryLabel: string) => {
    let colorStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    let barStyle = "bg-emerald-500";
    
    if (pct < 50) {
      colorStyle = "bg-red-500/10 text-red-400 border-red-500/30";
      barStyle = "bg-red-500";
    } else if (pct < 100) {
      colorStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
      barStyle = "bg-amber-500";
    }

    const missing = pct < 100 ? getMissingFields(student, categoryKey) : [];

    return (
      <div 
        className={`group/badge relative flex flex-col gap-1.5 min-w-[100px] ${pct < 100 ? 'cursor-pointer' : ''}`}
        onClick={() => {
          if (pct < 100) {
            setSelectedDetail({ student, categoryKey, categoryLabel, pct, missing });
          }
        }}
        title={pct < 100 ? `Klik untuk melihat ${missing.length} data belum terisi` : 'Lengkap 100%'}
      >
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border transition-all ${colorStyle} ${pct < 100 ? 'group-hover/badge:scale-105 group-hover/badge:border-amber-400/80 shadow-sm' : ''}`}>
            {pct}%
          </span>
          {pct === 100 ? (
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest hidden sm:inline">Lengkap</span>
          ) : (
            <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-widest hidden sm:inline group-hover/badge:underline">
              {missing.length} Kosong
            </span>
          )}
        </div>
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${barStyle}`} 
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Hover Tooltip Preview */}
        {pct < 100 && missing.length > 0 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/badge:flex flex-col bg-[#181e42] border border-amber-500/40 rounded-xl p-3 shadow-2xl z-50 min-w-[210px] max-w-[280px] text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-1.5">
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                <AlertCircle size={12} className="text-amber-400 shrink-0" /> {categoryLabel} ({pct}%)
              </span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                {missing.length} Belum Terisi
              </span>
            </div>
            <ul className="space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar text-[11px] text-slate-200">
              {missing.map((item, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="truncate">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-[9px] text-purple-300 font-semibold mt-2 text-center border-t border-white/5 pt-1">
              Klik untuk melihat rincian lengkap
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderOverallBadge = (s: any) => {
    const isLengkap = s.overallPct === 100;
    const allMissing = isLengkap ? [] : [
      ...getMissingFields(s, 'profil').map(f => `[Profil] ${f}`),
      ...getMissingFields(s, 'ortu').map(f => `[Data Org Tua] ${f}`),
      ...getMissingFields(s, 'registrasi').map(f => `[Registrasi] ${f}`),
      ...getMissingFields(s, 'periodik').map(f => `[Data Periodik] ${f}`),
    ];

    return (
      <div 
        className={`inline-block relative group/overall ${!isLengkap ? 'cursor-pointer' : ''}`}
        onClick={() => {
          if (!isLengkap) {
            setSelectedDetail({
              student: s,
              categoryKey: 'overall',
              categoryLabel: 'Semua Kategori (Rata-Rata Total)',
              pct: s.overallPct,
              missing: allMissing
            });
          }
        }}
        title={!isLengkap ? `Klik untuk melihat total ${allMissing.length} field belum terisi` : '100% Lengkap'}
      >
        <span className={`inline-block px-3 py-1 rounded-xl text-xs font-bold transition-all ${
          isLengkap 
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            : s.overallPct >= 70
            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:border-blue-400'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:border-amber-400'
        }`}>
          {s.overallPct}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Rekap Inputan Data Siswa</h2>
          <p className="text-slate-400 text-xs mt-1">Persentase kelengkapan pengisian data wajib siswa per kategori. Klik/sorot pada % untuk melihat data yang belum terisi.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <select 
            value={completionFilter}
            onChange={(e) => setCompletionFilter(e.target.value)}
            className="bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200"
          >
            <option value="Semua">Status: Semua</option>
            <option value="Lengkap">100% Lengkap</option>
            <option value="Belum Lengkap">Belum Lengkap (&lt;100%)</option>
          </select>

          <select 
            value={rombelFilter}
            onChange={(e) => setRombelFilter(e.target.value)}
            disabled={uniqueRombels.length <= 1}
            className={`flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200 ${uniqueRombels.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uniqueRombels.map((r: string) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama atau NISN..."
              className="bg-[#111633] border border-white/10 rounded-xl py-2.5 pl-12 pr-4 w-full focus:outline-none focus:border-purple-500/50 text-slate-200"
            />
          </div>
          <button onClick={onRefresh} className="p-2.5 bg-[#111633] hover:bg-white/5 border border-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#111633] border border-white/10 p-5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Siswa</p>
          <h4 className="text-2xl font-bold text-white">{filteredStats.length}</h4>
          <p className="text-[10px] text-slate-400 mt-1">Siswa Terdaftar</p>
        </div>
        <div className="bg-[#111633] border border-white/10 p-5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Profil Siswa</p>
          <h4 className="text-2xl font-bold text-blue-400">{avgStats.profil}%</h4>
          <p className="text-[10px] text-slate-400 mt-1">Rata-rata Kelengkapan</p>
        </div>
        <div className="bg-[#111633] border border-white/10 p-5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data Org Tua</p>
          <h4 className="text-2xl font-bold text-purple-400">{avgStats.ortu}%</h4>
          <p className="text-[10px] text-slate-400 mt-1">Rata-rata Kelengkapan</p>
        </div>
        <div className="bg-[#111633] border border-white/10 p-5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Registrasi</p>
          <h4 className="text-2xl font-bold text-indigo-400">{avgStats.reg}%</h4>
          <p className="text-[10px] text-slate-400 mt-1">Rata-rata Kelengkapan</p>
        </div>
        <div className="bg-[#111633] border border-white/10 p-5 rounded-2xl col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data Periodik</p>
          <h4 className="text-2xl font-bold text-cyan-400">{avgStats.periodik}%</h4>
          <p className="text-[10px] text-slate-400 mt-1">Rata-rata Kelengkapan</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111633] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="max-h-[600px] overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead className="sticky top-0 z-20 bg-[#161b40] shadow-[0_1px_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 w-12">No</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 sticky left-0 bg-[#161b40] z-30 min-w-[220px]">Nama & NISN</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Rombel</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Profil</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Data Org Tua</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Registrasi</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Data Periodik</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 text-center">Rata-Rata Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500 italic">
                    Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStats.map((s: any, idx: number) => (
                  <tr key={s.nisn} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-5 text-sm font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-5 sticky left-0 bg-[#111633] group-hover:bg-[#1a1f3d] z-10 border-r border-white/5">
                      <p className="font-bold text-white group-hover:text-purple-400 transition-colors">{s.nama}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.nisn}</p>
                    </td>
                    <td className="p-5 text-sm text-slate-300 font-medium">{s.rombel || "-"}</td>
                    <td className="p-5">{renderBadge(s.profilPct, s, 'profil', 'Profil Siswa')}</td>
                    <td className="p-5">{renderBadge(s.ortuPct, s, 'ortu', 'Data Org Tua')}</td>
                    <td className="p-5">{renderBadge(s.regPct, s, 'registrasi', 'Registrasi')}</td>
                    <td className="p-5">{renderBadge(s.periodikPct, s, 'periodik', 'Data Periodik')}</td>
                    <td className="p-5 text-center">
                      {renderOverallBadge(s)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Field Belum Terisi */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111633] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full inline-block mb-2">
                  Belum Lengkap ({selectedDetail.pct}%)
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">{selectedDetail.student?.nama}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  NISN: <span className="text-slate-200 font-mono">{selectedDetail.student?.nisn}</span> | Rombel: <span className="text-slate-200">{selectedDetail.student?.rombel || '-'}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedDetail(null)}
                className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-400" />
                  Kategori: <span className="text-purple-300 font-bold">{selectedDetail.categoryLabel}</span>
                </h4>
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {selectedDetail.missing.length} Field Kosong
                </span>
              </div>

              <div className="bg-[#181e42] border border-white/5 rounded-2xl p-4 max-h-[260px] overflow-y-auto custom-scrollbar">
                <p className="text-xs font-semibold text-slate-400 mb-2.5">Daftar Field Yang Belum Diisi:</p>
                <ul className="space-y-2">
                  {selectedDetail.missing.map((field: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2.5 text-xs text-slate-200 bg-white/[0.03] border border-white/5 p-2.5 rounded-xl">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-medium">{field}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDetail(null)}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
