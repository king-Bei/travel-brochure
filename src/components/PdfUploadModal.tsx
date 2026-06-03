import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { storage } from '../lib/storage';
import * as pdfjsLib from 'pdfjs-dist';

// 使用與 pdfjs-dist 版本完全對應的本地 worker，避免版本不符錯誤
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

interface PdfUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    updateTarget?: {
        brochureId: string;
        ebookId: string;
        title: string;
        category?: '出團' | '報價';
    } | null;
}

export function PdfUploadModal({ isOpen, onClose, onSuccess, updateTarget }: PdfUploadModalProps) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<'出團' | '報價'>('出團');
    const [file, setFile] = useState<File | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [status, setStatus] = useState<'idle' | 'converting' | 'uploading' | 'success' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!isOpen) return;
        setTitle(updateTarget?.title || '');
        setCategory(updateTarget?.category || '出團');
        setFile(null);
        setSelectedFiles([]);
        setStatus('idle');
        setProgress(0);
        setStatusText('');
        setErrorMessage('');
    }, [isOpen, updateTarget]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const pickedFiles = Array.from(files);
            const invalidFile = pickedFiles.find(selectedFile => selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf'));
            if (invalidFile) {
                alert('只支援上傳 PDF 檔案！');
                return;
            }
            const uploadFiles = updateTarget ? pickedFiles.slice(0, 1) : pickedFiles;
            const selectedFile = uploadFiles[0];
            setFile(selectedFile);
            setSelectedFiles(uploadFiles);
            if (!updateTarget && uploadFiles.length > 1) {
                setTitle('');
            } else if (!title) {
                // 自動將檔名（去字尾）作為預設標題
                setTitle(selectedFile.name.replace(/\.pdf$/i, ''));
            }
        }
    };

    const convertPDFToImages = async (pdfFile: File, onProgress: (current: number, total: number) => void): Promise<string[]> => {
        const ab = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
        const totalPages = Math.min(pdf.numPages, 50); // 最多 50 頁
        const pages: string[] = [];

        // 偵測第一頁尺寸
        const firstPage = await pdf.getPage(1);
        const viewport1 = firstPage.getViewport({ scale: 1 });
        const aspect = viewport1.width / viewport1.height;

        // 優化行動端長邊 1200px
        const MAX_PX = 1200;
        let scale = aspect >= 1 ? MAX_PX / viewport1.width : MAX_PX / viewport1.height;
        if (scale > 3) scale = 3;

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            const ctx = canvas.getContext('2d');

            if (ctx) {
                // 填白底以防透明 PDF 變黑
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                await page.render({
                    canvasContext: ctx,
                    viewport: viewport,
                    intent: 'print',
                    canvas: canvas
                } as any).promise;

                let dataUrl;
                try {
                    dataUrl = canvas.toDataURL('image/webp', 0.85);
                    if (!dataUrl.startsWith('data:image/webp')) {
                        throw new Error('WebP not supported');
                    }
                } catch {
                    dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                }
                pages.push(dataUrl);
            }
            onProgress(i, totalPages);
        }
        return pages;
    };

    const handleUpload = async () => {
        const uploadFiles = selectedFiles.length > 0 ? selectedFiles : (file ? [file] : []);
        const isBatch = !updateTarget && uploadFiles.length > 1;
        if (uploadFiles.length === 0 || (!isBatch && !title.trim())) return;
        setStatus('converting');
        setProgress(0);
        setStatusText(isBatch ? `準備批次處理 ${uploadFiles.length} 份 PDF...` : '正在解析並轉換 PDF 頁面...');

        try {
            for (let index = 0; index < uploadFiles.length; index++) {
                const currentFile = uploadFiles[index];
                const baseProgress = Math.round((index / uploadFiles.length) * 100);
                const ebookTitle = isBatch ? currentFile.name.replace(/\.pdf$/i, '') : title.trim();

                setStatus('converting');
                setStatusText(isBatch
                    ? `正在轉換第 ${index + 1} / ${uploadFiles.length} 份：${currentFile.name}`
                    : '正在解析並轉換 PDF 頁面...'
                );

                const pages = await convertPDFToImages(currentFile, (current, total) => {
                    const filePercent = (current / total) * 55;
                    const percent = Math.min(98, Math.round(baseProgress + filePercent / uploadFiles.length));
                    setProgress(percent);
                    setStatusText(`${isBatch ? `第 ${index + 1} / ${uploadFiles.length} 份 · ` : ''}正在轉換 PDF：第 ${current} 頁 / 共 ${total} 頁`);
                });

                setStatus('uploading');
                setProgress(Math.min(98, Math.round(baseProgress + 70 / uploadFiles.length)));
                setStatusText(isBatch
                    ? `正在上傳第 ${index + 1} / ${uploadFiles.length} 本電子書：${ebookTitle}`
                    : '正在上傳圖片至雲端儲存空間...'
                );

                const result = updateTarget
                    ? await storage.updateEbookFromPdf(updateTarget.brochureId, updateTarget.ebookId, ebookTitle, pages, category)
                    : await storage.createEbookFromPdf(ebookTitle, pages, category);

                if (!result.success) {
                    throw new Error(`${ebookTitle}：${result.error || '無法同步發佈電子書'}`);
                }
            }

            setProgress(100);
            setStatus('success');
            setStatusText(updateTarget
                ? '更新成功！電子書圖片與管理紀錄已同步更新。'
                : isBatch
                    ? `批次上傳成功！已建立 ${uploadFiles.length} 本 PDF 電子書。`
                    : '發佈成功！電子書與管理紀錄已同步建立。'
            );
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.message || 'PDF 轉換或上傳失敗，請檢查網路後重試');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Upload size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">{updateTarget ? '重新上傳更新電子書' : '上傳 PDF 建立電子書'}</h3>
                            <p className="text-[10px] text-gray-400 font-medium">{updateTarget ? '系統會自動將 PDF 轉為圖片並覆蓋原電子書' : '可單本或批次選取 PDF，系統會逐本轉圖片並同步至電子書'}</p>
                        </div>
                    </div>
                    {status !== 'converting' && status !== 'uploading' && (
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    {status === 'idle' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">用途分類</label>
                                    <select 
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as any)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
                                    >
                                        <option value="出團">出團</option>
                                        <option value="報價">報價</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">電子書標題</label>
                                    <input 
                                        type="text"
	                                        placeholder={selectedFiles.length > 1 && !updateTarget ? '批次上傳時會使用 PDF 檔名' : '例如：2026 歐洲德法瑞奧精選'}
	                                        value={title}
	                                        onChange={(e) => setTitle(e.target.value)}
	                                        disabled={selectedFiles.length > 1 && !updateTarget}
	                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-medium"
	                                    />
                                </div>
                            </div>

                            {/* Dropzone */}
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-3 bg-gray-50/50 hover:bg-blue-50/10 cursor-pointer transition-all"
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
	                                    onChange={handleFileChange}
	                                    accept=".pdf"
                                        multiple={!updateTarget}
	                                    className="hidden" 
	                                />
                                <div className="p-4 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-blue-500 transition-colors">
                                    <FileText size={32} />
                                </div>
	                                {selectedFiles.length > 1 && !updateTarget ? (
	                                    <div className="text-center">
	                                        <p className="font-bold text-gray-800 text-sm">已選取 {selectedFiles.length} 份 PDF</p>
	                                        <p className="text-xs text-gray-400 mt-1">{selectedFiles.map(item => item.name).slice(0, 3).join('、')}{selectedFiles.length > 3 ? '…' : ''}</p>
	                                    </div>
	                                ) : file ? (
	                                    <div className="text-center">
	                                        <p className="font-bold text-gray-800 text-sm">{file.name}</p>
	                                        <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
	                                        <p className="font-bold text-gray-700 text-sm">{updateTarget ? '拖放或點擊上傳 PDF 檔案' : '拖放或點擊上傳 PDF 檔案，可一次多選'}</p>
	                                        <p className="text-xs text-gray-400 mt-1">{updateTarget ? '重新上傳會覆蓋原本電子書圖片，但保留連結' : '每份 PDF 上限 50 頁，批次會依檔名建立電子書'}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {(status === 'converting' || status === 'uploading') && (
                        <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
                            <Loader2 className="animate-spin text-blue-600" size={40} />
                            <div>
                                <h4 className="font-bold text-gray-800 text-base">{status === 'converting' ? '圖片轉換中' : '發佈上傳中'}</h4>
                                <p className="text-xs text-gray-500 mt-1">{statusText}</p>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mt-2">
                                <div 
                                    className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="p-3 bg-green-50 text-green-600 rounded-full">
                                <CheckCircle size={48} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-base">轉換與發佈成功！</h4>
                                <p className="text-xs text-gray-500 mt-1">{statusText}</p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="p-3 bg-red-50 text-red-600 rounded-full">
                                <AlertTriangle size={48} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-base">發生錯誤</h4>
                                <p className="text-xs text-red-500 mt-1 font-medium">{errorMessage}</p>
                            </div>
                            <button
                                onClick={() => setStatus('idle')}
                                className="mt-4 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-all"
                            >
                                重新嘗試
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {status === 'idle' && (
                    <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all"
                        >
                            取消退出
                        </button>
                        <button 
                            onClick={handleUpload}
	                            disabled={selectedFiles.length === 0 || (!updateTarget && selectedFiles.length > 1 ? false : !title.trim())}
	                            className="flex-[1.5] py-3.5 rounded-2xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
	                        >
	                            {updateTarget ? '開始重新上傳更新' : selectedFiles.length > 1 ? `開始批次上傳 ${selectedFiles.length} 份` : '開始轉換並發佈'}
	                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
