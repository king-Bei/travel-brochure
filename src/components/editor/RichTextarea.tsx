import React, { useState, useRef, useEffect } from 'react';
import { Bold, Palette, Highlighter, Type } from 'lucide-react';

interface RichTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    themeColor: string;
}

export function RichTextarea({ value, onChange, themeColor, className, ...props }: RichTextareaProps) {
    const [selection, setSelection] = useState<{ start: number; end: number; x: number; y: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSelection = (e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        if (target.selectionStart !== target.selectionEnd) {
            // 取得鼠標位置作為彈出選單座標
            let clientX = 0;
            let clientY = 0;
            if ('clientX' in e) {
                clientX = e.clientX;
                clientY = e.clientY;
            } else {
                const rect = target.getBoundingClientRect();
                clientX = rect.left + rect.width / 2;
                clientY = rect.top + rect.height / 2;
            }
            setSelection({
                start: target.selectionStart,
                end: target.selectionEnd,
                x: clientX,
                y: clientY - 15, // 顯示在游標上方
            });
        } else {
            setSelection(null);
        }
    };

    const applyFormat = (format: 'bold' | 'theme' | 'custom') => {
        if (!selection || !textareaRef.current) return;

        let prefix = '';
        let suffix = '';

        if (format === 'bold') {
            prefix = '**';
            suffix = '**';
        } else if (format === 'theme') {
            prefix = '//';
            suffix = '//';
        } else if (format === 'custom') {
            prefix = '[[';
            suffix = '|red]]'; // 預設紅色，可讓使用者自己改
        }

        const start = selection.start;
        const end = selection.end;

        const newText = value.substring(0, start) + prefix + value.substring(start, end) + suffix + value.substring(end);

        // 使用 native setter 確保 React 觸發更新
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
        )?.set;

        if (nativeInputValueSetter && textareaRef.current) {
            nativeInputValueSetter.call(textareaRef.current, newText);
            const event = new Event('input', { bubbles: true });
            textareaRef.current.dispatchEvent(event);
        }

        setSelection(null);

        // 恢復 focus
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                // 將游標移到剛標記好的文字段落後方、或選取改好的自訂顏色
                if (format === 'custom') {
                    textareaRef.current.setSelectionRange(
                        start + prefix.length + (end - start) + 1,
                        start + prefix.length + (end - start) + 4
                    ); // 選取 'red' 讓使用者方便直接換色
                } else {
                    textareaRef.current.setSelectionRange(end + prefix.length + suffix.length, end + prefix.length + suffix.length);
                }
            }
        }, 0);
    };

    // 避免點擊外部時，還殘留 focus tools
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
                setSelection(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                    onChange(e);
                    setSelection(null);
                }}
                onMouseUp={handleSelection}
                onKeyUp={handleSelection}
                className={className}
                {...props}
            />

            {selection && (
                <div
                    className="fixed z-[100] bg-gray-900/95 backdrop-blur-sm text-white rounded-lg shadow-2xl flex items-center gap-1 p-1 border border-gray-700/50"
                    style={{ left: selection.x, top: selection.y, transform: 'translate(-50%, -100%)' }}
                    onMouseDown={(e) => e.preventDefault()} // 防止失去 focus
                >
                    <div className="px-2 text-[10px] text-gray-400 font-medium whitespace-nowrap flex items-center gap-1">
                        <Type size={12} />
                        強調樣式
                    </div>
                    <div className="w-px h-5 bg-gray-700 mx-1"></div>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
                        className="px-2 py-1.5 hover:bg-gray-800 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="套用 **粗體**"
                    >
                        <Bold size={13} />
                        一般段落
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyFormat('theme'); }}
                        className="px-2 py-1.5 hover:bg-gray-800 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="套用 //系統色//"
                    >
                        <Highlighter size={13} style={{ color: themeColor }} />
                        系統主色
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyFormat('custom'); }}
                        className="px-2 py-1.5 hover:bg-gray-800 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="套用 [[自訂色|碼]]"
                    >
                        <Palette size={13} className="text-red-400" />
                        特殊顏色
                    </button>

                    {/* 加入小三角形指向游標 */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900/95"></div>
                </div>
            )}
        </div>
    );
}
