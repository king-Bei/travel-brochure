import React, { useState, useEffect } from 'react';
import { storage, BrochureMeta } from '../lib/storage';
import { FileText, Plus, Copy, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BrochureData } from '../types';

interface DashboardProps {
    onSelectBrochure: (id: string) => void;
}

export function Dashboard({ onSelectBrochure }: DashboardProps) {
    const [brochures, setBrochures] = useState<BrochureMeta[]>([]);

    const loadList = async () => {
        let mergedList: BrochureMeta[] = [];
        let hasLoadedCloud = false;

        if (supabase) {
            try {
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT')), 8000)
                );
                // 讀取這張表時，拿取 isDeleted 判斷是否作廢
                const fetchPromise = supabase.from('brochures').select('id, title:data->>title, agency:data->>agency, isDeleted:data->>isDeleted, updated_at, created_at');
                const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

                if (!error && data) {
                    const cloudList: BrochureMeta[] = data
                        .filter((row: any) => row.isDeleted !== 'true' && row.isDeleted !== true)
                        .map((row: any) => {
                            return {
                                id: row.id,
                                title: row.title || '未命名手冊',
                                agency: row.agency || '',
                                createdAt: row.created_at || new Date().toISOString(),
                                updatedAt: row.updated_at || new Date().toISOString(),
                            };
                        });

                    mergedList = [...cloudList];
                    hasLoadedCloud = true;
                }
            } catch (e) {
                console.warn('載入雲端列表失敗，降級為本地列表', e);
            }
        }

        const localList = await storage.getList();

        if (hasLoadedCloud) {
            // 合併本地和雲端列表 (過濾掉雲端已有的)
            const cloudIds = new Set(mergedList.map(m => m.id));
            mergedList = [...mergedList, ...localList.filter(l => !cloudIds.has(l.id))];
        } else {
            mergedList = localList;
        }

        // 以更新時間排序 (新到舊)
        mergedList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setBrochures(mergedList);
    };

    useEffect(() => {
        loadList();
    }, []);

    const handleCreate = async () => {
        const newId = await storage.createBrochure();
        onSelectBrochure(newId);
    };

    const handleDuplicate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        // 如果是從雲端複製，我們需要先拿到最新資料
        let dataToDuplicate: BrochureData | null = null;
        if (supabase) {
            const { data } = await supabase.from('brochures').select('data').eq('id', id).single();
            if (data && data.data) {
                dataToDuplicate = data.data as BrochureData;
            }
        }

        // 如果雲端拿不到，再從本地拿
        if (!dataToDuplicate) {
            dataToDuplicate = await storage.getBrochure(id);
        }

        if (!dataToDuplicate) return;

        const newId = crypto.randomUUID();
        const duplicatedData = {
            ...dataToDuplicate,
            title: `${dataToDuplicate.title} (複製)`,
        };
        await storage.saveBrochure(newId, duplicatedData);
        await loadList(); // 重新載入列表
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('確定要刪除這份手冊嗎？這個動作無法復原。')) {
            if (supabase) {
                try {
                    // 加上 .select() 來驗證是否真的有刪除到資料（RLS 阻擋通常不會報錯，而是回傳 0 筆資料）
                    const { data, error } = await supabase.from('brochures').delete().eq('id', id).select();
                    if (error || !data || data.length === 0) {
                        console.warn('實體刪除失敗或被安全機制阻擋，嘗試使用軟刪除 (標記作廢隱藏)...', error);
                        // 取得當前資料並加上 isDeleted 標記，因為 update 沒有被限制
                        const { data: existingData } = await supabase.from('brochures').select('data').eq('id', id).single();
                        if (existingData && existingData.data) {
                            const newData = { ...(existingData.data as any), isDeleted: true };
                            await supabase.from('brochures').update({ data: newData }).eq('id', id);
                        }
                    }
                } catch (error) {
                    console.error('刪除或作廢雲端資料發生錯誤', error);
                }
            }
            await storage.deleteBrochure(id);
            await loadList();
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-gray-200 sticky top-0 z-10">
                <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                    <FileText size={24} className="text-blue-600" />
                    旅遊手冊主控台
                </h1>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    建立新草稿
                </button>
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
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Plus size={20} />
                                立即建立
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                我的草稿列表
                                <span className="text-sm font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                    {brochures.length} 份
                                </span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {brochures.map((meta) => (
                                    <div
                                        key={meta.id}
                                        onClick={() => onSelectBrochure(meta.id)}
                                        className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden flex flex-col h-48"
                                    >
                                        <div className="flex-1 p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">
                                                    {meta.title}
                                                </h3>
                                            </div>
                                            <p className="text-sm text-gray-500 line-clamp-1 mb-4">
                                                {meta.agency || '未設定旅行社'}
                                            </p>

                                            <div className="flex flex-col gap-1.5 mt-auto">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <Calendar size={12} />
                                                    更新：{formatDate(meta.updatedAt)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleDuplicate(e, meta.id)}
                                                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                                            >
                                                <Copy size={16} />
                                                複製
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, meta.id)}
                                                className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
