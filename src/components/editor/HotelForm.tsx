import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Building2, Trash2 } from 'lucide-react';

export function HotelForm() {
  const { data, updateData } = useBrochure();

  const updateHotel = (index: number, field: string, value: string) => {
    const newHotels = [...data.hotels];
    newHotels[index] = { ...newHotels[index], [field]: value };
    updateData({ hotels: newHotels });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
        <Building2 size={20} />
        飯店資料
      </h3>

      <p className="text-xs text-gray-500">
        共 {data.hotels.length} 間飯店（第 2 天至第 {data.duration} 天）
      </p>

      <div className="space-y-4">
        {data.hotels.map((hotel, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3" style={{ color: data.theme.primary }}>
              第 {index + 2} 天住宿
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">飯店名稱</label>
                <input
                  type="text"
                  value={hotel.name}
                  onChange={(e) => updateHotel(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="大紅花渡假村"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">電話</label>
                <input
                  type="tel"
                  value={hotel.phone}
                  onChange={(e) => updateHotel(index, 'phone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="+60 3-76820088"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">地址</label>
                <input
                  type="text"
                  value={hotel.address}
                  onChange={(e) => updateHotel(index, 'address', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Malaysia"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Morning Call 時間</label>
                <input
                  type="time"
                  value={hotel.morningCall}
                  onChange={(e) => updateHotel(index, 'morningCall', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        ))}

        {data.hotels.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            天數不足，無需住宿
          </p>
        )}
      </div>
    </div>
  );
}
