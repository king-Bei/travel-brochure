import React, { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { 
  X, 
  History, 
  RotateCcw, 
  User, 
  Calendar, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import type { BrochureData } from '../types';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  brochureId: string;
  onRestore: (data: BrochureData) => void;
}

export function VersionHistoryModal({ isOpen, onClose, brochureId, onRestore }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && brochureId) {
      loadVersions();
    }
  }, [isOpen, brochureId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await storage.getVersions(brochureId);
      setVersions(data);
    } catch (err) {
      console.error('載入版本失敗:', err);
    }
    setLoading(false);
  };

  const handleRestore = async (version: any) => {
    if (!window.confirm('確定要將手冊恢復到此版本嗎？目前未儲存的變更將會遺失。')) return;
    
    setRestoringId(version.id);
    try {
      // 在恢復前才去抓取詳細的 data
      const snapshot = await storage.getLogDetail(version.id);
      
      if (!snapshot) {
        alert('無法取得該版本的詳細內容，可能已被刪除。');
        return;
      }

      await storage.restoreVersion(brochureId, snapshot);
      onRestore(snapshot);
      onClose();
    } catch (error) {
      console.error('恢復失敗：', error);
      alert('恢復版本失敗，請稍後再試。');
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
              <History size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-800 text-xl tracking-tight">版本歷程紀錄</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">檢視並恢復過往儲存的手冊快照</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-gray-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm font-bold text-gray-400">正在讀取歷程版本...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                <History size={32} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-gray-600">目前尚無版本紀錄</p>
                <p className="text-xs text-gray-400">當您手動點擊儲存或發佈時，系統會自動建立快照版本。</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div 
                  key={version.id}
                  className="group relative bg-white border border-gray-100 rounded-2xl p-5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${index === 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                        {index === 0 ? <ShieldCheck size={20} /> : <Clock size={20} />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-800 tracking-tight">
                            {formatDate(version.created_at)}
                          </span>
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-md">目前版本</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                          <span className="flex items-center gap-1">
                            <User size={12} /> {version.editor_name || '系統'}
                          </span>
                          <span className="w-1 h-1 bg-gray-200 rounded-full" />
                          <span className="flex items-center gap-1">
                            <AlertCircle size={12} /> {
                              version.action_type === 'status_change'
                                ? (version.data?.note || '變更製作狀態')
                                : version.data 
                                  ? (version.data.title || '未命名手冊') 
                                  : '無版本快照'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const isRestorable = version.action_type === 'save' && !!version.data;
                      return (
                        <button
                          onClick={() => handleRestore(version)}
                          disabled={restoringId !== null || !isRestorable}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            !isRestorable 
                              ? 'bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                              : restoringId === version.id
                                ? 'bg-blue-50 text-blue-400'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-100'
                          }`}
                          title={!isRestorable ? "此紀錄不含資料快照，無法恢復" : "將手冊恢復至此版本"}
                        >
                          {restoringId === version.id ? (
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <RotateCcw size={16} />
                          )}
                          {isRestorable ? '恢復此版本' : '無法恢復'}
                        </button>
                      );
                    })()}
                  </div>
                  
                  {/* Subtle link indicator */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pr-2 text-blue-200">
                    <ChevronRight size={20} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-8 py-5 bg-white border-t border-gray-50 text-center">
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
              提示：恢復版本後，系統會自動同步至雲端並覆蓋現有手冊內容。<br/>
              建議在恢復前，可先將目前草稿匯出至電腦備份。
            </p>
        </div>
      </div>
    </div>
  );
}
