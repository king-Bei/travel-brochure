import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { MapPin, Calendar, Users, Phone } from 'lucide-react';
import { PageWrapper } from './PageWrapper';

export function CoverPage() {
  const { data } = useBrochure();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '____ / __ / __';
    const date = new Date(dateStr);
    return `${date.getFullYear()} . ${(date.getMonth() + 1).toString().padStart(2, '0')} . ${date.getDate().toString().padStart(2, '0')}`;
  };

  const formatEndDate = (dateStr: string, duration: number) => {
    if (!dateStr || duration < 1) return '____ / __ / __';
    const date = new Date(dateStr);
    date.setDate(date.getDate() + duration - 1);
    return `${date.getFullYear()} . ${(date.getMonth() + 1).toString().padStart(2, '0')} . ${date.getDate().toString().padStart(2, '0')}`;
  };

  return (
    <PageWrapper hideHeaderFooter={true} className="cover-page">
      <div className="absolute inset-0 flex flex-col pt-12">
        {/* 頂部裝飾條 */}
        <div
          className="absolute top-0 left-0 right-0 h-4"
          style={{ backgroundColor: data.theme.primary }}
        />

        {/* 封面圖片背景區塊 (如果有上傳) */}
        {data.coverImage ? (
          <div className="absolute top-4 left-0 right-0 h-[45%] z-0">
            <img
              src={data.coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
            {/* 漸層遮罩，讓文字更易讀 */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-secondary)] via-transparent to-black/20"
              style={{ '--bg-secondary': data.theme.secondary } as React.CSSProperties} />
          </div>
        ) : (
          /* 沒有圖片時的預設背景圖案 */
          <div className="absolute top-4 left-0 right-0 h-[45%] z-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-300 via-gray-100 to-transparent" />
        )}

        {/* 內容主體區 */}
        <div className={`relative z-10 flex flex-col h-full px-16 ${data.coverImage ? 'mt-[35%]' : 'mt-12'}`}>

          {/* Header 區塊：移除 Logo，僅留空白讓排版不會擠到頂端 */}
          <div className="flex flex-col items-center mb-12 h-16">
          </div>

          {/* Main Title & Subtitle */}
          <div className="flex-grow flex flex-col items-center justify-center text-center -mt-12">
            <div className="w-16 h-1 mb-8 rounded-full" style={{ backgroundColor: data.theme.primary }} />
            <h1
              className="text-3xl font-black mb-2 leading-tight tracking-wide whitespace-pre-wrap"
              style={{ color: data.theme.primary }}
            >
              {data.title || '旅遊說明會手冊'}
            </h1>
            {data.subTitle && (
              <h2 className="text-lg font-bold mb-4 tracking-widest opacity-80" style={{ color: data.theme.primary }}>
                {data.subTitle}
              </h2>
            )}
            <div className="w-16 h-1 mt-4 rounded-full" style={{ backgroundColor: data.theme.primary }} />
          </div>

          {/* Bottom Info Section: 日期、地點、Logo、旅行社名稱 */}
          <div className="mt-auto flex flex-col w-full pb-8">
            {/* 上方分隔線 */}
            <div className="w-full border-t border-dashed mb-6" style={{ borderColor: `${data.theme.primary}80` }} />

            {/* 日期與地點列 */}
            <div className="w-full flex justify-between items-center px-4 mb-4 text-base tracking-wider font-semibold" style={{ color: data.theme.primary }}>
              <div className="flex items-center gap-2">
                <Calendar size={18} />
                <span>{formatDate(data.startDate)}</span>
                <span className="text-gray-400 font-normal mx-2">~</span>
                <span>{formatEndDate(data.startDate, data.duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={18} />
                <span>{data.destination || '未指派地點'}</span>
              </div>
            </div>

            {/* 下方分隔線 */}
            <div className="w-full border-b border-dashed mb-10" style={{ borderColor: `${data.theme.primary}80` }} />

            {/* Logo 與 旅行社名稱 (置中排列) */}
            <div className="flex flex-col items-center justify-center gap-4">
              {data.logo && (
                <div className="max-w-[160px]">
                  <img src={data.logo} alt="Logo" className="w-full h-auto object-contain max-h-16" />
                </div>
              )}
              {data.agency && (
                <p className="tracking-[0.2em] font-black text-lg uppercase opacity-90" style={{ color: data.theme.primary }}>
                  {data.agency}
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
