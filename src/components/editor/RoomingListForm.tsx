import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Plus, Trash2, Users } from 'lucide-react';
import type { RoomingEntry } from '../../types';

export function RoomingListForm() {
    const { data, updateData } = useBrochure();

    const handleAddRoom = () => {
        const newRoom: RoomingEntry = {
            id: crypto.randomUUID(),
            roomNumber: ((data.roomingList?.length || 0) + 1).toString().slice(0, 5),
            names: ['', ''],
            roomType: '雙人房',
            hotelName: '',
            hotelRooms: {},
            remarks: '',
        };
        updateData({ roomingList: [...(data.roomingList || []), newRoom] });
    };

    const handleRemoveRoom = (index: number) => {
        const newList = [...(data.roomingList || [])];
        newList.splice(index, 1);
        updateData({ roomingList: newList });
    };

    const handleUpdateRoom = (index: number, updates: Partial<RoomingEntry>) => {
        const newList = [...(data.roomingList || [])];
        newList[index] = { ...newList[index], ...updates };
        updateData({ roomingList: newList });
    };

    const handleUpdateName = (roomIndex: number, nameIndex: number, value: string) => {
        const newList = [...(data.roomingList || [])];
        const newNames = [...newList[roomIndex].names];
        newNames[nameIndex] = value;
        newList[roomIndex] = { ...newList[roomIndex], names: newNames };
        updateData({ roomingList: newList });
    };

    const handlePasteNames = () => {
        const input = prompt('請貼上名單（每行一位旅客姓名）：');
        if (!input) return;

        const newNames = input.split('\n').map(n => n.trim()).filter(n => n !== '');
        if (newNames.length === 0) return;

        // 簡單邏輯：每兩個人一間房，如果是單人就一間房
        const newRooms: RoomingEntry[] = [];
        for (let i = 0; i < newNames.length; i += 2) {
            const names = [newNames[i]];
            if (i + 1 < newNames.length) names.push(newNames[i + 1]);

            newRooms.push({
                id: crypto.randomUUID(),
                roomNumber: (newRooms.length + (data.roomingList?.length || 0) + 1).toString().slice(0, 5),
                names: names,
                roomType: names.length === 1 ? '單人房' : '雙人房',
                hotelName: data.hotels?.[0]?.name || '',
                hotelRooms: {},
                remarks: '',
            });
        }
        updateData({ roomingList: [...(data.roomingList || []), ...newRooms] });
    };

    const roomingList = data.roomingList || [];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-bold text-gray-700">分房列表 ({roomingList.length} 間)</h3>
                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-blue-600 transition-colors">
                        <input
                            type="checkbox"
                            checked={data.showRoomNumber !== false}
                            onChange={(e) => updateData({ showRoomNumber: e.target.checked })}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>顯示房號</span>
                    </label>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePasteNames}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        title="每行一個姓名，系統將自動填寫"
                    >
                        <Users size={16} />
                        貼心貼上名單
                    </button>
                    <button
                        onClick={handleAddRoom}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    >
                        <Plus size={16} />
                        新增房間
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {roomingList.map((room, index) => (
                    <div key={room.id} className="p-4 bg-gray-50 border border-gray-100 rounded-lg relative group">
                        <button
                            onClick={() => handleRemoveRoom(index)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="刪除"
                        >
                            <Trash2 size={16} />
                        </button>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-2 pr-6">
                            <div className="lg:col-span-3 space-y-2">
                                <label className="block text-gray-500 text-[10px] font-bold uppercase">房號資訊 (對應飯店)</label>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {data.hotels.length > 0 ? (
                                        data.hotels.map((h, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-gray-400 w-20 truncate" title={h.name}>
                                                    {h.name || `飯店 ${i + 1}`}
                                                </span>
                                                <input
                                                    type="text"
                                                    maxLength={5}
                                                    placeholder="#"
                                                    value={room.hotelRooms?.[h.name] || ''}
                                                    onChange={(e) => {
                                                        const newRooms = { ...(room.hotelRooms || {}) };
                                                        newRooms[h.name] = e.target.value.slice(0, 5);
                                                        handleUpdateRoom(index, { hotelRooms: newRooms });
                                                    }}
                                                    className="flex-1 text-xs border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-gray-400 w-20">預設房號</span>
                                            <input
                                                type="text"
                                                maxLength={5}
                                                placeholder="#"
                                                value={room.roomNumber || ''}
                                                onChange={(e) => handleUpdateRoom(index, { roomNumber: e.target.value.slice(0, 5) })}
                                                className="flex-1 text-xs border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="lg:col-span-4 space-y-1">
                                <label className="block text-gray-400 text-[10px] font-bold uppercase">旅客姓名 (每位一欄)</label>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="姓名 1"
                                        value={room.names[0] || ''}
                                        onChange={(e) => handleUpdateName(index, 0, e.target.value)}
                                        className="w-full text-base font-medium border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="姓名 2 (單人房可留空)"
                                        value={room.names[1] || ''}
                                        onChange={(e) => handleUpdateName(index, 1, e.target.value)}
                                        className="w-full text-base font-medium border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="lg:col-span-5 space-y-1">
                                <label className="block text-gray-400 text-[10px] font-bold uppercase">備註</label>
                                <textarea
                                    className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                                    placeholder="如：素食、特殊需求..."
                                    value={room.remarks || ''}
                                    onChange={(e) => handleUpdateRoom(index, { remarks: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {roomingList.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed rounded-lg bg-gray-50">
                    目前沒有房間資料，點擊上方按鈕新增。
                </div>
            )}
        </div>
    );
}
