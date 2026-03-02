import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { AlertCircle } from 'lucide-react';
import { PageWrapper } from './PageWrapper';
import { parseRichText } from '../../lib/textParser';
import { getTipsPages } from '../../lib/pagination';

export function TipsPage() {
  const { data } = useBrochure();

  // 使用統一的分頁工具
  const pages = React.useMemo(() => {
    return getTipsPages(data.tips);
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
