import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { MapPin, Utensils, BedDouble } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import { getItineraryPages } from '../../lib/pagination';

export function ItineraryPage() {
  const { data } = useBrochure();

  const getMealSymbols = (meals: { breakfast: boolean; lunch: boolean; dinner: boolean; breakfastText?: string; lunchText?: string; dinnerText?: string }) => {
    const symbols: string[] = [];
    if (meals.breakfast) symbols.push(`早餐: ${meals.breakfastText || '包含'}`);
    if (meals.lunch) symbols.push(`午餐: ${meals.lunchText || '包含'}`);
    if (meals.dinner) symbols.push(`晚餐: ${meals.dinnerText || '包含'}`);
    return symbols.length > 0 ? symbols.join(' / ') : '餐食自理';
  };

  // 使用統一的分頁工具
  const pages = React.useMemo(() => {
    return getItineraryPages(data.itineraries || []);
  }, [data.itineraries]);

  return (
    <>
      {pages.map((pageDays, pageIdx) => (
        <PageWrapper key={pageIdx} title={pageIdx === 0 ? "行程規劃" : "行程規劃 (續)"} icon={<MapPin size={18} />}>
          <div className="space-y-3">
            {pageDays.map((day: any) => {
              const index = day.originalIndex;
              return (
                <div
                  key={index}
                  className="flex gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group"
                >
                  {/* 左側天數裝飾 - 調整為高度略縮，避免被圓角切割感 */}
                  <div
                    className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-all group-hover:w-1.5"
                    style={{ backgroundColor: data.theme.primary }}
                  />

                  {/* 天數徽 badges */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div
                      className="w-12 h-12 flex flex-col justify-center items-center rounded-lg bg-gray-50 mb-1.5 border border-gray-100 pb-0.5"
                      style={{ color: data.theme.primary }}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 leading-none">Day</span>
                      <span className="text-xl font-black leading-none">{index + 1}</span>
                      {data.startDate && (
                        <div className="flex flex-col items-center mt-1 border-t border-gray-200 pt-1.5 w-full leading-tight font-black">
                          {(() => {
                            const date = new Date(data.startDate);
                            date.setDate(date.getDate() + index);
                            const month = date.getMonth() + 1;
                            const day = date.getDate();
                            const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
                            return (
                              <>
                                <span className="text-[16px] leading-none mb-0.5">{month}/{day}</span>
                                <span className="text-[14px] opacity-80 leading-none">({weekDay})</span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 內容區塊 */}
                  <div className="flex-grow space-y-2.5">

                    {/* 標題 */}
                    <h3
                      className="text-[14px] font-bold pt-1"
                      style={{ color: data.theme.primary }}
                    >
                      {day.title}
                    </h3>

                    {/* 圖片網格 */}
                    {day.images.length > 0 && (
                      <div className={`grid gap-1.5 mb-2 rounded-xl overflow-hidden ${day.images.length === 1 ? 'grid-cols-1' :
                        day.images.length === 2 ? 'grid-cols-2' :
                          'grid-cols-3'
                        }`}>
                        {day.images.map((img: string, imgIndex: number) => (
                          <div key={imgIndex} className="relative pt-[50%]">
                            <img
                              src={img}
                              alt={`Day ${index + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 行程描述 */}
                    {day.description && (
                      <p className="text-[11px] leading-snug text-gray-700 whitespace-pre-wrap">
                        {day.description}
                      </p>
                    )}

                    {/* 景點介紹 */}
                    {day.attractions && (
                      <div className="mt-2 p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
                        <h4 className="text-[11px] font-bold mb-1 flex items-center gap-1.5" style={{ color: data.theme.primary }}>
                          <MapPin size={12} /> 景點特色
                        </h4>
                        <p className="text-[11px] leading-snug text-gray-700 whitespace-pre-wrap">
                          {day.attractions}
                        </p>
                      </div>
                    )}

                    {/* 餐食與住宿資訊 Footer */}
                    <div className="flex flex-wrap gap-1.5 pt-1.5 mt-1.5 border-t border-gray-100">
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded text-[10px] font-medium text-gray-600 border border-gray-100 shadow-sm">
                        <Utensils size={10} className="opacity-60" />
                        {getMealSymbols(day.meals)}
                      </div>

                      {day.hotelIndex !== null && data.hotels[day.hotelIndex] && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded text-[10px] font-medium text-gray-600 border border-gray-100 shadow-sm">
                          <BedDouble size={10} className="opacity-60" />
                          {data.hotels[day.hotelIndex].name || '已安排住宿'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </PageWrapper>
      ))}
    </>
  );
}
