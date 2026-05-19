import React, { useEffect, useState, useRef } from 'react';
import { Globe, Sparkles } from 'lucide-react';
import { BrochureProvider, useBrochure } from './context/BrochureContext';
import { EditorPanel } from './components/editor/EditorPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { Management } from './components/Management';
import { EBookView } from './components/preview/EBookView';
import { auth } from './lib/auth';
import { supabase } from './lib/supabase';
import { storage } from './lib/storage';
import type { BrochureData, User } from './types';

function InnerApp({ currentId, currentUser, onBackToDashboard }: { currentId: string, currentUser: User | null, onBackToDashboard: () => void }) {
  const { data, updateData } = useBrochure();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [hasConflict, setHasConflict] = useState(false);
  const isFirstMount = React.useRef(true);
  const [syncToast, setSyncToast] = useState<{ show: boolean; editor: string }>({ show: false, editor: '' });

  const lastSavedDataRef = useRef<string>(JSON.stringify(data));

  // 當雲端時間戳變動時 (無論是自己儲存還是協同同步過來)，立即同步更新 lastSavedDataRef
  // 這是防範協作更新回彈觸發「自動儲存死循環」的關鍵防線！
  useEffect(() => {
    if (data.serverUpdatedAt) {
      const dataToCompare = { ...data };
      delete (dataToCompare as any).serverUpdatedAt;
      lastSavedDataRef.current = JSON.stringify(dataToCompare);
    }
  }, [data.serverUpdatedAt]);

  // 監聽全域實時同步事件，彈出精緻協同通知
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSyncToast({ show: true, editor: detail.editor });
      
      const timer = setTimeout(() => {
        setSyncToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('brochure-collaborative-sync', handleSync);
    return () => window.removeEventListener('brochure-collaborative-sync', handleSync);
  }, []);

  // 20秒防抖自動儲存
  useEffect(() => {
    // 初始掛載時不觸發儲存
    if (isFirstMount.current) {
      isFirstMount.current = false;
      lastSavedDataRef.current = JSON.stringify(data);
      return;
    }

    // 資料已鎖定、發生衝突或已結案時不自動儲存
    if (data.isLocked || hasConflict || data.isClosed) {
      setSaveStatus('saved');
      return;
    }

    // 檢查內容是否真的有變動 (排除 serverUpdatedAt 欄位進行比對)
    const currentDataToCompare = { ...data };
    delete (currentDataToCompare as any).serverUpdatedAt;
    const currentDataStr = JSON.stringify(currentDataToCompare);
    
    const lastDataToCompare = JSON.parse(lastSavedDataRef.current);
    delete (lastDataToCompare as any).serverUpdatedAt;
    const lastDataStr = JSON.stringify(lastDataToCompare);

    if (currentDataStr === lastDataStr) {
      // 內容沒變，不需要儲存
      return;
    }

    setSaveStatus('unsaved');
    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      const result = await storage.saveBrochure(currentId, data, true); // true 代表這是自動儲存，不產生版本快照
      
      if (result.success) {
        lastSavedDataRef.current = JSON.stringify(data); // 標記為已儲存
        setLastSaved(new Date());
        setSaveStatus('saved');
        // 更新 Context 中的時間戳，以便下次儲存
        if (data.serverUpdatedAt) {
           updateData({ serverUpdatedAt: data.serverUpdatedAt });
        }
      } else if (result.error === 'CONFLICT') {
        setSaveStatus('unsaved');
        setHasConflict(true);
        alert('【儲存衝突】此手冊已被其他使用者修改並儲存。\n\n為避免覆蓋他人的變更，自動儲存已暫停。請複製您的變更後，重新整理頁面以取得最新版本。');
      } else {
        // 同步失敗時回到待儲存狀態，以便使用者再次手動觸發或重試
        console.error('自動儲存同步失敗:', result.error);
        setSaveStatus('unsaved');
      }
    }, 20000);

    return () => clearTimeout(timer);
  }, [data, currentId, hasConflict]);

  // 實時在線 Presence 監聽
  useEffect(() => {
    if (!supabase || !currentId || !currentUser) return;

    const channel = supabase.channel(`brochure_${currentId}`, {
      config: {
        presence: {
          key: currentUser.name || currentUser.employee_id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // 取得目前在線的其他使用者名稱清單
        const users = Object.keys(state);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [currentId, currentUser]);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      <Header
        currentId={currentId}
        onBackToDashboard={onBackToDashboard}
        saveStatus={saveStatus}
        onlineUsers={onlineUsers}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/5 no-print border-r">
          <EditorPanel />
        </div>
        <div className="w-3/5">
          <PreviewPanel />
        </div>
      </div>

      {/* 協同編輯實時同步 Toast */}
      {syncToast.show && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-white/95 backdrop-blur-md border border-blue-100 shadow-2xl px-5 py-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-800 tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
              實時協作同步成功
            </h4>
            <p className="text-[10px] text-gray-500 font-medium mt-1">
              同仁 <span className="font-bold text-blue-600">{syncToast.editor}</span> 剛更新了此手冊，已為您無縫同步進度！
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [view, setView] = useState<'login' | 'dashboard' | 'editor' | 'management' | 'ebook'>('login');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [initialData, setInitialData] = useState<BrochureData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadData() {
      // 1. 檢查登入狀態
      const user = await auth.getCurrentUser();
      setCurrentUser(user);
      
      // 2. 處理網址參數
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('id');
      const mode = urlParams.get('mode');

      // 電子書模式特殊處理 (不強制導向登入，但會檢查發佈狀態)
      if (mode === 'ebook' && urlId) {
        let cloudData = await storage.getBrochure(urlId, true); // E-Book 模式需要圖片
        
        // 如果找不到 id，嘗試搜尋 shortId
        if (!cloudData && supabase) {
            const { data: found } = await supabase
                .from('brochures')
                .select('data')
                .eq('data->>shortId', urlId)
                .single();
            if (found) cloudData = found.data as BrochureData;
        }

        if (cloudData) {
            // 檢查是否已過期 (下架)
            const isExpired = cloudData.expiresAt && new Date(cloudData.expiresAt).getTime() < new Date().setHours(0,0,0,0);
            
            if ((cloudData.isPublished && !isExpired) || currentUser) { // 已發佈且未過期，或已登入管理者皆可看
              setInitialData(cloudData);
              setCurrentId(urlId); // 這裡雖然是 shortId 但 context 會用 initialData
              setView('ebook');
              setLoading(false);
              return;
            } else {
              alert(isExpired ? '此手冊已過期下架。' : '此手冊尚未發佈，無法線上閱讀。');
            }
        }
      }

      // 如果未登入，強制導向登入頁面
      if (!user) {
         setView('login');
         setLoading(false);
         return;
      }
      
      // 如果已登入，且有 urlId，則載入該手冊進入 editor
      if (urlId && mode !== 'ebook') {
        const cloudData = await storage.getBrochure(urlId, false); // 編輯器模式不需抓取巨大圖片
        if (cloudData) {
          if (cloudData.isDeleted) {
            alert('此手冊已被作廢，無法編輯。');
            setView('dashboard');
          } else {
            setInitialData(cloudData);
            setCurrentId(urlId);
            setView('editor');
          }
          setLoading(false);
          return;
        }
      }
      
      // 已登入但沒有 urlId，進入 dashboard
      setView('dashboard');
      setLoading(false);
    }

    loadData();

    // 監聽登入狀態變更 (處理登出或 Session 失效)
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setView('login');
        setCurrentId(null);
        setInitialData(null);
      }
    }) || { data: { subscription: null } };

    return () => {
      subscription?.unsubscribe();
    }
  }, []);

  // 3. 定期檢查 Session 是否過期 (6小時自動登出)
  useEffect(() => {
    if (view === 'login' || view === 'ebook') return;

    const checkSession = async () => {
      const user = await auth.getCurrentUser();
      if (!user) {
        // 如果 getCurrentUser 回傳 null，代表可能已過期
        setView('login');
        setCurrentId(null);
        setInitialData(null);
        setCurrentUser(null);
      }
    };

    // 每 5 分鐘檢查一次
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    
    // 當視窗獲取焦點時也檢查一次，確保休眠喚醒後能立即處理
    window.addEventListener('focus', checkSession);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkSession);
    };
  }, [view]);

  // 4. 使用者活動偵測 (更新最後活動時間)
  useEffect(() => {
    if (view === 'login' || view === 'ebook') return;

    let throttleTimer: any = null;
    const handleActivity = () => {
      if (throttleTimer) return;
      
      // 立即更新最後活動時間，保障即時寫入
      auth.updateLastActivity();
      
      // 進入 30 秒冷卻期，避免頻繁寫入 localStorage 造成效能損耗
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
      }, 30000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [view]);

  // 載入進度模擬邏輯
  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingProgress(0);
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 98) return prev;
          // 智慧減速：越接近 100 跑越慢
          const remaining = 100 - prev;
          const increment = Math.max(0.1, remaining * 0.15);
          return Math.min(98, prev + increment);
        });
      }, 200);
    } else {
      setLoadingProgress(100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
        <div className="w-full max-w-[280px] flex flex-col items-center">
          {/* Logo 區域 */}
          <div className="mb-12 flex flex-col items-center animate-in fade-in zoom-in duration-700">
            <div className="w-20 h-20 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mb-5 shadow-sm">
               <Globe className="text-blue-600 animate-spin" style={{ animationDuration: '3s' }} size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">鑫囍探索旅行</h2>
            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-[0.3em] font-bold">Smart Brochure</p>
          </div>

          {/* 進度條區域 */}
          <div className="w-full space-y-4">
            <div className="flex justify-between items-end px-1">
              <span className="text-xs font-bold text-gray-500">載入手冊資料中...</span>
              <span className="text-xs font-black text-blue-600 font-mono">{Math.round(loadingProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-50">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out shadow-sm"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-300 text-center font-medium">正在從伺服器安全取得您的專屬行程</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return <Login onLoginSuccess={async () => {
      // 登入成功後即時獲取並更新當前使用者狀態，以便在線 Presence 能立即啟用
      const user = await auth.getCurrentUser();
      setCurrentUser(user);
      
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('id')) {
         // 若登入前有夾帶 id，登入後重新整理讓他走 loadData 邏輯
         window.location.reload();
      } else {
         setView('dashboard');
      }
    }} />;
  }

  if (view === 'dashboard') {
    return <Dashboard 
      onLogout={async () => {
        await auth.logout();
        setView('login');
      }}
      onGoToManagement={() => setView('management')}
      onSelectBrochure={async (id) => {
      setLoading(true);
      const loadedData = await storage.getBrochure(id, false); // 從列表進入編輯器不需圖片

      setLoading(false);

      if (loadedData) {
        setInitialData(loadedData);
        setCurrentId(id);
        setView('editor');
        // 清除網址的 ?id 除非想要保持雲端連結（點擊雲端儲存時才會再次設定）
        window.history.pushState({}, '', window.location.pathname);
      } else {
        alert('無法載入此手冊的詳細資料，可能尚未同步且本機無快取。');
      }
    }} />
  }

  if (view === 'management') {
    return <Management 
      onBack={() => setView('dashboard')}
      onEdit={async (id) => {
        setLoading(true);
        const loadedData = await storage.getBrochure(id, false); // 管理頁面進入編輯不需圖片
        setLoading(false);
        if (loadedData) {
           setInitialData(loadedData);
           setCurrentId(id);
           setView('editor');
        }
      }}
    />
  }

  if (view === 'ebook') {
    return (
      <BrochureProvider initialData={initialData}>
        <EBookView />
      </BrochureProvider>
    );
  }

  return (
    <BrochureProvider initialData={initialData} key={currentId}>
      <InnerApp
        currentId={currentId!}
        currentUser={currentUser}
        onBackToDashboard={() => {
          setView('dashboard');
          setCurrentId(null);
          setInitialData(null);
          window.history.pushState({}, '', window.location.pathname);
        }}
      />
    </BrochureProvider>
  );
}

export default App;
