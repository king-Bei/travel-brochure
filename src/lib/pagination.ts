import { BrochureData, SectionId, Attraction, ItineraryDay } from '../types';

/**
 * 獲取旅遊注意事項 (Tips) 的分頁資料
 * 邏輯對應 TipsPage.tsx
 */
export function getTipsPages(data: BrochureData['tips']): any[][] {
    const CLASSIC_TIPS_LABELS = {
        airport: '機 場 集 合 與 行 李 準 備 篇',
        security: '安 檢 規 定',
        immigration: '出 境 流 程',
        luggage: '托 運 行 李 相 關 規 定',
        destination: '目 的 地 旅 遊 注 意 事 項',
    };

    const pagesArray: any[][] = [];
    let currentPageItems: any[] = [];

    const currentOrder = data.order || Object.keys(CLASSIC_TIPS_LABELS);

    currentOrder.forEach((key) => {
        const defaultLabel = CLASSIC_TIPS_LABELS[key as keyof typeof CLASSIC_TIPS_LABELS];
        if (!defaultLabel) return;
        const label = data.customLabels?.[key] ?? defaultLabel;

        const content = data[key as keyof typeof CLASSIC_TIPS_LABELS] as string;
        const sections = key === 'destination' ? data.destinationSections : [];

        if (!content && (!sections || sections.length === 0)) return;

        let currentMainItem = { key, label, content: content || '', sections: [] as any[] };

        // 是否使用者勾選強迫換頁
        const forcePageBreak = data.pageBreaks?.[key];

        // 如果有設定換頁，且當前頁面不是空的，就換新頁
        if (forcePageBreak && currentPageItems.length > 0) {
            pagesArray.push(currentPageItems);
            currentPageItems = [];
        }

        currentPageItems.push(currentMainItem);

        // 處理額外的子段落 (例如 destinationSections)
        if (sections && sections.length > 0) {
            sections.forEach((sec, sIdx) => {
                if (sec.pageBreak && currentMainItem.sections.length > 0) {
                    pagesArray.push(currentPageItems);
                    currentPageItems = [];
                    currentMainItem = { key: `${key}-cont-${sIdx}`, label: `${label} (續)`, content: '', sections: [] };
                    currentPageItems.push(currentMainItem);
                } else if (sec.pageBreak && currentMainItem.content) {
                    pagesArray.push(currentPageItems);
                    currentPageItems = [];
                    currentMainItem = { key: `${key}-cont-${sIdx}`, label: `${label} (續)`, content: '', sections: [] };
                    currentPageItems.push(currentMainItem);
                }
                currentMainItem.sections.push(sec);
            });
        }
    });

    if (currentPageItems.length > 0) {
        pagesArray.push(currentPageItems);
    }

    return pagesArray;
}

/**
 * 計算旅遊注意事項 (Tips) 的總頁數
 */
export function getTipsPageCount(data: BrochureData['tips']): number {
    return getTipsPages(data).length;
}

/**
 * 獲取景點介紹 (Attraction) 的分頁資料
 * 邏輯對應 AttractionPage.tsx
 */
export function getAttractionPages(attractions: Attraction[]): Attraction[][] {
    if (attractions.length === 0) return [];

    const pages: Attraction[][] = [];
    let currentPage: Attraction[] = [];

    attractions.forEach((attraction) => {
        const canFitInCurrent =
            currentPage.length === 1 &&
            currentPage[0].isTwoPerPage &&
            attraction.isTwoPerPage &&
            !currentPage[0].pageBreakAfter;

        if (canFitInCurrent) {
            currentPage.push(attraction);
            pages.push(currentPage);
            currentPage = [];
        } else {
            if (currentPage.length > 0) {
                pages.push(currentPage);
            }
            currentPage = [attraction];
            if (!attraction.isTwoPerPage || attraction.pageBreakAfter) {
                pages.push(currentPage);
                currentPage = [];
            }
        }
    });

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return pages;
}

/**
 * 計算景點介紹 (Attraction) 的總頁數
 * 邏輯對應 AttractionPage.tsx
 */
export function getAttractionPageCount(attractions: Attraction[]): number {
    return getAttractionPages(attractions).length;
}

/**
 * 獲取行程規劃 (Itinerary) 的分頁資料
 * 邏輯對應 ItineraryPage.tsx
 */
export function getItineraryPages(itineraries: ItineraryDay[]): any[][] {
    if (itineraries.length === 0) return [];

    const pages: any[][] = [];
    let currentPage: any[] = [];

    itineraries.forEach((day, index) => {
        if (index > 0 && day.pageBreakBefore && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
        }
        currentPage.push({ ...day, originalIndex: index });
    });

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return pages;
}

/**
 * 計算行程規劃 (Itinerary) 的總頁數
 * 邏輯對應 ItineraryPage.tsx
 */
export function getItineraryPageCount(itineraries: ItineraryDay[]): number {
    return getItineraryPages(itineraries).length;
}

/**
 * 根據 SectionId 獲取精確的頁數
 */
export function getSectionPageCount(sectionId: SectionId, data: BrochureData): number {
    switch (sectionId) {
        case 'flight':
            return 1;
        case 'attraction':
            return getAttractionPageCount(data.attractions || []);
        case 'hotel':
            return 1;
        case 'hotelDetail':
            return data.hotelDetails?.length || 0;
        case 'map':
            return data.mapPage?.src ? 1 : 0;
        case 'itinerary':
            return getItineraryPageCount(data.itineraries || []);
        case 'packing':
            return 1;
        case 'tips':
            return getTipsPageCount(data.tips);
        case 'gridTips':
            return (data.gridTips && data.gridTips.length > 0) ? 1 : 0;
        default:
            return 0;
    }
}
