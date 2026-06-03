import React, { useRef, useState, useEffect } from 'react';
import { Printer, Download, Upload, CloudUpload, ArrowLeft, CheckCircle2, Globe, History, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useBrochure } from '../context/BrochureContext';
import { PublishModal } from './PublishModal';
import type { BrochureData } from '../types';
// 移除大量渲染套件，改用原生列印以最佳化效能
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { StatusLogModal, LogEntry, LogLevel } from './StatusLogModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { captureBrochurePages } from '../lib/renderUtils';

export function Header({
    currentId,
    onBackToDashboard,
    saveStatus,
    onlineUsers = []
}: {
    currentId?: string,
    onBackToDashboard?: () => void,
    saveStatus?: 'saved' | 'saving' | 'unsaved',
    onlineUsers?: string[]
}) {
    const { data, updateData } = useBrochure();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isSavingCloud, setIsSavingCloud] = useState(false);

    // 背景發佈狀態
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishProgress, setPublishProgress] = useState({ current: 0, total: 0 });
    const [publishStatusText, setPublishStatusText] = useState('');
    const [publishFlipCloudId, setPublishFlipCloudId] = useState<string | null>(data.ebookId || null);
    const [publishToFlipCloud, setPublishToFlipCloud] = useState(true);
    const [publishStartAt, setPublishStartAt] = useState(data.publishStartAt || '');
    const [publishExpiresAt, setPublishExpiresAt] = useState(data.expiresAt || '');
    const [publishToast, setPublishToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string } | null>(null);

    // 當手冊資料的上下架日期變動時，同步狀態
    useEffect(() => {
        setPublishStartAt(data.publishStartAt || '');
        setPublishExpiresAt(data.expiresAt || '');
    }, [data.publishStartAt, data.expiresAt]);

    const showPublishToast = (type: 'success' | 'error', message: string) => {
        setPublishToast({ show: true, type, message });
        setTimeout(() => {
            setPublishToast(null);
        }, 4000);
    };

    const handlePublish = async () => {
        if (isPublishing) return;
        setIsPublishing(true);
        setPublishStatusText('準備中...');
        setPublishProgress({ current: 0, total: 0 });

        try {
            // 1. 執行圖片擷取
            setPublishStatusText('正在捕捉分頁 PNG 快照以確保排版正確...');
            const images = await captureBrochurePages('#capture-pages-root', (current, total) => {
                setPublishProgress({ current, total });
                setPublishStatusText(`正在處理第 ${current} / ${total} 頁...`);
            });

            // 2. 同步發佈到 FlipCloud
            let ebookId = data.ebookId || null;
            let finalPublishedImages = images;

            if (publishToFlipCloud) {
                setPublishStatusText('正在同步至 電子書系統...');
                const ebookResult = await storage.publishToEbook(data.title || '未命名手冊', images, data.ebookId);
                if (ebookResult.success && ebookResult.id) {
                    ebookId = ebookResult.id;
                    setPublishFlipCloudId(ebookResult.id);
                    if (ebookResult.urls) {
                        finalPublishedImages = ebookResult.urls;
                    }
                } else {
                    console.error('發佈失敗:', ebookResult.error);
                    throw new Error('同步到電子書系統時失敗：' + ebookResult.error);
                }
            }

            // 3. 更新手冊資料
            const now = new Date().toISOString();
            const history = data.publishHistory || [];
            const finalData = {
                ...data,
                isPublished: true,
                publishedAt: now,
                publishStartAt,
                expiresAt: publishExpiresAt,
                publishedImages: finalPublishedImages,
                ebookId: ebookId || undefined,
                publishHistory: [
                    ...history,
                    { timestamp: now, action: 'publish' as const }
                ],
                version: (data.version || 0) + 1
            };

            // 4. 儲存到雲端
            setPublishStatusText('正在同步至手冊雲端系統...');
            const urlParams = new URLSearchParams(window.location.search);
            const id = currentId || urlParams.get('id');
            if (id) {
                const result = await storage.saveBrochure(id, finalData);
                if (!result.success && result.error === 'CONFLICT') {
                    throw new Error('【發佈衝突】此手冊已被其他使用者修改並儲存。請重新整理頁面以取得最新版本。');
                }
            }

            updateData(finalData);
            setPublishStatusText('發佈成功！');
            showPublishToast('success', '手冊發佈成功！電子書已同步更新。');
        } catch (error: any) {
            console.error('發佈失敗:', error);
            setPublishStatusText('發佈失敗');
            showPublishToast('error', error.message || '發佈過程發生錯誤');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleUnpublish = async () => {
        if (isPublishing) return;
        setIsPublishing(true);
        setPublishStatusText('下架中...');
        try {
            const now = new Date().toISOString();
            const history = data.publishHistory || [];
            const finalData = {
                ...data,
                isPublished: false,
                publishHistory: [
                    ...history,
                    { timestamp: now, action: 'unpublish' as const }
                ]
            };

            const urlParams = new URLSearchParams(window.location.search);
            const id = currentId || urlParams.get('id');
            if (id) {
                await storage.saveBrochure(id, finalData, false);
            }
            updateData(finalData);
            setPublishStatusText('下架成功！');
            showPublishToast('success', '手冊已成功下架。');
        } catch (error: any) {
            console.error('下架失敗:', error);
            showPublishToast('error', '下架失敗：' + error.message);
        } finally {
            setIsPublishing(false);
        }
    };

    // Status Log State
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [logTitle, setLogTitle] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const addLog = (message: string, level: LogLevel = 'info') => {
        setLogs(prev => [...prev, { id: crypto.randomUUID(), message, level, timestamp: new Date() }]);
    };

    const [isConfirmingSave, setIsConfirmingSave] = useState(false);

    const handleSaveToCloud = () => {
        if (!supabase) {
            alert('系統尚未連接至雲端資料庫');
            return;
        }
        setLogTitle('同步至雲端');
        setLogs([]);
        setIsConfirmingSave(true);
        setIsLogOpen(true);
    };

    const startCloudSaveSync = async () => {
        setIsConfirmingSave(false);
        setIsSavingCloud(true);

        const urlParams = new URLSearchParams(window.location.search);
        const existingId = currentId || urlParams.get('id');

        if (!existingId) {
            alert('手冊 ID 遺失，無法進行雲端同步');
            return;
        }

        try {
            const dataToSave = { ...data };
            const result = await storage.saveBrochure(existingId, dataToSave);

            if (result.success) {
                setLogs([{ id: '1', message: '儲存成功', level: 'success', timestamp: new Date() }]);
                // 更新 Context 中的時間戳，以便下次儲存
                if (data.serverUpdatedAt) {
                    updateData({ serverUpdatedAt: data.serverUpdatedAt });
                }
            } else if (result.error === 'CONFLICT') {
                setLogs([{
                    id: 'err-conflict',
                    message: '【儲存衝突】此手冊已被其他使用者修改並儲存。請重新整理頁面以取得最新版本，或複製目前變更後重新整理。',
                    level: 'error',
                    timestamp: new Date()
                }]);
                alert('【儲存衝突】資料已被他人修改，本次儲存已取消。');
            } else {
                throw new Error(result.error || '同步過程發生未知錯誤');
            }
        } catch (error: any) {
            console.error('儲存失敗:', error);
            setLogs([{ id: 'err', message: error.message || '儲存失敗，請檢查網路連線', level: 'error', timestamp: new Date() }]);
        } finally {
            setIsSavingCloud(false);
        }
    };

    const handlePrint = () => {
        // 標準 A5 直式列印
        const oldTitle = document.title;
        const now = new Date();
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        const mmdd = `${mm}${dd}`;

        // 暫時修改標題以改變輸出 PDF 檔名
        document.title = `${data.title || '旅遊手冊'}－手冊${mmdd}`;

        document.body.classList.remove('print-cover-mode');
        const printStyle = document.createElement('style');
        printStyle.id = 'force-fullpage-print';
        printStyle.innerHTML = `
            @page { size: A5 portrait; margin: 0 !important; }
            @media print { html, body { margin: 0 !important; padding: 0 !important; } }
        `;
        document.head.appendChild(printStyle);
        window.print();

        setTimeout(() => {
            document.title = oldTitle;
            const el = document.getElementById('force-fullpage-print');
            if (el) el.remove();
        }, 1000);
    };

    const handlePrintCover = () => {
        // A4 橫式封面+封底跨頁列印
        const oldTitle = document.title;
        const now = new Date();
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        const mmdd = `${mm}${dd}`;

        // 暫時修改標題以改變輸出 PDF 檔名
        document.title = `${data.title || '旅遊手冊'}－封面封底_${mmdd}`;

        document.body.classList.add('print-cover-mode');
        const printStyle = document.createElement('style');
        printStyle.id = 'force-spread-print';
        printStyle.innerHTML = `
            @page { size: A4 landscape; margin: 0 !important; }
            @media print { html, body { margin: 0 !important; padding: 0 !important; } }
        `;
        document.head.appendChild(printStyle);
        window.print();

        setTimeout(() => {
            document.title = oldTitle;
            document.body.classList.remove('print-cover-mode');
            const el = document.getElementById('force-spread-print');
            if (el) el.remove();
        }, 1000);
    };

    const handleExport = () => {
        // 建立可下載的 JSON 字串
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const now = new Date();
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        const mmdd = `${mm}${dd}`;

        // 產生預設檔名：標題＋草稿_mmdd
        const exportFileDefaultName = `${data.title || '旅遊手冊'}－草稿_${mmdd}.json`;

        // 模擬點擊下載連結
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImportClick = () => {
        // 觸發隱藏的 file input
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const importedData = JSON.parse(result) as BrochureData;

                // 基本的結構驗證 (檢查是否有必要的欄位)
                if (importedData && typeof importedData === 'object' && 'itineraries' in importedData && 'theme' in importedData) {
                    updateData(importedData);
                    alert('資料匯入成功！');
                } else {
                    alert('匯入失敗：檔案格式不正確或缺少必要資料。');
                }
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('匯入失敗：無法解析 JSON 檔案。');
            }

            // 清空 input，允許重複上傳相同檔案
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <header
            className="h-16 flex items-center justify-between px-6 border-b no-print"
            style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}
        >
            <div className="flex items-center gap-4">
                {onBackToDashboard && (
                    <button
                        onClick={onBackToDashboard}
                        className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="回主控台"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <h1
                    className="text-xl font-bold"
                    style={{ color: '#1e3a5f' }}
                >
                    📖 旅遊手冊製作
                </h1>

                {/* 資料鎖定切換或唯讀狀態 */}
                {data.isClosed ? (
                    <div className="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 border-2 border-gray-200 text-gray-500 shadow-sm cursor-not-allowed" title="此手冊已結案，唯讀模式下無法自動儲存">
                        <Lock size={14} />
                        已結案 (唯讀)
                    </div>
                ) : (
                    <button
                        onClick={() => updateData({ isLocked: !data.isLocked })}
                        className={`ml-4 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 border-2 ${data.isLocked
                                ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-sm animate-pulse'
                                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                            }`}
                        title={data.isLocked ? "點擊解除鎖定以恢復自動儲存" : "點擊鎖定後將停止自動儲存，保護資料不被意外更改"}
                    >
                        {data.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                        {data.isLocked ? '資料已鎖定' : '資料未鎖定'}
                    </button>
                )}

                {saveStatus && (
                    <div className="ml-4 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                        {saveStatus === 'saving' && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" /> 儲存中...</span>}
                        {saveStatus === 'saved' && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={12} />已自動儲存</span>}
                        {saveStatus === 'unsaved' && <span className="flex items-center gap-1 text-amber-500">待儲存...</span>}
                    </div>
                )}

                {/* 在線協作者顯示 */}
                {onlineUsers.length > 1 && (
                    <div className="ml-2 flex items-center -space-x-2">
                        {onlineUsers.map((user, idx) => (
                            <div
                                key={idx}
                                title={`${user} 正在編輯中`}
                                className="w-7 h-7 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 cursor-help"
                                style={{ zIndex: 10 - idx }}
                            >
                                {user.substring(0, 1)}
                            </div>
                        ))}
                        <span className="ml-3 text-[10px] text-gray-400 font-medium">其他 {onlineUsers.length - 1} 人在線</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* 隱藏的檔案上傳元素 */}
                <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />

                <button
                    onClick={handleSaveToCloud}
                    disabled={isSavingCloud || data.isClosed}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold transition-all active:scale-95 shadow-sm ${data.isClosed
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                            : isSavingCloud
                                ? 'opacity-70 cursor-wait bg-blue-50 border-blue-100 text-blue-500'
                                : saveStatus === 'unsaved'
                                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:shadow-md animate-pulse'
                                    : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                    title={data.isClosed ? "手冊已結案，唯讀狀態下無法儲存" : "儲存草稿到 Supabase 雲端並取得分享連結"}
                >
                    <CloudUpload size={18} className={isSavingCloud ? 'animate-spin' : ''} />
                    {isSavingCloud ? '正在同步...' : '強制儲存'}
                </button>

                <button
                    onClick={handleImportClick}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50 text-gray-700 border-gray-300"
                    title="從電腦載入之前儲存的手冊資料"
                >
                    <Upload size={18} />
                    匯入紀錄
                </button>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50 text-gray-700 border-gray-300"
                    title="將目前的手冊資料存成檔案下載"
                >
                    <Download size={18} />
                    儲存草稿
                </button>

                <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 transition-colors hover:bg-amber-50 text-amber-700"
                    title="查看並恢復之前的版本"
                >
                    <History size={18} />
                    版本歷程
                </button>

                <button
                    onClick={handlePrintCover}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 transition-colors hover:bg-blue-50 text-blue-700"
                    title="將封面與封底拼成一張 A4 橫式列印"
                >
                    <div className="flex -space-x-1">
                        <Printer size={16} />
                        <Printer size={16} className="opacity-50" />
                    </div>
                    封面跨頁 (A4)
                </button>

                <button
                    onClick={() => setIsPublishModalOpen(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ml-1 hover:opacity-90 active:scale-95 ${data.isPublished
                            ? 'bg-green-600 text-white shadow-lg shadow-green-200 animate-pulse'
                            : 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                        }`}
                >
                    <Globe size={18} />
                    {data.isPublished ? '已發佈' : '發佈'}
                </button>

                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-opacity ml-1 hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: '#1e3a5f' }}
                >
                    <Printer size={18} />
                    手冊全文 (PDF)
                </button>
            </div>
            <StatusLogModal
                isOpen={isLogOpen}
                title={logTitle}
                logs={logs}
                isProcessing={isGeneratingPDF || isSavingCloud}
                isConfirming={isConfirmingSave}
                onConfirm={startCloudSaveSync}
                onClose={() => {
                    setIsLogOpen(false);
                    setIsConfirmingSave(false);
                }}
            />
            <PublishModal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                isProcessing={isPublishing}
                renderProgress={publishProgress}
                statusMessage={publishStatusText}
                flipCloudId={publishFlipCloudId}
                publishToFlipCloud={publishToFlipCloud}
                setPublishToFlipCloud={setPublishToFlipCloud}
                publishStartAt={publishStartAt}
                setPublishStartAt={setPublishStartAt}
                expiresAt={publishExpiresAt}
                setExpiresAt={setPublishExpiresAt}
                onPublish={handlePublish}
                onUnpublish={handleUnpublish}
            />
            <VersionHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                brochureId={currentId || ''}
                onRestore={(restoredData) => updateData(restoredData)}
            />

            {/* 背景發佈懸浮進度卡片 (玻璃擬態) */}
            {isPublishing && !isPublishModalOpen && (
                <div className="fixed bottom-6 right-6 z-[9999] w-80 bg-white/80 backdrop-blur-xl border border-gray-100/50 shadow-2xl rounded-2xl p-5 flex flex-col gap-3.5 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
                            <Globe size={20} className="animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black text-gray-800 tracking-wide flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                                背景發佈中...
                            </h4>
                            <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                                {publishStatusText}
                            </p>
                        </div>
                    </div>

                    {publishProgress.total > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[9px] font-bold text-gray-400">
                                <span>進度</span>
                                <span>{publishProgress.current} / {publishProgress.total} 頁</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-50/50">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out shadow-sm"
                                    style={{ width: `${(publishProgress.current / publishProgress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <p className="text-[9px] text-amber-600 font-bold bg-amber-50/60 px-2.5 py-1.5 rounded-lg border border-amber-100/40 text-center animate-pulse">
                        ⚠️ 發佈期間請勿關閉或重新整理此網頁
                    </p>
                </div>
            )}

            {/* 發佈狀態 Toast 通知 */}
            {publishToast && publishToast.show && (
                <div className={`fixed bottom-6 right-6 z-[9999] bg-white/95 backdrop-blur-md border shadow-2xl px-5 py-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 ${publishToast.type === 'success' ? 'border-green-100 shadow-green-100/20' : 'border-red-100 shadow-red-100/20'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${publishToast.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                        {publishToast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-gray-800 tracking-wide">
                            {publishToast.type === 'success' ? '處理成功' : '處理失敗'}
                        </h4>
                        <p className="text-[10px] text-gray-500 font-medium mt-1">
                            {publishToast.message}
                        </p>
                    </div>
                </div>
            )}
        </header>
    );
}
