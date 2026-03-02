import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Lightbulb, AlertCircle } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import { parseRichText } from '../../lib/textParser';

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

    const currentOrder = data.tips.order || Object.keys(CLASSIC_TIPS_LABELS);

    currentOrder.forEach((key) => {
      const defaultLabel = CLASSIC_TIPS_LABELS[key as keyof typeof CLASSIC_TIPS_LABELS];
      if (!defaultLabel) return;
      const label = data.tips.customLabels?.[key] ?? defaultLabel;

      const content = data.tips[key as keyof typeof CLASSIC_TIPS_LABELS] as string;
      const sections = key === 'destination' ? data.tips.destinationSections : [];

      if (!content && (!sections || sections.length === 0)) return;

      let currentMainItem = { key, label, content: content || '', sections: [] as any[] };

      // 是否使用者勾選強迫換頁
      const forcePageBreak = data.tips.pageBreaks?.[key];

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
            // 如果這個子標題設定了強迫換頁，且當前已有內容，就先把累積的推出去換頁
            pagesArray.push(currentPageItems);
            currentPageItems = [];
            currentMainItem = { key: `${key}-cont-${sIdx}`, label: `${label} (續)`, content: '', sections: [] };
            currentPageItems.push(currentMainItem);
          } else if (sec.pageBreak && currentMainItem.content) {
            // 處理如果這是第一個 section 但上面有預設內容也要換頁的情況
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
                      <p className="text-gray-600 leading-relaxed text-justify whitespace-pre-wrap mb-4 font-medium">
                        {parseRichText(item.content, data.theme.primary)}
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
                              {parseRichText(section.content, data.theme.primary)}
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
