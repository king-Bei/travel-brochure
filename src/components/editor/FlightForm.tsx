import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Plane } from 'lucide-react';

export function FlightForm() {
  const { data, updateData } = useBrochure();

  const updateFlight = (type: 'outbound' | 'return', field: string, value: string) => {
    updateData({
      flights: {
        ...data.flights,
        [type]: {
          ...data.flights[type],
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
        <Plane size={20} />
        航班資訊
      </h3>

      <div className="space-y-6">
        {/* Outbound Flight */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">去程</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">航空公司</label>
                <input
                  type="text"
                  value={data.flights.outbound.airline}
                  onChange={(e) => updateFlight('outbound', 'airline', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="星宇航空"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">班機號碼</label>
                <input
                  type="text"
                  value={data.flights.outbound.flightNumber}
                  onChange={(e) => updateFlight('outbound', 'flightNumber', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="JX725"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">起飛時間</label>
                <input
                  type="time"
                  value={data.flights.outbound.departureTime}
                  onChange={(e) => updateFlight('outbound', 'departureTime', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">起飛地點</label>
                <input
                  type="text"
                  value={data.flights.outbound.departurePlace}
                  onChange={(e) => updateFlight('outbound', 'departurePlace', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="桃園"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">到達時間</label>
                <input
                  type="time"
                  value={data.flights.outbound.arrivalTime}
                  onChange={(e) => updateFlight('outbound', 'arrivalTime', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">到達地點</label>
                <input
                  type="text"
                  value={data.flights.outbound.arrivalPlace}
                  onChange={(e) => updateFlight('outbound', 'arrivalPlace', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="吉隆坡"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Return Flight */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">回程</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">航空公司</label>
                <input
                  type="text"
                  value={data.flights.return.airline}
                  onChange={(e) => updateFlight('return', 'airline', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="星宇航空"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">班機號碼</label>
                <input
                  type="text"
                  value={data.flights.return.flightNumber}
                  onChange={(e) => updateFlight('return', 'flightNumber', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="JX726"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">起飛時間</label>
                <input
                  type="time"
                  value={data.flights.return.departureTime}
                  onChange={(e) => updateFlight('return', 'departureTime', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">起飛地點</label>
                <input
                  type="text"
                  value={data.flights.return.departurePlace}
                  onChange={(e) => updateFlight('return', 'departurePlace', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="吉隆坡"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">到達時間</label>
                <input
                  type="time"
                  value={data.flights.return.arrivalTime}
                  onChange={(e) => updateFlight('return', 'arrivalTime', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">到達地點</label>
                <input
                  type="text"
                  value={data.flights.return.arrivalPlace}
                  onChange={(e) => updateFlight('return', 'arrivalPlace', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="桃園"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
