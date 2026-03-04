import React, { useMemo } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Camera } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import { Attraction } from '../../types';
import { getAttractionPages } from '../../lib/pagination';

export function AttractionPage() {
    const { data } = useBrochure();
    const attractions = data.attractions || [];
    if (attractions.length === 0) return null;

    const renderLayout = (attraction: Attraction, isCompact: boolean = false) => {
        const { images, layout } = attraction;
        const imgCount = images.length;

        if (imgCount === 0) return null;

        // 在一頁兩個景點的模式下，改用 flex-1 min-h-0 讓它自適應填滿剩餘空間，而不是固定鎖死 160px
        const heightClass = isCompact ? "flex-1 min-h-0" : "max-h-[200px] flex-grow";

        if (layout === 'top-1-bottom-2' || (imgCount === 3 && layout !== 'left-1-right-2')) {
            return (
                <div className={`flex flex-col gap-2 min-h-[120px] ${heightClass} mt-3`}>
                    <div className="h-2/3 rounded-xl overflow-hidden relative">
                        <img src={images[0]} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="h-1/3 flex gap-2">
                        {images[1] && <div className="flex-1 rounded-xl overflow-hidden relative"><img src={images[1]} className="w-full h-full object-cover" alt="" /></div>}
                        {images[2] && <div className="flex-1 rounded-xl overflow-hidden relative"><img src={images[2]} className="w-full h-full object-cover" alt="" /></div>}
                    </div>
                </div>
            );
        }

        if (layout === 'left-1-right-2' || imgCount === 3) {
            return (
                <div className={`flex gap-2 min-h-[80px] ${heightClass} mt-3`}>
                    <div className="w-2/3 rounded-xl overflow-hidden relative">
                        <img src={images[0]} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="w-1/3 flex flex-col gap-2">
                        {images[1] && <div className="flex-1 rounded-xl overflow-hidden relative"><img src={images[1]} className="w-full h-full object-cover" alt="" /></div>}
                        {images[2] && <div className="flex-1 rounded-xl overflow-hidden relative"><img src={images[2]} className="w-full h-full object-cover" alt="" /></div>}
                    </div>
                </div>
            );
        }

        if (layout === 'grid-4' || imgCount >= 4) {
            return (
                <div className={`grid grid-cols-2 gap-2 min-h-[80px] ${heightClass} mt-3`}>
                    {images.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="rounded-xl overflow-hidden relative">
                            <img src={img} className="w-full h-full object-cover" alt="" />
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className={`min-h-[80px] ${heightClass} mt-3 rounded-xl overflow-hidden relative`}>
                <img src={images[0]} className="w-full h-full object-cover" alt="" />
            </div>
        );
    };

    // 使用統一的分頁工具
    const attractionPages = useMemo(() => {
        return getAttractionPages(attractions);
    }, [attractions]);

    return (
        <>
            {attractionPages.map((pageAttractions, pageIdx) => (
                <PageWrapper
                    key={pageIdx}
                    title={pageIdx === 0 ? "景點介紹" : ""}
                    icon={pageIdx === 0 ? <Camera size={24} /> : undefined}
                >
                    <div className="flex flex-col h-full py-2 gap-6">
                        {pageAttractions.map((attraction, aIdx) => (
                            <div key={aIdx} className={`flex flex-col flex-1 ${pageAttractions.length > 1 ? 'min-h-0' : 'h-full'}`}>
                                <div className="flex items-center mb-3">
                                    <div
                                        className="w-1 h-5 mr-2 rounded-full"
                                        style={{ backgroundColor: data.theme.primary }}
                                    />
                                    <h2 className={`${pageAttractions.length > 1 ? 'text-base' : 'text-lg'} font-bold text-gray-800 tracking-wide flex-1 flex items-center gap-2`}>
                                        {attraction.title}
                                        {attraction.country && <span className="text-[9px] font-bold text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded uppercase">{attraction.country}</span>}
                                    </h2>
                                </div>

                                <div className="bg-gray-50/50 p-3 rounded-xl flex-1 flex flex-col min-h-0">
                                    <div className={`prose prose-sm max-w-none text-xs text-gray-600 leading-relaxed font-medium ${pageAttractions.length > 1 ? 'line-clamp-3 mb-2' : 'mb-3 flex-grow'}`}>
                                        {attraction.description}
                                    </div>
                                    {renderLayout(attraction, pageAttractions.length > 1)}
                                </div>
                            </div>
                        ))}
                    </div>
                </PageWrapper>
            ))}
        </>
    );
}
