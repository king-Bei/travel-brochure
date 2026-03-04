import React, { useState } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Plus, Trash2, FileText, Layout, GripVertical, Image as ImageIcon } from 'lucide-react';

export function CustomPageForm() {
    const { data, updateData } = useBrochure();
    const pages = data.customPages || [];

    const addPage = () => {
        updateData({
            customPages: [
                ...pages,
                {
                    id: crypto.randomUUID(),
                    title: '新建自訂頁面',
                    content: '請輸入內容...',
                    images: [],
                    layout: 'single'
                }
            ]
        });
    };

    const removePage = (index: number) => {
        const newPages = [...pages];
        newPages.splice(index, 1);
        updateData({ customPages: newPages });
    };

    const updatePage = (index: number, field: string, value: any) => {
        const newPages = [...pages];
        newPages[index] = { ...newPages[index], [field]: value };
        updateData({ customPages: newPages });
    };

    // 簡單的圖片處理（這部分建議如果需要多張可以串接 ImageUploader)
    const addImage = (index: number) => {
        const newPages = [...pages];
        newPages[index].images.push('');
        updateData({ customPages: newPages });
    };

    const updateImage = (pageIndex: number, imgIndex: number, val: string) => {
        const newPages = [...pages];
        newPages[pageIndex].images[imgIndex] = val;
        updateData({ customPages: newPages });
    };

    const removeImage = (pageIndex: number, imgIndex: number) => {
        const newPages = [...pages];
        newPages[pageIndex].images.splice(imgIndex, 1);
        updateData({ customPages: newPages });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
                    <FileText size={20} />
                    自訂頁面
                </h3>
                <button
                    onClick={addPage}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    新增頁面
                </button>
            </div>

            <div className="space-y-6">
                {pages.map((page, index) => (
                    <div key={page.id} className="p-4 bg-gray-50 rounded-xl space-y-4 border border-gray-100 relative group">
                        <button
                            onClick={() => removePage(index)}
                            className="absolute -top-3 -right-3 p-2 bg-white text-red-500 rounded-full shadow-md hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={16} />
                        </button>

                        <div className="flex gap-4">
                            <div className="flex-1 space-y-3">
                                {/* 頁面標題 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">標題</label>
                                    <input
                                        type="text"
                                        value={page.title}
                                        onChange={(e) => updatePage(index, 'title', e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                                        placeholder="例：行前須知 / 公司介紹"
                                    />
                                </div>

                                {/* 版面選擇 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                        <Layout size={16} className="text-gray-400" />
                                        版面配置
                                    </label>
                                    <select
                                        value={page.layout}
                                        onChange={(e) => updatePage(index, 'layout', e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none"
                                    >
                                        <option value="single">單一圖片 (滿版或置頂)</option>
                                        <option value="top-1-bottom-2">上一圖，下兩圖</option>
                                        <option value="grid-4">四宮格</option>
                                    </select>
                                </div>
                            </div>

                            {/* 圖片管理 */}
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                                    <span><ImageIcon size={16} className="inline mr-1 text-gray-400" />圖片網址</span>
                                    <button onClick={() => addImage(index)} className="text-xs text-blue-500 hover:text-blue-600 flex items-center">
                                        <Plus size={12} /> 新增圖片
                                    </button>
                                </label>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                    {page.images.map((img, imgIdx) => (
                                        <div key={imgIdx} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={img}
                                                onChange={(e) => updateImage(index, imgIdx, e.target.value)}
                                                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-blue-500 outline-none"
                                                placeholder="https://..."
                                            />
                                            <button onClick={() => removeImage(index, imgIdx)} className="text-red-400 hover:text-red-600">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {page.images.length === 0 && <div className="text-xs text-gray-400 italic">尚未新增圖片</div>}
                                </div>
                            </div>
                        </div>

                        {/* 內容 Rich Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">內文 (支援基礎 Rich Text `**粗體**` `*藍字*`)</label>
                            <textarea
                                value={page.content}
                                onChange={(e) => updatePage(index, 'content', e.target.value)}
                                className="w-full h-32 px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow resize-none"
                                placeholder="請輸入頁面內文..."
                            />
                        </div>

                    </div>
                ))}

                {pages.length === 0 && (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <FileText size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium mb-1">目前沒有自訂頁面</p>
                        <p className="text-sm text-gray-400">點擊上方「新增頁面」來在手冊中插入全新內容</p>
                    </div>
                )}
            </div>
        </div>
    );
}
