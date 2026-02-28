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
  addPackingItem: (item: string) => void;
  removePackingItem: (index: number) => void;
}

const BrochureContext = createContext<BrochureContextType | undefined>(undefined);

export function BrochureProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BrochureData>(() => {
    const initial = createDefaultData();
    initial.itineraries = initializeItineraries(initial.duration);
    initial.hotels = initializeHotels(initial.duration);
    return initial;
  });

  const updateData = (updates: Partial<BrochureData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates };
      
      // Handle duration changes
      if (updates.duration !== undefined && updates.duration !== prev.duration) {
        newData.itineraries = initializeItineraries(updates.duration);
        newData.hotels = initializeHotels(updates.duration);
      }
      
      return newData;
    });
  };

  const setTheme = (theme: ThemeColors | keyof typeof themes) => {
    if (typeof theme === 'string') {
      updateData({ theme: themes[theme] || defaultTheme });
    } else {
      updateData({ theme });
    }
  };

  const addPackingItem = (item: string) => {
    setData(prev => ({
      ...prev,
      packingList: [...prev.packingList, item],
    }));
  };

  const removePackingItem = (index: number) => {
    setData(prev => ({
      ...prev,
      packingList: prev.packingList.filter((_, i) => i !== index),
    }));
  };

  return (
    <BrochureContext.Provider value={{ data, updateData, setTheme, addPackingItem, removePackingItem }}>
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
