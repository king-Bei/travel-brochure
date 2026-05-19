import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
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
    const allowedKeys = ['isLocked', 'serverUpdatedAt', 'isPublished', 'publishedAt', 'expiresAt', 'publishedImages', 'ebookId', 'publishHistory', 'version'];
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
