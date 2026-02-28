import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { AlertCircle } from 'lucide-react';

export function TipsForm() {
  const { data, updateData } = useBrochure();

  const updateTip = (field: string, value: string) => {
    updateData({
      tips: {
        ...data.tips,
        [field]: value,
      },
    });
  };

  const tips = [
    { key: 'airport', label: '機場集合與行李準備' },
    { key: 'security', label: '安檢規定' },
    { key: 'immigration', label: '出境流程' },
    { key: 'luggage', label: '托運行李相關規定' },
    { key: 'destination', label: '目的地注意事項' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
        <AlertCircle size={20} />
        旅遊小叮嚀
      </h3>

      <div className="space-y-4">
        {tips.map((tip) => (
          <div key={tip.key}>
            <label className="block text-sm font-medium mb-1">{tip.label}</label>
            <textarea
              value={data.tips[tip.key as keyof typeof data.tips]}
              onChange={(e) => updateTip(tip.key, e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={2}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
