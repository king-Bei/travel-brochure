import React, { lazy, Suspense, useState, useEffect } from 'react';
import { storage, BrochureMeta } from '../lib/storage';
import {
  Globe,
  Lock,
  ExternalLink,
  Copy,
  Calendar,
  ArrowLeft,
  Link as LinkIcon,
  Eye,
  Settings,
  X,
  Upload,
  History,
  RefreshCw,
  Library,
  Trash2,
} from 'lucide-react';
import { VersionHistoryModal } from './VersionHistoryModal';
import type { BrochureData } from '../types';

const PdfUploadModal = lazy(() => import('./PdfUploadModal').then(m => ({ default: m.PdfUploadModal })));

interface EbookManagementProps {
  onBack: () => void;
}

export function EbookManagement({ onBack }: EbookManagementProps) {
  const [brochures, setBrochures] = useState<BrochureMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBrochure, setEditingBrochure] = useState<BrochureData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [historyBrochureId, setHistoryBrochureId] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchSaving, setBatchSaving] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{
    brochureId: string;
    ebookId: string;
    title: string;
    category?: '出團' | '報價';
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const cached = await storage.getList(false);
      if (cancelled) return;
      if (cached.length > 0) {
        setBrochures(cached.filter(b => b.source === 'pdf'));
        setLoading(false);
      }
      const fresh = await storage.getList(true);
      if (cancelled) return;
      setBrochures(fresh.filter(b => b.source === 'pdf'));
      setLoading(false);
      await storage.syncLegacyEbooks().catch(() => { });
      if (cancelled) return;
      const repaired = await storage.getList(true);
      if (cancelled) return;
      setBrochures(repaired.filter(b => b.source === 'pdf'));
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const loadList = async (forceCloud = false) => {
    setLoading(true);
    const list = await storage.getList(forceCloud);
    setBrochures(list.filter(b => b.source === 'pdf'));
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
          { timestamp: now, action: (!currentStatus ? 'publish' : 'unpublish') as 'publish' | 'unpublish' },
        ],
      };
      const result = await storage.saveBrochure(id, updatedData);
      if (result.success) {
        await loadList(true);
      } else if (result.error === 'CONFLICT') {
        alert('【狀態變更衝突】此手冊已被其他使用者修改。請重新整理列表。');
      }
    }
  };

  const handleDeleteEbook = async (e: React.MouseEvent, item: BrochureMeta) => {
    e.stopPropagation();
    if (!confirm(`確定要刪除「${item.title}」嗎？\n\n這會刪除電子書資料與 Storage 圖片，對外連結也會失效。`)) return;
    const result = await storage.deleteEbook(item.id, item.ebookId);
    if (result.success) {
      setSelectedIds(prev => prev.filter(id => id !== item.id));
      await loadList(true);
    } else {
      alert('刪除失敗：' + (result.error || '未知錯誤'));
    }
  };

  const handleBatchPublish = async (publish: boolean) => {
    if (selectedIds.length === 0) return;
    const actionText = publish ? '上架' : '下架';
    if (!confirm(`確定要批次${actionText} ${selectedIds.length} 份電子書嗎？`)) return;

    setBatchSaving(true);
    try {
      for (const id of selectedIds) {
        const data = await storage.getBrochure(id);
        if (!data) continue;
        const now = new Date().toISOString();
        await storage.saveBrochure(id, {
          ...data,
          isPublished: publish,
          publishedAt: publish ? (data.publishedAt || now) : data.publishedAt,
          publishHistory: [
            ...(data.publishHistory || []),
            { timestamp: now, action: (publish ? 'publish' : 'unpublish') as 'publish' | 'unpublish', note: `批次${actionText}` }
          ]
        });
      }
      setSelectedIds([]);
      await loadList(true);
    } finally {
      setBatchSaving(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.length === filteredBrochures.length ? [] : filteredBrochures.map(b => b.id));
  };

  const openShelf = () => {
    window.open(`${window.location.origin}${window.location.pathname}?mode=shelf`, '_blank');
  };

  const handleOpenEditModal = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const data = await storage.getBrochure(id);
    if (data) {
      setEditingBrochure({ ...data, id } as any);
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
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const filteredBrochures = brochures.filter(b => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.groupNumber && b.groupNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.agency && b.agency.toLowerCase().includes(searchTerm.toLowerCase()));
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
    return matchesSearch && matchesDate;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <span className="text-2xl">📄</span>
            電子書管理
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openShelf}
            className="flex items-center gap-2 px-5 py-2 bg-[#1e1a10] hover:bg-[#12100a] text-[#c8a96e] rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
          >
            <Library size={16} />
            電子書櫃
          </button>
          <button
            onClick={() => {
              setUploadTarget(null);
              setIsPdfModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-100 cursor-pointer"
          >
            <Upload size={16} />
            上傳 電子書
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* 搜尋 + 篩選 */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="搜尋標題、團號或旅行社..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm text-sm"
              />
            </div>
            <div className="text-sm text-gray-500 font-medium">共 {filteredBrochures.length} 份電子書</div>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">出發日期:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:border-blue-300"
                />
                <span className="text-gray-300">~</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:border-blue-300"
                />
                {(dateRange.start || dateRange.end) && (
                  <button onClick={() => setDateRange({ start: '', end: '' })} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            {filteredBrochures.length > 0 && (
              <>
                <div className="h-6 w-px bg-gray-100 mx-2 hidden md:block" />
                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-500 hover:text-blue-600"
                >
                  {selectedIds.length === filteredBrochures.length ? '取消全選' : '全選本頁'}
                </button>
                <button
                  onClick={() => handleBatchPublish(true)}
                  disabled={selectedIds.length === 0 || batchSaving}
                  className="px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg text-xs font-bold text-green-600 disabled:opacity-40"
                >
                  批次上架
                </button>
                <button
                  onClick={() => handleBatchPublish(false)}
                  disabled={selectedIds.length === 0 || batchSaving}
                  className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-xs font-bold text-red-500 disabled:opacity-40"
                >
                  批次下架
                </button>
                <span className="text-xs text-gray-400">已選 {selectedIds.length} 份</span>
              </>
            )}
          </div>
        </div>

        {/* 空狀態 */}
        {!loading && filteredBrochures.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">尚未上傳任何電子書</h2>
            <p className="text-sm text-gray-400 mb-8">將 PDF 旅遊手冊上傳後，即可生成電子書連結對外分享。</p>
            <button
              onClick={() => {
                setUploadTarget(null);
                setIsPdfModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              <Upload size={18} />
              立即上傳第一本
            </button>
          </div>
        )}

        {/* 表格 */}
        {(loading || filteredBrochures.length > 0) && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-4 w-10"></th>
                    <th className="px-6 py-4">電子書標題 / 內部團號</th>
                    <th className="px-6 py-4">旅行社 / 出發日</th>
                    <th className="px-6 py-4">發佈狀態</th>
                    <th className="px-6 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4" colSpan={5}>
                          <div className="h-12 bg-gray-100 rounded-lg w-full" />
                        </td>
                      </tr>
                    ))
                    : filteredBrochures.map(item => (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                        onClick={e => handleOpenEditModal(e, item.id)}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onClick={e => e.stopPropagation()}
                            onChange={() => toggleSelected(item.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 line-clamp-1">{item.title}</span>
                            <span className="text-xs text-gray-400 mt-1 font-mono">{item.groupNumber || '--- 無內部團號 ---'}</span>
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
                              onClick={e => handleTogglePublish(e, item.id, !!item.isPublished)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all w-fit ${item.isPublished
                                ? 'bg-green-50 text-green-600 border border-green-100'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}
                            >
                              {item.isPublished ? <Globe size={12} /> : <Lock size={12} />}
                              {item.isPublished ? '已上架' : '未上架'}
                            </button>
                            <span className="text-[10px] text-gray-300 font-medium whitespace-nowrap">更新: {formatDate(item.updatedAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const url = getPublicEbookUrl(item, true);
                                if (!url) {
                                  alert('尚未產生電子書 ID，請先同步上架。');
                                  return;
                                }
                                window.open(url, '_blank');
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 hover:shadow-sm"
                              title="預覽電子書"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const url = getPublicEbookUrl(item);
                                if (!url) {
                                  alert('尚未產生電子書 ID，請先同步上架。');
                                  return;
                                }
                                navigator.clipboard.writeText(url);
                                alert('已複製電子書連結至剪貼簿！');
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 hover:shadow-sm"
                              title="複製連結"
                            >
                              <LinkIcon size={18} />
                            </button>
                            <div className="w-px h-4 bg-gray-200 mx-1" />
                            <button
                              onClick={e => handleOpenEditModal(e, item.id)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 hover:shadow-sm"
                              title="調整資訊"
                            >
                              <Settings size={18} />
                            </button>
                            {item.ebookId && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setUploadTarget({
                                    brochureId: item.id,
                                    ebookId: item.ebookId!,
                                    title: item.title,
                                    category: item.category === '報價行程' ? '報價' : '出團',
                                  });
                                  setIsPdfModalOpen(true);
                                }}
                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 hover:shadow-sm"
                                title="重新上傳更新"
                              >
                                <RefreshCw size={18} />
                              </button>
                            )}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setHistoryBrochureId(item.id);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 hover:shadow-sm"
                              title="版本紀錄"
                            >
                              <History size={18} />
                            </button>
                            <button
                              onClick={e => handleDeleteEbook(e, item)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 hover:shadow-sm"
                              title="刪除電子書"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 bg-rose-50/50 rounded-2xl p-6 border border-rose-100">
          <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2 mb-2">
            📄 PDF 電子書說明
          </h3>
          <ul className="text-xs text-rose-700/80 space-y-1.5 leading-relaxed">
            <li>• 上傳後系統會將 PDF 每頁轉換為圖片並儲存，生成可對外分享的電子書連結。</li>
            <li>• 只有狀態為「已發佈」的電子書，外部旅客才能透過連結開啟閱讀。</li>
            <li>• PDF 電子書內容無法在系統內編輯，如需修改請重新上傳。</li>
          </ul>
        </div>
      </main>

      {/* 快速調整 Modal */}
      {editingBrochure && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">調整電子書資訊</h3>
                  <p className="text-[10px] text-gray-400 font-medium">修改基本資訊與發佈設定</p>
                </div>
              </div>
              <button onClick={() => setEditingBrochure(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-5 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">電子書標題</label>
                <input
                  type="text"
                  value={editingBrochure.title}
                  onChange={e => setEditingBrochure({ ...editingBrochure, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">團號</label>
                  <input
                    type="text"
                    value={editingBrochure.groupNumber || ''}
                    onChange={e => setEditingBrochure({ ...editingBrochure, groupNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                    placeholder="例如: ABC-123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">出發日期</label>
                  <input
                    type="date"
                    value={editingBrochure.departureDate || ''}
                    onChange={e => setEditingBrochure({ ...editingBrochure, departureDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">旅行社名稱</label>
                <input
                  type="text"
                  value={editingBrochure.agency || ''}
                  onChange={e => setEditingBrochure({ ...editingBrochure, agency: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">上架狀態</label>
                <button
                  onClick={() => setEditingBrochure({ ...editingBrochure, isPublished: !editingBrochure.isPublished })}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${editingBrochure.isPublished
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {editingBrochure.isPublished ? <Globe size={20} /> : <Lock size={20} />}
                    <span className="text-sm font-bold">{editingBrochure.isPublished ? '已上架' : '未上架'}</span>
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
                  onChange={e => setEditingBrochure({ ...editingBrochure, publishStartAt: e.target.value })}
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
                  onChange={e => setEditingBrochure({ ...editingBrochure, expiresAt: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                />
              </div>

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
                    onChange={e => {
                      setPassword(e.target.value);
                      if (e.target.value) setClearPassword(false);
                    }}
                    disabled={clearPassword}
                    placeholder={editingBrochure.passwordHash ? '輸入新密碼以覆寫' : '設定閱讀密碼（留空 = 公開）'}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  {editingBrochure.passwordHash && (
                    <label className="flex items-center gap-1.5 text-xs text-red-500 cursor-pointer select-none font-bold whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={clearPassword}
                        onChange={e => {
                          setClearPassword(e.target.checked);
                          if (e.target.checked) setPassword('');
                        }}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
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

      <VersionHistoryModal
        isOpen={!!historyBrochureId}
        onClose={() => setHistoryBrochureId(null)}
        brochureId={historyBrochureId || ''}
        onRestore={() => loadList(true)}
      />

      <Suspense fallback={null}>
        <PdfUploadModal
          isOpen={isPdfModalOpen}
          onClose={() => {
            setIsPdfModalOpen(false);
            setUploadTarget(null);
          }}
          onSuccess={() => {
            loadList(true);
            setIsPdfModalOpen(false);
            setUploadTarget(null);
          }}
          updateTarget={uploadTarget}
        />
      </Suspense>
    </div>
  );
}
