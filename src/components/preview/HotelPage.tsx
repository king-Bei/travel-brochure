import React from 'react';
import { useBrochure } from '../../context/BrochureContext';

export function HotelPage() {
  const { data } = useBrochure();

  if (data.hotels.length === 0) {
    return null;
  }

  return (
    <div 
      className="a4-page"
      style={{ 
        backgroundColor: data.theme.secondary,
        color: data.theme.text 
      }}
    >
      <h2 
        className="text-2xl font-bold mb-6 text-center"
        style={{ color: data.theme.primary }}
      >
        飯店資訊
      </h2>

      <div className="space-y-6">
        {data.hotels.map((hotel, index) => (
          <div 
            key={index} 
            className="p-4 bg-white rounded-lg"
            style={{ borderLeft: `4px solid ${data.theme.primary}` }}
          >
            <h3 
              className="text-lg font-bold mb-3"
              style={{ color: data.theme.primary }}
            >
              第 {index + 2} 天住宿
            </h3>
            
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 font-medium w-24">飯店名稱</td>
                  <td>{hotel.name || '-'}</td>
                </tr>
                <tr>
                  <td className="py-1 font-medium">電話</td>
                  <td>{hotel.phone || '-'}</td>
                </tr>
                <tr>
                  <td className="py-1 font-medium">地址</td>
                  <td>{hotel.address || '-'}</td>
                </tr>
                {hotel.morningCall && (
                  <tr>
                    <td className="py-1 font-medium">Morning Call</td>
                    <td>{hotel.morningCall}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
