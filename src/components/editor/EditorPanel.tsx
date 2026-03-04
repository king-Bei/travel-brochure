import React, { useState, useRef } from 'react';
import { BasicInfoForm } from './BasicInfoForm';
import { FlightForm } from './FlightForm';
import { HotelForm } from './HotelForm';
import { ItineraryForm } from './ItineraryForm';
import { PackingListForm } from './PackingListForm';
import { TipsForm } from './TipsForm';
import { AttractionForm } from './AttractionForm';
import { HotelDetailForm } from './HotelDetailForm';
import { RoomingListForm } from './RoomingListForm';
import { MapForm } from './MapForm';
import { ThemeSettings } from './ThemeSettings';
import { SectionOrderForm } from './SectionOrderForm';
import { CustomPageForm } from './CustomPageForm';
import {
  ChevronDown,
  ChevronUp,
  Info,
  Settings,
  Plane,
  Building2,
  BedDouble,
  MapPin,
  Calendar,
  Map as MapIcon,
  CheckSquare,
  AlertCircle,
  Palette,
  Bookmark,
  Users,
  FileText
} from 'lucide-react';

type Section = 'basic' | 'order' | 'flight' | 'hotel' | 'hotel-detail' | 'rooming-list' | 'attraction' | 'map' | 'itinerary' | 'packing' | 'tips' | 'custom-page' | 'theme';

interface SectionConfig {
  id: Section;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  defaultOpen?: boolean;
}

const sections: SectionConfig[] = [
  { id: 'basic', label: '基本資料', icon: <Info size={16} />, component: <BasicInfoForm />, defaultOpen: true },
  { id: 'order', label: '大目錄排版順序', icon: <Settings size={16} />, component: <SectionOrderForm /> },
  { id: 'flight', label: '航班資訊', icon: <Plane size={16} />, component: <FlightForm /> },
  { id: 'hotel', label: '簡要飯店列表 (行程用)', icon: <Building2 size={16} />, component: <HotelForm /> },
  { id: 'hotel-detail', label: '飯店詳細介紹頁面', icon: <BedDouble size={16} />, component: <HotelDetailForm /> },
  { id: 'rooming-list', label: '分房表 (與飯店搭配)', icon: <Users size={16} />, component: <RoomingListForm /> },
  { id: 'attraction', label: '景點介紹頁面', icon: <MapPin size={16} />, component: <AttractionForm /> },
  { id: 'itinerary', label: '每日行程大綱', icon: <Calendar size={16} />, component: <ItineraryForm /> },
  { id: 'map', label: '旅遊地圖 (整頁)', icon: <MapIcon size={16} />, component: <MapForm /> },
  { id: 'packing', label: '旅遊物品', icon: <CheckSquare size={16} />, component: <PackingListForm /> },
  { id: 'tips', label: '旅遊叮嚀', icon: <AlertCircle size={16} />, component: <TipsForm /> },
  { id: 'custom-page', label: '自訂圖文頁面', icon: <FileText size={16} />, component: <CustomPageForm /> },
  { id: 'theme', label: '色系設定', icon: <Palette size={16} />, component: <ThemeSettings /> },
];

export function EditorPanel() {
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set(sections.filter(s => s.defaultOpen).map(s => s.id))
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleSection = (id: Section) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const scrollToSection = (id: Section) => {
    // 先展開該區塊
    if (!openSections.has(id)) {
      setOpenSections(prev => new Set([...prev, id]));
    }

    // 稍微延遲以等待 React 渲染展開後的內容，然後滾動
    setTimeout(() => {
      const element = document.getElementById(`editor-section-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="h-full flex flex-col bg-white border-r">
      {/* 快速導覽書籤列 */}
      <div className="flex items-center gap-1.5 p-2 bg-gray-50/50 border-b no-scrollbar scroll-smooth z-[60] overflow-visible">
        <div className="flex-shrink-0 px-2 py-1 flex items-center gap-1 text-gray-400">
          <Bookmark size={14} className="fill-current" />
          <span className="text-[10px] font-black uppercase tracking-tighter">快速選單</span>
        </div>
        <div className="h-4 w-px bg-gray-200 mx-1 flex-shrink-0" />
        {sections.map((section) => (
          <div key={`bookmark-${section.id}`} className="relative group/tip">
            <button
              onClick={() => scrollToSection(section.id)}
              className={`flex-shrink-0 p-1.5 rounded-md transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 text-gray-400 hover:text-blue-600 ${openSections.has(section.id) ? 'bg-white shadow-sm border-gray-100 text-blue-500' : ''
                }`}
            >
              {section.icon}
            </button>
            {/* 懸浮文字輔助說明 (Tooltip) */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded shadow-xl opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 -translate-y-1 group-hover/tip:translate-y-0">
              {section.label}
              {/* Tooltip 小箭頭 (置於上方) */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-b-4 border-b-gray-800" />
            </div>
          </div>
        ))}
      </div>

      {/* 編輯內容區 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="p-4 space-y-2">
          {sections.map((section) => (
            <div key={section.id} id={`editor-section-${section.id}`} className="border rounded-lg overflow-hidden scroll-mt-4">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-4 py-3 text-left flex items-center justify-between font-medium hover:bg-gray-50 group"
                style={{
                  backgroundColor: openSections.has(section.id) ? `${section.id === 'theme' ? '' : '#f8fafc'}` : 'white',
                  borderLeft: openSections.has(section.id) ? `3px solid var(--primary)` : '3px solid transparent'
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`transition-colors ${openSections.has(section.id) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    {section.icon}
                  </span>
                  {section.label}
                </div>
                {openSections.has(section.id) ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>

              {openSections.has(section.id) && (
                <div className="p-4 border-t">
                  {section.component}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
