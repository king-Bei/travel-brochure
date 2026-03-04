import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { MapPin, Phone, Building2, Clock } from 'lucide-react';
import { PageWrapper } from './PageWrapper';

export function HotelPage() {
  const { data } = useBrochure();

  if (data.hotels.length === 0) {
    return null;
  }

  const getHotelDaysLabel = (hotelIndex: number) => {
    const days: number[] = [];
    data.itineraries?.forEach((day: any, idx: number) => {
      if (day.hotelIndex === hotelIndex) {
        days.push(idx + 1);
      }
    });

    if (days.length === 0) return `第 ${hotelIndex + 1} 間飯店`;
    if (days.length === 1) return `第 ${days[0]} 天飯店`;

    return `第 ${days[0]}-${days[days.length - 1]} 天飯店`;
  };

  // 將飯店依據換頁標記分組
  const hotelPages: typeof data.hotels[] = [];
  let currentPage: typeof data.hotels = [];

  data.hotels.forEach((hotel, index) => {
    // 即使是第0項，如果他不需要換頁，自然就加入currentPage。但第一個項目不該觸發新增頁（因為一開始就是空頁）
    if (index > 0 && hotel.pageBreakBefore && currentPage.length > 0) {
      hotelPages.push(currentPage);
      currentPage = [];
    }
    // 帶上原始 index
    currentPage.push({ ...hotel, originalIndex: index } as any);
  });

  if (currentPage.length > 0) {
    hotelPages.push(currentPage);
  }

  return (
    <>
      {hotelPages.map((pageHotels, pageIdx) => (
        <PageWrapper key={pageIdx} title={pageIdx === 0 ? "住宿安排" : "住宿安排 (續)"} icon={<Building2 size={24} />}>
          <div className="space-y-6">
            {pageHotels.map((hotel: any) => {
              const index = hotel.originalIndex;
              return (
                <div
                  key={index}
                  className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* 標題與天數標記 */}
                  <div
                    className="px-3 py-2 flex items-center justify-between border-b border-gray-50 bg-gray-50/50"
                  >
                    <h3
                      className="text-sm font-bold flex items-center gap-2"
                      style={{ color: data.theme.primary }}
                    >
                      <div
                        className="w-1 h-3 rounded-full"
                        style={{ backgroundColor: data.theme.primary }}
                      />
                      {getHotelDaysLabel(index)}
                    </h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-0.5 bg-white rounded shadow-sm border border-gray-100">
                      Hotel {index + 1}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row gap-0">
                    {/* 飯店圖片 */}
                    <div className={`md:w-1/3 relative bg-gray-50 ${hotel.image ? '' : 'flex items-center justify-center p-6'}`}>
                      {hotel.image ? (
                        <div className="absolute inset-0">
                          <img
                            src={hotel.image}
                            alt={hotel.name || `Hotel ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 border-r border-gray-100/50" />
                        </div>
                      ) : (
                        <div className="text-center">
                          <Building2 size={32} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-xs font-medium text-gray-400">尚無飯店圖片</p>
                        </div>
                      )}
                      {/* 確保即使圖片為 absolute 也有最小高度 */}
                      <div className="pb-[60%] md:pb-0 md:h-full min-h-[120px]"></div>
                    </div>

                    {/* 飯店資訊 */}
                    <div className="p-4 md:w-2/3 flex flex-col justify-center space-y-2">
                      <h4 className="text-lg font-bold text-gray-900 leading-tight">
                        {hotel.name || '未指定飯店名稱'}
                      </h4>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-xs text-gray-600">
                          <MapPin size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                          <span className="leading-relaxed">{hotel.address || '地址待確認'}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone size={14} className="flex-shrink-0 text-gray-400" />
                          <span>{hotel.phone || '電話待確認'}</span>
                        </div>

                        {hotel.morningCall && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-[11px] font-medium border border-blue-100 mt-1">
                            <Clock size={12} />
                            Morning Call: {hotel.morningCall}
                          </div>
                        )}
                        {hotel.description && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{hotel.description}</p>
                          </div>
                        )}
                      </div>
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
