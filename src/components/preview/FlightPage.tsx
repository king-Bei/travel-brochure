import React from 'react';
import { useBrochure } from '../../context/BrochureContext';

export function FlightPage() {
  const { data } = useBrochure();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const FlightTable = ({ flight, type }: { flight: any; type: string }) => (
    <div className="mb-6">
      <h3 
        className="text-xl font-bold mb-3 pb-2 border-b-2"
        style={{ 
          color: data.theme.primary,
          borderColor: data.theme.primary 
        }}
      >
        {type}
      </h3>
      <table className="w-full text-sm">
        <tbody>
          <tr>
            <td className="py-2 font-medium w-24">航空公司</td>
            <td>{flight.airline || '-'}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium">班機號碼</td>
            <td>{flight.flightNumber || '-'}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium">起飛</td>
            <td>
              {flight.departurePlace || '-'} {flight.departureTime || '-'}
            </td>
          </tr>
          <tr>
            <td className="py-2 font-medium">到達</td>
            <td>
              {flight.arrivalPlace || '-'} {flight.arrivalTime || '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div 
      className="a4-page"
      style={{ 
        backgroundColor: data.theme.secondary,
        color: data.theme.text 
      }}
    >
      <h2 
        className="text-2xl font-bold mb-6 text-center"
        style={{ color: data.theme.primary }}
      >
        航班資訊
      </h2>
      
      {data.startDate && (
        <p className="text-center mb-6">
          出發日期：{formatDate(data.startDate)}
        </p>
      )}

      <FlightTable flight={data.flights.outbound} type="去程" />
      <FlightTable flight={data.flights.return} type="回程" />

      {data.meetingPoint && (
        <div className="mt-8 p-4 bg-white rounded-lg">
          <h3 
            className="font-bold mb-2"
            style={{ color: data.theme.primary }}
          >
            集合須知
          </h3>
          <p className="text-sm">
            集合地點：{data.meetingPoint}
            {data.meetingTime && `，集合時間：${data.meetingTime}`}
          </p>
          {data.tourLeader && (
            <p className="text-sm mt-2">
              領隊：{data.tourLeader} {data.tourLeaderPhone && `（${data.tourLeaderPhone}）`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
