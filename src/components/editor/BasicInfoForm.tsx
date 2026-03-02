import React, { useCallback } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, Trash2 } from 'lucide-react';
import { compressImage } from '../../lib/imageUtils';

export function BasicInfoForm() {
  const { data, updateData } = useBrochure();

  const handleImageUpload = async (file: File | string, type: 'logo' | 'cover') => {
    try {
      if (typeof file === 'string') {
        // Handle URL string
        if (type === 'logo') {
          updateData({ logo: file });
        } else {
          updateData({ coverImage: file });
        }
      } else {
        // Handle File object
        const compressedImage = await compressImage(file);
        if (type === 'logo') {
          updateData({ logo: compressedImage });
        } else {
          updateData({ coverImage: compressedImage });
        }
      }
    } catch (error) {
      console.error(type === 'logo' ? 'Logo 處理失敗' : '封面處理失敗', error);
    }
  };

  const handleUrlInput = (type: 'logo' | 'cover', e: React.MouseEvent) => {
    e.stopPropagation(); // 防止觸發 Dropzone
    const url = window.prompt('請輸入圖片網址 (URL)：\n支援 jpg, png, webp 等格式\n請注意：若來源網站刪除圖片，手冊內的圖片也會失效');
    if (url && url.trim().startsWith('http')) {
      handleImageUpload(url.trim(), type);
    }
  };

  const onDropLogo = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) handleImageUpload(acceptedFiles[0], 'logo');
  }, [updateData]);

  const onDropCover = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) handleImageUpload(acceptedFiles[0], 'cover');
  }, [updateData]);

  // 處理從剪貼簿貼上圖片
  const handlePaste = useCallback((e: React.ClipboardEvent, type: 'logo' | 'cover') => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image/') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageUpload(file, type);
          e.preventDefault(); // 防止預設貼上行為
          break;
        }
      }
    }
  }, [handleImageUpload]);

  const removeCoverImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateData({ coverImage: undefined });
  };

  const removeLogoImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateData({ logo: '' });
  };

  const { getRootProps: getLogoProps, getInputProps: getLogoInputProps, isDragActive: isLogoDragActive } = useDropzone({
    onDrop: onDropLogo,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
  });

  const { getRootProps: getCoverProps, getInputProps: getCoverInputProps, isDragActive: isCoverDragActive } = useDropzone({
    onDrop: onDropCover,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  // 共用的 Input 樣式
  const inputClassName = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm text-gray-700";
  const labelClassName = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-6">

      {/* 圖片上傳區域群組 */}
      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
        {/* Cover Image Upload (原本是 Grid 裡的一半，現在讓它佔滿) */}
        <div>
          <label className={labelClassName}>封面主圖 (Cover)</label>
          <div
            {...getCoverProps()}
            onPaste={(e) => handlePaste(e, 'cover')}
            tabIndex={0}
            className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors h-32 flex flex-col items-center justify-center overflow-hidden outline-none focus:border-blue-300 focus:bg-blue-50/30 ${isCoverDragActive ? 'border-blue-400 bg-blue-50/50' : 'border-gray-300 hover:bg-gray-50'
              }`}
          >
            <input {...getCoverInputProps()} />
            {data.coverImage ? (
              <>
                <img src={data.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-black/10 transition-opacity hover:bg-black/20" />
                <button
                  onClick={removeCoverImage}
                  className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-full p-1.5 shadow-sm hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <div className="text-gray-400 flex flex-col items-center gap-2 relative z-10">
                <ImagePlus size={24} strokeWidth={1.5} />
                <p className="text-xs font-medium">點擊、拖曳或 <kbd className="bg-gray-100 px-1 rounded text-[10px] mx-0.5 border border-gray-200">Ctrl+V</kbd> 貼上</p>
                <button
                  onClick={(e) => handleUrlInput('cover', e)}
                  className="mt-1 text-xs text-blue-500 hover:text-blue-600 font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  🔗 貼上圖片網址
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">


        <div>
          <label className={labelClassName}>旅遊主標題 *</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => updateData({ title: e.target.value })}
            className={`${inputClassName} font-medium text-base`}
            placeholder="例如：馬來西亞～雪蘭莪生態五日遊"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClassName}>出發日期 *</label>
            <input
              type="date"
              value={data.startDate}
              onChange={(e) => updateData({ startDate: e.target.value })}
              className={inputClassName}
            />
          </div>

          <div>
            <label className={labelClassName}>旅遊天數 *</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="30"
                value={data.duration}
                onChange={(e) => updateData({ duration: parseInt(e.target.value) || 1 })}
                className={`${inputClassName} pr-8`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">天</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClassName}>領隊姓名</label>
            <input
              type="text"
              value={data.tourLeader}
              onChange={(e) => updateData({ tourLeader: e.target.value })}
              className={inputClassName}
              placeholder="請輸入姓名"
            />
          </div>

          <div>
            <label className={labelClassName}>聯絡電話</label>
            <input
              type="tel"
              value={data.tourLeaderPhone}
              onChange={(e) => updateData({ tourLeaderPhone: e.target.value })}
              className={inputClassName}
              placeholder="09xx-xxx-xxx"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClassName}>集合地點</label>
            <input
              type="text"
              value={data.meetingPoint}
              onChange={(e) => updateData({ meetingPoint: e.target.value })}
              className={inputClassName}
              placeholder="例如：桃園機場第一航廈"
            />
          </div>

          <div>
            <label className={labelClassName}>集合時間</label>
            <input
              type="time"
              value={data.meetingTime}
              onChange={(e) => updateData({ meetingTime: e.target.value })}
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      {/* 旅行社相關設定移至區域最下方 */}
      <hr className="my-6 border-gray-200" />
      <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-100">
        <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
          <span>🏢</span> 旅行社與品牌設定
        </h3>
        <div className="space-y-4">
          <div>
            <label className={labelClassName}>旅行社名稱</label>
            <input
              type="text"
              value={data.agency}
              onChange={(e) => updateData({ agency: e.target.value })}
              className={inputClassName}
              placeholder="例如：安天旅行社"
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className={labelClassName}>旅行社 Logo 上傳</label>
            <div
              {...getLogoProps()}
              onPaste={(e) => handlePaste(e, 'logo')}
              tabIndex={0}
              className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors h-32 flex flex-col items-center justify-center outline-none focus:border-blue-300 focus:bg-white ${isLogoDragActive ? 'border-blue-400 bg-blue-50/50' : 'border-gray-300 hover:bg-white bg-white/50'
                }`}
            >
              <input {...getLogoInputProps()} />
              {data.logo ? (
                <>
                  <img src={data.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                  <button
                    onClick={removeLogoImage}
                    className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1.5 shadow-md border border-gray-100 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              ) : (
                <div className="text-gray-400 flex flex-col items-center gap-2">
                  <ImagePlus size={24} strokeWidth={1.5} />
                  <p className="text-xs font-medium">點擊、拖曳或 <kbd className="bg-gray-100 px-1 rounded text-[10px] mx-0.5 border border-gray-200">Ctrl+V</kbd> 貼上</p>
                  <button
                    onClick={(e) => handleUrlInput('logo', e)}
                    className="mt-1 text-xs text-blue-500 hover:text-blue-600 font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    🔗 貼上圖片網址
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
