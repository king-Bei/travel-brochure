import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import type { SectionId } from '../../types';
import { ChevronLeft, ChevronRight, List as ListIcon, Info, FileText, X } from 'lucide-react';

export function EBookView() {
  const { data } = useBrochure();
  const [currentPage, setCurrentPage] = useState(0);
  const [showTOC, setShowTOC] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isUIHidden, setIsUIHidden] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'flip' | 'scroll'>('flip');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isDoublePage, setIsDoublePage] = useState(false);

  // 偵測是否為行動裝置與螢幕寬度
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      
      // 手機預設瀑布流，電腦預設翻頁
      if (isMobile) {
        setLayoutMode('scroll');
        setIsDoublePage(false);
      } else {
        setLayoutMode('flip');
        // 寬度夠大則顯示雙頁並排
        setIsDoublePage(width > 1200);
      }
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    if (data.title) {
      document.title = `${data.title} | 鑫囍探索旅行社`;
    }
  }, [data.title]);

  const ALL_SECTION_IDS: SectionId[] = [
    'flight', 'attraction', 'hotel', 'hotelDetail', 'roomingList', 'map', 'itinerary', 'packing', 'tips', 'gridTips', 'customPage'
  ];

  const currentOrder = useMemo(() => {
    const order = data.sectionOrder || [];
    const missing = ALL_SECTION_IDS.filter(id => !order.includes(id));
    return [...order, ...missing].filter(id => ALL_SECTION_IDS.includes(id as SectionId));
  }, [data.sectionOrder]);

  const visibleSections = currentOrder.filter(id => data.tocSettings?.[id] !== false);

  const SECTION_LABELS: Record<string, string> = {
    cover: '封面',
    toc: '目錄',
    flight: '航班資訊',
    attraction: '景點介紹',
    hotel: '飯店列表',
    hotelDetail: '飯店詳情',
    roomingList: '分房表',
    map: '旅遊地圖',
    itinerary: '每日行程',
    packing: '旅遊物品',
    tips: '旅遊叮嚀',
    gridTips: '貼心提醒',
    customPage: '特別說明',
    backCover: '封底'
  };

  const pages = useMemo(() => {
    // 優先使用發佈時產生的圖片快照 (High-Fidelity Snapshots)
    if (data.isPublished && data.publishedImages && data.publishedImages.length > 0) {
      return data.publishedImages.map((src, index) => ({
        id: `snap-${index}`,
        label: `第 ${index + 1} 頁`,
        component: (
          <div className="h-full w-full flex items-center justify-center bg-white">
            <img 
              src={src} 
              className="max-w-full max-h-full object-contain" 
              alt={`Page ${index + 1}`}
              loading="lazy" 
            />
          </div>
        )
      }));
    }

    const p: { id: string; label: string; component: React.ReactNode }[] = [
      { id: 'cover', label: '封面', component: <CoverPage /> }
    ];

    p.push({ id: 'toc', label: '目錄', component: <TOCPage /> });

    visibleSections.forEach(id => {
      let component: React.ReactNode = null;
      let hasContent = false;

      if (id === 'flight') {
        hasContent = ((data.flights?.length || 0) > 0) || !!(data.meetingPoint || data.meetingTime || data.tourLeader);
        if (hasContent) {
          const flightsCount = Array.isArray(data.flights) ? data.flights.length : 0;
          const needsSplit = flightsCount > 3;
          if (needsSplit) {
            p.push({
              id: 'flight-info',
              label: '航班資訊',
              component: <FlightPage subPage="flights" />
            });
            p.push({
              id: 'flight-meeting',
              label: '集合資訊',
              component: <FlightPage subPage="meeting" />
            });
          } else {
            p.push({
              id: 'flight',
              label: '航班資訊',
              component: <FlightPage subPage="all" />
            });
          }
        }
        return;
      }

      switch (id) {
        case 'attraction': 
          hasContent = ((data.attractions?.length || 0) > 0);
          if (hasContent) component = <AttractionPage />; 
          break;
        case 'hotel': 
          hasContent = ((data.hotels?.length || 0) > 0);
          if (hasContent) component = <HotelPage />; 
          break;
        case 'hotelDetail': 
          hasContent = ((data.hotelDetails?.length || 0) > 0);
          if (hasContent) component = <HotelDetailPage />; 
          break;
        case 'roomingList': 
          hasContent = ((data.roomingList?.length || 0) > 0);
          if (hasContent) component = <RoomingListPage />; 
          break;
        case 'map': 
          hasContent = !!data.mapPage?.src;
          if (hasContent) component = <MapPage />; 
          break;
        case 'itinerary': 
          hasContent = ((data.itineraries?.length || 0) > 0);
          if (hasContent) component = <ItineraryPage />; 
          break;
        case 'packing': 
          hasContent = ((data.packingList?.length || 0) > 0);
          if (hasContent) component = <PackingPage />; 
          break;
        case 'tips': 
          hasContent = !!(data.tips.airport || data.tips.destination);
          if (hasContent) component = <TipsPage />; 
          break;
        case 'gridTips': 
          hasContent = ((data.gridTips?.length || 0) > 0);
          if (hasContent) component = <TipsGridPage />; 
          break;
        case 'customPage': 
          hasContent = ((data.customPages?.length || 0) > 0);
          if (hasContent) component = <CustomPage />; 
          break;
      }
      if (component) p.push({ id, label: SECTION_LABELS[id] || id, component });
    });

    Array.from({ length: data.notesCount || 0 }).forEach((_, i) => {
      p.push({ id: `note-${i}`, label: `備註 ${i + 1}`, component: <NotesPage totalNotes={data.notesCount} /> });
    });

    p.push({ id: 'back-cover', label: '封底', component: <BackCoverPage /> });
    return p;
  }, [data, visibleSections]);

  // 雙頁分組邏輯
  const doublePages = useMemo(() => {
    const pairs: { left: any, right: any, index: number }[] = [];
    // 第一頁 (封面) 永遠單獨顯示在右側 (或者左側空白)
    // 這裡採用專業電子書做法：封面單獨一頁，接著兩兩一組，封底單獨一頁
    pairs.push({ left: null, right: pages[0], index: 0 });
    
    for (let i = 1; i < pages.length - 1; i += 2) {
      pairs.push({ 
        left: pages[i], 
        right: pages[i + 1] || null, 
        index: Math.ceil(i / 2) 
      });
    }
    
    // 如果最後一頁沒被加入 (或是它是封底)
    if (pages.length > 1 && (pages.length % 2 === 0)) {
        pairs.push({ left: pages[pages.length - 1], right: null, index: pairs.length });
    } else if (pages.length > 1 && pages.length % 2 !== 0 && pairs[pairs.length-1].right === null) {
        // Already handled
    }

    return pairs;
  }, [pages]);

  const totalDesktopPages = isDoublePage ? doublePages.length : pages.length;

  const [isFlipping, setIsFlipping] = useState<'next' | 'prev' | null>(null);

  const nextPage = () => {
    const max = isDoublePage ? doublePages.length - 1 : pages.length - 1;
    if (currentPage < max && !isFlipping) {
      setIsFlipping('next');
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsFlipping(null);
        containerRef.current?.scrollTo({ left: (currentPage + 1) * window.innerWidth, behavior: 'auto' });
      }, 600);
    }
  };

  const prevPage = () => {
    if (currentPage > 0 && !isFlipping) {
      setIsFlipping('prev');
      setTimeout(() => {
        setCurrentPage(prev => prev - 1);
        setIsFlipping(null);
        containerRef.current?.scrollTo({ left: (currentPage - 1) * window.innerWidth, behavior: 'auto' });
      }, 600);
    }
  };

  useEffect(() => {
    if (layoutMode === 'scroll') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setCurrentPage(index);
          }
        });
      }, { threshold: 0.5 });

      pageRefs.current.forEach(ref => ref && observer.observe(ref));
      return () => observer.disconnect();
    } else {
      const handleScroll = () => {
        if (containerRef.current && !isFlipping) {
          const index = Math.round(containerRef.current.scrollLeft / window.innerWidth);
          if (index !== currentPage) setCurrentPage(index);
        }
      };

      const container = containerRef.current;
      container?.addEventListener('scroll', handleScroll);
      return () => container?.removeEventListener('scroll', handleScroll);
    }
  }, [currentPage, isFlipping, layoutMode, pages.length]);

  const goToPage = (index: number) => {
    setCurrentPage(index);
    setShowTOC(false);
    if (layoutMode === 'scroll') {
      pageRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
    } else {
      containerRef.current?.scrollTo({ left: index * window.innerWidth, behavior: 'auto' });
    }
  };

  return (
    <div className="fixed inset-0 bg-[#121212] flex flex-col overflow-hidden select-none perspective-2000">
      {/* 頂部工具列 */}
      <div 
        className={`h-14 bg-black/80 backdrop-blur-xl flex items-center justify-between px-6 z-50 border-b border-white/5 transition-all duration-500 ${isUIHidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg"
            style={{ backgroundColor: data.theme.primary }}
          >
            <FileText size={18} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-sm font-bold truncate max-w-[160px] md:max-w-md">{data.title || '未命名手冊'}</h1>
            <p className="text-white/30 text-[9px] font-black tracking-[0.2em] uppercase">Digital Brochure</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {/* 切換模式按鈕 (僅限電腦) */}
            <div className="hidden md:flex items-center bg-white/5 rounded-xl p-1 mr-2 border border-white/10">
              <button 
                onClick={() => setLayoutMode('flip')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${layoutMode === 'flip' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                翻頁視圖
              </button>
              <button 
                onClick={() => setLayoutMode('scroll')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${layoutMode === 'scroll' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                瀑布流
              </button>
            </div>

           <div className="flex items-center bg-white/10 rounded-xl p-1 mr-2">
             <button 
               onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
               className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
               title="縮小"
             >
               <span className="text-lg font-bold">−</span>
             </button>
             <div className="px-2 text-[10px] font-mono text-white/40 min-w-[40px] text-center">
               {Math.round(zoom * 100)}%
             </div>
             <button 
               onClick={() => setZoom(prev => Math.min(2.5, prev + 0.25))}
               className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
               title="放大"
             >
               <span className="text-lg font-bold">+</span>
             </button>
           </div>
           
           <button 
             onClick={() => setShowTOC(!showTOC)}
             className={`p-2 rounded-xl transition-all ${showTOC ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
             title="查看目錄"
           >
             <ListIcon size={20} />
           </button>
        </div>
      </div>

      {/* 電子書本體 */}
      {layoutMode === 'flip' ? (
        <div 
          ref={containerRef}
          onClick={() => setIsUIHidden(!isUIHidden)}
          className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] cursor-pointer"
          style={{ scrollBehavior: isFlipping ? 'auto' : 'smooth' }}
        >
          {isDoublePage ? (
            doublePages.map((pair, index) => {
              const isActive = currentPage === index;
              const flippingClass = isFlipping === 'next' && isActive ? 'animate-flip-out' : (isFlipping === 'prev' && isActive ? 'animate-flip-in' : '');

              return (
                <div 
                    key={`double-${index}`}
                    className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-8 gap-1"
                >
                    <div className="relative flex items-center justify-center w-full max-w-[min(95vw,calc(100vh*1.3))] aspect-[1.414/1] transition-all duration-700" style={{ transform: `scale(${zoom})` }}>
                        
                        {/* 左頁 */}
                        <div className={`relative w-1/2 h-full bg-white shadow-[-10px_30px_60px_-15px_rgba(0,0,0,0.5)] rounded-l-sm overflow-hidden border-r border-gray-100 ${flippingClass}`}>
                            {pair.left ? (
                              <div className="h-full w-full overflow-y-auto preview-content py-2">
                                  {pair.left.component}
                              </div>
                            ) : (
                              <div className="h-full w-full bg-gray-50 flex items-center justify-center opacity-10">
                                <FileText size={100} />
                              </div>
                            )}
                            <div className="absolute top-0 bottom-0 right-0 w-[8%] bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
                        </div>

                        {/* 右頁 */}
                        <div className={`relative w-1/2 h-full bg-white shadow-[10px_30px_60px_-15px_rgba(0,0,0,0.5)] rounded-r-sm overflow-hidden ${flippingClass}`}>
                            {pair.right ? (
                              <div className="h-full w-full overflow-y-auto preview-content py-2">
                                  {pair.right.component}
                              </div>
                            ) : (
                              <div className="h-full w-full bg-gray-50 flex items-center justify-center opacity-10">
                                <FileText size={100} />
                              </div>
                            )}
                            <div className="absolute top-0 bottom-0 left-0 w-[8%] bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
                        </div>

                        {/* 中間書脊 */}
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-black/10 z-30 shadow-[0_0_10px_rgba(0,0,0,0.2)]" />
                    </div>
                </div>
              );
            })
          ) : (
            pages.map((page, index) => {
              const isActive = currentPage === index;
              const flippingClass = isFlipping === 'next' && isActive ? 'animate-flip-out' : (isFlipping === 'prev' && isActive ? 'animate-flip-in' : '');

              return (
                <div 
                    key={`${page.id}-${index}`}
                    className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-2 sm:p-4 md:p-8"
                >
                    <div 
                      className={`relative w-full max-w-[min(95vw,calc(100vh*0.65))] aspect-[1/1.414] preserve-3d transition-all duration-700 ${flippingClass}`}
                      style={{ transform: `scale(${zoom})` }}
                      onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute inset-0 bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden backface-hidden">
                            <div className="absolute inset-0 pointer-events-none z-20">
                                <div className="absolute top-0 bottom-0 left-0 w-[5%] bg-gradient-to-r from-black/20 to-transparent" />
                                <div className="absolute top-0 bottom-0 left-[2%] w-[1px] bg-black/5" />
                                <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.03)]" />
                            </div>
                            <div className="h-full w-full overflow-y-auto preview-content bg-white py-2">
                                 <div className="scale-[1.0] origin-top">
                                    {page.component}
                                 </div>
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-gray-100 rounded-sm backface-hidden rotate-y-180 z-0 flex items-center justify-center">
                            <div className="w-1/2 h-[2px] bg-gray-200" />
                        </div>
                    </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div 
          ref={scrollContainerRef}
          onClick={() => setIsUIHidden(!isUIHidden)}
          className="flex-1 overflow-y-auto bg-[#f8f9fa] cursor-pointer space-y-4 py-8 pb-32"
        >
          {pages.map((page, index) => (
            <div 
              key={`${page.id}-${index}`}
              ref={el => { pageRefs.current[index] = el; }}
              data-index={index}
              className="w-full flex justify-center px-4 md:px-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-[800px] bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                <div className="preview-content p-1">
                  {page.component}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部導覽列 */}
      <div className={`h-20 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center px-6 z-40 border-t border-white/5 space-y-2 transition-all duration-500 ${isUIHidden ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="flex items-center gap-10 md:gap-16 text-white/80">
          <button 
            onClick={prevPage}
            disabled={currentPage === 0 || !!isFlipping}
            className="p-3 hover:bg-white/10 rounded-full transition-all disabled:opacity-10 active:scale-90"
          >
            <ChevronLeft size={28} />
          </button>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-black font-mono tracking-widest text-blue-400">
              PAGE {String(currentPage + 1).padStart(2, '0')} <span className="text-white/20 mx-2">/</span> {String(totalDesktopPages).padStart(2, '0')}
            </span>
            <div className="w-40 sm:w-60 h-1 bg-white/10 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500" 
                 style={{ width: `${((currentPage + 1) / totalDesktopPages) * 100}%` }}
               />
            </div>
          </div>

          <button 
            onClick={nextPage}
            disabled={currentPage === totalDesktopPages - 1 || !!isFlipping}
            className="p-3 hover:bg-white/10 rounded-full transition-all disabled:opacity-10 active:scale-90"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </div>

      {/* 目錄側邊欄 */}
      {showTOC && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-[#161616] shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[60] border-l border-white/5 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <ListIcon size={18} className="text-blue-500" />
              <h2 className="text-white font-black text-sm tracking-widest">CHAPTERS</h2>
            </div>
            <button onClick={() => setShowTOC(false)} className="p-2 text-white/40 hover:text-white transition-colors">
               <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {pages.map((page, index) => (
              <button
                key={`toc-item-${page.id}`}
                onClick={() => {
                  const targetIdx = isDoublePage ? Math.floor(index / 2) : index;
                  goToPage(targetIdx);
                }}
                className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center justify-between group ${
                  (isDoublePage ? Math.floor(currentPage * 2) === index || Math.floor(currentPage * 2) === index - 1 : currentPage === index)
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 translate-x-1' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white active:scale-95'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono leading-none ${currentPage === index ? 'text-blue-200' : 'text-white/20'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-bold">{page.label}</span>
                </div>
                {currentPage === index && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
              </button>
            ))}
          </div>
          <div className="p-6 bg-black/40 text-[9px] text-white/20 flex flex-col gap-2 uppercase tracking-tighter">
             <div className="flex items-center gap-2">
                <Info size={10} />
                <span>Tips: Use swipe gestures to turn pages</span>
             </div>
             <p>© 2024 Travel Brochure Digital Experience</p>
          </div>
        </div>
      )}

      {/* 目錄背景遮罩 */}
      {showTOC && (
        <div 
          className="fixed inset-0 bg-black/80 z-[55] backdrop-blur-md"
          onClick={() => setShowTOC(false)}
        />
      )}

      <style>{`
        .perspective-2000 { perspective: 2000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        
        @keyframes flip-out {
          0% { transform: rotateY(0deg) scale(1); opacity: 1; filter: brightness(1); }
          20% { transform: rotateY(-10deg) scale(0.98); filter: brightness(0.9); }
          100% { transform: rotateY(-180deg) translateX(-120%) scale(0.9); opacity: 0; filter: brightness(0.5); }
        }
        
        @keyframes flip-in {
          0% { transform: rotateY(0deg) scale(1); opacity: 1; filter: brightness(1); }
          20% { transform: rotateY(10deg) scale(0.98); filter: brightness(0.9); }
          100% { transform: rotateY(180deg) translateX(120%) scale(0.9); opacity: 0; filter: brightness(0.5); }
        }

        .animate-flip-out {
          animation: flip-out 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          transform-origin: left center;
        }

        .animate-flip-in {
          animation: flip-in 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          transform-origin: right center;
        }
      `}</style>
    </div>
  );
}
