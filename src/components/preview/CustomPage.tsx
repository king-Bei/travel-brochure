import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { FileText } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import { parseRichText } from '../../lib/textParser';

export function CustomPage() {
    const { data } = useBrochure();

    if (!data.customPages || data.customPages.length === 0) {
        return null;
    }

    return (
        <>
            {data.customPages.map((page, index) => (
                <PageWrapper
                    key={page.id || `custom-page-${index}`}
                    title={page.title || '自訂頁面'}
                    icon={<FileText size={24} />}
                >
                    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-hidden">

                        {/* 根據不同版面呈現圖片 */}
                        <div className="mb-4">
                            {page.layout === 'single' && page.images[0] && (
                                <div className="w-full h-48 rounded-xl overflow-hidden relative shadow-sm">
                                    <img src={page.images[0]} alt="Feature" className="absolute inset-0 w-full h-full object-cover" />
                                </div>
                            )}

                            {page.layout === 'top-1-bottom-2' && page.images.length >= 1 && (
                                <div className="space-y-2">
                                    <div className="w-full h-32 rounded-xl overflow-hidden relative shadow-sm">
                                        <img src={page.images[0]} alt="Feature 1" className="absolute inset-0 w-full h-full object-cover" />
                                    </div>
                                    {page.images.length > 1 && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="h-24 rounded-xl overflow-hidden relative shadow-sm">
                                                <img src={page.images[1]} alt="Feature 2" className="absolute inset-0 w-full h-full object-cover" />
                                            </div>
                                            {page.images[2] && (
                                                <div className="h-24 rounded-xl overflow-hidden relative shadow-sm">
                                                    <img src={page.images[2]} alt="Feature 3" className="absolute inset-0 w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {page.layout === 'grid-4' && page.images.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {page.images.slice(0, 4).map((img, i) => (
                                        <div key={i} className="h-24 rounded-xl overflow-hidden relative shadow-sm">
                                            <img src={img} alt={`Feature ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 自訂內文 */}
                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            <div className="text-[11px] leading-relaxed text-gray-700 whitespace-pre-wrap text-justify">
                                {parseRichText(page.content || '', data.theme.primary)}
                            </div>
                        </div>

                    </div>
                </PageWrapper>
            ))}
        </>
    );
}
