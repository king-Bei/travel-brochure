import React, { ReactNode } from 'react';
import { useBrochure } from '../../context/BrochureContext';

interface PageWrapperProps {
    children: ReactNode;
    title?: string;
    icon?: ReactNode;
    hideHeaderFooter?: boolean;
}

export function PageWrapper({ children, title, icon, hideHeaderFooter = false }: PageWrapperProps) {
    const { data } = useBrochure();

    if (hideHeaderFooter) {
        return (
            <div
                className="a4-page p-10 flex flex-col relative"
                style={{ backgroundColor: data.theme.secondary, color: data.theme.text }}
            >
                {children}
            </div>
        );
    }

    const evenHeaderText = data.title || data.agency || '旅遊手冊';
    const oddHeaderText = title ? `${evenHeaderText} - ${title}` : evenHeaderText;

    return (
        <div
            className="a4-page relative overflow-hidden flex flex-col pt-20 pb-20 px-10"
            style={{ backgroundColor: data.theme.secondary, color: data.theme.text }}
        >
            {/* 頁首 (由 CSS nth-of-type 與 ::after 控制) */}
            <div
                className="absolute top-10 left-10 right-10 flex page-header text-sm font-semibold opacity-50"
                style={{ color: data.theme.primary }}
                data-header-odd={oddHeaderText}
                data-header-even={evenHeaderText}
            />

            {/* 頁面標題 */}
            {title && (
                <div className="flex items-center gap-3 mb-8 pb-4 border-b-2" style={{ borderColor: `${data.theme.primary}20` }}>
                    <div className="p-2 rounded-lg bg-white shadow-sm" style={{ color: data.theme.primary }}>
                        {icon}
                    </div>
                    <h2 className="text-3xl font-bold tracking-wider" style={{ color: data.theme.primary }}>
                        {title}
                    </h2>
                </div>
            )}

            {/* 內容區域 */}
            <div className="flex-1 min-h-0 flex flex-col relative w-full">
                {children}
            </div>

            {/* 頁尾置中頁碼 (由 CSS ::after 控制 contents) */}
            <div
                className="absolute bottom-10 left-0 right-0 text-center text-sm font-medium opacity-50 page-footer"
                style={{ color: data.theme.primary }}
            />
        </div>
    );
}
