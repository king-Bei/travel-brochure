import React, { useEffect, useState } from 'react';
import { BrochureProvider, useBrochure } from './context/BrochureContext';
import { EditorPanel } from './components/editor/EditorPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { supabase } from './lib/supabase';
import { storage } from './lib/storage';
import type { BrochureData } from './types';

function InnerApp({ currentId, onBackToDashboard }: { currentId: string, onBackToDashboard: () => void }) {
  const { data } = useBrochure();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  // 20秒防抖自動儲存
  useEffect(() => {
    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      setSaveStatus('saving');
      storage.saveBrochure(currentId, data);
      setLastSaved(new Date());
      setSaveStatus('saved');
    }, 20000);

    return () => clearTimeout(timer);
  }, [data, currentId]);

  return (
    <div className="h-screen flex flex-col">
      <Header
        onBackToDashboard={onBackToDashboard}
        saveStatus={saveStatus}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/5 no-print border-r">
          <EditorPanel />
        </div>
        <div className="w-3/5">
          <PreviewPanel />
        </div>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<BrochureData | null>(null);

  useEffect(() => {
    async function loadData() {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('id');

      if (urlId) {
        // 優先嘗試從 Supabase 雲端讀取
        if (supabase) {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('TIMEOUT')), 8000)
            );

            const fetchPromise = supabase
              .from('brochures')
              .select('data')
              .eq('id', urlId)
              .single();

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error) throw error;
            if (data && data.data) {
              const cloudData = data.data as BrochureData;
              // 寫回本機快取，確保兩邊同步
              storage.saveBrochure(urlId, cloudData);
              setInitialData(cloudData);
              setCurrentId(urlId);
              setView('editor');
              setLoading(false);
              return; // 成功讀取雲端後直接返回
            }
          } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message === 'TIMEOUT') {
              console.warn('雲端載入超時，改由本機快取嘗試讀取');
            } else {
              console.warn('雲端載入失敗或無資料:', err?.message);
            }
          }
        }

        // 雲端讀取失敗或未設定 Supabase，降級嘗試從本機讀取
        const localData = await storage.getBrochure(urlId);
        if (localData) {
          setInitialData(localData);
          setCurrentId(urlId);
          setView('editor');
          setLoading(false);
          return;
        }
      }
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="font-medium tracking-wider">載入手冊資料中...</p>
      </div>
    );
  }

  if (view === 'dashboard') {
    return <Dashboard onSelectBrochure={async (id) => {
      const data = await storage.getBrochure(id);
      if (data) {
        setInitialData(data);
        setCurrentId(id);
        setView('editor');
        // 清除網址的 ?id 除非想要保持雲端連結（點擊雲端儲存時才會再次設定）
        window.history.pushState({}, '', window.location.pathname);
      }
    }} />
  }

  return (
    <BrochureProvider initialData={initialData} key={currentId}>
      <InnerApp
        currentId={currentId!}
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
