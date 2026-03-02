import React, { useCallback } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Lightbulb, AlertCircle, ImagePlus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { TipItem, Tips } from '../../types';
import { compressImage } from '../../lib/imageUtils';
import { RichTextarea } from './RichTextarea';

const CLASSIC_TIPS = [
  { key: 'airport', label: '機場集合與行李準備篇' },
  { key: 'security', label: '安檢規定' },
  { key: 'immigration', label: '出境流程' },
  { key: 'luggage', label: '托運行李相關規定' },
  { key: 'destination', label: '目的地旅遊注意事項' },
] as const;

export function TipsForm() {
  const { data, updateData } = useBrochure();

  const updateGridTip = (index: number, field: keyof TipItem, value: string) => {
    const newTips = [...data.gridTips];
    newTips[index] = { ...newTips[index], [field]: value };
    updateData({ gridTips: newTips });
  };

  const updateClassicTip = (key: keyof Tips, value: string) => {
    updateData({ tips: { ...data.tips, [key]: value } });
  };

  const currentOrder = data.tips.order || ['airport', 'security', 'immigration', 'luggage', 'destination'];

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...currentOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    updateData({ tips: { ...data.tips, order: newOrder } });
  };

  const moveDown = (index: number) => {
    if (index === currentOrder.length - 1) return;
    const newOrder = [...currentOrder];
    [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    updateData({ tips: { ...data.tips, order: newOrder } });
  };

  const updatePageBreak = (key: string, checked: boolean) => {
    updateData({ tips: { ...data.tips, pageBreaks: { ...(data.tips.pageBreaks || {}), [key]: checked } } });
  };

  const updateCustomLabel = (key: string, value: string) => {
    updateData({ tips: { ...data.tips, customLabels: { ...(data.tips.customLabels || {}), [key]: value } } });
  };

  const addDestinationSection = () => {
    const sections = data.tips.destinationSections || [];
    updateData({
      tips: {
        ...data.tips,
        destinationSections: [...sections, { title: '', content: '' }]
      }
    });
  };

  const updateDestinationSection = (index: number, field: 'title' | 'content' | 'pageBreak', value: string | boolean) => {
    const sections = [...(data.tips.destinationSections || [])];
    sections[index] = { ...sections[index], [field]: value };
    updateData({ tips: { ...data.tips, destinationSections: sections } });
  };

  const removeDestinationSection = (index: number) => {
    const sections = (data.tips.destinationSections || []).filter((_, i) => i !== index);
    updateData({ tips: { ...data.tips, destinationSections: sections } });
  };

  const handleImageUpload = useCallback(async (index: number, file: File) => {
    try {
      const compressedImage = await compressImage(file);
      updateGridTip(index, 'image', compressedImage);
    } catch (error) {
      console.error('叮嚀圖示壓縮失敗', error);
    }
  }, [data.gridTips, updateData]);

  const removeImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    updateGridTip(index, 'image', '');
  };

  const inputClassName = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm text-gray-700";
  const labelClassName = "block text-xs font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-8">

      {/* 經典文字版本 */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-2 gap-2">
          <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
            <AlertCircle size={20} />
            旅遊注意事項
          </h3>
          <div className="text-[11px] text-gray-500 bg-blue-50/70 p-2.5 rounded-lg border border-blue-100/70 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-blue-700 flex items-center gap-1">文字標示語法：</span>
            <span className="flex items-center gap-1"><code className="bg-white px-1.5 py-0.5 rounded text-gray-700 border border-gray-200 font-mono">**文字**</code> 一般粗體</span>
            <span className="flex items-center gap-1"><code className="bg-white px-1.5 py-0.5 rounded text-gray-700 border border-gray-200 font-mono">//文字//</code> 系統色粗體</span>
            <span className="flex items-center gap-1"><code className="bg-white px-1.5 py-0.5 rounded text-gray-700 border border-gray-200 font-mono">[[文字|色碼]]</code> 自訂色粗體</span>
          </div>
        </div>
        <div className="space-y-4">
          {currentOrder.map((key, index) => {
            const tipItem = CLASSIC_TIPS.find(t => t.key === key);
            if (!tipItem) return null;
            const { label } = tipItem;

            const isPageBreak = data.tips.pageBreaks?.[key] || false;

            const headerActions = (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-50 px-2 py-1.5 rounded border border-gray-100">
                  <input
                    type="checkbox"
                    checked={isPageBreak}
                    onChange={(e) => updatePageBreak(key, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  這段換新頁
                </label>
                <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 px-2 flex items-center gap-1 bg-white border border-gray-200 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:cursor-not-allowed transition-colors"
                    title="上移"
                  >
                    <ArrowUp size={14} /> 上移
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === currentOrder.length - 1}
                    className="p-1 px-2 flex items-center gap-1 bg-white border border-gray-200 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:cursor-not-allowed transition-colors"
                    title="下移"
                  >
                    <ArrowDown size={14} /> 下移
                  </button>
                </div>
              </div>
            );

            if (key === 'destination') {
              return (
                <div key={key} className="space-y-3 p-4 bg-white border border-gray-200 rounded-xl relative group">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <input
                      type="text"
                      value={data.tips.customLabels?.[key] ?? label}
                      onChange={(e) => updateCustomLabel(key, e.target.value)}
                      className={`${labelClassName} !mb-0 text-base font-bold bg-transparent border-none p-0 focus:ring-0 w-1/2`}
                      style={{ color: data.theme.primary }}
                    />
                    <div className="flex gap-4 items-center">
                      <button
                        onClick={addDestinationSection}
                        className="text-[12px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                      >
                        + 新增分層標題
                      </button>
                      {headerActions}
                    </div>
                  </div>

                  <RichTextarea
                    themeColor={data.theme.primary}
                    value={data.tips.destination || ''}
                    onChange={(e) => updateClassicTip('destination', e.target.value)}
                    className={`${inputClassName} h-24 mb-3`}
                    placeholder="輸入通用注意事項..."
                  />

                  {data.tips.destinationSections?.map((section, sIdx) => (
                    <div key={sIdx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2 relative group-item">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateDestinationSection(sIdx, 'title', e.target.value)}
                            className={`${inputClassName} font-bold`}
                            placeholder="小標題 (例如：電壓與插座)"
                          />
                          <button
                            onClick={() => removeDestinationSection(sIdx)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <label className="flex items-center self-start gap-1.5 cursor-pointer text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                          <input
                            type="checkbox"
                            checked={section.pageBreak || false}
                            onChange={(e) => updateDestinationSection(sIdx, 'pageBreak', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          這段子標題換新頁
                        </label>
                      </div>
                      <RichTextarea
                        themeColor={data.theme.primary}
                        value={section.content}
                        onChange={(e) => updateDestinationSection(sIdx, 'content', e.target.value)}
                        className={`${inputClassName} h-20`}
                        placeholder="詳細說明內容..."
                      />
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={key} className="space-y-3 p-4 bg-white border border-gray-200 rounded-xl relative group">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <input
                    type="text"
                    value={data.tips.customLabels?.[key] ?? label}
                    onChange={(e) => updateCustomLabel(key, e.target.value)}
                    className={`${labelClassName} !mb-0 text-base font-bold bg-transparent border-none p-0 focus:ring-0 w-1/2`}
                    style={{ color: data.theme.primary }}
                  />
                  {headerActions}
                </div>
                <RichTextarea
                  themeColor={data.theme.primary}
                  value={data.tips[key as keyof Tips] as string || ''}
                  onChange={(e) => updateClassicTip(key as keyof Tips, e.target.value)}
                  className={`${inputClassName} h-24`}
                  placeholder={`輸入${label}說明...`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* 9宮格版本 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2 mb-2" style={{ color: data.theme.primary }}>
          <Lightbulb size={20} />
          貼心小叮嚀 (九宮格設計)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.gridTips.map((tip, index) => {
            return (
              <div key={tip.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full">
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={tip.title}
                    onChange={(e) => updateGridTip(index, 'title', e.target.value)}
                    className="font-bold text-sm bg-transparent border-none focus:ring-0 w-full text-right"
                    style={{ color: data.theme.primary }}
                    placeholder="區塊標題"
                  />
                </div>

                <div className="flex-1 space-y-3 flex flex-col">
                  <TipImageUploader
                    image={tip.image}
                    title={tip.title}
                    index={index}
                    onImageUpload={handleImageUpload}
                    onRemove={removeImage}
                  />

                  <RichTextarea
                    themeColor={data.theme.primary}
                    value={tip.content}
                    onChange={(e) => updateGridTip(index, 'content', e.target.value)}
                    className={`${inputClassName} flex-1 resize-none text-xs leading-relaxed`}
                    placeholder={`輸入${tip.title}的說明文字...`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TipImageUploader({
  image, title, index, onImageUpload, onRemove
}: {
  image?: string, title: string, index: number,
  onImageUpload: (index: number, file: File) => void,
  onRemove: (index: number, e: React.MouseEvent) => void
}) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) onImageUpload(index, acceptedFiles[0]);
  }, [index, onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      tabIndex={0}
      onPaste={(e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) { onImageUpload(index, file); e.preventDefault(); break; }
          }
        }
      }}
      className={`relative w-full aspect-[4/3] rounded-lg border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer bg-gray-50/50 outline-none focus:border-blue-300 ${isDragActive ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-100'}`}
    >
      <input {...getInputProps()} />
      {image ? (
        <>
          <img src={image} alt={title} className="w-full h-full object-contain p-2" />
          <div className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => onRemove(index, e)}
              className="absolute top-1 right-1 bg-white/90 text-red-500 rounded p-1 shadow-sm hover:bg-red-50"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </>
      ) : (
        <div className="text-gray-400 flex flex-col items-center gap-1">
          <ImagePlus size={20} strokeWidth={1.5} />
          <span className="text-[10px] text-center px-2">點擊或拖曳<br />上傳專屬圖示</span>
        </div>
      )}
    </div>
  );
}
