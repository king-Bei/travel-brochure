import React, { useState } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import { parseRichText } from '../../lib/textParser';
import { getTipsPages } from '../../lib/pagination';

export function TipsPage() {
  const { data } = useBrochure();
  
  // 記錄被折疊的項目 key，預設未折疊 (undefined/false = 展開)
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setCollapsedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 使用統一的分頁工具
  const pages = React.useMemo(() => {
    return getTipsPages(data.tips);
  }, [data.tips]);

  const isBulleted = (line: string) => {
    const trimmed = line.trim();
    // 偵測常見的項目符號開頭
    return trimmed.startsWith('•') || 
           trimmed.startsWith('・') || 
           trimmed.startsWith('-') || 
           trimmed.startsWith('＊') || 
           trimmed.startsWith('*');
  };

  if (pages.length === 0) return null;

  return (
    <>
      {pages.map((pageItems, pageIdx) => (
        <PageWrapper
          key={`tips-page-${pageIdx}`}
          sectionId="tips"
          title="旅遊注意事項"
          icon={<AlertCircle size={24} />}
        >
          <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-gray-100 p-4 mt-2">
            <div className="space-y-6">
              {pageItems.map((item) => {
                const isCollapsed = collapsedItems[item.key] === true;
                return (
                  <div key={item.key} className="flex gap-4">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer select-none" 
                      style={{ backgroundColor: `${data.theme.primary}15`, color: data.theme.primary }}
                      onClick={() => toggleItem(item.key)}
                    >
                      <AlertCircle size={16} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* 標題列：點擊可切換折疊狀態 */}
                      <div 
                        className="flex items-center justify-between border-b border-gray-100 pb-1 mb-3 cursor-pointer select-none group/title"
                        onClick={() => toggleItem(item.key)}
                      >
                        <h3 className="text-base font-bold tracking-widest text-gray-800 inline-block group-hover/title:text-blue-600 transition-colors">
                          {item.index}. {item.label}
                        </h3>
                        <div className="text-gray-400 group-hover/title:text-blue-600 transition-colors pr-1">
                          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </div>
                      </div>

                      {/* 展開時才顯示內容與子區塊 */}
                      {!isCollapsed && (
                        <>
                          {item.content && (
                            <div className="space-y-2 mb-4 animate-fadeIn">
                              {item.content.split('\n').filter((line: string) => line.trim() !== '').map((line: string, lIdx: number) => (
                                <p 
                                  key={lIdx} 
                                  className={`dynamic-text text-gray-600 text-justify font-medium leading-relaxed ${isBulleted(line) ? 'hanging-indent' : ''}`}
                                >
                                  {data.tips.showAutoNumbering ? `${lIdx + 1}. ` : ''}
                                  {parseRichText(line, data.theme.primary)}
                                </p>
                              ))}
                            </div>
                          )}

                          {item.sections && item.sections.length > 0 && (
                            <div className="grid grid-cols-1 gap-3 animate-fadeIn">
                              {item.sections.map((section: any, sIdx: number) => (
                                <div key={sIdx} className="bg-gray-50/50 p-3.5 rounded-xl border border-gray-100">
                                  <h4 className="font-bold text-sm text-gray-800 mb-2 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {data.tips.showSectionNumbering ? `${sIdx + 1}. ` : ''}
                                    {section.title}
                                  </h4>
                                  <div className="space-y-1.5">
                                    {section.content?.split('\n').filter((l: string) => l.trim() !== '').map((line: string, lIdx: number) => (
                                      <p 
                                        key={lIdx} 
                                        className={`dynamic-text text-gray-600 text-justify leading-relaxed ${isBulleted(line) ? 'hanging-indent' : ''}`}
                                      >
                                        {parseRichText(line, data.theme.primary)}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </PageWrapper>
      ))}
    </>
  );
}
