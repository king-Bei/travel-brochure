import React, { ReactNode } from 'react';
import { useBrochure } from '../../context/BrochureContext';

interface PageWrapperProps {
    children: ReactNode;
    title?: string;
    icon?: ReactNode;
    hideHeaderFooter?: boolean;
    className?: string;
}

export function PageWrapper({ children, title, icon, hideHeaderFooter = false, className = '' }: PageWrapperProps) {
    const { data } = useBrochure();

    if (hideHeaderFooter) {
        return (
            <div
                className={`a5-page p-6 flex flex-col relative ${className}`}
                style={{ backgroundColor: data.theme.secondary, color: data.theme.text }}
            >
                {children}
            </div>
        );
    }

    const customHeaderText = data.headerText || data.agency || '';
    const headerTitle = title || '';

    // 雙數頁 (實際偶數頁，DOM 為 odd，靠左)：LOGO 企業名稱 - 單元名稱
    const leftAlignedString = customHeaderText
        ? (headerTitle ? `${customHeaderText} - ${headerTitle}` : customHeaderText)
        : (headerTitle || '旅遊手冊');

    // 單數頁 (實際奇數頁，DOM 為 even，靠右)：單元名稱 - 企業名稱 LOGO
    const rightAlignedString = customHeaderText
        ? (headerTitle ? `${headerTitle} - ${customHeaderText}` : customHeaderText)
        : (headerTitle || '旅遊手冊');

    return (
        <div
            className={`a5-page relative overflow-hidden flex flex-col pt-12 pb-12 px-6 ${className}`}
            style={{ backgroundColor: data.theme.secondary, color: data.theme.text }}
        >
            {/* 頁首 (由 CSS nth-of-type flex-direction 控制左右排列) */}
            <div
                className="absolute top-6 left-6 right-6 flex page-header text-xs font-semibold opacity-50 gap-2 items-center"
                style={{ color: data.theme.primary }}
            >
                {/* 如果有客戶 Logo (頁首專屬 Logo) 且使用者希望在頁首顯示，可在此處渲染 */}
                {data.headerLogo && (
                    <img src={data.headerLogo} alt="Header Logo" className="h-4 object-contain" />
                )}
                <div className="flex gap-2">
                    {/* DOM 的奇數(實際偶數頁) 置左 -> 顯示 LOGO 企業名稱 - 單元名稱 */}
                    <span className="hidden [.a5-page:nth-of-type(odd):not(.cover-page)_&]:inline">{leftAlignedString}</span>
                    {/* DOM 的偶數(實際奇數頁) 置右 -> 顯示 單元名稱 - 企業名稱 LOGO */}
                    <span className="hidden [.a5-page:nth-of-type(even)_&]:inline">{rightAlignedString}</span>
                </div>
            </div>

            {/* 頁面標題 */}
            {title && (
                <div className="flex items-center gap-2 mb-6 pb-3 border-b-2" style={{ borderColor: `${data.theme.primary}20` }}>
                    <div className="p-1.5 rounded-lg bg-white shadow-sm scale-90" style={{ color: data.theme.primary }}>
                        {icon}
                    </div>
                    <h2 className="text-2xl font-bold tracking-wider" style={{ color: data.theme.primary }}>
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
                className="absolute bottom-6 left-0 right-0 text-center text-xs font-medium opacity-50 page-footer"
                style={{ color: data.theme.primary }}
            />
        </div>
    );
}
