/**
 * 擷取指定容器內的所有手冊分頁並轉為高解析度圖片
 * @param containerSelector 選擇器，通常是 '.print-only-container'
 * @param onProgress 進度回呼
 */
export async function captureBrochurePages(
  containerSelector: string, 
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const container = document.querySelector(containerSelector);
  if (!container) {
    throw new Error('找不到擷取容器');
  }

  // @ts-ignore - 從 index.html CDN 載入
  const h2i = window.htmlToImage;
  if (!h2i) {
    throw new Error('html-to-image 套件尚未載入完成');
  }

  // 取得所有分頁元素
  const pages = Array.from(container.querySelectorAll('.a5-page'));
  const total = pages.length;
  const images: string[] = [];

  // 暫時確保容器是可見的但位移到螢幕外
  const originalStyle = (container as HTMLElement).style.cssText;
  (container as HTMLElement).style.cssText += '; display: block !important; position: fixed !important; left: -9999px !important; top: 0 !important; visibility: visible !important;';

  try {
    const batchSize = 4; // 提高並行批次以充分利用現代裝置多核心效能
    for (let i = 0; i < total; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (page, index) => {
            const actualIdx = i + index;
            if (onProgress) onProgress(Math.min(actualIdx + 1, total), total);
            
            // 改用 toWebp 並設定品質 0.82，並保留 toPng 作為相容性備份
            const renderFn = h2i.toWebp || h2i.toPng;
            return renderFn(page as HTMLElement, {
                quality: 0.82,
                pixelRatio: 1.2, // 調整至 1.2 即可在手機 Retina 螢幕上維持清晰且大幅減少 CPU 渲染開銷
                backgroundColor: '#ffffff',
                skipAnimations: true,
                cacheBust: false, // 停用以允許瀏覽器使用快取圖片，避免每頁擷取時都向網路重複發送圖片請求
            });
        }));
        
        images.push(...results);
    }
  } finally {
    // 恢復原始樣式
    (container as HTMLElement).style.cssText = originalStyle;
  }

  return images;
}
