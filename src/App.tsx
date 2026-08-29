import React, { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { Globe, Sparkles } from 'lucide-react';
import { BrochureProvider, useBrochure } from './context/BrochureContext';
import { EditorPanel } from './components/editor/EditorPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { auth } from './lib/auth';
import { supabase } from './lib/supabase';
import { storage } from './lib/storage';
import { createDefaultData } from './types';
import type { BrochureData, User } from './types';

const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const Management = lazy(() => import('./components/Management').then(m => ({ default: m.Management })));
const EbookManagement = lazy(() => import('./components/EbookManagement').then(m => ({ default: m.EbookManagement })));
const EBookView = lazy(() => import('./components/preview/EBookView').then(m => ({ default: m.EBookView })));
const EBookShelf = lazy(() => import('./components/preview/EBookShelf').then(m => ({ default: m.EBookShelf })));
const AUTO_SAVE_IDLE_MS = 20_000;

function PageLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function InnerApp({ currentId, currentUser, onBackToDashboard }: { currentId: string, currentUser: User | null, onBackToDashboard: () => void }) {
  const { data, markSaved, beginSave, finishSave } = useBrochure();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [hasConflict, setHasConflict] = useState(false);
  const isFirstMount = React.useRef(true);
  const [syncToast, setSyncToast] = useState<{ show: boolean; editor: string }>({ show: false, editor: '' });

  const lastSavedDataRef = useRef<string>(JSON.stringify(data));

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

  useEffect(() => {
    const handleRemoteConflict = (e: Event) => {
      const editor = (e as CustomEvent<{ editor?: string }>).detail?.editor || '其他使用者';
      setHasConflict(true);
      setSaveStatus('unsaved');
      setSyncToast({ show: true, editor: `${editor}（雲端已有新版，本地草稿已保留）` });
    };
    window.addEventListener('brochure-remote-conflict', handleRemoteConflict);
    return () => window.removeEventListener('brochure-remote-conflict', handleRemoteConflict);
  }, []);

  // 最後一次修改後靜置 20 秒才自動儲存；持續輸入會重新計時。
  useEffect(() => {
    // 初始掛載時不觸發儲存
    if (isFirstMount.current) {
      isFirstMount.current = false;
      lastSavedDataRef.current = JSON.stringify(data);
      return;
    }

    // 資料已鎖定、發生衝突或已結案時不自動儲存
    if (data.isLocked || data.isClosed) {
      setSaveStatus('saved');
      return;
    }
    if (hasConflict) {
      setSaveStatus('unsaved');
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
      // 自動與手動存檔共用同一把鎖，避免兩個 CAS 請求拿同一版號互撞。
      if (!beginSave()) return;
      setSaveStatus('saving');
      const snapshot = structuredClone(data);
      try {
        const result = await storage.saveBrochure(currentId, snapshot, true); // true 代表這是自動儲存，不產生版本快照

        if (result.success) {
          const savedComparable = { ...snapshot };
          delete savedComparable.serverUpdatedAt;
          lastSavedDataRef.current = JSON.stringify(savedComparable);
          setLastSaved(new Date());
          setSaveStatus('saved');
          markSaved(snapshot, result.serverUpdatedAt);
        } else if (result.error === 'CONFLICT') {
          setSaveStatus('unsaved');
          setHasConflict(true);
          alert('【儲存衝突】此手冊已被其他使用者修改並儲存。\n\n您的本地草稿已保留，自動儲存已暫停。請先複製草稿，再重新整理取得最新版本。');
        } else {
          // 同步失敗時回到待儲存狀態，以便使用者再次手動觸發或重試
          console.error('自動儲存同步失敗:', result.error);
          setSaveStatus('unsaved');
        }
      } catch (error) {
        // 網路或同步程序直接拋出例外時，不能讓畫面永久停在「儲存中」。
        console.error('自動儲存發生例外:', error);
        setSaveStatus('unsaved');
      } finally {
        finishSave();
      }
    }, AUTO_SAVE_IDLE_MS);

    return () => clearTimeout(timer);
  }, [data, currentId, hasConflict, markSaved, beginSave, finishSave]);

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
  const [view, setView] = useState<'login' | 'dashboard' | 'editor' | 'management' | 'ebook-management' | 'ebook' | 'shelf'>('login');
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
      const bookId = urlParams.get('book');
      const mode = urlParams.get('mode');

      const loadEbookById = async (id: string): Promise<BrochureData | null> => {
        if (!supabase) return null;
        const { data: ebookItem, error } = await supabase
          .from('ebooks')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !ebookItem) return null;

        let ebookData = (ebookItem as any).data || {};
        if (typeof ebookData === 'string') {
          try {
            ebookData = JSON.parse(ebookData);
          } catch {
            ebookData = {};
          }
        }

        const normalizeUrls = (...candidates: any[]) => {
          const toPublicUrl = (value: string) => {
            const trimmed = value.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('http') || trimmed.startsWith('data:')) return trimmed;
            if (!supabase) return trimmed;
            let cleanPath = trimmed.replace(/^\/+/, '');
            cleanPath = cleanPath.replace(/^brochures\//, '');
            cleanPath = cleanPath.replace(/^storage\/v1\/object\/public\/brochures\//, '');
            const { data: { publicUrl } } = supabase.storage.from('brochures').getPublicUrl(cleanPath);
            return publicUrl;
          };

          for (const candidate of candidates) {
            if (!candidate) continue;
            if (Array.isArray(candidate)) return candidate.map(item => typeof item === 'string' ? toPublicUrl(item) : item?.publicUrl || item?.url || item?.src || '').filter(Boolean);
            if (typeof candidate === 'string') {
              try {
                const parsed = JSON.parse(candidate);
                if (Array.isArray(parsed)) return parsed.map(item => typeof item === 'string' ? toPublicUrl(item) : item?.publicUrl || item?.url || item?.src || '').filter(Boolean);
              } catch {
                return [toPublicUrl(candidate)].filter(Boolean);
              }
            }
          }
          return [];
        };

        const listStorageImages = async () => {
          const dirs = [`ebooks/${id}`, `ebooks/ebooks/${id}`, `brochures/${id}`, id];
          for (const dir of dirs) {
            const { data: files, error } = await supabase!.storage
              .from('brochures')
              .list(dir, { limit: 200, sortBy: { column: 'name', order: 'asc' } });
            if (error || !files?.length) continue;
            const pageFiles = files
              .filter((file: any) => /^page[_-]?\d+/i.test(file.name))
              .map((file: any) => `${dir}/${file.name}`);
            if (pageFiles.length) return normalizeUrls(pageFiles);
          }
          return [];
        };

        let publishedImages = normalizeUrls(
          (ebookItem as any).images,
          (ebookItem as any).pages,
          ebookData.publishedImages,
          ebookData.pages,
          ebookData.images,
          ebookData.pageUrls
        );

        if (publishedImages.length === 0) {
          publishedImages = await listStorageImages();
        }

        return {
          ...createDefaultData(),
          title: (ebookItem as any).title || ebookData.title || '未命名電子書',
          category: (ebookItem as any).category || ebookData.category || '出團',
          isPublished: ebookData.isPublished ?? (ebookItem as any).is_published ?? ((ebookItem as any).status === '已發佈'),
          publishedAt: ebookData.publishedAt || (ebookItem as any).published_at || (ebookItem as any).created_at || '',
          publishStartAt: ebookData.publishStartAt || (ebookItem as any).published_at || '',
          expiresAt: ebookData.expiresAt || (ebookItem as any).expires_at || '',
          passwordHash: ebookData.passwordHash || '',
          publishedImages,
          ebookId: (ebookItem as any).id,
          source: 'pdf',
        };
      };

      // 1. 電子書櫃模式 (公開免登入)
      if (mode === 'shelf') {
        setView('shelf');
        setLoading(false);
        return;
      }

      // 2. 電子書閱讀模式 (公開免登入)：只讀 ebooks 表與 Supabase Storage 圖片
      if (bookId) {
        const cloudData = await loadEbookById(bookId);

        if (cloudData) {
            setInitialData(cloudData);
            setCurrentId(bookId); 
            setView('ebook');
            setLoading(false);
            return;
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
    return (
      <Suspense fallback={<PageLoader />}>
        <Dashboard
          onLogout={async () => {
            await auth.logout();
            setView('login');
          }}
          onGoToManagement={() => setView('management')}
          onGoToEbookManagement={() => setView('ebook-management')}
          onSelectBrochure={async (id) => {
            setLoading(true);
            const loadedData = await storage.getBrochure(id, false);
            setLoading(false);
            if (loadedData) {
              setInitialData(loadedData);
              setCurrentId(id);
              setView('editor');
              window.history.pushState({}, '', window.location.pathname);
            } else {
              alert('無法載入此手冊的詳細資料，可能尚未同步且本機無快取。');
            }
          }}
        />
      </Suspense>
    );
  }

  if (view === 'management') {
    return (
      <Suspense fallback={<PageLoader />}>
        <Management
          onBack={() => setView('dashboard')}
          onEdit={async (id) => {
            setLoading(true);
            const loadedData = await storage.getBrochure(id, false);
            setLoading(false);
            if (loadedData) {
              setInitialData(loadedData);
              setCurrentId(id);
              setView('editor');
            }
          }}
        />
      </Suspense>
    );
  }

  if (view === 'ebook-management') {
    return (
      <Suspense fallback={<PageLoader />}>
        <EbookManagement onBack={() => setView('dashboard')} />
      </Suspense>
    );
  }

  if (view === 'shelf') {
    return (
      <Suspense fallback={<PageLoader />}>
        <EBookShelf />
      </Suspense>
    );
  }

  if (view === 'ebook') {
    return (
      <Suspense fallback={<PageLoader />}>
        <BrochureProvider initialData={initialData}>
          <EBookView />
        </BrochureProvider>
      </Suspense>
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
