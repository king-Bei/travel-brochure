import React, { lazy, Suspense, useState, useEffect } from 'react';
import { storage, BrochureMeta } from '../lib/storage';
import {
  Globe,
  Lock,
  Calendar,
  ArrowLeft,
  Link as LinkIcon,
  CheckCircle2,
  Eye,
  Settings,
  X,
  History,
  Search,
} from 'lucide-react';
import { VersionHistoryModal } from './VersionHistoryModal';
const EBookStats = lazy(() => import('./editor/EBookStats').then(m => ({ default: m.EBookStats })));
import type { BrochureData } from '../types';

interface ManagementProps {
  onBack: () => void;
  onEdit: (id: string) => void;
}

export function Management({ onBack, onEdit }: ManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [brochures, setBrochures] = useState<BrochureMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBrochure, setEditingBrochure] = useState<BrochureData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [historyBrochureId, setHistoryBrochureId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'全部' | '出團' | '報價'>('全部');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      // 先顯示本地快取（瞬間），再背景拉雲端更新
      const cached = await storage.getList(false);
      if (cancelled) return;
      if (cached.length > 0) {
        setBrochures(cached);
        setLoading(false);
      }
      const fresh = await storage.getList(true);
      if (cancelled) return;
      setBrochures(fresh);
      setLoading(false);
      await storage.syncLegacyEbooks().catch(() => { });
      if (cancelled) return;
      const repaired = await storage.getList(true);
      if (cancelled) return;
      setBrochures(repaired);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const loadList = async (forceCloud = false) => {
    setLoading(true);
    const list = await storage.getList(forceCloud);
    setBrochures(list);
    setLoading(false);
  };

  const handleTogglePublish = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    const data = await storage.getBrochure(id);
    if (data) {
      const now = new Date().toISOString();
      const updatedData: BrochureData = {
        ...data,
        isPublished: !currentStatus,
        publishHistory: [
          ...(data.publishHistory || []),
          { timestamp: now, action: (!currentStatus ? 'publish' : 'unpublish') as 'publish' | 'unpublish' }
        ]
      };
      const result = await storage.saveBrochure(id, updatedData);
      if (result.success) {
        await loadList(true);
      } else if (result.error === 'CONFLICT') {
        alert('【狀態變更衝突】此手冊已被其他使用者修改。請重新整理列表。');
      }
    }
  };

  const handleOpenEditModal = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const data = await storage.getBrochure(id);
    if (data) {
      setEditingBrochure({ ...data, id } as any); // id is needed for saving
      setPassword('');
      setClearPassword(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBrochure || !editingBrochure.title) return;
    setIsSaving(true);
    const id = (editingBrochure as any).id;

    let updatedBrochure = { ...editingBrochure };
    if (clearPassword) {
      updatedBrochure.passwordHash = '';
    } else if (password.trim()) {
      const sha256 = async (text: string) => {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      };
      updatedBrochure.passwordHash = await sha256(password.trim());
    }

    const result = await storage.saveBrochure(id, updatedBrochure);

    if (result.success) {
      await loadList(true);
      setEditingBrochure(null);
      setPassword('');
      setClearPassword(false);
    } else if (result.error === 'CONFLICT') {
      alert('【儲存衝突】此手冊已被其他使用者修改並儲存。\n\n儲存已取消。請重新整理列表後再試。');
    } else {
      alert('儲存失敗：' + result.error);
    }
    setIsSaving(false);
  };

  const getPublicEbookUrl = (item: Pick<BrochureMeta, 'ebookId'>, preview = false) => {
    if (!item.ebookId) return '';
    const base = `${window.location.origin}${window.location.pathname}?book=${item.ebookId}`;
    return preview ? `${base}&preview=1` : base;
  };

  const handleCopyShortLink = (e: React.MouseEvent, item: BrochureMeta) => {
    e.stopPropagation();
    const url = getPublicEbookUrl(item);
    if (!url) {
      alert('尚未產生電子書 ID，請先同步上架至 FlipCloud。');
      return;
    }
    navigator.clipboard.writeText(url);
    alert('已複製電子書連結至剪貼簿！');
  };

  const filteredBrochures = brochures.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.groupNumber && b.groupNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.agency && b.agency.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === '全部' || b.category === categoryFilter;

    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const depDate = b.departureDate;
      if (!depDate) {
        matchesDate = false;
      } else {
        if (dateRange.start && depDate < dateRange.start) matchesDate = false;
        if (dateRange.end && depDate > dateRange.end) matchesDate = false;
      }
    }

    return matchesSearch && matchesCategory && matchesDate && (b.source || 'editor') === 'editor';
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case '待製作': return 'bg-gray-100 text-gray-500 border-gray-200';
      case '初稿完成': return 'bg-blue-50 text-blue-600 border-blue-100';
      case '待調整': return 'bg-orange-50 text-orange-600 border-orange-100';
      case '內部確認':
      case '待客戶確認': return 'bg-purple-50 text-purple-600 border-purple-100';
      case '客戶已確認': return 'bg-green-50 text-green-600 border-green-100';
      case '已出團': return 'bg-slate-700 text-white border-slate-800';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <Globe size={24} className="text-blue-600 animate-pulse" />
            電子書與手冊發佈管理
          </h1>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* Tab 切換欄 */}
        <div className="flex border-b border-gray-200 mb-8 gap-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-2 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'list'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
          >
            📂 發佈管理清單
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-3 px-2 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'stats'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
          >
            📊 數據統計看板
          </button>
        </div>

        {activeTab === 'list' ? (
          <>
            <div className="mb-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="搜尋標題、團號或旅行社..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm text-sm"
                  />
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  共 {filteredBrochures.length} 份手冊
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">用途分類:</span>
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                    {(['全部', '出團', '報價'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${categoryFilter === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-6 w-px bg-gray-100 mx-2 hidden md:block" />

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">出發日期:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:border-blue-300"
                    />
                    <span className="text-gray-300">~</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:border-blue-300"
                    />
                    {(dateRange.start || dateRange.end) && (
                      <button
                        onClick={() => setDateRange({ start: '', end: '' })}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 表格 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4">手冊標題 / 內部團號</th>
                      <th className="px-6 py-4">分類 / 進度</th>
                      <th className="px-6 py-4">旅行社 / 出發日</th>
                      <th className="px-6 py-4">發佈狀態</th>
                      <th className="px-6 py-4 text-right">管理操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4" colSpan={5}>
                            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredBrochures.length === 0 ? (
                      <tr>
                        <td className="px-6 py-20 text-center text-gray-400" colSpan={5}>
                          找不到符合條件的手冊資料
                        </td>
                      </tr>
                    ) : (
                      filteredBrochures.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                          onClick={(e) => {
                            if (item.source === 'pdf') {
                              handleOpenEditModal(e, item.id);
                            } else {
                              onEdit(item.id);
                            }
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900 line-clamp-1">{item.title}</span>
                                {item.source === 'pdf' ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100 whitespace-nowrap">
                                    📄 PDF 上傳
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                                    ✍️ 系統手冊
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400 mt-1 font-mono">{item.groupNumber || '--- 無內部團號 ---'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                              <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold ${item.category === '出團' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.category || '報價'}
                              </span>
                              <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(item.status)}`}>
                                {item.status || '待製作'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-600">{item.agency || '---'}</span>
                              <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                <Calendar size={10} />
                                {item.departureDate ? `出發: ${item.departureDate}` : '未設定日期'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={(e) => handleTogglePublish(e, item.id, !!item.isPublished)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all w-fit ${item.isPublished
                                    ? 'bg-green-50 text-green-600 border border-green-100'
                                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                                  }`}
                              >
                                {item.isPublished ? <Globe size={12} /> : <Lock size={12} />}
                                {item.isPublished ? '已發佈' : '草稿'}
                              </button>
                              <span className="text-[10px] text-gray-300 font-medium whitespace-nowrap">更新: {formatDate(item.updatedAt)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const url = getPublicEbookUrl(item, true);
                                  if (!url) {
                                    alert('尚未產生電子書 ID，請先同步上架至 FlipCloud。');
                                    return;
                                  }
                                  window.open(url, '_blank');
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-none hover:shadow-sm border border-transparent hover:border-gray-100"
                                title="預覽電子書"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                onClick={(e) => handleCopyShortLink(e, item)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-none hover:shadow-sm border border-transparent hover:border-gray-100"
                                title="複製短網址"
                              >
                                <LinkIcon size={18} />
                              </button>
                              <div className="w-px h-4 bg-gray-200 mx-1"></div>
                              <button
                                onClick={(e) => handleOpenEditModal(e, item.id)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-none hover:shadow-sm border border-transparent hover:border-gray-100"
                                title="快速調整"
                              >
                                <Settings size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistoryBrochureId(item.id);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-none hover:shadow-sm border border-transparent hover:border-gray-100"
                                title="版本紀錄"
                              >
                                <History size={18} />
                              </button>
                              {item.source !== 'pdf' && (
                                <>
                                  <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                  <button
                                    onClick={() => onEdit(item.id)}
                                    className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                  >
                                    編輯手冊
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 說明區塊 */}
            <div className="mt-8 bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} />
                發佈管理說明
              </h3>
              <ul className="text-xs text-blue-700/80 space-y-1.5 leading-relaxed">
                <li>• 只有狀態為「已發佈」的手冊，才能透過短連結讓外部旅客直接開啟電子書閱讀模式。</li>
                <li>• 「團號」為內部財務或控團人員對照使用，不會顯示在手冊封面，僅出現在管理列表。</li>
                <li>• 電子書模式支援 Responsive 自適應排版，於手機、平板與電腦皆可獲得最佳閱讀體驗。</li>
              </ul>
            </div>
          </>
        ) : (
          <Suspense fallback={<div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}><EBookStats brochures={brochures} /></Suspense>
        )}
      </main>

      {/* 快速編輯 Modal */}
      {editingBrochure && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">快速調整手冊</h3>
                  <p className="text-[10px] text-gray-400 font-medium">修改基本資訊與發佈設定</p>
                </div>
              </div>
              <button
                onClick={() => setEditingBrochure(null)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-5 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">用途分類</label>
                  <select
                    value={editingBrochure.category || '報價'}
                    onChange={(e) => setEditingBrochure({ ...editingBrochure, category: e.target.value as any })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                  >
                    <option value="報價">報價</option>
                    <option value="出團">出團</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">製作進度</label>
                  <select
                    value={editingBrochure.status || '待製作'}
                    onChange={(e) => setEditingBrochure({ ...editingBrochure, status: e.target.value as any })}
                    className={`w-full px-4 py-3 border rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-bold ${getStatusColor(editingBrochure.status)}`}
                  >
                    {['待製作', '初稿完成', '待調整', '內部確認', '待客戶確認', '客戶已確認', '已出團'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">手冊標題</label>
                <input
                  type="text"
                  value={editingBrochure.title}
                  onChange={(e) => setEditingBrochure({ ...editingBrochure, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">內部團號</label>
                  <input
                    type="text"
                    value={editingBrochure.groupNumber || ''}
                    onChange={(e) => setEditingBrochure({ ...editingBrochure, groupNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                    placeholder="例如: ABC-123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">出發日期</label>
                  <input
                    type="date"
                    value={editingBrochure.departureDate || ''}
                    onChange={(e) => setEditingBrochure({ ...editingBrochure, departureDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">旅行社名稱</label>
                <input
                  type="text"
                  value={editingBrochure.agency || ''}
                  onChange={(e) => setEditingBrochure({ ...editingBrochure, agency: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">發佈狀態</label>
                <button
                  onClick={() => setEditingBrochure({ ...editingBrochure, isPublished: !editingBrochure.isPublished })}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${editingBrochure.isPublished
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {editingBrochure.isPublished ? <Globe size={20} /> : <Lock size={20} />}
                    <span className="text-sm font-bold">{editingBrochure.isPublished ? '已對外發佈' : '目前為草稿'}</span>
                  </div>
                  <div className={`w-12 h-7 rounded-full p-1 transition-colors ${editingBrochure.isPublished ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${editingBrochure.isPublished ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1 flex items-center gap-1.5">
                  <Calendar size={12} />
                  預計上架日期
                </label>
                <input
                  type="date"
                  value={editingBrochure.publishStartAt || ''}
                  onChange={(e) => setEditingBrochure({ ...editingBrochure, publishStartAt: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1 flex items-center gap-1.5">
                  <Calendar size={12} />
                  預計下架日期
                </label>
                <input
                  type="date"
                  value={editingBrochure.expiresAt || ''}
                  onChange={(e) => setEditingBrochure({ ...editingBrochure, expiresAt: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                />
              </div>

              {/* 電子書密碼保護 */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">🔑 電子書密碼保護</span>
                  {editingBrochure.passwordHash && (
                    <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100">🔒 已設定密碼</span>
                  )}
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (e.target.value) setClearPassword(false);
                    }}
                    disabled={clearPassword}
                    placeholder={editingBrochure.passwordHash ? "輸入新密碼以覆寫" : "設定閱讀密碼（留空 = 公開）"}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  {editingBrochure.passwordHash && (
                    <label className="flex items-center gap-1.5 text-xs text-red-500 cursor-pointer select-none font-bold whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={clearPassword}
                        onChange={(e) => {
                          setClearPassword(e.target.checked);
                          if (e.target.checked) setPassword('');
                        }}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 transition-all cursor-pointer"
                      />
                      清除密碼
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
              <button
                onClick={() => setEditingBrochure(null)}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all"
              >
                取消退出
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-[1.5] py-3.5 rounded-2xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? '正在儲存...' : '確認儲存調整'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 版本紀錄 Modal */}
      <VersionHistoryModal
        isOpen={!!historyBrochureId}
        onClose={() => setHistoryBrochureId(null)}
        brochureId={historyBrochureId || ''}
        onRestore={() => loadList(true)}
      />
    </div>
  );
}
