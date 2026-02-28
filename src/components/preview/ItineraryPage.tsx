import React from 'react';
import { useBrochure } from '../../context/BrochureContext';

export function ItineraryPage() {
  const { data } = useBrochure();

  const getMealSymbols = (meals: { breakfast: boolean; lunch: boolean; dinner: boolean }) => {
    const symbols: string[] = [];
    if (meals.breakfast) symbols.push('早餐');
    if (meals.lunch) symbols.push('午餐');
    if (meals.dinner) symbols.push('晚餐');
    return symbols.length > 0 ? `（${symbols.join('/')}）` : '';
  };

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
        行程介紹
      </h2>

      <div className="space-y-6">
        {data.itineraries.map((day, index) => (
          <div 
            key={index} 
            className="p-4 bg-white rounded-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 
                className="text-lg font-bold"
                style={{ color: data.theme.primary }}
              >
                {day.title}
              </h3>
              {getMealSymbols(day.meals) && (
                <span className="text-sm px-2 py-1 bg-gray-100 rounded">
                  {getMealSymbols(day.meals)}
                </span>
              )}
            </div>
            
            {day.description && (
              <p className="text-sm mb-3 whitespace-pre-wrap">{day.description}</p>
            )}
            
            {day.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {day.images.map((img, imgIndex) => (
                  <img
                    key={imgIndex}
                    src={img}
                    alt={`Day ${index + 1}`}
                    className="w-full h-24 object-cover rounded"
                  />
                ))}
              </div>
            )}
            
            {day.hotelIndex !== null && data.hotels[day.hotelIndex] && (
              <p className="text-sm mt-2 text-gray-600">
                住宿：{data.hotels[day.hotelIndex].name}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
