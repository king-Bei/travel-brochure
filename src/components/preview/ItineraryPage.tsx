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
        <PageWrapper key={pageIdx} title={pageIdx === 0 ? "行程規劃" : "行程規劃 (續)"} icon={<MapPin size={24} />}>
          <div className="space-y-6">
            {pageDays.map((day: any) => {
              const index = day.originalIndex;
              return (
                <div
                  key={index}
                  className="flex gap-6 p-5 bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group"
                >
                  {/* 左側天數裝飾 */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
                    style={{ backgroundColor: data.theme.primary }}
                  />

                  {/* 天數徽 badges */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div
                      className="w-16 h-16 flex flex-col justify-center items-center rounded-xl bg-gray-50 mb-2 border border-gray-100"
                      style={{ color: data.theme.primary }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Day</span>
                      <span className="text-2xl font-black leading-none">{index + 1}</span>
                      {data.startDate && (
                        <span className="text-[12px] font-bold mt-1 opacity-90 border-t border-gray-200 pt-1 w-full text-center">
                          {(() => {
                            const date = new Date(data.startDate);
                            date.setDate(date.getDate() + index);
                            return `${date.getMonth() + 1}/${date.getDate()} (${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]})`;
                          })()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 內容區塊 */}
                  <div className="flex-grow space-y-4">

                    {/* 標題 */}
                    <h3
                      className="text-xl font-bold pt-1"
                      style={{ color: data.theme.primary }}
                    >
                      {day.title}
                    </h3>

                    {/* 圖片網格 */}
                    {day.images.length > 0 && (
                      <div className={`grid gap-2 mb-3 rounded-xl overflow-hidden ${day.images.length === 1 ? 'grid-cols-1' :
                        day.images.length === 2 ? 'grid-cols-2' :
                          'grid-cols-3'
                        }`}>
                        {day.images.map((img: string, imgIndex: number) => (
                          <div key={imgIndex} className="relative pt-[60%]">
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
                      <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                        {day.description}
                      </p>
                    )}

                    {/* 景點介紹 */}
                    {day.attractions && (
                      <div className="mt-4 p-4 bg-gray-50/70 rounded-xl border border-gray-100">
                        <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5" style={{ color: data.theme.primary }}>
                          <MapPin size={16} /> 景點特色
                        </h4>
                        <p className="text-[14.5px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                          {day.attractions}
                        </p>
                      </div>
                    )}

                    {/* 餐食與住宿資訊 Footer */}
                    <div className="flex flex-wrap gap-3 pt-3 mt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-sm font-medium text-gray-600">
                        <Utensils size={14} className="opacity-60" />
                        {getMealSymbols(day.meals)}
                      </div>

                      {day.hotelIndex !== null && data.hotels[day.hotelIndex] && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-sm font-medium text-gray-600">
                          <BedDouble size={14} className="opacity-60" />
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
