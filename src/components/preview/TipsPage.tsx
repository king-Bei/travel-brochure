import React from 'react';
import { useBrochure } from '../../context/BrochureContext';

export function TipsPage() {
  const { data } = useBrochure();

  const tips = [
    { key: 'airport', label: '機場集合與行李準備篇' },
    { key: 'security', label: '安檢規定' },
    { key: 'immigration', label: '出境流程' },
    { key: 'luggage', label: '托運行李相關規定' },
    { key: 'destination', label: '馬來西亞旅遊注意事項' },
  ];

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
        旅遊小叮嚀
      </h2>

      <div className="space-y-4">
        {tips.map((tip) => (
          <div 
            key={tip.key} 
            className="p-4 bg-white rounded-lg"
            style={{ borderLeft: `4px solid ${data.theme.primary}` }}
          >
            <h3 
              className="font-bold mb-2"
              style={{ color: data.theme.primary }}
            >
              {tip.label}
            </h3>
            <p className="text-sm whitespace-pre-wrap">
              {data.tips[tip.key as keyof typeof data.tips] || '-'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
