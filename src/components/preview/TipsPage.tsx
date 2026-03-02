import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Lightbulb, AlertCircle } from 'lucide-react';
import { PageWrapper } from './PageWrapper';

// 預設 SVG 圖示對應表 (如果使用者沒有自行上傳)
const defaultIcons: Record<string, string> = {
  clothes: '👕',
  items: '🎒',
  weather: '☀️',
  time: '⏰',
  power: '🔌',
  money: '💵',
  customs: '🛂',
  comms: '📱',
  bag: '🧳',
};

const CLASSIC_TIPS_LABELS = {
  airport: '機 場 集 合 與 行 李 準 備 篇',
  security: '安 檢 規 定',
  immigration: '出 境 流 程',
  luggage: '托 運 行 李 相 關 規 定',
  destination: '目 的 地 旅 遊 注 意 事 項',
};

export function TipsPage() {
  const { data } = useBrochure();

  // 將資料分頁
  const pages = React.useMemo(() => {
    const pagesArray: any[][] = [];
    let currentPageItems: any[] = [];
    let currentPageChars = 0;
    const MAX_CHARS_PER_PAGE = 1000;

    const estimateChars = (text: string) => {
      if (!text) return 0;
      const newlines = (text.match(/\n/g) || []).length;
      return text.length + newlines * 50;
    };

    Object.entries(CLASSIC_TIPS_LABELS).forEach(([key, label]) => {
      const content = data.tips[key as keyof typeof CLASSIC_TIPS_LABELS] as string;
      const sections = key === 'destination' ? data.tips.destinationSections : [];

      if (!content && (!sections || sections.length === 0)) return;

      let currentMainItem = { key, label, content: content || '', sections: [] as any[] };
      let itemChars = estimateChars(content) + 120; // +120 for header overhead

      // 如果當前頁面放不下這段主內容，且當前頁面不是空的，就換新頁
      if (currentPageChars + itemChars > MAX_CHARS_PER_PAGE && currentPageItems.length > 0) {
        pagesArray.push(currentPageItems);
        currentPageItems = [];
        currentPageChars = 0;
      }

      currentPageItems.push(currentMainItem);
      currentPageChars += itemChars;

      // 處理額外的子段落 (例如 destinationSections)
      if (sections && sections.length > 0) {
        sections.forEach((sec, sIdx) => {
          const secChars = estimateChars(sec.title) + estimateChars(sec.content) + 80;

          if (currentPageChars + secChars > MAX_CHARS_PER_PAGE && currentPageItems.length > 0) {
            // 換頁
            pagesArray.push(currentPageItems);
            currentPageItems = [];
            currentPageChars = 0;

            // 建立一個接續的主項目
            currentMainItem = { key: `${key}-cont-${sIdx}`, label: `${label} (續)`, content: '', sections: [] };
            currentPageItems.push(currentMainItem);
            currentPageChars += 120; // header overhead
          }

          currentMainItem.sections.push(sec);
          currentPageChars += secChars;
        });
      }
    });

    if (currentPageItems.length > 0) {
      pagesArray.push(currentPageItems);
    }

    return pagesArray;
  }, [data.tips]);

  if (pages.length === 0) return null;

  return (
    <>
      {pages.map((pageItems, pageIdx) => (
        <PageWrapper
          key={`tips-page-${pageIdx}`}
          title={pages.length > 1 ? `旅遊注意事項 (${pageIdx + 1}/${pages.length})` : "旅遊注意事項"}
          icon={<AlertCircle size={24} />}
        >
          <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-gray-100 p-8 mt-4">
            <div className="space-y-8">
              {pageItems.map((item) => (
                <div key={item.key} className="flex gap-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${data.theme.primary}15`, color: data.theme.primary }}>
                    <AlertCircle size={24} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2 tracking-widest text-gray-800 border-b border-gray-100 pb-1 inline-block">{item.label}</h3>

                    {item.content && (
                      <p className="text-gray-600 leading-relaxed text-justify whitespace-pre-wrap mb-4 font-medium italic">
                        {item.content}
                      </p>
                    )}

                    {item.sections && item.sections.length > 0 && (
                      <div className="grid grid-cols-1 gap-4">
                        {item.sections.map((section: any, sIdx: number) => (
                          <div key={sIdx} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {section.title}
                            </h4>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                              {section.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PageWrapper>
      ))}
    </>
  );
}
