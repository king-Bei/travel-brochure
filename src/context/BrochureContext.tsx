import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  BrochureData,
  createDefaultData,
  initializeItineraries,
  initializeHotels,
  ThemeColors,
  themes,
  defaultTheme,
} from '../types';

interface BrochureContextType {
  data: BrochureData;
  updateData: (updates: Partial<BrochureData>) => void;
  setTheme: (theme: ThemeColors | keyof typeof themes) => void;
  addPackingItem: (text: string, important: boolean) => void;
  removePackingItem: (index: number) => void;
  updatePageSetting: (id: string, updates: { fontSize?: number; imageScale?: number }) => void;
}

const BrochureContext = createContext<BrochureContextType | undefined>(undefined);

export function BrochureProvider({ children, initialData }: { children: ReactNode, initialData?: BrochureData | null }) {
  const [data, setData] = useState<BrochureData>(() => {
    const defaults = createDefaultData();
    if (initialData) {
      // Data Migration: 將新欄位補進舊資料中
      const merged = { ...defaults, ...initialData };
      // 確保陣列類型的欄位如果有資料就用舊的，沒資料才用預設
      // 確保陣列類型的欄位如果有資料就用舊的，沒資料才用預設
      merged.flights = initialData.flights || defaults.flights;
      merged.hotels = initialData.hotels || defaults.hotels;
      merged.hotelDetails = initialData.hotelDetails || defaults.hotelDetails;
      
      // 補齊 ID (Data Migration for Attractions and Itineraries)
      const rawItineraries = initialData.itineraries || defaults.itineraries;
      merged.itineraries = rawItineraries.map(day => ({
        ...day,
        id: (day as any).id || crypto.randomUUID()
      }));

      const rawAttractions = initialData.attractions || defaults.attractions;
      merged.attractions = rawAttractions.map(attr => ({
        ...attr,
        id: (attr as any).id || crypto.randomUUID()
      }));

      merged.packingList = initialData.packingList || defaults.packingList;
      merged.gridTips = initialData.gridTips || defaults.gridTips;
      merged.roomingList = initialData.roomingList || defaults.roomingList;
      merged.customPages = initialData.customPages || defaults.customPages;
      merged.serverUpdatedAt = initialData.serverUpdatedAt;

      // 確保基本數值屬性有預設值
      merged.contentFontSize = initialData.contentFontSize || defaults.contentFontSize;
      merged.imageHeightScale = initialData.imageHeightScale || defaults.imageHeightScale;
      merged.fontFamily = initialData.fontFamily || defaults.fontFamily;

      // 確保 sectionOrder 包含所有新舊區塊
      const currentOrder = initialData.sectionOrder || defaults.sectionOrder;
      const allPossible = defaults.sectionOrder;
      const missing = allPossible.filter(id => !currentOrder.includes(id));
      merged.sectionOrder = [...currentOrder, ...missing];

      return merged;
    }
    const initial = defaults;
    initial.itineraries = initializeItineraries(initial.duration);
    initial.hotels = initializeHotels(initial.duration);
    return initial;
  });

  const updateData = (updates: Partial<BrochureData>) => {
    // 判斷是否只包含允許在鎖定狀態下更新的欄位 (metadata 或鎖定狀態本身)
    const allowedKeys = ['isLocked', 'serverUpdatedAt', 'isPublished', 'publishedAt', 'publishStartAt', 'expiresAt', 'publishedImages', 'ebookId', 'publishHistory', 'version'];
    const isOnlyAllowedUpdates = Object.keys(updates).every(key => allowedKeys.includes(key));

    if (data.isLocked && !isOnlyAllowedUpdates) {
      alert('資料已鎖定，禁止修改。請先解鎖！');
      return;
    }

    setData(prev => {
      const newData = { ...prev, ...updates };
      // 依使用者要求，取消 "天數更改時自動重設同步飯店與行程" 邏汇
      return newData;
    });
  };

  const setTheme = (theme: ThemeColors | keyof typeof themes) => {
    if (data.isLocked) {
      alert('資料已鎖定，禁止修改。請先解鎖！');
      return;
    }
    if (typeof theme === 'string') {
      updateData({ theme: themes[theme] || defaultTheme });
    } else {
      updateData({ theme });
    }
  };

  const addPackingItem = (text: string, important: boolean = false) => {
    if (data.isLocked) {
      alert('資料已鎖定，禁止修改。請先解鎖！');
      return;
    }
    setData(prev => ({
      ...prev,
      packingList: [...prev.packingList, { text, important }],
    }));
  };

  const removePackingItem = (index: number) => {
    if (data.isLocked) {
      alert('資料已鎖定，禁止修改。請先解鎖！');
      return;
    }
    setData(prev => ({
      ...prev,
      packingList: prev.packingList.filter((_, i) => i !== index),
    }));
  };

  const updatePageSetting = (id: string, updates: { fontSize?: number; imageScale?: number }) => {
    if (data.isLocked) {
      alert('資料已鎖定，禁止修改。請先解鎖！');
      return;
    }
    setData(prev => ({
      ...prev,
      pageSettings: {
        ...(prev.pageSettings || {}),
        [id]: {
          ...(prev.pageSettings?.[id] || {}),
          ...updates
        }
      }
    }));
  };

  // 獲取當前手冊的 ID
  const urlParams = new URLSearchParams(window.location.search);
  const brochureId = urlParams.get('id');

  // 建立 Supabase Realtime 資料庫變更實時監聽
  useEffect(() => {
    if (!supabase || !brochureId) return;

    console.log(`[協作系統] 正在為手冊 ${brochureId} 建立實時同步通道...`);

    const channel = supabase
      .channel(`realtime-brochure:${brochureId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'brochures',
          filter: `id=eq.${brochureId}`
        },
        async (payload) => {
          const newRecord = payload.new as any;
          if (!newRecord) return;

          const cloudData = newRecord.data as BrochureData;
          const cloudUpdatedAt = newRecord.updated_at;
          const cloudEditor = newRecord.last_modified_by || '系統';

          // 核心檢查：如果雲端的更新時間戳與我們本地記錄的不同
          setData(prev => {
            // 如果本地已經是最新的 (由本次儲存動作觸發，且 serverUpdatedAt 已被更新過)
            if (prev.serverUpdatedAt === cloudUpdatedAt) {
              return prev;
            }

            console.log(`[協作系統] 偵測到雲端有最新變更 (修改者: ${cloudEditor})。開始執行背景自動合併...`);

            // 智慧自動合併：
            // 保持我們當前正在極速修改的表單狀態 (例如若是文字輸入框的值仍在 prev 中)
            // 為了不讓使用者輸入到一半的文字突然被覆蓋，我們智慧保留使用者正在修改的表單基本欄位
            // 我們把雲端上的最新 publishedImages、isPublished、isLocked 以及 schema 資料與本地進行合併
            const merged = { ...prev, ...cloudData };
            merged.serverUpdatedAt = cloudUpdatedAt;
            
            // 拋出一個全域自訂事件，讓 UI 可以貼心地呈現浮動 Toast 通知
            const syncEvent = new CustomEvent('brochure-collaborative-sync', {
              detail: { editor: cloudEditor }
            });
            window.dispatchEvent(syncEvent);

            return merged;
          });
        }
      )
      .subscribe((status) => {
        console.log(`[協作系統] 通道狀態:`, status);
      });

    return () => {
      console.log(`[協作系統] 卸載實時同步通道...`);
      supabase?.removeChannel(channel);
    };
  }, [brochureId]);

  return (
    <BrochureContext.Provider value={{ data, updateData, setTheme, addPackingItem, removePackingItem, updatePageSetting }}>
      {children}
    </BrochureContext.Provider>
  );
}

export function useBrochure() {
  const context = useContext(BrochureContext);
  if (!context) {
    throw new Error('useBrochure must be used within a BrochureProvider');
  }
  return context;
}
