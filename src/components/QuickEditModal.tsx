import React, { useState, useEffect } from 'react';
import { Settings, X, Save, Calendar, Tag, Activity } from 'lucide-react';
import { BrochureMeta } from '../lib/storage';

interface QuickEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: any) => Promise<void>;
    meta: BrochureMeta | null;
}

export function QuickEditModal({ isOpen, onClose, onSave, meta }: QuickEditModalProps) {
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [departureDate, setDepartureDate] = useState('');
    const [isClosed, setIsClosed] = useState(false);
    const [password, setPassword] = useState('');
    const [clearPassword, setClearPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (meta) {
            setCategory(meta.category || '報價');
            setStatus(meta.status || '待製作');
            setDepartureDate(meta.departureDate || '');
            setIsClosed(!!meta.isClosed);
            setPassword('');
            setClearPassword(false);
        }
    }, [meta, isOpen]);

    if (!isOpen || !meta) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(meta.id, {
                category,
                status,
                departureDate,
                isClosed,
                password: password.trim() || undefined,
                clearPassword
            });
            onClose();
        } catch (error) {
            console.error('Failed to save metadata:', error);
            alert('儲存失敗，請稍後再試');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
                    <div className="flex items-center gap-3">
                        <Settings size={20} className="text-blue-600" />
                        <h3 className="font-bold text-gray-800">快速編輯資訊</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">手冊標題</p>
                        <p className="font-bold text-gray-800 text-lg leading-tight">{meta.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                                <Tag size={14} /> 分類
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                            >
                                <option value="報價">報價</option>
                                <option value="出團">出團</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                                <Activity size={14} /> 狀態
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                            >
                                {['待製作', '初稿完成', '待調整', '內部確認', '待客戶確認', '客戶已確認', '已出團'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                            <Calendar size={14} /> 出發日期
                        </label>
                        <input
                            type="date"
                            value={departureDate}
                            onChange={(e) => setDepartureDate(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                        />
                    </div>

                    {/* 電子書密碼保護 */}
                    <div className="space-y-2 pt-4 border-t border-gray-100">
                        <label className="text-xs font-bold text-gray-500 flex items-center justify-between uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">🔑 電子書密碼保護</span>
                            {meta.passwordHash && (
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
                                placeholder={meta.passwordHash ? "輸入新密碼以覆寫" : "設定閱讀密碼（留空 = 公開）"}
                                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all disabled:bg-gray-50 disabled:text-gray-400"
                            />
                            {meta.passwordHash && (
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

                    <div className="pt-4 border-t border-gray-100">
                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${isClosed ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                                    <X size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">結案狀態</p>
                                    <p className="text-xs text-gray-500">結案後手冊將從草稿清單中隱藏</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={isClosed}
                                onChange={(e) => setIsClosed(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                            />
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md shadow-blue-200 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>處理中...</>
                        ) : (
                            <>
                                <Save size={18} />
                                儲存變更
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
