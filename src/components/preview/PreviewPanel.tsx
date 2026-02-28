import React from 'react';
import { CoverPage } from './CoverPage';
import { FlightPage } from './FlightPage';
import { HotelPage } from './HotelPage';
import { ItineraryPage } from './ItineraryPage';
import { PackingPage } from './PackingPage';
import { TipsPage } from './TipsPage';

export function PreviewPanel() {
  return (
    <div className="h-full overflow-y-auto bg-gray-200 p-8">
      <div className="max-w-[210mm] mx-auto space-y-4">
        <CoverPage />
        <FlightPage />
        <HotelPage />
        <ItineraryPage />
        <PackingPage />
        <TipsPage />
      </div>
    </div>
  );
}
