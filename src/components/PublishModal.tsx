import React from 'react';
import { Globe, Calendar, History, X, CheckCircle2, AlertTriangle, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useBrochure } from '../context/BrochureContext';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProcessing: boolean;
  renderProgress: { current: number; total: number };
  statusMessage: string;
  flipCloudId: string | null;
  publishToFlipCloud: boolean;
  setPublishToFlipCloud: (val: boolean) => void;
  expiresAt: string;
  setExpiresAt: (val: string) => void;
  onPublish: () => Promise<void>;
  onUnpublish: () => Promise<void>;
}

export function PublishModal({
  isOpen,
  onClose,
  isProcessing,
  renderProgress,
  statusMessage,
  flipCloudId,
  publishToFlipCloud,
  setPublishToFlipCloud,
  expiresAt,
  setExpiresAt,
  onPublish,
  onUnpublish
}: PublishModalProps) {
  const { data } = useBrochure();

  if (!isOpen) return null;

  const ebookReaderBaseUrl = import.meta.env.VITE_EBOOK_READER_URL || `${window.location.origin}/ebook`;
  const ebookUrl = data.ebookId 
    ? `${ebookReaderBaseUrl}/?book=${data.ebookId}`
    : `${window.location.origin}${window.location.pathname}?id=${(new URLSearchParams(window.location.search)).get('id')}&mode=ebook`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 no-print">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${data.isPublished ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
              <Globe size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">發佈線上手冊 (E-Book)</h2>
              <p className="text-xs text-gray-400 font-medium">讓客戶隨時隨地在手機上閱讀</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-8 py-4 overflow-y-auto max-h-[70vh] space-y-6">
          
          {/* 狀態卡片 */}
          <div className={`p-5 rounded-2xl border ${data.isPublished ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${data.isPublished ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'}`}>
                  {data.isPublished ? '已上架中' : '尚未發佈'}
                </span>
                <h3 className="text-base font-bold text-gray-800">
                  {data.isPublished ? '客戶已可以透過連結閱讀' : '發佈後將產生專屬閱讀連結'}
                </h3>
                {data.publishedAt && (
                  <p className="text-xs text-gray-500">
                    上次發佈時間：{new Date(data.publishedAt).toLocaleString()}
                  </p>
                )}
              </div>
              {data.isPublished && (
                <CheckCircle2 size={32} className="text-green-500" />
              )}
            </div>

            {data.isPublished && (
                <div className="mt-4 pt-4 border-t border-green-100 flex flex-col gap-3">
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-green-100">
                        <LinkIcon size={14} className="text-green-600" />
                        <input 
                            readOnly 
                            value={ebookUrl} 
                            className="flex-1 text-[11px] font-mono text-gray-500 bg-transparent outline-none"
                        />
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(ebookUrl);
                                alert('連結已複製！');
                            }}
                            className="text-[10px] font-bold text-green-700 hover:underline"
                        >
                            複製連結
                        </button>
                    </div>
                    <a 
                      href={ebookUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors"
                    >
                        <ExternalLink size={14} /> 立即預覽電子書
                    </a>
                </div>
            )}
          </div>

          {/* 設定區 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                發佈設定
            </h4>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                {/* FlipCloud 同步選項 */}
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Globe size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-700">同步上架至 FlipCloud</p>
                            <p className="text-[10px] text-gray-400">將分頁轉為高畫質 PNG 並上傳至電子書系統</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={publishToFlipCloud}
                            onChange={(e) => setPublishToFlipCloud(e.target.checked)}
                            className="sr-only peer" 
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div>
                    <p className="text-[11px] text-gray-400 mb-2">預定下架時間 (選填)</p>
                    <input 
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm"
                    />
                </div>
            </div>
          </div>

          {/* FlipCloud 成功連結 (如果有) */}
          {flipCloudId && (
            <div className="p-5 rounded-2xl border bg-blue-50 border-blue-100 animate-in slide-in-from-top duration-500">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-600 text-white rounded-xl">
                        <CheckCircle2 size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900">FlipCloud 上架成功</h3>
                        <p className="text-[10px] text-blue-600/70">電子書已成功發佈至系統</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100">
                        <input 
                            readOnly 
                            value={`${ebookReaderBaseUrl}/?book=${flipCloudId}`} 
                            className="flex-1 text-[10px] font-mono text-gray-500 bg-transparent outline-none"
                        />
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(`${ebookReaderBaseUrl}/?book=${flipCloudId}`);
                                alert('電子書連結已複製！');
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                            複製
                        </button>
                    </div>
                    <a 
                      href={`${ebookReaderBaseUrl}/?book=${flipCloudId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                        <ExternalLink size={14} /> 開啟電子書程式
                    </a>
                </div>
            </div>
          )}

          {/* 紀錄區 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <History size={16} className="text-blue-500" />
                發佈歷史紀錄
            </h4>
            <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                {data.publishHistory && data.publishHistory.length > 0 ? (
                    data.publishHistory.slice().reverse().map((log: any, idx: number) => (
                        <div key={idx} className="px-4 py-3 flex items-center justify-between text-xs">
                            <div className="flex flex-col">
                                <span className={`font-bold ${log.action === 'publish' ? 'text-green-600' : 'text-gray-400'}`}>
                                    {log.action === 'publish' ? '發佈更新' : '執行下架'}
                                </span>
                                <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <span className="text-gray-400 italic">#{data.publishHistory!.length - idx}</span>
                        </div>
                    ))
                ) : (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">尚未有任何發佈紀錄</div>
                )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
          {data.isPublished ? (
              <>
                <button
                    onClick={onUnpublish}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-white text-red-500 border border-red-100 hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <AlertTriangle size={16} /> 停止發佈 (下架)
                </button>
                <button
                    onClick={onPublish}
                    disabled={isProcessing}
                    className="flex-[1.5] px-4 py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden"
                >
                    {isProcessing ? (
                        <div className="flex items-center gap-2">
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                             <span>{statusMessage}</span>
                        </div>
                    ) : (
                        '更新發佈內容'
                    )}
                </button>
              </>
          ) : (
              <button
                onClick={onPublish}
                disabled={isProcessing}
                className="w-full px-4 py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden"
              >
                {isProcessing ? (
                    <div className="flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                         <span>{statusMessage}</span>
                    </div>
                ) : (
                    '立即發佈線上手冊'
                )}
              </button>
          )}
        </div>
      </div>
    </div>
  );
}

