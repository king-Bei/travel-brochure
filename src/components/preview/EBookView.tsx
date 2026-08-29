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
import { ChevronLeft, ChevronRight, List as ListIcon, Info, FileText, X, Volume2, VolumeX, QrCode, Code, Share2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const brandLogoUrl = `${import.meta.env.BASE_URL}logo.svg`;
const FLIP_DURATION_MS = 680;

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
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const [isDoublePage, setIsDoublePage] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // 密碼與解鎖狀態
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('book') || urlParams.get('id');
      return sessionStorage.getItem(`fc_unlocked_${id}`) === 'true';
    } catch {
      return false;
    }
  });
  const [viewsIncremented, setViewsIncremented] = useState(false);

  useEffect(() => {
    if ((!data.passwordHash || isUnlocked) && !viewsIncremented && supabase) {
      const urlParams = new URLSearchParams(window.location.search);
      const bookId = data.ebookId || urlParams.get('book') || urlParams.get('id');
      if (bookId) {
        setViewsIncremented(true);
        (async () => {
          try {
            const { data: ebookItem } = await supabase
              .from('ebooks')
              .select('data')
              .eq('id', bookId)
              .single();
            
            if (ebookItem) {
              const currentViews = ebookItem.data?.views || 0;
              await supabase
                .from('ebooks')
                .update({
                  data: {
                    ...ebookItem.data,
                    views: currentViews + 1
                  }
                })
                .eq('id', bookId);
              console.log('[Views] 電子書瀏覽量已增加為:', currentViews + 1);
            }
          } catch (err) {
            console.warn('[Views] 增加瀏覽量失敗:', err);
          }
        })();
      }
    }
  }, [data.passwordHash, isUnlocked, data.ebookId, viewsIncremented]);

  // 音效狀態
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  // Modal 狀態
  const [showQR, setShowQR] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // 偵測是否為行動裝置與螢幕寬度
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      setIsMobileView(isMobile);
      
      // 原版 EBOOK 手機仍使用單頁翻頁，不切瀑布流
      if (isMobile) {
        setLayoutMode('flip');
        setIsDoublePage(false);
      } else {
        setLayoutMode('flip');
        // 寬度夠大則顯示雙頁並排，接近原版書攤
        setIsDoublePage(width > 900);
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
          <div className="h-full w-full flex items-center justify-center bg-[#faf6ef]">
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
        hasContent = ((data.flights?.length || 0) > 0) || !!(data.meetingInfos?.length || data.meetingPoint || data.meetingTime || data.tourLeader);
        if (hasContent) {
          const flightsCount = Array.isArray(data.flights) ? data.flights.length : 0;
          const meetingGroupCount = data.meetingInfos?.length || 0;
          const needsSplit = flightsCount > 3;
          if (meetingGroupCount > 1) {
            Array.from({ length: meetingGroupCount }).forEach((_, groupIndex) => {
              p.push({
                id: `flight-group-${groupIndex + 1}`,
                label: `航班與集合－第 ${groupIndex + 1} 組`,
                component: <FlightPage subPage="all" groupIndex={groupIndex} />
              });
            });
          } else if (needsSplit) {
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
    for (let i = 0; i < pages.length; i += 2) {
      pairs.push({ 
        left: pages[i], 
        right: pages[i + 1] || null, 
        index: pairs.length 
      });
    }

    return pairs;
  }, [pages]);

  const totalDesktopPages = isDoublePage ? doublePages.length : pages.length;

  const [isFlipping, setIsFlipping] = useState<'next' | 'prev' | null>(null);

  // Web Audio 物理翻頁音效合成
  const playFlipSound = () => {
    if (!soundEnabled) return;
    try {
      let ctx = audioCtx;
      if (!ctx) {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioCtx(ctx);
      }
      // 合成 0.12 秒的紙張摩擦噪聲
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / ctx.sampleRate;
        d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.25
          + Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 60) * 0.08;
      }
      const src = ctx.createBufferSource();
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1200;
      f.Q.value = 0.8;
      src.buffer = buf;
      src.connect(f);
      f.connect(ctx.destination);
      src.start();
    } catch (e) {
      console.error(e);
    }
  };

  const nextPage = () => {
    const max = isDoublePage ? doublePages.length - 1 : pages.length - 1;
    if (currentPage < max && !isFlipping) {
      playFlipSound();
      setIsFlipping('next');
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsFlipping(null);
        containerRef.current?.scrollTo({ left: (currentPage + 1) * window.innerWidth, behavior: 'auto' });
      }, FLIP_DURATION_MS);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current ?? 0;
    const delta = endX - touchStartXRef.current;
    const verticalDelta = Math.abs(endY - (touchStartYRef.current ?? endY));
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    if (layoutMode !== 'flip' || Math.abs(delta) < 42 || Math.abs(delta) < verticalDelta * 1.2) return;
    if (delta < 0) nextPage();
    else prevPage();
  };

  const prevPage = () => {
    if (currentPage > 0 && !isFlipping) {
      playFlipSound();
      setIsFlipping('prev');
      setTimeout(() => {
        setCurrentPage(prev => prev - 1);
        setIsFlipping(null);
        containerRef.current?.scrollTo({ left: (currentPage - 1) * window.innerWidth, behavior: 'auto' });
      }, FLIP_DURATION_MS);
    }
  };

  useEffect(() => {
    if (!isMobileView || layoutMode !== 'flip') return;

    const handleWindowTouchStart = (e: TouchEvent) => {
      if (showTOC || showQR || showEmbed) return;
      touchStartXRef.current = e.touches[0]?.clientX ?? null;
      touchStartYRef.current = e.touches[0]?.clientY ?? null;
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      if (showTOC || showQR || showEmbed || touchStartXRef.current === null) return;
      const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
      const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current ?? 0;
      const delta = endX - touchStartXRef.current;
      const verticalDelta = Math.abs(endY - (touchStartYRef.current ?? endY));
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      if (Math.abs(delta) < 42 || Math.abs(delta) < verticalDelta * 1.2) return;
      if (delta < 0) nextPage();
      else prevPage();
    };

    window.addEventListener('touchstart', handleWindowTouchStart, { passive: true });
    window.addEventListener('touchend', handleWindowTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleWindowTouchStart);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [isMobileView, layoutMode, showTOC, showQR, showEmbed, currentPage, isFlipping, pages.length, doublePages.length]);

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
    playFlipSound();
    setCurrentPage(index);
    setShowTOC(false);
    if (layoutMode === 'scroll') {
      pageRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
    } else {
      containerRef.current?.scrollTo({ left: index * window.innerWidth, behavior: 'auto' });
    }
  };

  // 密碼解鎖邏輯
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.passwordHash) {
      setIsUnlocked(true);
      return;
    }

    const sha256 = async (text: string) => {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const hash = await sha256(passwordInput);
    if (hash === data.passwordHash) {
      setIsUnlocked(true);
      setPasswordError(false);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('book') || urlParams.get('id');
        sessionStorage.setItem(`fc_unlocked_${id}`, 'true');
      } catch (err) {
        console.error(err);
      }
    } else {
      setPasswordError(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 判斷上架期間與過期
  const isExpired = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === '1';
    if (isPreview) return false; // 預覽模式不受限
    
    if (!data.isPublished) return true;
    if (data.publishStartAt) {
      const publishStart = new Date(data.publishStartAt).getTime();
      const today = new Date().setHours(0, 0, 0, 0);
      if (publishStart > today) return true;
    }
    if (data.expiresAt) {
      const expiry = new Date(data.expiresAt).getTime();
      const today = new Date().setHours(0, 0, 0, 0);
      return expiry < today;
    }
    return false;
  }, [data.isPublished, data.publishStartAt, data.expiresAt]);

  if (isExpired) {
    return (
      <div className="fixed inset-0 bg-[#0e0c08] flex flex-col items-center justify-center text-center p-6 text-white font-serif z-[99999]">
        <div className="text-5xl mb-5 animate-bounce">🔒</div>
        <h1 className="text-2xl font-bold text-[#c8a96e] mb-2 tracking-wide">手冊尚未開放或已下架</h1>
        <p className="text-white/40 text-xs max-w-sm leading-relaxed">此書籍目前尚未公開上架，或已超過設定的有效期限。請聯絡您的旅行專員。</p>
      </div>
    );
  }

  if (data.passwordHash && !isUnlocked) {
    return (
      <div className="fixed inset-0 bg-[#0e0c08] flex flex-col items-center justify-center p-6 text-white font-serif z-[99999]">
        <form onSubmit={handleUnlock} className="bg-[#1c1810] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center relative overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c8a96e]/40 to-transparent" />
          <h2 className="text-2xl font-bold text-[#c8a96e] mb-2 tracking-wide">專屬旅遊手冊</h2>
          <p className="text-[10px] tracking-[0.22em] text-white/30 uppercase font-black mb-8">Password Protected</p>
          <div className="text-left mb-8">
            <label className="block text-[11px] text-white/50 mb-2 font-medium">請輸入閱讀密碼</label>
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-[#c8a96e]/50 focus:ring-2 focus:ring-[#c8a96e]/10 transition-all font-mono text-center text-lg"
              placeholder="••••••"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-400 text-[10px] mt-2.5 text-center font-mono">⚠ 密碼錯誤，請重新輸入</p>
            )}
          </div>
          <button type="submit" className="w-full py-4 bg-gradient-to-r from-[#c8a96e] to-[#a07840] text-[#1a1208] rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all text-xs tracking-widest uppercase">
            確認解鎖
          </button>
        </form>
      </div>
    );
  }

  const ebookUrl = window.location.href;
  const embedCode = `<iframe src="${ebookUrl}&embed=1" width="860" height="640" frameborder="0" allowfullscreen style="border-radius:12px"></iframe>`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ebookUrl)}`;

  return (
    <div className="fixed inset-0 bg-[#12100a] flex flex-col overflow-hidden select-none perspective-2000">
      {/* 頂部工具列 */}
      <div 
        onClick={(event) => event.stopPropagation()}
        className={`relative z-[70] h-14 shrink-0 pointer-events-auto bg-[#1e1a10]/90 backdrop-blur-xl flex items-center justify-between px-3 sm:px-6 border-b border-[#c8a96e]/10 transition-all duration-500 ${isUIHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
      >
        <div className="flex items-center gap-3">
          <div className="h-9 min-w-9 rounded-xl border border-[#c8a96e]/20 bg-white/[0.04] px-2 flex items-center justify-center shadow-lg">
            <img
              src={brandLogoUrl}
              alt="鑫囍探索旅行"
              className="h-6 max-w-[120px] object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
              }}
            />
            <span className="hidden text-[10px] font-bold text-[#c8a96e] tracking-widest">鑫囍探索</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[#f5f0e8] text-sm font-bold truncate max-w-[140px] md:max-w-md">{data.title || '未命名手冊'}</h1>
            <p className="text-[#c8a96e]/45 text-[9px] font-black tracking-[0.2em] uppercase">Digital Brochure</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {/* 切換模式按鈕 */}
            <div className="flex items-center bg-white/5 rounded-xl p-1 mr-1 md:mr-2 border border-white/10">
              <button 
                onClick={() => setLayoutMode('flip')}
                className={`px-2 md:px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${layoutMode === 'flip' ? 'bg-[#c8a96e]/20 text-[#c8a96e]' : 'text-white/40 hover:text-white/60'}`}
              >
                翻頁
              </button>
              <button 
                onClick={() => setLayoutMode('scroll')}
                className={`px-2 md:px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${layoutMode === 'scroll' ? 'bg-[#c8a96e]/20 text-[#c8a96e]' : 'text-white/40 hover:text-white/60'}`}
              >
                瀑布流
              </button>
            </div>

           <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 mr-1">
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
           
           {/* 音效開關 */}
           <button 
             onClick={() => setSoundEnabled(!soundEnabled)}
             className={`hidden sm:flex p-2 rounded-xl transition-all ${soundEnabled ? 'text-[#c8a96e] hover:bg-white/10' : 'text-white/30 hover:text-white hover:bg-white/10'}`}
             title="翻頁音效"
           >
             {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
           </button>

           {/* QR Code */}
           <button 
             onClick={() => setShowQR(true)}
             className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
             title="QR Code"
           >
             <QrCode size={20} />
           </button>

           {/* 嵌入碼 */}
           <button 
             onClick={() => setShowEmbed(true)}
             className="hidden sm:flex p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
             title="嵌入網頁"
           >
             <Code size={20} />
           </button>

           <div className="w-[1px] h-6 bg-white/10 mx-1" />

           <button 
             onClick={() => setShowTOC(!showTOC)}
             className={`p-2 rounded-xl transition-all ${showTOC ? 'bg-[#c8a96e] text-[#1a1208] shadow-lg shadow-black/30' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
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
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative z-0 flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-[radial-gradient(ellipse_at_center,#1e1a10_0%,#12100a_70%)] cursor-pointer"
          style={{ scrollBehavior: isFlipping ? 'auto' : 'smooth' }}
        >
          {isDoublePage ? (
            doublePages.map((pair, index) => {
              const isActive = currentPage === index;
              const leftFlipClass = isFlipping === 'prev' && isActive ? 'animate-page-prev' : '';
              const rightFlipClass = isFlipping === 'next' && isActive ? 'animate-page-next' : '';

              return (
                <div 
                    key={`double-${index}`}
                    className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-2 md:p-4"
                >
                    <div
                      className="ebook-book-wrap relative flex items-center justify-center transition-all duration-700"
                      style={{
                        height: 'min(calc(100dvh - 10.5rem), 67vw)',
                        aspectRatio: '1.414 / 1',
                        maxWidth: '95vw',
                        transform: `scale(${zoom})`,
                      }}
                    >
                        
                        {/* 左頁 */}
                        <div className={`ebook-page ebook-page-left relative w-1/2 h-full bg-[#faf6ef] shadow-[-4px_0_20px_rgba(0,0,0,0.27)] rounded-l-md overflow-hidden ${leftFlipClass}`}>
                            {pair.left ? (
                              <div className="h-full w-full overflow-hidden preview-content bg-[#faf6ef]">
                                  {pair.left.component}
                              </div>
                            ) : (
                              <div className="h-full w-full bg-[#faf6ef] flex items-center justify-center opacity-10">
                                <FileText size={100} />
                              </div>
                            )}
                            <div className="page-curl left-curl" />
                            <div className="absolute top-0 bottom-0 right-0 w-10 bg-gradient-to-r from-transparent to-black/10 pointer-events-none" />
                        </div>

                        {/* 右頁 */}
                        <div className={`ebook-page ebook-page-right relative w-1/2 h-full bg-[#faf6ef] shadow-[4px_0_20px_rgba(0,0,0,0.27)] rounded-r-md overflow-hidden ${rightFlipClass}`}>
                            {pair.right ? (
                              <div className="h-full w-full overflow-hidden preview-content bg-[#faf6ef]">
                                  {pair.right.component}
                              </div>
                            ) : (
                              <div className="h-full w-full bg-[#faf6ef] flex items-center justify-center opacity-10">
                                <FileText size={100} />
                              </div>
                            )}
                            <div className="page-curl right-curl" />
                            <div className="absolute top-0 bottom-0 left-0 w-10 bg-gradient-to-l from-transparent to-black/10 pointer-events-none" />
                        </div>

                        {/* 中間書脊 */}
                        <div className="ebook-spine absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-2 z-30 shadow-[0_2px_20px_rgba(0,0,0,0.45)]" />
                    </div>
                </div>
              );
            })
          ) : (
            pages.map((page, index) => {
              const isActive = currentPage === index;
              const flippingClass = isFlipping === 'next' && isActive ? 'animate-page-next' : (isFlipping === 'prev' && isActive ? 'animate-page-prev' : '');

              return (
                <div 
                    key={`${page.id}-${index}`}
                    className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-2 sm:p-3 md:p-4"
                >
                    <div 
                      className={`ebook-book-wrap single-page relative preserve-3d transition-all duration-700 ${flippingClass}`}
                      style={{
                        height: 'min(calc(100dvh - 10.5rem), 124vw)',
                        aspectRatio: '1 / 1.414',
                        maxWidth: '88vw',
                        transform: `scale(${zoom})`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ebook-page ebook-page-right absolute inset-0 bg-[#faf6ef] shadow-[0_18px_44px_rgba(0,0,0,0.45)] rounded-lg overflow-hidden backface-hidden">
                            <div className="absolute inset-0 pointer-events-none z-20">
                                <div className="absolute top-0 bottom-0 left-0 w-10 bg-gradient-to-r from-black/16 to-transparent" />
                                <div className="absolute inset-0 shadow-[inset_0_0_70px_rgba(0,0,0,0.04)]" />
                            </div>
                            <div className="h-full w-full overflow-hidden preview-content bg-[#faf6ef]">
                                 <div className="scale-[1.0] origin-top">
                                    {page.component}
                                 </div>
                            </div>
                            <div className="page-curl right-curl" />
                        </div>
                        <div className="absolute inset-0 bg-[#efe6d8] rounded-lg backface-hidden rotate-y-180 z-0 flex items-center justify-center">
                            <div className="w-1/2 h-[2px] bg-[#d8c7ac]" />
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
          className="flex-1 min-h-0 overflow-y-auto bg-[#080806] cursor-pointer space-y-4 py-8 pb-32"
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
      <div className={`relative z-[70] h-20 shrink-0 bg-[#1e1a10]/90 backdrop-blur-xl flex flex-col items-center justify-center px-6 border-t border-[#c8a96e]/10 space-y-2 transition-all duration-500 ${isUIHidden ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'}`}>
        <div className="flex items-center gap-10 md:gap-16 text-white/80">
          <button 
            onClick={prevPage}
            disabled={currentPage === 0 || !!isFlipping}
            className="p-3 hover:bg-white/10 rounded-full transition-all disabled:opacity-10 active:scale-90"
          >
            <ChevronLeft size={28} />
          </button>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-black font-mono tracking-widest text-[#c8a96e]">
              PAGE {String(currentPage + 1).padStart(2, '0')} <span className="text-white/20 mx-2">/</span> {String(totalDesktopPages).padStart(2, '0')}
            </span>
            {isMobileView && (
              <span className="text-[9px] font-mono tracking-widest text-white/25 uppercase">Swipe to turn</span>
            )}
            <div className="w-40 sm:w-60 h-1 bg-white/10 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-[#8a5b24] to-[#c8a96e] transition-all duration-500" 
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
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-[#1e1a10] shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[60] border-l border-[#c8a96e]/10 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-[#c8a96e]/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <ListIcon size={18} className="text-[#c8a96e]" />
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
                  ? 'bg-[#c8a96e] text-[#1a1208] shadow-xl shadow-black/30 translate-x-1' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white active:scale-95'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono leading-none ${currentPage === index ? 'text-[#1a1208]/60' : 'text-white/20'}`}>
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

      {/* QR Code 彈窗 */}
      {showQR && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1c1810] border border-white/10 p-8 rounded-[2.5rem] text-center max-w-xs w-full relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-[#c8a96e] font-bold text-lg mb-2">行動端閱讀</h3>
            <p className="text-[10px] text-white/40 mb-6 uppercase tracking-wider font-mono">Scan to Read on Mobile</p>
            <div className="w-48 h-48 bg-white p-4 rounded-3xl mx-auto shadow-2xl flex items-center justify-center">
              <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
            </div>
            <p className="text-[10px] text-white/30 mt-6 leading-relaxed">使用手機相機掃描上方 QR 碼，即可隨時在手機上流暢翻閱電子書。</p>
          </div>
        </div>
      )}

      {/* 嵌入碼彈窗 */}
      {showEmbed && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1c1810] border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setShowEmbed(false)} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-[#c8a96e] font-bold text-lg mb-2 text-center">嵌入網頁代碼</h3>
            <p className="text-[10px] text-white/40 mb-6 text-center uppercase tracking-wider font-mono">Iframe Embed Code</p>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 font-mono text-[10px] text-white/60 break-all select-all leading-normal">
              {embedCode}
            </div>

            <button 
              onClick={() => {
                navigator.clipboard.writeText(embedCode);
                alert('嵌入碼已複製到剪貼簿！');
              }}
              className="mt-6 w-full py-3.5 bg-gradient-to-r from-[#c8a96e] to-[#a07840] text-[#1a1208] rounded-xl font-bold hover:brightness-110 transition-all text-xs tracking-wider"
            >
              複製嵌入代碼
            </button>
          </div>
        </div>
      )}

      {/* 複製成功提示 */}
      {copiedLink && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-5 py-3 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300 z-[9999]">
          <CheckCircle2 size={14} />
          電子書網址複製成功！
        </div>
      )}

      <style>{`
        .perspective-2000 { perspective: 2000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .ebook-book-wrap::after {
          content: '';
          position: absolute;
          left: 6%;
          right: 6%;
          bottom: -22px;
          height: 34px;
          background: radial-gradient(ellipse at center, rgba(0,0,0,.58), transparent 70%);
          filter: blur(12px);
          pointer-events: none;
          z-index: -1;
        }
        .ebook-spine {
          background: linear-gradient(90deg, #2a1600, #6b3010, #8b4513, #6b3010, #2a1600);
        }
        .ebook-page img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          background: #faf6ef;
        }
        .ebook-page-left {
          border-radius: 5px 0 0 5px;
        }
        .ebook-page-right {
          border-radius: 0 5px 5px 0;
        }
        .single-page .ebook-page-right {
          border-radius: 8px;
        }
        .page-curl {
          position: absolute;
          bottom: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-color: transparent;
          z-index: 25;
          opacity: .8;
          filter: drop-shadow(-2px -2px 4px rgba(0,0,0,.16));
          transition: all .25s ease;
          pointer-events: none;
        }
        .right-curl {
          right: 0;
          border-width: 0 0 22px 22px;
          border-bottom-color: #e8e0d0;
          border-left-color: #e8e0d0;
        }
        .left-curl {
          left: 0;
          border-width: 0 22px 22px 0;
          border-bottom-color: #e8e0d0;
          border-right-color: #e8e0d0;
        }
        .ebook-page:hover .right-curl {
          border-width: 0 0 32px 32px;
        }
        .ebook-page:hover .left-curl {
          border-width: 0 32px 32px 0;
        }

        .ebook-book-wrap {
          perspective: 1800px;
          transform-style: preserve-3d;
        }

        .ebook-page,
        .ebook-book-wrap.single-page {
          transform-style: preserve-3d;
          will-change: transform, filter, box-shadow;
        }

        .ebook-page::after,
        .ebook-book-wrap.single-page::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 35;
          pointer-events: none;
          opacity: 0;
          background:
            linear-gradient(90deg, rgba(255,255,255,.18), rgba(255,255,255,0) 30%),
            linear-gradient(270deg, rgba(0,0,0,.34), rgba(0,0,0,0) 54%);
        }
        
        @keyframes page-next {
          0% {
            transform: rotateY(0deg) translateZ(0) scaleX(1);
            filter: brightness(1);
            box-shadow: 4px 0 20px rgba(0,0,0,.27);
          }
          34% {
            transform: rotateY(-58deg) translateZ(18px) scaleX(.985);
            filter: brightness(.94);
            box-shadow: -10px 12px 34px rgba(0,0,0,.38);
          }
          68% {
            transform: rotateY(-126deg) translateZ(34px) scaleX(.965);
            filter: brightness(.74);
            box-shadow: -34px 18px 56px rgba(0,0,0,.56);
          }
          100% {
            transform: rotateY(-178deg) translateZ(10px) scaleX(.98);
            filter: brightness(.62);
            box-shadow: -42px 20px 62px rgba(0,0,0,.58);
          }
        }
        
        @keyframes page-prev {
          0% {
            transform: rotateY(0deg) translateZ(0) scaleX(1);
            filter: brightness(1);
            box-shadow: -4px 0 20px rgba(0,0,0,.27);
          }
          34% {
            transform: rotateY(58deg) translateZ(18px) scaleX(.985);
            filter: brightness(.94);
            box-shadow: 10px 12px 34px rgba(0,0,0,.38);
          }
          68% {
            transform: rotateY(126deg) translateZ(34px) scaleX(.965);
            filter: brightness(.74);
            box-shadow: 34px 18px 56px rgba(0,0,0,.56);
          }
          100% {
            transform: rotateY(178deg) translateZ(10px) scaleX(.98);
            filter: brightness(.62);
            box-shadow: 42px 20px 62px rgba(0,0,0,.58);
          }
        }

        @keyframes page-shade-next {
          0% { opacity: 0; transform: translateX(0); }
          34% { opacity: .28; transform: translateX(-2%); }
          68% { opacity: .62; transform: translateX(-4%); }
          100% { opacity: .42; transform: translateX(-6%); }
        }

        @keyframes page-shade-prev {
          0% { opacity: 0; transform: translateX(0) scaleX(-1); }
          34% { opacity: .28; transform: translateX(2%) scaleX(-1); }
          68% { opacity: .62; transform: translateX(4%) scaleX(-1); }
          100% { opacity: .42; transform: translateX(6%) scaleX(-1); }
        }

        .animate-page-next {
          animation: page-next ${FLIP_DURATION_MS}ms cubic-bezier(.24,.72,.18,1) forwards;
          transform-origin: left center;
          z-index: 45;
        }

        .animate-page-prev {
          animation: page-prev ${FLIP_DURATION_MS}ms cubic-bezier(.24,.72,.18,1) forwards;
          transform-origin: right center;
          z-index: 45;
        }

        .animate-page-next::after {
          animation: page-shade-next ${FLIP_DURATION_MS}ms cubic-bezier(.24,.72,.18,1) forwards;
        }

        .animate-page-prev::after {
          animation: page-shade-prev ${FLIP_DURATION_MS}ms cubic-bezier(.24,.72,.18,1) forwards;
        }

        @media (max-width: 767px) {
          .ebook-book-wrap.single-page {
            max-width: min(88vw, calc(100vh * .62));
          }
          .ebook-page-left,
          .ebook-spine {
            display: none !important;
          }
          .ebook-page-right {
            border-radius: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
