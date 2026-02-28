import React, { useState } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';

export function PackingListForm() {
  const { data, addPackingItem, removePackingItem } = useBrochure();
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      addPackingItem(newItem.trim());
      setNewItem('');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
        <CheckSquare size={20} />
        旅遊物品一覽
      </h3>

      <div className="space-y-2">
        {data.packingList.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded"
                defaultChecked
              />
              {item}
            </span>
            <button
              onClick={() => removePackingItem(index)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
          placeholder="新增物品..."
        />
        <button
          onClick={handleAdd}
          className="px-3 py-2 rounded-lg flex items-center gap-1"
          style={{ backgroundColor: data.theme.primary, color: 'white' }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
