import React, { useCallback } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { useDropzone } from 'react-dropzone';

export function BasicInfoForm() {
  const { data, updateData } = useBrochure();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        updateData({ logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  }, [updateData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg" style={{ color: data.theme.primary }}>
        基本資料
      </h3>

      <div className="space-y-3">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">旅行社 Logo</label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            {data.logo ? (
              <img src={data.logo} alt="Logo" className="max-h-20 mx-auto" />
            ) : (
              <p className="text-sm text-gray-500">
                {isDragActive ? '放開以上傳' : '點擊或拖曳上傳圖片'}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">旅行社名稱</label>
          <input
            type="text"
            value={data.agency}
            onChange={(e) => updateData({ agency: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="輸入旅行社名稱"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">旅遊主題 *</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => updateData({ title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例如：馬來西亞～雪蘭莪生態5日"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">出發日期 *</label>
            <input
              type="date"
              value={data.startDate}
              onChange={(e) => updateData({ startDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">天數 *</label>
            <input
              type="number"
              min="1"
              max="30"
              value={data.duration}
              onChange={(e) => updateData({ duration: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">領隊姓名</label>
            <input
              type="text"
              value={data.tourLeader}
              onChange={(e) => updateData({ tourLeader: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="領隊姓名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">領隊電話</label>
            <input
              type="tel"
              value={data.tourLeaderPhone}
              onChange={(e) => updateData({ tourLeaderPhone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0978-578-626"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">集合地點</label>
            <input
              type="text"
              value={data.meetingPoint}
              onChange={(e) => updateData({ meetingPoint: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="桃園機場第一航站"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">集合時間</label>
            <input
              type="time"
              value={data.meetingTime}
              onChange={(e) => updateData({ meetingTime: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
