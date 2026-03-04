import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Lightbulb } from 'lucide-react';
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

export function TipsGridPage() {
    const { data } = useBrochure();
    const sortedTips = data.gridTips; // 保持 9 宮格順序

    return (
        <PageWrapper title="貼心小叮嚀" icon={<Lightbulb size={24} />}>
            <div className="flex-grow flex flex-col justify-center w-full px-2 py-2">
                <div className="grid grid-cols-3 gap-3 h-full auto-rows-fr">
                    {sortedTips.map((tip) => (
                        <div
                            key={tip.id}
                            className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden flex flex-col relative"
                        >
                            <div
                                className="absolute top-0 left-0 w-20 h-7 rounded-br-3xl flex items-center pl-3 z-10"
                                style={{ backgroundColor: data.theme.primary, color: 'white' }}
                            >
                                <h3 className="font-bold text-xs tracking-widest">{tip.title}</h3>
                            </div>

                            <div className="flex-1 p-3 pt-9 flex flex-col items-center">
                                <div className="h-14 w-14 flex items-center justify-center mb-2">
                                    {tip.image ? (
                                        <img
                                            src={tip.image}
                                            alt={tip.title}
                                            className="w-full h-full object-contain filter drop-shadow hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <div className="text-4xl opacity-80 filter drop-shadow-sm">
                                            {defaultIcons[tip.id] || '💡'}
                                        </div>
                                    )}
                                </div>

                                <div className="w-full flex-1 flex flex-col justify-center">
                                    <p className="text-[9px] leading-relaxed text-gray-700 text-left whitespace-pre-wrap">
                                        {parseRichText(tip.content, data.theme.primary)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageWrapper>
    );
}
