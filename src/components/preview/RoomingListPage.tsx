import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Users } from 'lucide-react';
import { PageWrapper } from './PageWrapper';

export function RoomingListPage() {
    const { data } = useBrochure();

    if (!data.roomingList || data.roomingList.length === 0) {
        return null;
    }

    const hotels = data.hotels || [];
    const hasHotels = hotels.length > 0;

    return (
        <PageWrapper title="分房表 Rooming List" icon={<Users size={24} />}>
            <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-gray-800">
                {/* Rooming Table */}
                <div className="flex-1 overflow-hidden p-2.5">
                    <table className="w-full text-[10px] text-center border-collapse border border-gray-200 table-fixed">
                        <thead className="bg-[#f8f9fa] text-gray-700 font-bold tracking-tight">
                            <tr>
                                <th className="border border-gray-200 px-1 py-1.5 w-[35px]">編號</th>
                                <th className="border border-gray-200 px-2 py-1.5 text-left min-w-[80px]">旅客姓名</th>

                                {hasHotels ? (
                                    hotels.map((h, i) => (
                                        <th key={i} className="border border-gray-200 px-1 py-1 bg-blue-50/50 min-w-[60px]">
                                            <div className="flex flex-col items-center leading-tight">
                                                <span className="text-[7px] text-blue-600/70 font-black uppercase tracking-tighter">H{i + 1}</span>
                                                <span className="text-[9px] break-words line-clamp-2 uppercase leading-none">
                                                    {h.name || '飯店'}
                                                </span>
                                            </div>
                                        </th>
                                    ))
                                ) : (
                                    <th className="border border-gray-200 px-2 py-1.5 w-[60px]">房號</th>
                                )}

                                <th className="border border-gray-200 px-2 py-1.5 w-[60px] uppercase text-[9px] tracking-wider">備註</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                // 1. 先排序：優先依照第一個飯店的房號排序，若無則依預設房號
                                const sortedList = [...(data.roomingList || [])].sort((a, b) => {
                                    const firstHotel = hotels[0]?.name;
                                    const valA = firstHotel ? (a.hotelRooms?.[firstHotel] || '') : (a.roomNumber || '');
                                    const valB = firstHotel ? (b.hotelRooms?.[firstHotel] || '') : (b.roomNumber || '');
                                    return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
                                });

                                let globalIdx = 1;

                                return sortedList.map((room) => {
                                    const namesToRender = (room.names || []).filter(n => n?.trim() !== '');
                                    if (namesToRender.length === 0) namesToRender.push('');
                                    const peopleCount = namesToRender.length;

                                    return namesToRender.map((name, nameIdx) => {
                                        const currentSeq = globalIdx++;
                                        return (
                                            <tr key={`${room.id}-${nameIdx}`} className="hover:bg-gray-50/50">
                                                {/* 1. 編號 */}
                                                <td className="border border-gray-200 px-1 py-1 text-gray-500 font-mono">
                                                    {currentSeq}
                                                </td>

                                                {/* 2. 姓名 */}
                                                <td className="border border-gray-200 px-2 py-1 text-left font-bold text-gray-800 text-xs truncate">
                                                    {name || '-'}
                                                </td>

                                                {/* 3. 房號錄 (依據飯店數量動態產出) */}
                                                {hasHotels ? (
                                                    hotels.map((h, hIdx) => {
                                                        const roomNo = room.hotelRooms?.[h.name] || '';
                                                        if (nameIdx !== 0) return null;
                                                        return (
                                                            <td key={hIdx} className="border border-gray-200 px-1 py-2 bg-white align-middle" rowSpan={peopleCount}>
                                                                <div className="font-bold text-gray-800 text-xs tracking-tighter uppercase text-center">
                                                                    {data.showRoomNumber !== false ? (roomNo || '-') : ''}
                                                                </div>
                                                            </td>
                                                        );
                                                    })
                                                ) : (
                                                    nameIdx === 0 && (
                                                        <td className="border border-gray-200 px-2 py-2 bg-white align-middle" rowSpan={peopleCount}>
                                                            <div className="font-bold text-gray-800 text-xs tracking-widest uppercase text-center">
                                                                {data.showRoomNumber !== false ? (room.roomNumber || '-') : ''}
                                                            </div>
                                                        </td>
                                                    )
                                                )}

                                                {/* 4. 備註 (合併欄位) */}
                                                {nameIdx === 0 && (
                                                    <td className="border border-gray-200 px-2 py-2 bg-white align-middle text-left" rowSpan={peopleCount}>
                                                        {room.remarks ? (
                                                            <div className="text-[8px] text-gray-500 leading-tight line-clamp-3">
                                                                {room.remarks}
                                                            </div>
                                                        ) : (
                                                            <div className="h-4" />
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    });
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageWrapper>
    );
}
