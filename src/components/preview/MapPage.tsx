import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { PageWrapper } from './PageWrapper';
import { Map } from 'lucide-react';

export function MapPage() {
    const { data } = useBrochure();
    if (!data.mapPage?.src) return null;

    const fitMode = data.mapPage.fit ?? 'cover';

    return (
        <PageWrapper title="旅遊地圖" icon={<Map size={24} />}>
            <div className="flex-1 relative w-full mt-2">
                <div
                    className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-gray-100 p-2 overflow-hidden"
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)' }}
                >
                    <img
                        src={data.mapPage.src}
                        alt="旅遊地圖"
                        className={`w-full h-full rounded-lg ${fitMode === 'contain' ? 'object-contain' : 'object-cover'
                            }`}
                        style={{ gridArea: '1 / 1' }}
                    />
                </div>
            </div>
        </PageWrapper>
    );
}
