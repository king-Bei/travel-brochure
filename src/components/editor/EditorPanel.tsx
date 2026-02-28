import React, { useState } from 'react';
import { BasicInfoForm } from './BasicInfoForm';
import { FlightForm } from './FlightForm';
import { HotelForm } from './HotelForm';
import { ItineraryForm } from './ItineraryForm';
import { PackingListForm } from './PackingListForm';
import { TipsForm } from './TipsForm';
import { ThemeSettings } from './ThemeSettings';
import { ChevronDown, ChevronUp } from 'lucide-react';

type Section = 'basic' | 'flight' | 'hotel' | 'itinerary' | 'packing' | 'tips' | 'theme';

interface SectionConfig {
  id: Section;
  label: string;
  component: React.ReactNode;
  defaultOpen?: boolean;
}

const sections: SectionConfig[] = [
  { id: 'basic', label: '基本資料', component: <BasicInfoForm />, defaultOpen: true },
  { id: 'flight', label: '航班資訊', component: <FlightForm /> },
  { id: 'hotel', label: '飯店資料', component: <HotelForm /> },
  { id: 'itinerary', label: '行程介紹', component: <ItineraryForm /> },
  { id: 'packing', label: '旅遊物品', component: <PackingListForm /> },
  { id: 'tips', label: '旅遊叮嚀', component: <TipsForm /> },
  { id: 'theme', label: '色系設定', component: <ThemeSettings /> },
];

export function EditorPanel() {
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set(sections.filter(s => s.defaultOpen).map(s => s.id))
  );

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

  return (
    <div className="h-full overflow-y-auto bg-white border-r">
      <div className="p-4 space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 text-left flex items-center justify-between font-medium hover:bg-gray-50"
              style={{ 
                backgroundColor: openSections.has(section.id) ? `${section.id === 'theme' ? '' : '#f8fafc'}` : 'white',
                borderLeft: openSections.has(section.id) ? `3px solid var(--primary)` : '3px solid transparent'
              }}
            >
              {section.label}
              {openSections.has(section.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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
  );
}
