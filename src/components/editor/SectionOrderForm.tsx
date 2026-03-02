import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { ArrowUp, ArrowDown, GripVertical, Settings2 } from 'lucide-react';
import type { SectionId } from '../../types';

const SECTION_LABELS: Record<SectionId, string> = {
    flight: '航班資訊',
    attraction: '景點介紹',
    hotel: '住宿安排 (行程用)',
    hotelDetail: '飯店詳細介紹',
    map: '旅遊地圖',
    itinerary: '每日行程規劃',
    packing: '攜帶物品清單',
    tips: '旅遊注意事項',
    gridTips: '貼心小叮嚀',
};

export function SectionOrderForm() {
    const { data, updateData } = useBrochure();

    const ALL_SECTION_IDS: SectionId[] = [
        'flight',
        'attraction',
        'hotel',
        'hotelDetail',
        'map',
        'itinerary',
        'packing',
        'tips',
        'gridTips'
    ];

    // 確保舊資料也有 sectionOrder，並補足缺失的區塊
    let currentOrder = data.sectionOrder || ALL_SECTION_IDS;

    // 如果現有順序中缺少某些區塊 (例如剛新增的 gridTips)，則將其補在最後
    const missingSections = ALL_SECTION_IDS.filter(id => !currentOrder.includes(id));
    if (missingSections.length > 0) {
        currentOrder = [...currentOrder, ...missingSections];
    }

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newOrder = [...currentOrder];
        const temp = newOrder[index - 1];
        newOrder[index - 1] = newOrder[index];
        newOrder[index] = temp;
        updateData({ sectionOrder: newOrder });
    };

    const moveDown = (index: number) => {
        if (index === currentOrder.length - 1) return;
        const newOrder = [...currentOrder];
        const temp = newOrder[index + 1];
        newOrder[index + 1] = newOrder[index];
        newOrder[index] = temp;
        updateData({ sectionOrder: newOrder });
    };

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
                <Settings2 size={20} />
                大目錄排版順序
            </h3>
            <p className="text-sm text-gray-500">
                調整手冊中各大頁面的先後順序。目錄頁以及匯出的標題順序都會連動。
            </p>

            <div className="space-y-2 max-w-sm mt-4">
                {currentOrder.map((sectionId, index) => (
                    <div
                        key={sectionId}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors group"
                    >
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <GripVertical size={16} className="text-gray-400 cursor-move" />
                                <span className="font-medium text-gray-700">
                                    {SECTION_LABELS[sectionId]}
                                </span>
                            </div>
                            <label className="ml-7 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-500 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={data.tocSettings?.[sectionId] !== false}
                                    onChange={(e) => {
                                        const newSettings = { ...(data.tocSettings || {}) };
                                        newSettings[sectionId] = e.target.checked;
                                        updateData({ tocSettings: newSettings });
                                    }}
                                    className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                顯示於目錄 (Show in TOC)
                            </label>
                            {sectionId === 'itinerary' && data.tocSettings?.[sectionId] !== false && (
                                <label className="ml-7 flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={data.showTOCItineraryDetails !== false}
                                        onChange={(e) => {
                                            updateData({ showTOCItineraryDetails: e.target.checked });
                                        }}
                                        className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    顯示行程詳情 (Show Day Details)
                                </label>
                            )}
                        </div>
                        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => moveUp(index)}
                                disabled={index === 0}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                                title="往上移"
                            >
                                <ArrowUp size={16} />
                            </button>
                            <button
                                onClick={() => moveDown(index)}
                                disabled={index === currentOrder.length - 1}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                                title="往下移"
                            >
                                <ArrowDown size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
