import React from 'react';
import { PageWrapper } from './PageWrapper';
import { Edit3 } from 'lucide-react';
import { useBrochure } from '../../context/BrochureContext';

interface NotesPageProps {
    totalNotes?: number;
}

export function NotesPage({ totalNotes }: NotesPageProps) {
    const { data } = useBrochure();

    // 建立 18 條橫線作為筆記區
    const lines = Array.from({ length: 18 }, (_, i) => i);

    return (
        <PageWrapper
            title="旅遊隨筆"
            icon={<Edit3 size={24} />}
        >
            <div className="flex flex-col h-full mt-4">
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: data.theme.primary }} />
                        <h2 className="text-xl font-bold text-gray-800 tracking-wider">Memo / Notes</h2>
                    </div>

                    <div className="flex-1 flex flex-col justify-between pb-4">
                        {lines.map((line) => (
                            <div
                                key={line}
                                className="w-full border-b border-gray-200 border-dashed h-10"
                            />
                        ))}
                    </div>

                    <div className="mt-8 text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] text-center">
                        Capture your memories here
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
}
