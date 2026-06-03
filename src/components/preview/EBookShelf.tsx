import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Search, Grid, List, ExternalLink } from 'lucide-react';

const brandLogoUrl = `${import.meta.env.BASE_URL}logo.svg`;

interface BookItem {
  id: string;
  title: string;
  category: string;
  pageCount: number;
  pageUrls: string[];
  coverUrl: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  published: boolean;
  publishAt: string | null;
  unpublishAt: string | null;
}

export function EBookShelf() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'pages'>('newest');
  const [publishFilter, setPublishFilter] = useState<'all' | 'pub' | 'unp'>('pub');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 載入所有書籍
  const loadAllBooks = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ebooks')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const normalizeUrls = (...candidates: any[]) => {
          const toPublicUrl = (value: string) => {
            const trimmed = value.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('http') || trimmed.startsWith('data:')) return trimmed;
            if (!supabase) return trimmed;
            let cleanPath = trimmed.replace(/^\/+/, '');
            cleanPath = cleanPath.replace(/^brochures\//, '');
            cleanPath = cleanPath.replace(/^storage\/v1\/object\/public\/brochures\//, '');
            const { data: { publicUrl } } = supabase.storage.from('brochures').getPublicUrl(cleanPath);
            return publicUrl;
          };

          for (const candidate of candidates) {
            if (!candidate) continue;
            if (Array.isArray(candidate)) return candidate.map(item => typeof item === 'string' ? toPublicUrl(item) : item?.publicUrl || item?.url || item?.src || '').filter(Boolean);
            if (typeof candidate === 'string') {
              try {
                const parsed = JSON.parse(candidate);
                if (Array.isArray(parsed)) return parsed.map(item => typeof item === 'string' ? toPublicUrl(item) : item?.publicUrl || item?.url || item?.src || '').filter(Boolean);
              } catch {
                return [toPublicUrl(candidate)].filter(Boolean);
              }
            }
          }
          return [];
        };

        const listStorageImages = async (id: string) => {
          const dirs = [`ebooks/${id}`, `ebooks/ebooks/${id}`, `brochures/${id}`, id];
          for (const dir of dirs) {
            const { data: files, error } = await supabase!.storage
              .from('brochures')
              .list(dir, { limit: 200, sortBy: { column: 'name', order: 'asc' } });
            if (error || !files?.length) continue;
            const pageFiles = files
              .filter((file: any) => /^page[_-]?\d+/i.test(file.name))
              .map((file: any) => `${dir}/${file.name}`);
            if (pageFiles.length) return normalizeUrls(pageFiles);
          }
          return [];
        };

        const mapped: BookItem[] = await Promise.all(data.map(async b => {
          let d = b.data || {};
          if (typeof d === 'string') {
            try { d = JSON.parse(d); } catch (e) { d = {}; }
          }
          let pageUrls = normalizeUrls(b.images, b.pages, d.publishedImages, d.pages, d.images, d.pageUrls);
          if (pageUrls.length === 0) {
            pageUrls = await listStorageImages(b.id);
          }
          return {
            id: b.id,
            title: b.title || d.title || '未命名',
            category: b.category || d.category || '',
            pageCount: d.pageCount || pageUrls.length,
            pageUrls: pageUrls,
            coverUrl: d.coverUrl || b.cover_url || pageUrls[0] || '',
            createdAt: b.created_at,
            updatedAt: b.updated_at,
            views: d.views || 0,
            published: d.isPublished ?? b.is_published ?? (b.status === '已發佈'),
            publishAt: d.publishStartAt || b.publish_start_at || null,
            unpublishAt: d.expiresAt || b.expires_at || null,
          };
        }));
        setBooks(mapped);
      }
    } catch (err) {
      console.error('載入書架失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllBooks();
  }, []);

  // 動態獲取所有的分類
  const categories = useMemo(() => {
    const cats = books.map(b => b.category).filter(Boolean);
    return [...new Set(cats)];
  }, [books]);

  // 判斷書籍上架狀態
  const getBookStatus = (b: BookItem): 'pub' | 'sched' | 'unp' | 'exp' => {
    if (!b.published) return 'unp';
    const n = Date.now();
    if (b.publishAt && new Date(b.publishAt).getTime() > n) return 'sched';
    if (b.unpublishAt && new Date(b.unpublishAt).getTime() <= n) return 'exp';
    return 'pub';
  };

  const STATUS_LABELS = {
    pub: '已上架',
    sched: '排程中',
    unp: '未上架',
    exp: '已下架'
  };

  // 篩選與排序邏輯
  const filteredBooks = useMemo(() => {
    let result = [...books];

    // 1. 搜尋篩選
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
    }

    // 2. 上架狀態篩選
    if (publishFilter === 'pub') {
      result = result.filter(b => getBookStatus(b) === 'pub');
    } else if (publishFilter === 'unp') {
      result = result.filter(b => getBookStatus(b) !== 'pub');
    }

    // 3. 分類篩選
    if (selectedCategory) {
      result = result.filter(b => b.category === selectedCategory);
    }

    // 4. 排序
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title, 'zh-TW');
      if (sortBy === 'pages') return b.pageCount - a.pageCount;
      return 0;
    });

    return result;
  }, [books, searchQuery, sortBy, publishFilter, selectedCategory]);

  const openBook = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}?book=${id}`;
    window.open(url, '_blank');
  };

  const copyBookLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?book=${id}`;
    navigator.clipboard.writeText(url);
    alert('電子書連結已複製！');
  };

  const publishedCount = useMemo(() => {
    return books.filter(b => getBookStatus(b) === 'pub').length;
  }, [books]);

  return (
    <div className="min-h-screen bg-[#0e0c08] text-[#f5f0e8] font-serif relative overflow-y-auto px-6 py-8 pb-20 select-none">
      
      {/* 背景雜訊 */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='.07'/%3E%3C/svg%3E")`
        }}
      />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto flex items-center justify-between border-b border-white/5 pb-6 mb-10">
        <div className="flex items-center gap-3">
          <img
            src={brandLogoUrl}
            alt="鑫囍探索旅行"
            className="h-11 w-auto max-w-[170px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
            }}
          />
          <span className="hidden text-xl font-bold text-[#c8a96e] tracking-wide">鑫囍探索旅行</span>
        </div>
        <div className="text-right text-[11px] font-mono text-white/30">
          {books.length} 本手冊 · {publishedCount} 本已上架
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <section className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wide">我的<em className="text-[#c8a96e] not-italic ml-2">書架</em></h1>
          <p className="text-[11px] text-white/40 uppercase tracking-widest font-mono">Smart Brochure Collections</p>
        </section>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          
          {/* 搜尋 */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋書名或編號…"
              className="w-full bg-white/5 border border-white/5 focus:border-[#c8a96e]/30 rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#f5f0e8] outline-none font-mono transition-all"
            />
          </div>

          {/* 排序 */}
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white/50 cursor-pointer outline-none hover:text-white transition-all font-mono"
          >
            <option value="newest" className="bg-[#1a1510]">最新上傳</option>
            <option value="oldest" className="bg-[#1a1510]">最早上傳</option>
            <option value="title" className="bg-[#1a1510]">書名排序</option>
            <option value="pages" className="bg-[#1a1510]">頁數排序</option>
          </select>

          {/* 視圖切換 */}
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/5 ml-auto">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'text-[#c8a96e] bg-[#c8a96e]/10' : 'text-white/30 hover:text-white/60'}`}
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'text-[#c8a96e] bg-[#c8a96e]/10' : 'text-white/30 hover:text-white/60'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* 上架狀態篩選 */}
        <div className="flex flex-wrap gap-2 items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider mr-2">上架狀態:</span>
          {[
            { key: 'pub' as const, label: '已上架' },
            { key: 'all' as const, label: '全部' },
            { key: 'unp' as const, label: '未上架 / 排程 / 下架' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setPublishFilter(item.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                publishFilter === item.key
                  ? 'bg-[#c8a96e]/15 text-[#c8a96e] border-[#c8a96e]/30'
                  : 'text-white/40 border-white/5 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 分類按鈕列 */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider mr-2">分類篩選:</span>
            <button 
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                selectedCategory === '' 
                ? 'bg-[#c8a96e]/15 text-[#c8a96e] border-[#c8a96e]/30' 
                : 'text-white/40 border-white/5 hover:text-white hover:bg-white/5'
              }`}
            >
              所有分類
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                  selectedCategory === cat 
                  ? 'bg-[#c8a96e]/15 text-[#c8a96e] border-[#c8a96e]/30' 
                  : 'text-white/40 border-white/5 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* 書籍列表區 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[#1a1510] border border-white/5 rounded-2xl overflow-hidden p-0 animate-pulse">
                <div className="aspect-[3/4] bg-white/5" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.01] border border-white/5 rounded-[2rem]">
            <div className="text-5xl opacity-20 mb-4">📚</div>
            <h3 className="text-white/40 font-bold text-lg">書架目前是空的</h3>
            <p className="text-white/20 text-xs mt-2 font-mono">No matching brochures found</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* 網格視圖 */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredBooks.map(b => {
              const status = getBookStatus(b);
              const colorMap = {
                pub: 'bg-green-600/10 border-green-600/20 text-green-400',
                sched: 'bg-orange-600/10 border-orange-600/20 text-orange-400',
                unp: 'bg-white/5 border-white/10 text-white/40',
                exp: 'bg-red-600/10 border-red-600/20 text-red-400'
              };

              return (
                <div 
                  key={b.id} 
                  onClick={() => status === 'pub' && openBook(b.id)}
                  className="group bg-[#1a1510] border border-white/5 hover:border-[#c8a96e]/30 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#000]/60 cursor-pointer relative"
                >
                  <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-b from-[#2d1a04] to-[#120a02]">
                    {b.coverUrl ? (
                      <img 
                        src={b.coverUrl} 
                        alt={b.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-2xl opacity-25 mb-2">📖</span>
                        <span className="text-xs text-[#c8a96e] opacity-80 leading-relaxed italic">{b.title}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    
                    {/* 頁數角標 */}
                    <div className="absolute top-3 right-3 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-mono text-[#c8a96e]">
                      {b.pageCount} P
                    </div>

                    {/* 上架狀態 */}
                    <div className={`absolute top-3 left-3 border rounded-lg px-2.5 py-1 text-[9px] font-bold ${colorMap[status]}`}>
                      {STATUS_LABELS[status]}
                    </div>

                    {/* 懸浮按鈕區 */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <button 
                        disabled={status !== 'pub'}
                        onClick={() => openBook(b.id)}
                        className="bg-[#1c1810] border border-[#c8a96e]/40 text-[#c8a96e] hover:bg-[#c8a96e] hover:text-[#1a1208] rounded-xl px-4 py-2.5 text-[10px] font-mono font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        閱讀
                      </button>
                      <button 
                        onClick={(e) => copyBookLink(b.id, e)}
                        className="bg-[#1c1810] border border-[#c8a96e]/40 text-[#c8a96e] hover:bg-[#c8a96e] hover:text-[#1a1208] rounded-xl px-4 py-2.5 text-[10px] font-mono font-bold transition-all"
                      >
                        複製
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    {b.category && (
                      <span className="inline-block text-[8px] font-mono text-[#c8a96e]/80 bg-[#c8a96e]/5 border border-[#c8a96e]/20 rounded-full px-2 py-0.5">
                        {b.category}
                      </span>
                    )}
                    <h4 className="text-xs font-bold text-[#f5f0e8] line-clamp-2 leading-relaxed min-h-[2.4rem]">{b.title}</h4>
                    <div className="flex items-center justify-between text-[9px] font-mono text-white/30">
                      <span>{b.views} 次閱讀</span>
                      <span>{new Date(b.createdAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 列表視圖 */
          <div className="bg-[#1a1510] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {filteredBooks.map(b => {
              const status = getBookStatus(b);
              const colorMap = {
                pub: 'bg-green-600/10 border-green-600/20 text-green-400',
                sched: 'bg-orange-600/10 border-orange-600/20 text-orange-400',
                unp: 'bg-white/5 border-white/10 text-white/40',
                exp: 'bg-red-600/10 border-red-600/20 text-red-400'
              };

              return (
                <div 
                  key={b.id} 
                  onClick={() => status === 'pub' && openBook(b.id)}
                  className="flex items-center gap-4 p-4 hover:bg-white/[0.02] cursor-pointer transition-colors group relative"
                >
                  <div className="w-12 h-16 bg-[#2d1a04] rounded-lg overflow-hidden border border-white/5 flex-shrink-0">
                    {b.coverUrl && (
                      <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-xs font-bold text-[#f5f0e8] truncate">{b.title}</h4>
                      {b.category && (
                        <span className="text-[8px] font-mono text-[#c8a96e] bg-[#c8a96e]/5 border border-[#c8a96e]/10 rounded-full px-2 py-0.5">
                          {b.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-mono text-white/30">
                      <span className={`border rounded px-1.5 py-0.5 ${colorMap[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      <span>{b.pageCount} 頁</span>
                      <span>{b.views} 次閱讀</span>
                      <span>建立日期: {new Date(b.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      disabled={status !== 'pub'}
                      onClick={() => openBook(b.id)}
                      className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-[#c8a96e] hover:border-[#c8a96e]/30 transition-colors disabled:opacity-20"
                      title="閱讀"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button 
                      onClick={(e) => copyBookLink(b.id, e)}
                      className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-[#c8a96e] hover:border-[#c8a96e]/30 transition-colors"
                      title="複製連結"
                    >
                      <FileText size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
