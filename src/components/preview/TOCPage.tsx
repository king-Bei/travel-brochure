import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { List, Plane, MapPin, Building2, Map as MapIcon, Calendar, CheckSquare, AlertCircle } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import type { SectionId } from '../../types';
import { getSectionPageCount } from '../../lib/pagination';

export function TOCPage() {
    const { data } = useBrochure();

    const currentOrder = data.sectionOrder || [
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

    // 計算每個啟用的目錄項目所在的起始頁碼
    const visibleSections = currentOrder.filter(id => data.tocSettings?.[id] !== false);

    // 第 1 頁為目錄自己，所以內容章節從第 2 頁開始
    let currentPageAcc = 2;
    const pageNumbers: Record<string, number> = {};

    visibleSections.forEach((id) => {
        const count = getSectionPageCount(id as SectionId, data);
        if (count > 0) {
            pageNumbers[id] = currentPageAcc;
            currentPageAcc += count;
        }
    });

    const renderTocItem = (sectionId: SectionId) => {
        const IconComponent = ({
            flight: Plane,
            attraction: MapPin,
            hotel: Building2,
            hotelDetail: Building2,
            map: MapIcon,
            itinerary: Calendar,
            packing: CheckSquare,
            tips: AlertCircle,
            gridTips: CheckSquare,
        } as any)[sectionId];

        const label = ({
            flight: '航班資訊',
            attraction: '景點介紹',
            hotel: '住宿安排',
            hotelDetail: '飯店詳細介紹',
            map: '旅遊地圖',
            itinerary: '每日行程規劃',
            packing: '攜帶物品清單',
            tips: '旅遊注意事項',
            gridTips: '貼心小叮嚀',
        } as any)[sectionId];

        const isEmpty = ({
            flight: false,
            attraction: !data.attractions || data.attractions.length === 0,
            hotel: false,
            hotelDetail: !data.hotelDetails || data.hotelDetails.length === 0,
            map: !data.mapPage?.src,
            itinerary: false,
            packing: false,
            tips: false,
            gridTips: !data.gridTips || data.gridTips.length === 0,
        } as any)[sectionId];

        if (isEmpty) return null;

        const pageNum = pageNumbers[sectionId];

        return (
            <div key={sectionId} className="space-y-2">
                <div className="flex justify-between items-end pb-2 mt-4 relative">
                    <div className="flex items-center gap-3 bg-white pr-2 z-10">
                        <div className="p-1 px-2 rounded bg-gray-50 border border-gray-100 shadow-sm" style={{ color: data.theme.primary }}>
                            <IconComponent size={16} />
                        </div>
                        <span className="font-bold text-gray-800" style={{ color: data.theme.primary }}>{label}</span>
                    </div>

                    {/* 點點連線 */}
                    <div className="absolute left-0 right-0 bottom-4 border-b-[3px] border-dotted border-gray-200 z-0"></div>

                    {/* 頁次顯示 */}
                    {pageNum && (
                        <div className="bg-white pl-2 z-10 font-medium text-gray-500 text-sm pb-0.5">
                            {pageNum}
                        </div>
                    )}
                </div>
                {sectionId === 'itinerary' && data.showTOCItineraryDetails !== false && data.itineraries && data.itineraries.length > 0 && (
                    <div className="pl-12 space-y-4 pt-2">
                        {data.itineraries.map((day, i) => (
                            <div key={i} className="flex items-center gap-3 text-base text-gray-700">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.theme.primary }} />
                                <span className="font-semibold text-gray-500 w-14">Day {i + 1}</span>
                                {data.startDate && (
                                    <span className="text-xs text-gray-400 w-16">
                                        {(() => {
                                            const date = new Date(data.startDate);
                                            date.setDate(date.getDate() + i);
                                            return `${date.getMonth() + 1}/${date.getDate()} (${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]})`;
                                        })()}
                                    </span>
                                )}
                                <span className="flex-grow">{day.title}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <PageWrapper title="目錄 (Table of Contents)" icon={<List size={24} />}>
            {(data.tocText || data.tocImage) && (
                <div className="mt-2 mb-6 px-8 space-y-6">
                    {data.tocImage && (
                        <div className="w-full h-48 overflow-hidden rounded-xl shadow-sm border border-gray-100">
                            <img src={data.tocImage} alt="Welcome" className="w-full h-full object-cover" />
                        </div>
                    )}
                    {data.tocText && (
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]">
                            {data.tocText}
                        </p>
                    )}
                </div>
            )}
            <div className={`space-y-8 text-lg px-8 ${data.tocText || data.tocImage ? 'mt-4' : 'mt-10'}`}>
                {currentOrder
                    .filter(sectionId => data.tocSettings?.[sectionId] !== false)
                    .map(renderTocItem)}
            </div>
        </PageWrapper>
    );
}
