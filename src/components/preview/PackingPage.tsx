import React from 'react';
import { useBrochure } from '../../context/BrochureContext';

export function PackingPage() {
  const { data } = useBrochure();

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
        旅遊物品一覽
      </h2>

      <div className="bg-white rounded-lg p-6">
        <table className="w-full">
          <tbody>
            {data.packingList.map((item, index) => (
              <tr key={index} className="border-b last:border-b-0">
                <td className="py-3 flex items-center gap-3">
                  <div 
                    className="w-5 h-5 border-2 rounded"
                    style={{ borderColor: data.theme.primary }}
                  />
                  <span>{item}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
