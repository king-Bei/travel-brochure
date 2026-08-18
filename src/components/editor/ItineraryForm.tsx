import React, { useCallback } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { useDropzone } from 'react-dropzone';
import { Calendar, MapPin, ImagePlus, Trash2, Plus, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Check, Layout, List } from 'lucide-react';
import { SectionSettings } from './SectionSettings';
import { compressImage } from '../../lib/imageUtils';

export function ItineraryForm() {
  const { data, updateData } = useBrochure();

  const addDay = () => {
    updateData({
      itineraries: [
        ...data.itineraries,
        {
          id: crypto.randomUUID(),
          title: '',
          description: '',
          attractions: '',
          meals: { breakfast: true, breakfastText: '', lunch: true, lunchText: '', dinner: true, dinnerText: '' },
          hotelIndex: null,
          images: [],
        },
      ],
    });
  };

  const removeDay = (index: number) => {
    const newItineraries = data.itineraries.filter((_, i) => i !== index);
    updateData({ itineraries: newItineraries });
  };

  const updateDay = (index: number, field: string, value: any) => {
    const newItineraries = [...data.itineraries];
    newItineraries[index] = { ...newItineraries[index], [field]: value };
    updateData({ itineraries: newItineraries });
  };

  const moveDay = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === data.itineraries.length - 1) return;
    const newItineraries = [...data.itineraries];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItineraries[index], newItineraries[targetIndex]] = [newItineraries[targetIndex], newItineraries[index]];
    updateData({ itineraries: newItineraries });
  };

  const handleImageUpload = async (dayIndex: number, file: File) => {
    try {
      const compressed = await compressImage(file);
      const day = data.itineraries[dayIndex];
      const images = [...(day.images || []), compressed];
      updateDay(dayIndex, 'images', images);
    } catch (err) {
      console.error('圖片壓縮失敗', err);
    }
  };

  const removeImage = (dayIndex: number, imgIndex: number) => {
    const day = data.itineraries[dayIndex];
    const images = day.images.filter((_, i) => i !== imgIndex);
    updateDay(dayIndex, 'images', images);
  };

  const handleAttractionImageUpload = async (dayIndex: number, file: File) => {
    try {
      const compressed = await compressImage(file);
      const day = data.itineraries[dayIndex];
      const attractionImages = [...(day.attractionImages || []), compressed];
      updateDay(dayIndex, 'attractionImages', attractionImages);
    } catch (err) {
      console.error('景點特色圖片壓縮失敗', err);
    }
  };

  const removeAttractionImage = (dayIndex: number, imgIndex: number) => {
    const day = data.itineraries[dayIndex];
    const attractionImages = (day.attractionImages || []).filter((_, i) => i !== imgIndex);
    updateDay(dayIndex, 'attractionImages', attractionImages);
  };

  const inputClassName = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm text-gray-700 placeholder:text-gray-300";
  const labelClassName = "block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
          <MapPin size={20} />
          行程介紹
        </h3>
        <button
          onClick={addDay}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          新增天數
        </button>
      </div>

      <div className="space-y-6">
        {data.itineraries.map((day, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
            <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-blue-600 text-sm font-black shadow-sm">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={day.title}
                  onChange={(e) => updateDay(index, 'title', e.target.value)}
                  className="bg-transparent font-bold text-base text-gray-800 outline-none border-b border-transparent focus:border-blue-400 placeholder:text-gray-300 min-w-[200px]"
                  placeholder={`第 ${index + 1} 天行程標題`}
                />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <label className="flex items-center gap-1.5 mr-2 cursor-pointer group/break">
                  <input
                    type="checkbox"
                    checked={day.pageBreakBefore || false}
                    onChange={(e) => updateDay(index, 'pageBreakBefore', e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-[10px] font-bold text-gray-400 group-hover/break:text-orange-500 transition-colors">分頁</span>
                </label>
                <button onClick={() => moveDay(index, 'up')} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-20 hover:bg-white rounded-lg transition-all"><ChevronUp size={16} /></button>
                <button onClick={() => moveDay(index, 'down')} disabled={index === data.itineraries.length - 1} className="p-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-20 hover:bg-white rounded-lg transition-all"><ChevronDown size={16} /></button>
                <button onClick={() => removeDay(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-1"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className={labelClassName}>行程內容</label>
                    <textarea
                      value={day.description}
                      onChange={(e) => updateDay(index, 'description', e.target.value)}
                      className={`${inputClassName} min-h-[120px] resize-y`}
                      placeholder="請輸入當日詳細行程內容..."
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>景點特色</label>
                    <textarea
                      value={day.attractions || ''}
                      onChange={(e) => updateDay(index, 'attractions', e.target.value)}
                      className={`${inputClassName} min-h-[60px] resize-y mb-2`}
                      placeholder="請輸入景點特色說明..."
                    />
                    <div className="mt-2 space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">特色圖片 ({(day.attractionImages || []).length} / 3)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(day.attractionImages || []).map((img, imgIndex) => (
                          <div key={imgIndex} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group/img shadow-sm hover:shadow-md transition-all">
                            <img src={img} className="w-full h-full object-cover" alt={`Attraction ${imgIndex}`} />
                            <button
                              onClick={() => removeAttractionImage(index, imgIndex)}
                              className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm text-red-500 rounded-full p-1 shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-red-50"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {(day.attractionImages || []).length < 3 && (
                          <DayImageUploader onUpload={(file) => handleAttractionImageUpload(index, file)} />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {['breakfast', 'lunch', 'dinner'].map((meal) => (
                       <div key={meal}>
                        <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">
                          {meal === 'breakfast' ? '早餐' : meal === 'lunch' ? '午餐' : '晚餐'}
                        </label>
                        <input
                          type="text"
                          value={day.meals[`${meal}Text` as keyof typeof day.meals] as string || ''}
                          onChange={(e) => updateDay(index, 'meals', { ...day.meals, [`${meal}Text`]: e.target.value, [meal]: true })}
                          className="w-full bg-white border border-gray-200 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400"
                          placeholder="自理 / 飯店"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className={labelClassName}>當晚住宿</label>
                    <select
                      value={day.hotelIndex === null ? '' : day.hotelIndex}
                      onChange={(e) => updateDay(index, 'hotelIndex', e.target.value === '' ? null : Number(e.target.value))}
                      className={inputClassName}
                    >
                      <option value="">-- 請選擇飯店 --</option>
                      {data.hotels.map((hotel, hIndex) => (
                        <option key={hIndex} value={hIndex}>
                          飯店：{hotel.name || '未命名'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClassName}>行程圖片 ({day.images.length})</label>
                  <div className="grid grid-cols-2 gap-2">
                    {day.images.map((img, imgIndex) => (
                      <div key={imgIndex} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group/img shadow-sm hover:shadow-md transition-all">
                        <img src={img} className="w-full h-full object-cover" alt={`Day ${index + 1} image ${imgIndex}`} />
                        <button
                          onClick={() => removeImage(index, imgIndex)}
                          className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm text-red-500 rounded-full p-1 shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-red-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <DayImageUploader onUpload={(file) => handleImageUpload(index, file)} />
                  </div>
                </div>
              </div>
              
              <div className="px-5 pb-5">
                <SectionSettings id={day.id} />
              </div>
            </div>
          </div>
        ))}

        {data.itineraries.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <Calendar className="mx-auto text-gray-300 mb-3" size={32} strokeWidth={1.5} />
            <p className="text-sm text-gray-400 font-medium">尚未新增任何行程天數</p>
            <button onClick={addDay} className="mt-4 text-blue-600 font-bold text-xs hover:underline decoration-2 underline-offset-4">立即開始規劃 ➔</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DayImageUploader({ onUpload }: { onUpload: (file: File) => void }) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) onUpload(acceptedFiles[0]);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          onUpload(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  return (
    <div
      {...getRootProps()}
      onPaste={handlePaste}
      tabIndex={0}
      className={`relative aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all outline-none focus:border-blue-300 ${isDragActive ? 'border-blue-400 bg-blue-50/50' : 'border-gray-300 hover:bg-gray-50'}`}
    >
      <input {...getInputProps()} />
      <ImagePlus size={20} className={isDragActive ? 'text-blue-500' : 'text-gray-400'} />
      <span className="text-[10px] text-gray-400 mt-1 font-medium">新增圖片</span>
    </div>
  );
}
