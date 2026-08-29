import React, { useCallback, useMemo } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Plane, ImagePlus, Trash2, Plus, ArrowDown, ChevronUp, ChevronDown, Map, Phone } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { FlightInfo, MeetingInfo } from '../../types';
import { compressImage } from '../../lib/imageUtils';
import { SectionSettings } from './SectionSettings';

export function FlightForm() {
  const { data, updateData } = useBrochure();

  const flights = useMemo(() => {
    if (Array.isArray(data.flights)) return data.flights;
    return [];
  }, [data.flights]);

  const meetingInfos = useMemo<MeetingInfo[]>(() => {
    if (data.meetingInfos?.length) {
      return data.meetingInfos.map((item, index) =>
        index === 0 && !item.map && data.meetingMap ? { ...item, map: data.meetingMap } : item
      );
    }
    if (data.meetingPoint || data.meetingTime || data.meetingMap) {
      return [{ id: 'legacy-meeting', point: data.meetingPoint || '', time: data.meetingTime || '', map: data.meetingMap || '' }];
    }
    return [];
  }, [data.meetingInfos, data.meetingPoint, data.meetingTime, data.meetingMap]);

  const saveMeetingInfos = (items: MeetingInfo[]) => {
    updateData({
      meetingInfos: items,
      meetingPoint: items[0]?.point || '',
      meetingTime: items[0]?.time || '',
      meetingMap: items[0]?.map || '',
    });
  };

  const addMeetingInfo = () => {
    if (meetingInfos.length >= 6) return;
    saveMeetingInfos([...meetingInfos, { id: crypto.randomUUID(), point: '', time: '', people: '', contactName: '', contactPhone: '', map: '' }]);
  };

  const updateMeetingInfo = (index: number, field: 'point' | 'time' | 'people' | 'contactName' | 'contactPhone' | 'isContactPerson' | 'map' | 'mapSize', value: string | boolean) => {
    saveMeetingInfos(meetingInfos.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  };


  const removeMeetingInfo = (index: number) => {
    saveMeetingInfos(meetingInfos.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleMeetingMapUpload = async (index: number, file: File) => {
    try {
      const compressed = await compressImage(file);
      updateMeetingInfo(index, 'map', compressed);
    } catch (err) {
      console.error('集合地圖壓縮失敗', err);
    }
  };

  const updateSegment = (index: number, field: keyof FlightInfo, value: any) => {
    const newFlights = [...flights];
    newFlights[index] = { ...newFlights[index], [field]: value };
    updateData({ flights: newFlights });
  };

  const addSegment = () => {
    if (flights.length >= 8) return;
    const newSegment: FlightInfo = {
      airline: '',
      airlineLogo: '',
      flightNumber: '',
      date: '',
      departureTime: '',
      departurePlace: '',
      arrivalTime: '',
      arrivalPlace: '',
      arrivalNextDay: false,
      duration: '',
      type: flights.length === 0 ? 'outbound' : (flights.length === 1 ? 'return' : 'middle'),
    };
    updateData({ flights: [...flights, newSegment] });
  };

  const removeSegment = (index: number) => {
    const newFlights = flights.filter((_, i) => i !== index);
    updateData({ flights: newFlights });
  };

  const moveSegment = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === flights.length - 1) return;
    const newFlights = [...flights];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFlights[index], newFlights[targetIndex]] = [newFlights[targetIndex], newFlights[index]];
    updateData({ flights: newFlights });
  };

  const handleLogoUpload = async (index: number, file: File) => {
    try {
      const compressed = await compressImage(file);
      updateSegment(index, 'airlineLogo', compressed);
    } catch (err) {
      console.error('Logo 壓縮失敗', err);
    }
  };

  const labelClassName = "block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider";
  const inputClassName = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm text-gray-700 placeholder:text-gray-300";

  return (
    <div className="space-y-4">
      <SectionSettings id="flight" />
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
          <Plane size={20} />
          航班航段管理
        </h3>
        <button
          onClick={addSegment}
          disabled={flights.length >= 8}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={16} />
          新增航段
        </button>
      </div>

      <div className="space-y-6">
        {flights.map((flight, index) => (
          <SegmentEditor
            key={index}
            flight={flight}
            index={index}
            total={flights.length}
            updateSegment={updateSegment}
            removeSegment={removeSegment}
            moveSegment={moveSegment}
            handleLogoUpload={handleLogoUpload}
            labelClassName={labelClassName}
            inputClassName={inputClassName}
            primaryColor={data.theme.primary}
            meetingGroupCount={meetingInfos.length}
          />
        ))}

        {flights.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <Plane className="mx-auto text-gray-300 mb-3" size={32} strokeWidth={1.5} />
            <p className="text-sm text-gray-400 font-medium">尚未新增任何航段</p>
            <button onClick={addSegment} className="mt-4 text-blue-600 font-bold text-xs hover:underline decoration-2 underline-offset-4">立即新增第一筆 ➔</button>
          </div>
        )}

        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <Map size={16} className="text-blue-500" />
              機場集合資訊
            </h4>
            <button
              onClick={addMeetingInfo}
              disabled={meetingInfos.length >= 6}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 disabled:opacity-40"
            >
              <Plus size={14} /> 新增集合資訊
            </button>
          </div>
          <div className="space-y-3 mb-4">
            {meetingInfos.map((meeting, index) => (
              <div key={meeting.id} className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-3 items-end p-3 bg-white border border-gray-100 rounded-xl">
                <div>
                  <label className={labelClassName}>集合地點 {index + 1}</label>
                  <input
                    type="text"
                    value={meeting.point}
                    onChange={(e) => updateMeetingInfo(index, 'point', e.target.value)}
                    className={inputClassName}
                    placeholder="例如：桃園機場第一航廈 3F 華航櫃檯"
                  />
                </div>
                <div>
                  <label className={labelClassName}>集合時間</label>
                  <input
                    type="text"
                    value={meeting.time}
                    onChange={(e) => updateMeetingInfo(index, 'time', e.target.value)}
                    className={inputClassName}
                    placeholder="例如：10:30"
                  />
                </div>
                <button onClick={() => removeMeetingInfo(index)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="刪除此集合資訊">
                  <Trash2 size={16} />
                </button>
                <div className="md:col-span-3">
                  <label className={labelClassName}>集合人員</label>
                  <input
                    type="text"
                    value={meeting.people || ''}
                    onChange={(e) => updateMeetingInfo(index, 'people', e.target.value)}
                    className={inputClassName}
                    placeholder="例如：王小明、陳美麗／A 車旅客／自行前往人員"
                  />
                </div>
                <div className="md:col-span-3 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-gray-700">人員身分</p>
                    <p className="text-[10px] text-gray-400">未勾選為領隊，勾選後改為聯繫人</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-blue-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={meeting.isContactPerson || false}
                      onChange={(e) => updateMeetingInfo(index, 'isContactPerson', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    聯繫人
                  </label>
                </div>
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClassName}>{meeting.isContactPerson ? '聯繫人姓名' : '此組領隊'}</label>
                    <input
                      type="text"
                      value={meeting.contactName || ''}
                      onChange={(e) => updateMeetingInfo(index, 'contactName', e.target.value)}
                      className={inputClassName}
                      placeholder={meeting.isContactPerson ? '例如：王小明' : '例如：王小明領隊'}
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>{meeting.isContactPerson ? '聯繫人電話' : '領隊電話'}</label>
                    <input
                      type="tel"
                      value={meeting.contactPhone || ''}
                      onChange={(e) => updateMeetingInfo(index, 'contactPhone', e.target.value)}
                      className={inputClassName}
                      placeholder="例如：0912-345-678"
                    />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClassName}>此集合地點地圖</label>
                    {meeting.map && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-400">地圖顯示尺寸：</span>
                        <select
                          value={meeting.mapSize || 'medium'}
                          onChange={(e) => updateMeetingInfo(index, 'mapSize', e.target.value)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5 font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="small">精簡 (140px)</option>
                          <option value="medium">標準 (200px)</option>
                          <option value="large">大型 (280px)</option>
                          <option value="huge">超大滿版 (360px)</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <MapUploader
                    image={meeting.map}
                    onUpload={(file: File) => handleMeetingMapUpload(index, file)}
                    onRemove={() => updateMeetingInfo(index, 'map', '')}
                    primaryColor={data.theme.primary}
                    compact
                  />
                </div>

              </div>
            ))}
            {meetingInfos.length === 0 && (
              <button onClick={addMeetingInfo} className="w-full py-5 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-blue-200 hover:text-blue-500">
                ＋ 新增第一筆集合地點、時間與人員
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function SegmentEditor({
  flight, index, total, updateSegment, removeSegment, moveSegment, handleLogoUpload, labelClassName, inputClassName, primaryColor, meetingGroupCount
}: any) {
  const automaticGroupSize = Math.max(1, Math.ceil(total / Math.max(meetingGroupCount, 1)));
  const effectiveGroupIndex = flight.groupIndex ?? Math.min(Math.floor(index / automaticGroupSize), Math.max(meetingGroupCount - 1, 0));
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) handleLogoUpload(index, acceptedFiles[0]);
  }, [index, handleLogoUpload]);

  const handleLogoPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                handleLogoUpload(index, file);
                e.preventDefault();
                break;
            }
        }
    }
  }, [index, handleLogoUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
      <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 text-blue-600 text-xs font-black shadow-sm">
            {index + 1}
          </span>
          <select
            value={flight.type}
            onChange={(e) => updateSegment(index, 'type', e.target.value)}
            className="bg-transparent font-bold text-sm text-gray-700 outline-none cursor-pointer hover:text-blue-600 transition-colors"
          >
            <option value="outbound">去程航班</option>
            <option value="middle">中轉航班</option>
            <option value="return">回程航班</option>
          </select>
          {meetingGroupCount > 1 && (
            <select
              value={effectiveGroupIndex}
              onChange={(e) => updateSegment(index, 'groupIndex', Number(e.target.value))}
              className="bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 outline-none cursor-pointer"
              title="選擇此航班要顯示在哪一組頁面"
            >
              {Array.from({ length: meetingGroupCount }).map((_, groupIndex) => (
                <option key={groupIndex} value={groupIndex}>第 {groupIndex + 1} 組</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => moveSegment(index, 'up')} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-20 hover:bg-white rounded-lg transition-all"><ChevronUp size={16} /></button>
          <button onClick={() => moveSegment(index, 'down')} disabled={index === total - 1} className="p-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-20 hover:bg-white rounded-lg transition-all"><ChevronDown size={16} /></button>
          <button onClick={() => removeSegment(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-1"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6">
          <div className="space-y-2">
            <label className={labelClassName}>航空公司 Logo</label>
            <div
              {...getRootProps()}
              onPaste={handleLogoPaste}
              tabIndex={0}
              className={`relative h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden outline-none focus:border-blue-300 focus:bg-blue-50/30 ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <input {...getInputProps()} />
              {flight.airlineLogo ? (
                <img src={flight.airlineLogo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="flex flex-col items-center">
                  <ImagePlus className="text-gray-300" size={20} />
                  <span className="text-[9px] text-gray-300 mt-1 font-bold">Paste</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>航空公司名稱</label>
              <input
                type="text"
                value={flight.airline || ''}
                onChange={(e) => updateSegment(index, 'airline', e.target.value)}
                className={inputClassName}
                placeholder="例如：中華航空"
              />
            </div>
            <div>
              <label className={labelClassName}>航班號碼</label>
              <input
                type="text"
                value={flight.flightNumber || ''}
                onChange={(e) => updateSegment(index, 'flightNumber', e.target.value)}
                className={inputClassName}
                placeholder="例如：CI 751"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div>
            <label className={labelClassName}>出發日期</label>
            <input
              type="date"
              value={flight.date || ''}
              onChange={(e) => updateSegment(index, 'date', e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col">
            <label className={labelClassName}>隔日抵達</label>
            <div className="flex items-center h-[38px]">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={flight.arrivalNextDay || false}
                  onChange={(e) => updateSegment(index, 'arrivalNextDay', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-xs font-semibold text-gray-500 uppercase tracking-tighter">YES</span>
              </label>
            </div>
          </div>
          <div>
              <label className={labelClassName}>去程資訊</label>
              <input
                type="text"
                value={flight.departurePlace || ''}
                onChange={(e) => updateSegment(index, 'departurePlace', e.target.value)}
                className={inputClassName}
                placeholder="點：桃園 (TPE)"
              />
              <input
                type="text"
                value={flight.departureTime || ''}
                onChange={(e) => updateSegment(index, 'departureTime', e.target.value)}
                className={`${inputClassName} mt-2`}
                placeholder="時：08:00"
              />
          </div>
          <div>
              <label className={labelClassName}>抵達資訊</label>
              <input
                type="text"
                value={flight.arrivalPlace || ''}
                onChange={(e) => updateSegment(index, 'arrivalPlace', e.target.value)}
                className={inputClassName}
                placeholder="點：新加坡 (SIN)"
              />
              <input
                type="text"
                value={flight.arrivalTime || ''}
                onChange={(e) => updateSegment(index, 'arrivalTime', e.target.value)}
                className={`${inputClassName} mt-2`}
                placeholder="時：12:30"
              />
          </div>
        </div>
      </div>
    </div>
  );
}

function MapUploader({ image, onUpload, onRemove, primaryColor, compact = false }: any) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) onUpload(acceptedFiles[0]);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = e.clipboardData.items[0];
    if (item?.type.includes('image')) {
      const file = item.getAsFile();
      if (file) onUpload(file);
    }
  };

  return (
    <div
      {...getRootProps()}
      onPaste={handlePaste}
      className={`relative border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center overflow-hidden outline-none ${compact ? 'min-h-[120px] p-4' : 'min-h-[200px] p-8'} ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
    >
      <input {...getInputProps()} />
      {image ? (
        <>
          <img src={image} alt="Meeting Map" className="absolute inset-0 w-full h-full object-contain p-4" />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-all flex items-start justify-end p-4">
             <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600 transition-colors"><Trash2 size={16} /></button>
          </div>
        </>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-4'}>
          <div className={`${compact ? 'w-10 h-10' : 'w-16 h-16'} bg-blue-50 rounded-full flex items-center justify-center mx-auto`}>
            <ImagePlus className="text-blue-500" size={compact ? 18 : 24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700">拖曳或點擊上傳集合地圖</p>
            {!compact && <p className="text-xs text-gray-400 mt-1">也可以直接使用 <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Ctrl+V</kbd> 貼上圖片</p>}
          </div>
        </div>
      )}
    </div>
  );
}
