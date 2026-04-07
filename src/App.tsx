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
  FileText, CreditCard, Layout
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend
} from 'recharts';

// GANTI DENGAN URL DEPLOY ADMIN BACKEND ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbxofsXy3ANp99QI2vsbKLdFBQ1aLuUU17FAJ4Tnz7LmG47z2bTXHSHYBYPy8TzUpSXD_g/exec";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('verval');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [rombelFilter, setRombelFilter] = useState("Semua");
  const [vervalFilter, setVervalFilter] = useState("Semua");
  const [notifForm, setNotifForm] = useState({ judul: '', pesan: '', tipe: 'info', nisn_target: '' });
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
        if (result.user.status === 'user' && result.user.rombel) {
          setRombelFilter(result.user.rombel);
        }
        if (result.user.status === 'user' && result.user.akses_menu) {
          const allowed = result.user.akses_menu.split(',').map((m: string) => m.trim().toLowerCase());
          if (allowed.length > 0) {
            // Set sub-tab aktif ke menu pertama yang diizinkan
            const firstMenu = allowed[0];
            const validMenus = ['profil', 'ortu', 'registrasi', 'periodik', 'kurang_mampu', 'verval'];
            if (validMenus.includes(firstMenu)) {
              setActiveSubTab(firstMenu);
            }
          }
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

  const filteredStudents = students
    .filter(s => {
      const matchesSearch = (s.nama || "").toLowerCase().includes(search.toLowerCase()) || 
                           (s.nisn || "").includes(search);
      
      // Filter Rombel: Jika user, paksa ke rombel user. Jika admin, bebas.
      const targetRombel = user?.status === 'user' ? user.rombel : rombelFilter;
      const matchesRombel = targetRombel === "Semua" || s.rombel === targetRombel;

      // Filter Verval
      const matchesVerval = vervalFilter === "Semua" || 
                           (vervalFilter === "Sudah Verval" && (s.status_verval || "").toLowerCase() === "ya") ||
                           (vervalFilter === "Belum Verval" && (s.status_verval || "").toLowerCase() !== "ya");
      
      return matchesSearch && matchesRombel && matchesVerval;
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

  const uniqueRombels = ["Semua", ...new Set(students.map(s => s.rombel).filter(Boolean))].sort();

  // Calculate stats based on user scope (Admin = All, User = Their Rombel)
  const studentsInScope = user?.status === 'user' 
    ? students.filter(s => s.rombel === user.rombel)
    : students;

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
      const status = (s.status_verval || "").toLowerCase();
      if (status === 'ya' || status === 'sudah') statsObj.total_verval++;
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

  const isAllowed = (menu: string) => {
    if (user?.status === 'admin') return true;
    if (!user?.akses_menu) return false;
    const allowed = user.akses_menu.split(',').map((m: any) => m.trim().toLowerCase());
    return allowed.includes(menu.toLowerCase());
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
          <h1 className="text-lg font-bold text-white">Dashdark X</h1>
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
                {isAllowed('profil') && <SubNavItem active={activeSubTab === 'profil'} onClick={() => setActiveSubTab('profil')} label="Profil Siswa" />}
                {isAllowed('ortu') && <SubNavItem active={activeSubTab === 'ortu'} onClick={() => setActiveSubTab('ortu')} label="Data Orang Tua" />}
                {isAllowed('registrasi') && <SubNavItem active={activeSubTab === 'registrasi'} onClick={() => setActiveSubTab('registrasi')} label="Registrasi" />}
                {isAllowed('periodik') && <SubNavItem active={activeSubTab === 'periodik'} onClick={() => setActiveSubTab('periodik')} label="Data Periodik" />}
                {isAllowed('kurang_mampu') && <SubNavItem active={activeSubTab === 'kurang_mampu'} onClick={() => setActiveSubTab('kurang_mampu')} label="Murid Kurang Mampu" />}
                {isAllowed('verval') && <SubNavItem active={activeSubTab === 'verval'} onClick={() => setActiveSubTab('verval')} label="Verval Data" />}
              </div>
            )}
          </div>

          {user.status === 'admin' && (
            <NavItem active={activeTab === 'notif'} onClick={() => { setActiveTab('notif'); setIsSidebarOpen(false); }} icon={<Bell size={20}/>} label="Notifikasi" />
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
              {activeTab === 'dashboard' && <DashboardView stats={displayStats} />}
              {activeTab === 'data' && (
                <>
                  {activeSubTab === 'verval' ? (
                    <DataSiswaView 
                      students={filteredStudents} 
                      search={search} 
                      setSearch={setSearch} 
                      rombelFilter={rombelFilter}
                      setRombelFilter={setRombelFilter}
                      vervalFilter={vervalFilter}
                      setVervalFilter={setVervalFilter}
                      uniqueRombels={uniqueRombels}
                      onRefresh={fetchData}
                      user={user}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
                      <Clock size={48} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium">Menu Sedang Dikembangkan</p>
                      <p className="text-sm opacity-60">Sub menu ini akan segera tersedia.</p>
                    </div>
                  )}
                </>
              )}
              {activeTab === 'notif' && <NotifView form={notifForm} setForm={setNotifForm} notifications={notifications} />}
            </>
          )}
        </div>
      </div>
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

function DashboardView({ stats }: { stats: any }) {
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
    { name: 'Menunggu Verval', value: stats?.total_pending || 0, fill: '#f59e0b' },
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
        <StatCard icon={<Clock className="text-cyan-400"/>} label="Menunggu Verval" value={stats?.total_pending} trend="-3.1%" isUp={false} />
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

function DataSiswaView({ students, search, setSearch, rombelFilter, setRombelFilter, vervalFilter, setVervalFilter, uniqueRombels, onRefresh, user }: any) {
  const isUser = user?.status === 'user';

  return (
    <div className="space-y-6 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Database Siswa</h2>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <select 
            value={vervalFilter}
            onChange={(e) => setVervalFilter(e.target.value)}
            className="flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200"
          >
            <option value="Semua">Semua Status</option>
            <option value="Sudah Verval">Sudah Verval</option>
            <option value="Belum Verval">Belum Verval</option>
          </select>
          <select 
            value={rombelFilter}
            onChange={(e) => setRombelFilter(e.target.value)}
            disabled={isUser}
            className={`flex-1 md:flex-none bg-[#111633] border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-purple-500/50 text-sm text-slate-200 ${isUser ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Siswa</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Rombel / Jurusan</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Verval</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Login</th>
                <th className="p-5 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {students.map((s: any) => (
              <tr key={s.nisn} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-5">
                  <p className="font-bold text-white group-hover:text-purple-400 transition-colors">{s.nama}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.nisn}</p>
                </td>
                <td className="p-5">
                  <p className="text-sm font-bold text-slate-300">{s.rombel}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.jurusan}</p>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    s.status_verval === 'Ya' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {s.status_verval === 'Ya' ? 'Verified' : 'Pending'}
                  </span>
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
                <td className="p-5 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-slate-500 hover:text-purple-400 transition-colors"><ChevronRight size={18}/></button>
                    <button className="p-2 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function NotifView({ form, setForm, notifications }: any) {
  return (
    <div className="space-y-10 pb-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-6">Kirim Pengumuman</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">NISN Target (Opsional)</label>
              <input 
                value={form.nisn_target} onChange={(e) => setForm({...form, nisn_target: e.target.value})}
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
          <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-600/20 active:scale-[0.98] border border-white/10">
            <Send size={20} /> Kirim Sekarang
          </button>
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
                  <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
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
                      <td className="p-5 text-sm text-slate-400">{notif.nisn_target || 'Semua'}</td>
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
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                          <CheckCircle size={14} /> Terkirim
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
