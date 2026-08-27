import React, { useMemo, useState } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Camera, ZoomIn, X } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import { Attraction } from '../../types';
import { getAttractionPages } from '../../lib/pagination';
import { parseRichText } from '../../lib/textParser';

export function AttractionPage() {
    const { data } = useBrochure();
    const [previewImage, setPreviewImage] = useState<{ src: string; title?: string } | null>(null);
    const attractions = data.attractions || [];
    if (attractions.length === 0) return null;

    const renderLayout = (attraction: Attraction, isCompact: boolean = false) => {
        const { images, layout, imageScale = 1.0 } = attraction;
        const imgCount = images.length;

        if (imgCount === 0) return null;

        // 計算自訂高度（根據 imageScale 0.8 ~ 1.5 微調）
        const maxHeightPx = Math.round(200 * imageScale);
        const heightClass = isCompact ? "flex-1 min-h-0" : "flex-grow";
        const heightStyle = isCompact ? {} : { maxHeight: `${maxHeightPx}px` };

        const ImageItem = ({ src, className = "" }: { src: string; className?: string }) => (
            <div
                onClick={() => setPreviewImage({ src, title: attraction.title })}
                className={`rounded-xl overflow-hidden relative cursor-pointer group/img ${className}`}
            >
                <img src={src} className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105" alt="" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/90 text-gray-800 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
                        <ZoomIn size={12} /> 放大地圖 / 圖片
                    </span>
                </div>
            </div>
        );

        if (layout === 'top-1-bottom-2' || (imgCount === 3 && layout !== 'left-1-right-2')) {
            return (
                <div className={`flex flex-col gap-2 min-h-[120px] ${heightClass} mt-3`} style={heightStyle}>
                    <ImageItem src={images[0]} className="h-2/3" />
                    <div className="h-1/3 flex gap-2">
                        {images[1] && <ImageItem src={images[1]} className="flex-1" />}
                        {images[2] && <ImageItem src={images[2]} className="flex-1" />}
                    </div>
                </div>
            );
        }

        if (layout === 'left-1-right-2' || imgCount === 3) {
            return (
                <div className={`flex gap-2 min-h-[80px] ${heightClass} mt-3`} style={heightStyle}>
                    <ImageItem src={images[0]} className="w-2/3" />
                    <div className="w-1/3 flex flex-col gap-2">
                        {images[1] && <ImageItem src={images[1]} className="flex-1" />}
                        {images[2] && <ImageItem src={images[2]} className="flex-1" />}
                    </div>
                </div>
            );
        }

        if (layout === 'grid-4' || imgCount >= 4) {
            return (
                <div className={`grid grid-cols-2 gap-2 min-h-[80px] ${heightClass} mt-3`} style={heightStyle}>
                    {images.slice(0, 4).map((img, idx) => (
                        <ImageItem key={idx} src={img} />
                    ))}
                </div>
            );
        }

        return (
            <div className={`min-h-[80px] ${heightClass} mt-3`} style={heightStyle}>
                <ImageItem src={images[0]} className="w-full h-full" />
            </div>
        );
    };

    const renderSideImage = (attraction: Attraction, isCompact: boolean = false) => {
        const { images, imageScale = 1.0 } = attraction;
        if (!images || images.length === 0) return null;

        const baseMinHeight = Math.round(140 * imageScale);
        const heightClass = isCompact ? "flex-1 min-h-0" : "flex-1";
        const heightStyle = isCompact ? {} : { minHeight: `${baseMinHeight}px` };

        const SideImageItem = ({ src, className = "" }: { src: string; className?: string }) => (
            <div
                onClick={() => setPreviewImage({ src, title: attraction.title })}
                className={`rounded-xl overflow-hidden relative cursor-pointer group/img ${className}`}
            >
                <img src={src} className="w-full h-full object-cover absolute inset-0 transition-transform duration-300 group-hover/img:scale-105" alt="" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/90 text-gray-800 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
                        <ZoomIn size={12} /> 放大圖片
                    </span>
                </div>
            </div>
        );

        if (images.length >= 2 && !isCompact) {
            return (
                <div className="flex flex-col gap-2 h-full py-1">
                    <SideImageItem src={images[0]} className="flex-1 min-h-[70px]" />
                    <SideImageItem src={images[1]} className="flex-1 min-h-[70px]" />
                </div>
            );
        }

        return (
            <div className={`w-full ${heightClass}`} style={heightStyle}>
                <SideImageItem src={images[0]} className="w-full h-full" />
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
                    sectionId={pageAttractions[0]?.id || "attraction"}
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
                                    {attraction.layout === 'side-left' || attraction.layout === 'side-right' ? (
                                        <div className="flex gap-4 items-stretch flex-1 min-h-0 py-1">
                                            {attraction.layout === 'side-left' && (
                                                <div className="w-[38%] flex-shrink-0 flex flex-col justify-center min-h-0">
                                                    {renderSideImage(attraction, pageAttractions.length > 1)}
                                                </div>
                                            )}
                                            <div className="flex-1 flex flex-col min-h-0 justify-center">
                                                <div className={`dynamic-text prose prose-sm max-w-none text-gray-600 font-medium whitespace-pre-wrap ${pageAttractions.length > 1 ? 'line-clamp-[7]' : 'flex-grow'}`}>
                                                    {parseRichText(attraction.description, data.theme.primary)}
                                                </div>
                                            </div>
                                            {attraction.layout === 'side-right' && (
                                                <div className="w-[38%] flex-shrink-0 flex flex-col justify-center min-h-0">
                                                    {renderSideImage(attraction, pageAttractions.length > 1)}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className={`dynamic-text prose prose-sm max-w-none text-gray-600 font-medium whitespace-pre-wrap ${pageAttractions.length > 1 ? 'line-clamp-3 mb-2' : 'mb-3 flex-grow'}`}>
                                                {parseRichText(attraction.description, data.theme.primary)}
                                            </div>
                                            {renderLayout(attraction, pageAttractions.length > 1)}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </PageWrapper>
            ))}

            {/* 景點大圖/地圖 Lightbox Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer select-none"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative max-w-5xl max-h-[90vh] bg-white/10 rounded-2xl p-2 border border-white/20 shadow-2xl flex flex-col items-center overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full flex items-center justify-between px-3 py-2 text-white border-b border-white/10 mb-2">
                            <span className="font-bold text-sm truncate">{previewImage.title || '景點地圖與照片'}</span>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1 text-xs"
                            >
                                <X size={18} /> 關閉 (ESC)
                            </button>
                        </div>
                        <div className="overflow-auto flex items-center justify-center max-h-[80vh] w-full p-2">
                            <img
                                src={previewImage.src}
                                alt={previewImage.title || '景點大圖'}
                                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

