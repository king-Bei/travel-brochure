import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { themes } from '../../types';

export function ThemeSettings() {
  const { data, setTheme, updateData } = useBrochure();

  const handleCustomColor = (key: 'primary' | 'secondary' | 'text', value: string) => {
    updateData({
      theme: {
        ...data.theme,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg" style={{ color: data.theme.primary }}>
        🌈 色系設定
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(themes).map(([name, theme]) => (
          <button
            key={name}
            onClick={() => setTheme(theme)}
            className={`p-3 rounded-lg border-2 transition-all ${
              data.theme.primary === theme.primary ? 'border-blue-500' : 'border-gray-200'
            }`}
            style={{ backgroundColor: theme.secondary }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: theme.primary }}
              />
              <span className="text-sm font-medium" style={{ color: theme.text }}>
                {name === 'business' && '商務'}
                {name === 'nature' && '自然'}
                {name === 'romance' && '浪漫'}
                {name === 'energy' && '活力'}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-3 pt-3 border-t">
        <h4 className="text-sm font-medium">自訂顏色</h4>
        
        <div className="space-y-2">
          <label className="flex items-center justify-between text-sm">
            <span>主色（標題/裝飾）</span>
            <input
              type="color"
              value={data.theme.primary}
              onChange={(e) => handleCustomColor('primary', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
          </label>
          
          <label className="flex items-center justify-between text-sm">
            <span>輔助色（背景）</span>
            <input
              type="color"
              value={data.theme.secondary}
              onChange={(e) => handleCustomColor('secondary', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
          </label>
          
          <label className="flex items-center justify-between text-sm">
            <span>文字色</span>
            <input
              type="color"
              value={data.theme.text}
              onChange={(e) => handleCustomColor('text', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
          </label>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>Hex: {data.theme.primary}</p>
        </div>
      </div>
    </div>
  );
}
