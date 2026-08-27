import React from 'react';
import ReactDOM from 'react-dom';
import { useBrochure } from '../../context/BrochureContext';
import { CoverPage } from './CoverPage';
import { TOCPage } from './TOCPage';
import { FlightPage } from './FlightPage';
import { HotelPage } from './HotelPage';
import { ItineraryPage } from './ItineraryPage';
import { AttractionPage } from './AttractionPage';
import { HotelDetailPage } from './HotelDetailPage';
import { MapPage } from './MapPage';
import { PackingPage } from './PackingPage';
import { TipsPage } from './TipsPage';
import { TipsGridPage } from './TipsGridPage';
import { NotesPage } from './NotesPage';
import { RoomingListPage } from './RoomingListPage';
import { CustomPage } from './CustomPage';
import { BackCoverPage } from './BackCoverPage';
import { PageSideContext } from './PageWrapper';
import type { SectionId } from '../../types';

export function PreviewPanel() {
  const { data } = useBrochure();
  const previewScrollRef = React.useRef<HTMLDivElement>(null);

  // ... (原本的 ALL_SECTION_IDS, currentOrder, visibleSections 邏輯保持不變)
  const ALL_SECTION_IDS: SectionId[] = [
    'flight', 'attraction', 'hotel', 'hotelDetail', 'roomingList', 'map', 'itinerary', 'packing', 'tips', 'gridTips', 'customPage'
  ];

  const currentOrder = React.useMemo(() => {
    const order = data.sectionOrder || [];
    const missing = ALL_SECTION_IDS.filter(id => !order.includes(id));
    return [...order, ...missing].filter(id => ALL_SECTION_IDS.includes(id as SectionId));
  }, [data.sectionOrder]);

  const SECTION_LABELS: Record<string, string> = {
    cover: '封面',
    toc: '目錄',
    flight: '航班',
    attraction: '景點',
    hotel: '住宿',
    hotelDetail: '細節',
    roomingList: '分房',
    map: '地圖',
    itinerary: '行程',
    packing: '攜帶',
    tips: '注意',
    gridTips: '提醒',
    customPage: '自訂',
  };

  const renderSection = (sectionId: SectionId, pageIndex: number) => {
    const side = pageIndex % 2 === 0 ? 'right' : 'left'; // 0=Page1(Right), 1=Page2(Left)
    
    return (
      <PageSideContext.Provider value={side} key={sectionId}>
        {(() => {
          switch (sectionId) {
            case 'flight': return <FlightPage />;
            case 'attraction': return <AttractionPage />;
            case 'hotel': return <HotelPage />;
            case 'hotelDetail': return <HotelDetailPage />;
            case 'roomingList': return <RoomingListPage />;
            case 'map': return <MapPage />;
            case 'itinerary': return <ItineraryPage />;
            case 'packing': return <PackingPage />;
            case 'tips': return <TipsPage />;
            case 'gridTips': return <TipsGridPage />;
            case 'customPage': return <CustomPage />;
            default: return null;
          }
        })()}
      </PageSideContext.Provider>
    );
  };

  // 過濾掉使用者在目錄設定中取消勾選的頁面
  const visibleSections = currentOrder.filter(id => data.tocSettings?.[id] !== false);

  const scrollToSection = (id: string) => {
    const targetId = id === 'flight' && (data.flights?.length || 0) > 3 ? 'flight-info' : id;
    const element = previewScrollRef.current?.querySelector<HTMLElement>(`#preview-section-${targetId}`);
    if (element) {
      const container = previewScrollRef.current;
      const top = element.offsetTop - 72;
      container?.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  };

  // 使用 useEffect 確保實體 DOM 渲染後，為每一頁加上正確的奇偶數 class
  // 這樣能解決 React 嵌套導致的「跳動與亂換邊」問題
  React.useEffect(() => {
    const containers = [
      document.querySelector('.preview-container'),
      document.querySelector('#capture-pages-root')
    ];
    
    containers.forEach(container => {
      if (!container) return;
      const pages = container.querySelectorAll('.a5-page:not(.cover-page)');
      pages.forEach((page, index) => {
        // 目錄是實際的第1頁 (奇數)，所以 index 0 = 奇數頁
        const isOdd = index % 2 === 0;
        if (isOdd) {
          page.classList.add('page-odd');
          page.classList.remove('page-even');
        } else {
          page.classList.add('page-even');
          page.classList.remove('page-odd');
        }
      });
    });
  });

  const PageContainer = ({ children, title, id }: { children: React.ReactNode, title: string, id: string }) => (
    <div id={`preview-section-${id}`} className="flex flex-col items-center gap-2 group scroll-mt-20">
      <span className="text-[11px] font-bold text-gray-400/80 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {title}
      </span>
      <div className="relative">
        {children}
      </div>
    </div>
  );

  // 統一計算頁面列表
  // 1=Cover, 2=TOC, 3...=visibleSections, ...=Notes, last=BackCover
  const pages = React.useMemo(() => {
    const list: { id: string; title: string; component: (side: 'left' | 'right') => React.ReactNode }[] = [];

    // 1. Cover Page
    list.push({
      id: 'cover',
      title: 'Cover Page',
      component: (side) => (
        <PageSideContext.Provider value={side}>
          <CoverPage />
        </PageSideContext.Provider>
      ),
    });

    // 2. Table of Contents
    list.push({
      id: 'toc',
      title: 'Table of Contents',
      component: (side) => (
        <PageSideContext.Provider value={side}>
          <TOCPage />
        </PageSideContext.Provider>
      ),
    });

    // 3. Sections
    let sectionPageIndex = 2; // Cover(0), TOC(1)
    visibleSections.forEach((id) => {
      if (id === 'flight') {
        const flightsCount = Array.isArray(data.flights) ? data.flights.length : 0;
        const needsSplit = flightsCount > 3;

        if (needsSplit) {
          list.push({
            id: 'flight-info',
            title: 'Flight Info Page',
            component: (side) => (
              <PageSideContext.Provider value={side}>
                <FlightPage subPage="flights" />
              </PageSideContext.Provider>
            ),
          });
          sectionPageIndex++;

          list.push({
            id: 'flight-meeting',
            title: 'Flight Meeting Page',
            component: (side) => (
              <PageSideContext.Provider value={side}>
                <FlightPage subPage="meeting" />
              </PageSideContext.Provider>
            ),
          });
          sectionPageIndex++;
        } else {
          list.push({
            id: 'flight',
            title: 'Flight Page',
            component: (side) => (
              <PageSideContext.Provider value={side}>
                <FlightPage subPage="all" />
              </PageSideContext.Provider>
            ),
          });
          sectionPageIndex++;
        }
      } else {
        const currentIdx = sectionPageIndex;
        list.push({
          id,
          title: `${id.charAt(0).toUpperCase() + id.slice(1)} Page`,
          component: (side) => renderSection(id as SectionId, currentIdx),
        });
        sectionPageIndex++;
      }
    });

    // 4. Notes Pages
    Array.from({ length: data.notesCount || 0 }).forEach((_, i) => {
      list.push({
        id: `note-${i}`,
        title: `Note Page ${i + 1}`,
        component: (side) => (
          <PageSideContext.Provider value={side}>
            <NotesPage totalNotes={data.notesCount} />
          </PageSideContext.Provider>
        ),
      });
    });

    // 5. Back Cover Page
    list.push({
      id: 'back-cover',
      title: 'Back Cover Page',
      component: (side) => (
        <PageSideContext.Provider value={side}>
          <BackCoverPage />
        </PageSideContext.Provider>
      ),
    });

    return list;
  }, [visibleSections, data.flights, data.notesCount, data.theme, data.fontFamily]);

  return (
    <div className="relative h-full overflow-hidden bg-[#ccd5e0]">
      {/* 頂部快速導覽列 (Sticky Navigation) */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-auto bg-white/90 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-start xl:justify-center py-2 gap-1 px-4 overflow-x-auto no-print">
        <button
          type="button"
          onClick={() => scrollToSection('cover')}
          className="px-3 py-1.5 rounded-lg text-xs font-black text-gray-500 hover:bg-white hover:text-blue-600 transition-all hover:shadow-sm uppercase tracking-widest whitespace-nowrap"
        >
          {SECTION_LABELS.cover}
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('toc')}
          className="px-3 py-1.5 rounded-lg text-xs font-black text-gray-500 hover:bg-white hover:text-blue-600 transition-all hover:shadow-sm uppercase tracking-widest whitespace-nowrap"
        >
          {SECTION_LABELS.toc}
        </button>
        <div className="w-px h-3 bg-gray-200 mx-1" />
        {visibleSections.map((sectionId) => (
          <button
            type="button"
            key={sectionId}
            onClick={() => scrollToSection(sectionId)}
            className="px-3 py-1.5 rounded-lg text-xs font-black transition-all hover:bg-white hover:shadow-sm uppercase tracking-widest whitespace-nowrap"
            style={{
              color: data.theme.primary,
              backgroundColor: 'transparent'
            }}
          >
            {SECTION_LABELS[sectionId] || sectionId}
          </button>
        ))}
      </div>

      {/* 螢幕預覽容器（列印時隱藏） */}
      <div ref={previewScrollRef} className="relative z-0 h-full overflow-y-auto pt-20 p-12 custom-scrollbar no-print">
        <div className="preview-container flex flex-col items-center gap-16 pb-32">
          {pages.map((page, index) => (
            <PageContainer key={page.id} id={page.id} title={page.title}>
              {page.component(index % 2 === 0 ? 'right' : 'left')}
            </PageContainer>
          ))}
        </div>
      </div>

      {/* 列印專用容器（透過 Portal 掛到 body，脫離 w-3/5 容器限制） */}
      {ReactDOM.createPortal(
        <div className="print-only-container">
          {/* A4 封面+封底跨頁列印 (不計入方點，固定左封底右封面) */}
          <div className="a4-landscape-page print-a4-landscape">
            <PageSideContext.Provider value="left"><BackCoverPage /></PageSideContext.Provider>
            <PageSideContext.Provider value="right"><CoverPage /></PageSideContext.Provider>
          </div>

          {/* 正常的頁面列表 */}
          <div id="capture-pages-root">
            {pages.map((page, index) => (
              <React.Fragment key={`print-${page.id}`}>
                {page.component(index % 2 === 0 ? 'right' : 'left')}
              </React.Fragment>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
