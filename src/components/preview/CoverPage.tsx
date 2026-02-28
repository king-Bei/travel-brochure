import React from 'react';
import { useBrochure } from '../../context/BrochureContext';

export function CoverPage() {
  const { data } = useBrochure();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '____年__月__日';
    const date = new Date(dateStr);
    return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  };

  return (
    <div 
      className="a4-page flex flex-col items-center justify-center text-center"
      style={{ 
        backgroundColor: data.theme.secondary,
        color: data.theme.text 
      }}
    >
      {data.logo && (
        <img src={data.logo} alt="Logo" className="max-h-24 mb-6" />
      )}
      
      {data.agency && (
        <p className="text-lg mb-2">{data.agency}</p>
      )}
      
      <h1 
        className="text-4xl font-bold mb-8"
        style={{ color: data.theme.primary }}
      >
        {data.title || '旅遊手冊'}
      </h1>
      
      <div className="text-xl mb-4">
        <p>出發日期：{formatDate(data.startDate)}</p>
        <p>旅遊天數：{data.duration} 天</p>
      </div>
      
      {data.tourLeader && (
        <div className="mt-8">
          <p className="text-lg">領隊：{data.tourLeader}</p>
          {data.tourLeaderPhone && (
            <p className="text-lg">電話：{data.tourLeaderPhone}</p>
          )}
        </div>
      )}
      
      {data.meetingPoint && (
        <div className="mt-8">
          <p className="text-lg">集合地點：{data.meetingPoint}</p>
          {data.meetingTime && (
            <p className="text-lg">集合時間：{data.meetingTime}</p>
          )}
        </div>
      )}
    </div>
  );
}
