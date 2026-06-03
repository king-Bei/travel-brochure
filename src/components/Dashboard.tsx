import React, { useState, useEffect } from 'react';
import { storage, BrochureMeta } from '../lib/storage';
import { FileText, Plus, Copy, Trash2, Calendar, LogOut, Archive, Globe, Settings } from 'lucide-react';
import { HistoryModal } from './HistoryModal';
import { QuickEditModal } from './QuickEditModal';
import { supabase } from '../lib/supabase';
import { auth } from '../lib/auth';
import { createDefaultData, type BrochureData } from '../types';

interface DashboardProps {
    onSelectBrochure: (id: string) => void;
    onLogout: () => void;
    onGoToManagement: () => void;
    onGoToEbookManagement: () => void;
}

export function Dashboard({ onSelectBrochure, onLogout, onGoToManagement, onGoToEbookManagement }: DashboardProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [brochures, setBrochures] = useState<BrochureMeta[]>([]);

    // History Modal State
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; title: string; logs: any[] }>({
        isOpen: false,
        title: '',
        logs: []
    });
    // Quick Edit Modal State
    const [quickEditModal, setQuickEditModal] = useState<{ isOpen: boolean; meta: BrochureMeta | null }>({
        isOpen: false,
        meta: null
    });

    const [categoryFilter, setCategoryFilter] = useState<'全部' | '出團' | '報價'>('全部');
    const [statusFilter, setStatusFilter] = useState<string>('全部');
    const [showClosed, setShowClosed] = useState(false);

    const loadList = async (forceCloud = false) => {
        const list = await storage.getList(forceCloud);
        setBrochures(list.filter(b => b.source !== 'pdf'));
    };

    useEffect(() => {
        loadList(true);
    }, []);

    const handleCreate = async () => {
        if (isCreating) return;
        setIsCreating(true);
        try {
            const newId = await storage.createBrochure();
            onSelectBrochure(newId);
        } catch (error) {
            console.error('Failed to create brochure:', error);
            setIsCreating(false);
        }
    };

    const handleDuplicate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        let dataToDuplicate: BrochureData | null = null;
        if (supabase) {
            const { data } = await supabase.from('brochures').select('data').eq('id', id).single();
            if (data && data.data) {
                dataToDuplicate = data.data as BrochureData;
            }
        }

        if (!dataToDuplicate) {
            dataToDuplicate = await storage.getBrochure(id);
        }

        if (!dataToDuplicate) return;

        const newId = crypto.randomUUID();
        const duplicatedData: BrochureData = dataToDuplicate.isClosed
            ? {
                ...createDefaultData(),
                title: `${dataToDuplicate.title} (新製作)`,
                category: dataToDuplicate.category || '出團',
                status: '待製作',
                isClosed: false,
            }
            : {
                ...dataToDuplicate,
                title: `${dataToDuplicate.title} (複製)`,
                isClosed: false,
            };
        await storage.saveBrochure(newId, duplicatedData);
        await loadList(true);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('確定要「永久刪除」這份手冊嗎？此動作將嘗試從雲端與本機同時抹除，無法復原。')) {
            await storage.deleteBrochure(id);
            await loadList(true);
        }
    };

    const handleViewHistory = async (e: React.MouseEvent, id: string, title: string) => {
        e.stopPropagation();
        const logs = await storage.getVersions(id);
        setHistoryModal({
            isOpen: true,
            title: title || '未命名手冊',
            logs: logs
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
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

    const handleOpenQuickEdit = (e: React.MouseEvent, meta: BrochureMeta) => {
        e.stopPropagation();
        setQuickEditModal({
            isOpen: true,
            meta: meta
        });
    };

    const handleQuickSave = async (id: string, updates: any) => {
        const result = await storage.updateMetadata(id, updates);
        if (result.success) {
            await loadList(true);
        } else {
            throw new Error(result.error);
        }
    };

    const filteredBrochures = brochures.filter(b => {
        const matchesCategory = categoryFilter === '全部' || b.category === categoryFilter;
        const matchesStatus = statusFilter === '全部' || b.status === statusFilter;
        const matchesClosed = showClosed || !b.isClosed;
        return matchesCategory && matchesStatus && matchesClosed;
    });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-gray-200 sticky top-0 z-10">
                <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                    <FileText size={24} className="text-blue-600" />
                    旅遊手冊主控台
                </h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors border border-transparent"
                        title="登出系統"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">登出</span>
                    </button>
                    <button
                        onClick={onGoToManagement}
                        className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 font-bold rounded-xl transition-all shadow-sm shadow-blue-50 cursor-pointer"
                        title="系統手冊發佈管理"
                    >
                        <Globe size={18} />
                        <span className="hidden sm:inline">手冊發佈管理</span>
                    </button>
                    <button
                        onClick={onGoToEbookManagement}
                        className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                        title="PDF 電子書管理"
                    >
                        <span className="text-base leading-none">📄</span>
                        <span className="hidden sm:inline">PDF 電子書</span>
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-2"></div>
                    <button
                        onClick={handleCreate}
                        disabled={isCreating}
                        className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors shadow-sm ${isCreating
                            ? 'bg-blue-300 cursor-not-allowed text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        <Plus size={18} />
                        {isCreating ? '建立中...' : '新增手冊'}
                    </button>
                </div>
            </header>

            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {brochures.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm mt-8">
                            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                            <h2 className="text-xl font-medium text-gray-800 mb-2">您還沒有建立任何手冊草稿</h2>
                            <p className="text-gray-500 mb-6">點擊下方按鈕開始製作您的第一本旅遊手冊，所有變更將隨螢幕停頓 20 秒自動儲存。</p>
                            <button
                                onClick={handleCreate}
                                disabled={isCreating}
                                className={`inline-flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-colors shadow-sm ${isCreating
                                    ? 'bg-blue-300 cursor-not-allowed text-white'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                <Plus size={20} />
                                {isCreating ? '處理中...' : '新增手冊'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    手冊清單
                                    <span className="text-sm font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                        {filteredBrochures.length} 份
                                    </span>
                                </h2>

                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                                        {(['全部', '出團', '報價'] as const).map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setCategoryFilter(cat)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-600 outline-none shadow-sm"
                                    >
                                        <option value="全部">所有進度</option>
                                        {['待製作', '初稿完成', '待調整', '內部確認', '待客戶確認', '客戶已確認', '已出團'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-2 ml-4 px-4 border-l border-gray-200">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={showClosed}
                                                onChange={(e) => setShowClosed(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">顯示已結案</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredBrochures.map((meta) => (
                                    <div
                                        key={meta.id}
                                        onClick={(e) => {
                                            // 如果點擊的是下拉選單，則不執行跳轉
                                            if ((e.target as HTMLElement).closest('select')) return;
                                            onSelectBrochure(meta.id);
                                        }}
                                        className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden flex flex-col h-auto min-h-[260px]"
                                    >
                                        <div className="flex-1 p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">
                                                    {meta.title}
                                                </h3>
                                                <button
                                                    onClick={(e) => handleOpenQuickEdit(e, meta)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors ml-auto flex-shrink-0"
                                                    title="快速編輯資訊"
                                                >
                                                    <Settings size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleViewHistory(e, meta.id, meta.title)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                                                    title="查看修改歷程"
                                                >
                                                    <Calendar size={18} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div 
                                                    onClick={(e) => handleOpenQuickEdit(e, meta)}
                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer hover:brightness-90 transition-all ${meta.category === '出團' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}
                                                >
                                                    {meta.category || '報價'}
                                                </div>
                                                <div 
                                                    onClick={(e) => handleOpenQuickEdit(e, meta)}
                                                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer hover:brightness-90 transition-all ${getStatusColor(meta.status)}`}
                                                >
                                                    {meta.status || '待製作'}
                                                </div>
                                                {meta.isClosed && (
                                                    <div className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-600 text-white border border-gray-700">
                                                        已結案
                                                    </div>
                                                )}
                                                {meta.groupNumber && (
                                                    <span className="text-[9px] text-gray-400 font-mono ml-auto">{meta.groupNumber}</span>
                                                )}
                                            </div>
                                            <div className="mb-4">
                                                {meta.departureDate ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 font-bold text-[11px] shadow-sm">
                                                        <Calendar size={12} />
                                                        出發日期：{meta.departureDate}
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-400 rounded-lg border border-gray-100 text-[10px]">
                                                        未設定出發日期
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1.5 mt-auto">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <Calendar size={12} />
                                                    更新：{formatDate(meta.updatedAt)}
                                                </div>
                                                {meta.lastModifiedBy && (
                                                    <div className="flex items-center gap-1.5 text-xs text-blue-500 font-medium border-t border-gray-100 pt-1.5 mt-1">
                                                        最後修改：{meta.lastModifiedBy}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between transition-all">
                                            <button
                                                onClick={(e) => handleDuplicate(e, meta.id)}
                                                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                                            >
                                                <Copy size={16} />
                                                複製
                                            </button>
                                            <div className="flex items-center gap-2">
                                                {!meta.isClosed ? (
                                                    <button
                                                        onClick={(e) => handleDelete(e, meta.id)}
                                                        className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded"
                                                        title="永久刪除"
                                                    >
                                                        <Trash2 size={16} />
                                                        <span className="text-xs">刪除</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded-lg">唯讀</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>

            <HistoryModal
                isOpen={historyModal.isOpen}
                onClose={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
                title={historyModal.title}
                logs={historyModal.logs}
            />

            <QuickEditModal
                isOpen={quickEditModal.isOpen}
                onClose={() => setQuickEditModal(prev => ({ ...prev, isOpen: false }))}
                onSave={handleQuickSave}
                meta={quickEditModal.meta}
            />
        </div>
    );
}
