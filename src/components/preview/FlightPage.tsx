import React, { useMemo } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Plane, MapPin, Users, Clock, Phone, AlertCircle } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import { FlightInfo } from '../../types';

export function FlightPage() {
  const { data } = useBrochure();

  // 1. Data Migration: 同步編輯器的邏輯，確保預覽也能顯示舊格式資料
  const flights = useMemo(() => {
    if (Array.isArray(data.flights)) {
      return data.flights;
    }
    const oldFlights = data.flights as any;
    if (oldFlights.outbound || oldFlights.return) {
      return [
        { ...oldFlights.outbound, arrivalNextDay: oldFlights.outbound?.arrivalNextDay || false },
        { ...oldFlights.return, arrivalNextDay: oldFlights.return?.arrivalNextDay || false }
      ].filter(f => f.airline || f.flightNumber || f.departurePlace);
    }
    return [];
  }, [data.flights]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${date.getMonth() + 1}/${date.getDate()} (${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]})`;
    } catch {
      return dateStr;
    }
  };

  // 緊湊型航班卡片
  const FlightCard = ({ flight, index }: { flight: FlightInfo; index: number }) => {
    return (
      <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-2 last:mb-0">
        <div className="flex items-stretch min-h-[60px]">
          <div className="flex-grow p-2 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                {flight.airlineLogo && <img src={flight.airlineLogo} alt="" className="h-3 object-contain" />}
                <span className="text-xs font-bold text-gray-800">{flight.airline}</span>
                <span className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-500 font-bold">{flight.flightNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600">
                  {flight.date ? (
                    flight.arrivalNextDay ? (
                      <>
                        {formatDate(flight.date)}
                        <span className="mx-1 opacity-50">-</span>
                        {(() => {
                          const nextDate = new Date(flight.date);
                          nextDate.setDate(nextDate.getDate() + 1);
                          return `${nextDate.getMonth() + 1}/${nextDate.getDate()} (${['日', '一', '二', '三', '四', '五', '六'][nextDate.getDay()]})`;
                        })()}
                      </>
                    ) : formatDate(flight.date)
                  ) : '日期待確認'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-start w-[80px]">
                <span className="text-base font-black text-gray-900 leading-none">{flight.departureTime || '--:--'}</span>
                <span className="text-xs font-bold text-gray-600 truncate w-full">{flight.departurePlace || '待確認'}</span>
              </div>

              <div className="flex-grow flex flex-col items-center justify-center relative">
                {flight.flightDuration && (
                  <div className="absolute -top-5 text-[14px] font-bold text-blue-600 uppercase tracking-tighter">
                    {flight.flightDuration}
                  </div>
                )}
                <div className="w-full flex items-center gap-2 opacity-30">
                  <div className="h-[3px] flex-grow bg-gray-400" />
                  <Plane size={14} className="rotate-45" />
                  <div className="h-[3px] flex-grow bg-gray-400" />
                </div>
              </div>

              <div className="flex flex-col items-end w-[90px]">
                <div className="flex items-start gap-0.5">
                  <span className="text-base font-black text-gray-900 leading-none">{flight.arrivalTime || '--:--'}</span>
                  {flight.arrivalNextDay && <span className="text-[10px] font-black text-orange-500 mt-[-2px]">+1</span>}
                </div>
                <span className="text-xs font-bold text-gray-600 truncate w-full text-right">{flight.arrivalPlace || '待確認'}</span>
              </div>
            </div>
            {flight.duration && (
              <div className="mt-1 text-xs text-gray-400 font-medium italic">
                Note: {flight.duration}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const meetingSection = (data.meetingPoint || data.meetingTime || data.tourLeader || data.agencyName || data.meetingMap) ? (
    <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
      <div className="flex items-center gap-2 mb-1.5">
        <Users size={14} style={{ color: data.theme.primary }} />
        <h3 className="font-bold text-base tracking-tight" style={{ color: data.theme.primary }}>集合資訊 & 聯絡方式</h3>
      </div>

      <div className="space-y-1">
        {/* 集合資訊卡片 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-100 flex flex-col justify-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0 flex items-center gap-1">
              <MapPin size={10} /> 集合地點
            </p>
            <p className="text-[11px] font-bold text-gray-800 leading-tight">{data.meetingPoint || '請洽旅行社確認'}</p>
          </div>
          <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-100 flex flex-col justify-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0 flex items-center gap-1">
              <Clock size={10} /> 集合時間
            </p>
            <p className="text-lg font-black leading-none" style={{ color: data.theme.primary }}>{data.meetingTime || '--:--'}</p>
          </div>
        </div>

        {/* 旅行社與緊急聯絡資訊 */}
        <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 -mr-3 -mt-3 opacity-5" style={{ color: data.theme.primary }}>
            <Phone size={48} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 relative z-10">
            {/* 第一列：領隊 (單獨一列) */}
            <div className="col-span-2 pb-1 border-b border-gray-50 mb-0.5 grid grid-cols-2 gap-x-4">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">領隊</p>
                <p className="text-base font-black text-gray-900 leading-none">{data.tourLeader || '敬請期待'}</p>
              </div>
              {data.tourLeaderPhone && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">領隊手機號碼</p>
                  <p className="text-sm font-black tracking-wider leading-none" style={{ color: data.theme.primary }}>
                    {data.tourLeaderPhone}
                  </p>
                </div>
              )}
            </div>

            {/* 第二列：旅行社 與 緊急聯繫人 */}
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">緊急聯繫人</p>
              <p className="text-xs font-black text-gray-900 leading-none">
                {data.emergencyContactName || '值班人員'}
              </p>
            </div>

            <div className="flex flex-col items-start justify-end space-y-0.5">
              <span className="text-[11px] font-bold text-gray-500 leading-none tracking-tight">
                {data.agencyPhone || '02-8789-6699'}
              </span>
              <p className="text-sm font-black tracking-wider text-gray-900 leading-none">
                {data.agencyMobile || data.emergencyPhone || '0911-111-111'}
              </p>
            </div>
          </div>
        </div>

        {/* 地圖區域 */}
        {data.meetingMap && (
          <div className="bg-gray-100/50 p-1.5 rounded-xl border border-gray-200">
            <div className="bg-white rounded-lg overflow-hidden shadow-inner">
              <img src={data.meetingMap} alt="Airport Meeting Map" className="w-full h-auto max-h-[140px] object-contain" />
            </div>
            <p className="text-center text-[9px] font-bold text-gray-400 mt-1 tracking-widest uppercase">機場集合地圖</p>
          </div>
        )}
      </div>
    </div>
  ) : null;

  // 航段分組邏輯：根據 type 分組 (去程 / 重點 / 回程)
  const groupedFlights = useMemo(() => {
    const groups: { type: string, label: string, color: string, colorLight: string, segments: FlightInfo[] }[] = [
      { type: 'outbound', label: '去程航班 Outbound', color: data.theme.primary, colorLight: `${data.theme.primary}15`, segments: [] },
      { type: 'middle', label: '中段/國內航班 Connections', color: '#6366f1', colorLight: '#6366f115', segments: [] },
      { type: 'return', label: '回程航班 Return', color: '#e67e22', colorLight: '#e67e2215', segments: [] },
    ];

    flights.forEach(f => {
      const g = groups.find(group => group.type === (f.type || (flights.indexOf(f) === 0 ? 'outbound' : 'return')));
      if (g) g.segments.push(f);
      else groups[0].segments.push(f);
    });

    return groups.filter(g => g.segments.length > 0);
  }, [flights, data.theme.primary]);

  if (flights.length === 0) {
    return (
      <PageWrapper title="航班資訊" icon={<Plane size={24} />}>
        <div className="flex-grow flex flex-col">
          <div className="flex-grow py-20 text-center opacity-20 italic font-medium">
            暫無航班資訊，請洽旅行社確認。
          </div>
          {meetingSection}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="航班資訊" icon={<Plane size={18} />}>
      <div className="flex-grow flex flex-col h-full">
        <div className="space-y-4">
          {groupedFlights.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <div className="flex items-center gap-2 mb-1 px-1">
                <div className="w-1 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                <h4 className="text-[11px] font-black uppercase tracking-wider" style={{ color: group.color }}>{group.label}</h4>
              </div>
              <div className="space-y-2">
                {group.segments.map((flight, fIdx) => (
                  <FlightCard key={fIdx} flight={flight} index={flights.indexOf(flight)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {meetingSection}
      </div>
    </PageWrapper>
  );
}
