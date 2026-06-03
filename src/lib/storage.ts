import { BrochureData, BrochureMeta, BrochureCategory, BrochureStatus, createDefaultData } from '../types';
export type { BrochureMeta }; // 重新匯出，讓 Dashboard 等組件能繼續從這裡引用
import { get, set, del, clear } from 'idb-keyval';
import { supabase } from './supabase';
import { auth } from './auth';

const STORAGE_KEY_PREFIX = 'travel_brochure_';
const LIST_KEY = 'travel_brochure_list';

export const storage = {
    // 取得手冊列表（優化讀取速度：Stale-While-Revalidate 快取優先策略，實現秒開體驗）
    async getList(forceFresh = false): Promise<BrochureMeta[]> {
        try {
            // 1. 優先回傳本地 Meta 列表快取，實現瞬時載入（若非強制刷新）
            const localList = await get(LIST_KEY);
            const filteredLocalList = (localList || []).filter((m: any) => !m.isDeleted);
            
            // 2. 靜默或強制更新
            if (supabase) {
                const fetchCloud = async () => {
                    if (!supabase) return null;
                    try {
                        const { data: cloudData, error } = await supabase
                            .from('brochures')
                            .select('id, title:data->>title, agency:data->>agency, groupNumber:data->>groupNumber, isPublished:data->>isPublished, isDeleted:data->>isDeleted, isClosed:data->>isClosed, publishStartAt:data->>publishStartAt, expiresAt:data->>expiresAt, shortId:data->>shortId, ebookId:data->>ebookId, departureDateFromData:data->>departureDate, passwordHash:data->>passwordHash, source:data->>source, category, status, departure_date, last_modified_by, created_at, updated_at')
                            .order('updated_at', { ascending: false });

                        if (!error && cloudData) {
                            const today = new Date().toISOString().split('T')[0];
                            const cloudList: BrochureMeta[] = cloudData
                                .filter((item: any) => {
                                     // 過濾掉標記為 isDeleted 的資料
                                    return item.isDeleted !== 'true' && item.isDeleted !== true;
                                })
                                .map((item: any) => {
                                     let currentStatus = item.status || '待製作';
                                     const departureDate = item.departure_date || item.departureDateFromData;
                                     let isClosed = item.isClosed === 'true' || item.isClosed === true;
                                     
                                     // 自動判定：如果當前日期大於等於出發日期，則顯示為「已出團」
                                     if (departureDate && today >= departureDate) {
                                         currentStatus = '已出團';
                                         
                                         // 新增：如果分類是「出團」且已出發超過一週 (7天)，自動轉為「結案」
                                         if (item.category === '出團' && !isClosed) {
                                             const depDate = new Date(departureDate);
                                             const nowDate = new Date(today);
                                             const diffTime = Math.abs(nowDate.getTime() - depDate.getTime());
                                             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                                             
                                             if (nowDate > depDate && diffDays > 7) {
                                                 isClosed = true;
                                                 // 在背景同步更新資料庫，避免阻塞主執行緒
                                                 this.updateMetadata(item.id, { isClosed: true }).catch(err => console.error('Auto-close sync failed:', err));
                                             }
                                         }
                                     }

                                     return {
                                         id: item.id,
                                         title: item.title || '未命名手冊',
                                         agency: item.agency || '',
                                         groupNumber: item.groupNumber || '',
                                         isPublished: item.isPublished === 'true' || item.isPublished === true,
                                         createdAt: item.created_at,
                                         updatedAt: item.updated_at,
                                         lastModifiedBy: item.last_modified_by || '',
                                         isDeleted: false,
                                         publishStartAt: item.publishStartAt || '',
                                         expiresAt: item.expiresAt || '',
                                         shortId: item.shortId || '',
                                         ebookId: item.ebookId || '',
                                         category: item.category || '報價',
                                         status: currentStatus,
                                         departureDate: departureDate || '',
                                         isClosed: isClosed,
                                         passwordHash: item.passwordHash || '',
                                         source: item.source === 'pdf' ? 'pdf'
                                             : (item.agency === 'PDF 上傳' || item.agency === '舊版 PDF 上傳') ? 'pdf'
                                             : 'editor'
                                     };
                                 });
                            
                            // 同步到本地列表快取
                            await set(LIST_KEY, cloudList);
                            return cloudList;
                        }
                    } catch (err) {
                        console.warn('[列表同步] 失敗（可能是離線狀態）:', err);
                    }
                    return null;
                };

                if (forceFresh) {
                    const freshList = await fetchCloud();
                    if (freshList) return freshList;
                } else {
                    // 背景靜默更新
                    fetchCloud().catch(err => console.warn('[背景列表同步] 失敗:', err));
                }
            }
            
            // 若本地有快取直接返回，否則返回空陣列等待背景加載完成
            return filteredLocalList;
        } catch (error) {
            console.error('取得列表失敗：', error);
            return [];
        }
    },

    // 儲存手冊列表（內部輔助）
    async saveList(list: BrochureMeta[]): Promise<void> {
        try {
            await set(LIST_KEY, list);
        } catch (error) {
            console.error('儲存列表失敗：', error);
        }
    },

    // 取得單一手冊內容（優化讀取速度：Stale-While-Revalidate 快取優先策略，秒開編輯器）
    async getBrochure(id: string, includeImages: boolean = false): Promise<BrochureData | null> {
        try {
            // 1. 優先從本地快取 (IndexedDB) 獲取，以達毫秒級極速回應
            const localData = await get(`${STORAGE_KEY_PREFIX}${id}`);
            
            // 2. 如果本地有快取，先非同步地在背景向雲端同步最新資料，但不阻塞主執行緒
            if (localData) {
                (async () => {
                    if (!supabase) return;
                    try {
                        const selectFields = includeImages ? 'data, updated_at, published_images' : 'data, updated_at';
                        const { data: cloudItem, error } = await supabase
                            .from('brochures')
                            .select(selectFields)
                            .eq('id', id)
                            .single();
                        
                        if (!error && cloudItem) {
                            const item = cloudItem as any;
                            const data = item.data as BrochureData;
                            data.serverUpdatedAt = item.updated_at;
                            
                            if (includeImages && item.published_images) {
                                data.publishedImages = item.published_images as string[];
                            }
                            
                            // 更新本地快取，確保下次載入或後續儲存使用的是最新雲端時間戳
                            await set(`${STORAGE_KEY_PREFIX}${id}`, data);
                            console.log(`[背景同步] 手冊 ${id} 已同步至最新雲端狀態`);
                        }
                    } catch (err) {
                        console.warn('[背景同步] 嘗試同步雲端失敗（可能是離線狀態）:', err);
                    }
                })();
                
                // 瞬間返回本地快取，免除網路延遲等待！
                return localData;
            }

            // 3. 若本地完全無快取（例如首次從其他裝置載入），則必須阻塞等待雲端下載
            if (supabase) {
                const selectFields = includeImages ? 'data, updated_at, published_images' : 'data, updated_at';
                const { data: cloudItem, error } = await supabase
                    .from('brochures')
                    .select(selectFields)
                    .eq('id', id)
                    .single();
                
                if (!error && cloudItem) {
                    const item = cloudItem as any;
                    const data = item.data as BrochureData;
                    data.serverUpdatedAt = item.updated_at;
                    
                    if (includeImages && item.published_images) {
                        data.publishedImages = item.published_images as string[];
                    }
                    
                    await set(`${STORAGE_KEY_PREFIX}${id}`, data);
                    return data;
                }
            }
            
            return null;
        } catch (error) {
            console.error('讀取手冊失敗：', error);
            return null;
        }
    },

    // 儲存單一本手冊內容（同步到雲端，優化順序以防本地快取污染）
    async saveBrochure(id: string, data: BrochureData, isAutoSave: boolean = false): Promise<{ success: boolean; error?: string }> {
        // 如果已發佈但還沒有短代碼，生成一個
        if (data.isPublished && !data.shortId) {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            data.shortId = code;
        }

        const now = new Date().toISOString();
        let syncError = '';
        let isConflict = false;
        
        // 1. 準備儲存的資料，移除暫存的 serverUpdatedAt 欄位
        let dataToSave = { ...data };
        delete dataToSave.serverUpdatedAt;

        // 2. 自動將所有 Base64 圖片上傳至 Supabase Storage，並替換為網址
        if (supabase) {
            try {
                const sanitized = await uploadAndReplaceBase64Images(id, dataToSave);
                dataToSave = sanitized;
                // 將已替換網址的部分同步回原始 data 物件，讓 React 狀態也變輕量
                Object.assign(data, dataToSave);
            } catch (err) {
                console.error('儲存時自動上傳圖片發生錯誤:', err);
            }
        }

        // 3. 儲存到雲端 Supabase (優先雲端)
        if (supabase) {
            try {
                const user = await auth.getCurrentUser();
                const editorName = user?.name || user?.email || '未知使用者';
                const originalUpdatedAt = data.serverUpdatedAt;
                
                // 取得舊資料以比對狀態變更
                const { data: oldData } = await supabase
                    .from('brochures')
                    .select('status')
                    .eq('id', id)
                    .single();
                
                const oldStatus = oldData?.status || '待製作';
                const newStatus = data.status || '待製作';
                const statusChanged = oldStatus !== newStatus;

                let newUpdatedAt = now;

                if (originalUpdatedAt) {
                    // 1. 執行更新
                    const updatePayload: any = {
                        data: dataToSave,
                        short_id: data.shortId || null,
                        updated_at: now,
                        last_modified_by: editorName,
                        category: data.category || '報價',
                        status: data.status || '待製作',
                        departure_date: data.departureDate || null
                    };
                    
                    // 只有當物件中確實含有圖片時才更新圖片欄位，避免覆蓋舊圖
                    if (dataToSave.publishedImages) {
                        updatePayload.published_images = dataToSave.publishedImages;
                    }

                    const { data: updatedData, error } = await supabase
                        .from('brochures')
                        .update(updatePayload)
                        .eq('id', id)
                        .eq('updated_at', originalUpdatedAt)
                        .select('updated_at');

                    if (error) {
                        syncError = error.message;
                    } else if (!updatedData || updatedData.length === 0) {
                        // 儲存衝突：雲端已被修改
                        console.warn('儲存衝突：資料已被他人修改');
                        isConflict = true;
                    } else {
                        newUpdatedAt = updatedData[0].updated_at;
                        data.serverUpdatedAt = newUpdatedAt; // 回填時間戳
                    }
                } else {
                    // 2. 新增資料 (如果是全新手冊)
                    const { data: insertedData, error } = await supabase
                        .from('brochures')
                        .insert({
                            id: id,
                            data: dataToSave,
                            published_images: dataToSave.publishedImages || null, // 圖片存入獨立欄位
                            short_id: data.shortId || null,
                            updated_at: now,
                            last_modified_by: editorName,
                            category: data.category || '報價',
                            status: data.status || '待製作',
                            departure_date: data.departureDate || null
                        })
                        .select('updated_at');
                    
                    if (error) {
                        syncError = error.message;
                    } else if (insertedData && insertedData.length > 0) {
                        newUpdatedAt = insertedData[0].updated_at;
                        data.serverUpdatedAt = newUpdatedAt; // 回填時間戳
                    }
                }

                // 如果沒有發生衝突且雲端成功，則紀錄歷程
                if (!isConflict && !syncError) {
                    // 如果是手動儲存，則建立完整快照版本
                    if (!isAutoSave) {
                        // 重要：版本歷程不儲存圖片快照，以節省空間與提升讀取效率
                        const logData = { ...dataToSave };
                        delete (logData as any).publishedImages; 

                        console.log(`正在為手冊 ${id} 寫入快照版本 (手動)...`);
                        const { error: logError } = await supabase.from('brochure_logs').insert({
                            brochure_id: id,
                            editor_name: editorName,
                            action_type: 'save',
                            data: logData
                        });

                        if (logError) {
                            console.error('快照版本寫入失敗：', logError.message);
                        } else {
                            console.log('快照版本寫入完成');
                        }
                    }

                    // 如果進度有變更，不論是否為自動儲存，皆額外寫入一筆進度變更紀錄
                    if (statusChanged) {
                        await supabase.from('brochure_logs').insert({
                            brochure_id: id,
                            editor_name: editorName,
                            action_type: 'status_change',
                            data: {
                                from: oldStatus,
                                to: newStatus,
                                note: `將製作進度從「${oldStatus}」調整為「${newStatus}」`
                            }
                        });
                    }

                    // 同步更新 ebooks 資料表 (如果該手冊已經生成了電子書)
                    if (data.ebookId) {
                        try {
                            const { data: ebookItem } = await supabase
                                .from('ebooks')
                                .select('data')
                                .eq('id', data.ebookId)
                                .single();

                            const mergedEbookData = ebookItem ? {
                                ...ebookItem.data,
                                category: data.category || ebookItem.data?.category || '旅遊手冊',
                                title: data.title || ebookItem.data?.title || '',
                                passwordHash: data.passwordHash || null,
                                publishStartAt: data.publishStartAt || '',
                                expiresAt: data.expiresAt || '',
                                isPublished: data.isPublished !== undefined ? !!data.isPublished : (ebookItem.data?.isPublished !== false)
                            } : {
                                category: data.category || '旅遊手冊',
                                title: data.title || '',
                                passwordHash: data.passwordHash || null,
                                publishStartAt: data.publishStartAt || '',
                                expiresAt: data.expiresAt || '',
                                isPublished: data.isPublished !== undefined ? !!data.isPublished : true
                            };

                            const { error: ebookSyncErr } = await supabase
                                .from('ebooks')
                                .update({
                                    updated_at: now,
                                    last_modified_by: editorName,
                                    category: data.category || '旅遊手冊',
                                    title: data.title,
                                    data: mergedEbookData
                                })
                                .eq('id', data.ebookId);

                            if (ebookSyncErr) {
                                console.error('同步更新電子書失敗:', ebookSyncErr.message);
                            } else {
                                console.log('同步更新電子書成功');
                            }
                        } catch (err) {
                            console.error('同步更新電子書發生意外錯誤:', err);
                        }
                    }
                }
            } catch (err: any) {
                console.error('雲端通訊發生意外錯誤：', err);
                syncError = err.message || '網路通訊失敗';
            }
        }

        // 3. 處理本地快取更新
        // 若發生「版本衝突 (CONFLICT)」，則絕對不更新本地快取，以免污染本地資料
        if (isConflict) {
            return { success: false, error: 'CONFLICT' };
        }

        // 雲端成功 或 雲端因網路問題失敗時，更新本地快取（作為備援或成功紀錄）
        try {
            // 同步最新的 data（包含可能的 serverUpdatedAt）到本地
            await set(`${STORAGE_KEY_PREFIX}${id}`, data);

            // 更新本地列表 Meta
            const list = (await get(LIST_KEY) as BrochureMeta[]) || [];
            const existingIndex = list.findIndex(item => item.id === id);

            const title = data.title || '未命名手冊';
            const agency = data.agency || '';
            const groupNumber = data.groupNumber || '';
            const isPublished = !!data.isPublished;
            const isClosed = !!data.isClosed;
            const publishStartAt = data.publishStartAt || '';
            const expiresAt = data.expiresAt || '';
            const shortId = data.shortId || '';
            const ebookId = data.ebookId || '';

            if (existingIndex >= 0) {
                list[existingIndex] = { 
                    ...list[existingIndex], 
                    title, agency, groupNumber, isPublished, isClosed, publishStartAt, expiresAt, shortId, ebookId,
                    isDeleted: !!data.isDeleted,
                    updatedAt: now, 
                    lastModifiedBy: (await auth.getCurrentUser())?.name || '系統' 
                };
            } else {
                list.unshift({
                    id, title, agency, groupNumber, isPublished, publishStartAt, expiresAt, shortId, ebookId,
                    isDeleted: !!data.isDeleted,
                    createdAt: now, updatedAt: now,
                    lastModifiedBy: (await auth.getCurrentUser())?.name || '系統'
                });
            }
            await set(LIST_KEY, list);
        } catch (error) {
            console.error('本地存取更新失敗：', error);
        }

        return { success: !syncError, error: syncError };
    },

    // 建立全新手冊
    async createBrochure(): Promise<string> {
        const newId = crypto.randomUUID();
        const defaultData = createDefaultData();
        await this.saveBrochure(newId, defaultData);
        return newId;
    },

    // 複製手冊
    async duplicateBrochure(id: string): Promise<string | null> {
        const data = await this.getBrochure(id);
        if (!data) return null;

        const newId = crypto.randomUUID();
        const duplicatedData: BrochureData = data.isClosed
            ? {
                ...createDefaultData(),
                title: `${data.title} (新製作)`,
                category: data.category || '出團',
                status: '待製作',
                isClosed: false,
            }
            : {
                ...data,
                title: `${data.title} (複製)`,
                isClosed: false,
            };
        await this.saveBrochure(newId, duplicatedData);
        return newId;
    },

    // 刪除手冊（實體刪除本機，雲端嘗試刪除）
    async deleteBrochure(id: string): Promise<void> {
        // 刪除本機
        await del(`${STORAGE_KEY_PREFIX}${id}`);

        // 刪除雲端
        if (supabase) {
            const { error } = await supabase
                .from('brochures')
                .delete()
                .eq('id', id);
            
            if (error) {
                 console.warn('雲端刪除失敗（可能是 RLS 限制實體刪除），改嘗試作廢機制。');
                 await this.invalidateBrochure(id);
            }
        }

        // 從列表移除
        const list = await this.getList();
        await this.saveList(list.filter(item => item.id !== id));
    },

    // 作廢手冊機制 (Invalidate)
    async invalidateBrochure(id: string): Promise<void> {
        const data = await this.getBrochure(id);
        if (data) {
            data.isDeleted = true;
            await this.saveBrochure(id, data);
        }
    },

    // 恢復至指定版本 (優化：先取得雲端最新時間戳再執行覆蓋，以確保恢復動作不受樂觀鎖阻擋)
    async restoreVersion(id: string, versionData: BrochureData): Promise<{ success: boolean; error?: string }> {
        if (supabase) {
            // 1. 先抓取目前的雲端版本，取得最新的時間戳
            const { data: current, error: fetchError } = await supabase
                .from('brochures')
                .select('updated_at')
                .eq('id', id)
                .single();
            
            if (!fetchError && current) {
                // 2. 將最新的時間戳填入要恢復的資料中
                versionData.serverUpdatedAt = current.updated_at;
            }
        }
        
        // 3. 調用 saveBrochure 執行覆蓋
        return await this.saveBrochure(id, versionData);
    },

    // 將手冊直接發佈到電子書系統的 ebooks 資料表與 Storage (優化：Promise.all 並行上傳，速度提升數倍)
    async publishToEbook(title: string, pages: string[], existingEbookId?: string): Promise<{ success: boolean; id?: string; urls?: string[]; error?: string }> {
        if (!supabase) {
            return { success: false, error: 'Supabase 連線尚未初始化' };
        }

        const bookId = existingEbookId && existingEbookId.trim() !== '' 
            ? existingEbookId 
            : (() => {
                const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
                const array = new Uint8Array(6);
                crypto.getRandomValues(array);
                return Array.from(array).map(b => chars[b % chars.length]).join('');
            })();

        try {
            // 1. 改用 Promise.all 並行上傳所有分頁 Base64 圖片，速度能提升數倍！
            const uploadPromises = pages.map(async (base64Data, p) => {
                const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
                if (!matches || matches.length !== 3) {
                    throw new Error(`第 ${p + 1} 頁的圖片格式不正確`);
                }

                const mimeType = matches[1];
                const base64Str = matches[2].replace(/\s/g, '');
                
                const byteCharacters = atob(base64Str);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);

                let ext = 'webp';
                if (mimeType.includes('png')) ext = 'png';
                else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';

                const fileName = `page_${String(p + 1).padStart(3, '0')}.${ext}`;
                const filePath = `ebooks/${bookId}/${fileName}`;

                // 上傳至 Storage
                const { error: uploadError } = await supabase!.storage
                    .from('brochures')
                    .upload(filePath, byteArray, {
                        contentType: mimeType,
                        cacheControl: '31536000',
                        upsert: true
                    });

                if (uploadError) {
                    throw new Error(`上傳第 ${p + 1} 頁圖片失敗: ${uploadError.message}`);
                }

                // 取得公開下載連結
                const { data: { publicUrl } } = supabase!.storage
                    .from('brochures')
                    .getPublicUrl(filePath);

                return { index: p, url: publicUrl };
            });

            const uploadResults = await Promise.all(uploadPromises);
            // 確保順序正確
            const pageUrls = uploadResults
                .sort((a, b) => a.index - b.index)
                .map(res => res.url);

            // 2. 取得當前使用者與時間
            const now = new Date().toISOString();
            const user = await auth.getCurrentUser();
            const editorName = user?.name || user?.email || '未知使用者';

            // 3. 寫入或更新 ebooks 資料表
            const ebookRecord = {
                id: bookId,
                title: title,
                created_at: now,
                updated_at: now,
                last_modified_by: editorName,
                category: '旅遊手冊',
                status: '已發佈',
                data: {
                    publishedImages: pageUrls,
                    pageCount: pageUrls.length,
                    notes: '由旅遊手冊系統自動同步發佈',
                    isPublished: true,
                    publishStartAt: '',
                    expiresAt: '',
                    publishedAt: now
                }
            };

            const { error: dbError } = await supabase
                .from('ebooks')
                .upsert(ebookRecord, { onConflict: 'id' });

            if (dbError) {
                throw dbError;
            }

            return { success: true, id: bookId, urls: pageUrls };
        } catch (err: any) {
            console.error('發佈到電子書系統時發生錯誤：', err);
            return { success: false, error: err.message || '未知錯誤' };
        }
    },

    // 直接建立一筆由外部 PDF 轉換而來的電子書與手冊紀錄
    async createEbookFromPdf(title: string, pages: string[], category: BrochureCategory = '出團'): Promise<{ success: boolean; id?: string; error?: string }> {
        if (!supabase) return { success: false, error: 'Supabase 未設定' };
        
        try {
            // 1. 發佈到 ebooks 資料表 (藉由呼叫 publishToEbook)
            const pubResult = await this.publishToEbook(title, pages);
            if (!pubResult.success || !pubResult.id || !pubResult.urls) {
                return { success: false, error: pubResult.error || '發佈電子書失敗' };
            }
            
            const bookId = pubResult.id;
            const pageUrls = pubResult.urls;
            
            // 2. 在 brochures 資料表中為其建立一筆手冊紀錄，以利在發佈管理列表中呈現與管理
            const brochureId = crypto.randomUUID();
            const now = new Date().toISOString();
            const user = await auth.getCurrentUser();
            const editorName = user?.name || user?.email || '未知使用者';
            
            // 建立手冊格式，使用 createDefaultData() 確保所有 BrochureData 的必要欄位都被正確初始化
            const brochureData: BrochureData = {
                ...createDefaultData(),
                title: title,
                category: category,
                status: '客戶已確認', // 預設已確認
                isPublished: true, // 預設發佈
                departureDate: '',
                agency: 'PDF 上傳',
                ebookId: bookId,
                publishedImages: pageUrls,
                version: 1,
                source: 'pdf'
            };
            
            const result = await this.saveBrochure(brochureId, brochureData);
            if (!result.success) {
                return { success: false, error: result.error || '建立手冊紀錄失敗' };
            }
            
            return { success: true, id: bookId };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 重新上傳 PDF 並更新既有電子書，保留原 ebookId 與公開連結
    async updateEbookFromPdf(brochureId: string, ebookId: string, title: string, pages: string[], category: BrochureCategory = '出團'): Promise<{ success: boolean; id?: string; error?: string }> {
        if (!supabase) return { success: false, error: 'Supabase 未設定' };

        try {
            const pubResult = await this.publishToEbook(title, pages, ebookId);
            if (!pubResult.success || !pubResult.id || !pubResult.urls) {
                return { success: false, error: pubResult.error || '更新電子書失敗' };
            }

            const existing = await this.getBrochure(brochureId);
            const now = new Date().toISOString();
            const brochureData: BrochureData = {
                ...(existing || createDefaultData()),
                title,
                category,
                status: existing?.status || '客戶已確認',
                isPublished: true,
                ebookId,
                publishedImages: pubResult.urls,
                publishedAt: now,
                source: 'pdf',
                publishHistory: [
                    ...(existing?.publishHistory || []),
                    { timestamp: now, action: 'publish' as const, note: '重新上傳 PDF 並更新電子書圖片' }
                ],
                version: (existing?.version || 0) + 1
            };

            const result = await this.saveBrochure(brochureId, brochureData);
            if (!result.success) {
                return { success: false, error: result.error || '更新手冊紀錄失敗' };
            }

            return { success: true, id: ebookId };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 刪除 PDF 電子書：移除 ebooks row、Storage 圖片，以及對應的管理紀錄
    async deleteEbook(brochureId: string, ebookId?: string): Promise<{ success: boolean; error?: string }> {
        if (!supabase) return { success: false, error: 'Supabase 未設定' };

        try {
            const data = await this.getBrochure(brochureId);
            const targetEbookId = ebookId || data?.ebookId;

            if (targetEbookId) {
                const dirs = [`ebooks/${targetEbookId}`, `ebooks/ebooks/${targetEbookId}`, `brochures/${targetEbookId}`, targetEbookId];
                for (const dir of dirs) {
                    const { data: files, error } = await supabase.storage.from('brochures').list(dir);
                    if (!error && files && files.length > 0) {
                        const filesToRemove = files.map((file: any) => `${dir}/${file.name}`);
                        await supabase.storage.from('brochures').remove(filesToRemove);
                    }
                }

                const { error: ebookError } = await supabase
                    .from('ebooks')
                    .delete()
                    .eq('id', targetEbookId);
                if (ebookError) return { success: false, error: ebookError.message };
            }

            const { error: brochureError } = await supabase
                .from('brochures')
                .delete()
                .eq('id', brochureId);

            if (brochureError) {
                const fallback = data ? await this.saveBrochure(brochureId, { ...data, isDeleted: true, isPublished: false }) : { success: false, error: brochureError.message };
                if (!fallback.success) return { success: false, error: fallback.error || brochureError.message };
            }

            await del(`${STORAGE_KEY_PREFIX}${brochureId}`);
            const list = (await get(LIST_KEY) as BrochureMeta[]) || [];
            await set(LIST_KEY, list.filter(item => item.id !== brochureId));

            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message || '刪除電子書失敗' };
        }
    },

    // 同步舊系統遺留的電子書，在 brochures 表中補建手冊紀錄
    async syncLegacyEbooks(): Promise<void> {
        if (!supabase) return;
        try {
            // 1. 撈取所有電子書
            const { data: ebooks, error: ebError } = await supabase
                .from('ebooks')
                .select('*');

            if (ebError || !ebooks) return;

            // 2. 撈取所有手冊，並收集已存在的 ebookId
            const { data: brochures, error: brError } = await supabase
                .from('brochures')
                .select('id, data, published_images');

            if (brError || !brochures) return;

            const existingByEbookId = new Map<string, any>();
            brochures.forEach((b: any) => {
                const ebookId = b.data?.ebookId;
                if (typeof ebookId === 'string' && ebookId.trim() !== '') {
                    existingByEbookId.set(ebookId, b);
                }
            });

            // 3. 先修復已存在但缺少圖片的舊版 PDF 紀錄
            for (const eb of ebooks) {
                const existingBrochure = existingByEbookId.get(eb.id);
                if (!existingBrochure) continue;

                const existingImages = normalizeEbookPageUrls(existingBrochure.published_images, existingBrochure.data?.publishedImages);
                if (existingImages.length > 0) continue;

                const ebData = normalizeJsonObject(eb.data);
                let pageUrls = normalizeEbookPageUrls(eb.images, eb.pages, ebData.publishedImages, ebData.pages, ebData.images, ebData.pageUrls);
                if (pageUrls.length === 0) {
                    pageUrls = await listEbookStoragePageUrls(eb.id);
                }
                if (pageUrls.length === 0) continue;

                const repairedData = {
                    ...existingBrochure.data,
                    title: existingBrochure.data?.title || eb.title || ebData.title || '未命名舊版電子書',
                    category: existingBrochure.data?.category || eb.category || ebData.category || '出團',
                    isPublished: existingBrochure.data?.isPublished ?? ebData.isPublished ?? eb.is_published ?? true,
                    ebookId: eb.id,
                    publishedImages: pageUrls,
                    source: 'pdf'
                };

                const { error: repairErr } = await supabase
                    .from('brochures')
                    .update({
                        data: repairedData,
                        published_images: pageUrls,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingBrochure.id);

                if (repairErr) {
                    console.error(`[同步舊版電子書] 回補圖片失敗 ${existingBrochure.id}:`, repairErr.message);
                } else {
                    console.log(`[同步舊版電子書] 已回補圖片 ${existingBrochure.id} (${pageUrls.length} 頁)`);
                }
            }

            // 4. 找出未在 brochures 中建立紀錄的舊電子書
            const legacyEbooks = ebooks.filter(eb => !existingByEbookId.has(eb.id));

            if (legacyEbooks.length === 0) return;

            console.log(`[同步舊版電子書] 發現 ${legacyEbooks.length} 本舊電子書未對應手冊，開始補建紀錄...`);

            // 5. 補建 brochures 紀錄
            const now = new Date().toISOString();
            for (const eb of legacyEbooks) {
                const ebData = normalizeJsonObject(eb.data);
                let pageUrls = normalizeEbookPageUrls(eb.images, eb.pages, ebData.publishedImages, ebData.pages, ebData.images, ebData.pageUrls);
                if (pageUrls.length === 0) {
                    pageUrls = await listEbookStoragePageUrls(eb.id);
                }
                const brochureId = crypto.randomUUID();

                const brochureData: BrochureData = {
                    ...createDefaultData(),
                    title: eb.title || ebData.title || '未命名舊版電子書',
                    category: eb.category || ebData.category || '出團',
                    status: '客戶已確認',
                    isPublished: ebData.isPublished ?? eb.is_published ?? true,
                    departureDate: '',
                    agency: '舊版 PDF 上傳',
                    ebookId: eb.id,
                    publishedImages: pageUrls,
                    passwordHash: ebData.passwordHash || '',
                    publishStartAt: ebData.publishStartAt || '',
                    expiresAt: ebData.expiresAt || '',
                    publishedAt: eb.created_at || now,
                    version: 1,
                    source: 'pdf'
                };

                // 直接插入雲端 (靜默儲存)
                const { error: insError } = await supabase.from('brochures').insert({
                    id: brochureId,
                    data: brochureData,
                    published_images: pageUrls || null,
                    short_id: eb.id, // 用舊的 id 當作短網址
                    updated_at: eb.updated_at || now,
                    created_at: eb.created_at || now,
                    last_modified_by: '系統自動遷移',
                    category: brochureData.category,
                    status: brochureData.status,
                    departure_date: null
                });
                if (insError) {
                    console.error(`[同步舊版電子書] 補建手冊 ${brochureId} 失敗:`, insError.message);
                } else {
                    console.log(`[同步舊版電子書] 補建手冊 ${brochureId} 成功`);
                }
            }
            console.log('[同步舊版電子書] 補建紀錄完成！');
        } catch (err) {
            console.error('同步舊版電子書發生意外錯誤:', err);
        }
    },

    // 取得修改歷程清單 (包含輕量化的 data 欄位以辨識標題與快照狀態，已剔除圖片以優化效能)
    async getVersions(brochureId: string): Promise<any[]> {
        if (!supabase) return [];
        try {
            const { data, error } = await supabase
                .from('brochure_logs')
                .select('id, brochure_id, created_at, editor_name, action_type, data')
                .eq('brochure_id', brochureId)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('取得歷程清單失敗：', error);
            return [];
        }
    },

    // 取得特定版本的詳細資料 (當使用者點選該版本時才抓取)
    async getLogDetail(logId: string): Promise<any | null> {
        if (!supabase) return null;
        try {
            const { data, error } = await supabase
                .from('brochure_logs')
                .select('data')
                .eq('id', logId)
                .single();
            
            if (error) throw error;
            return data?.data || null;
        } catch (error) {
            console.error('取得版本詳情失敗：', error);
            return null;
        }
    },

    // 快速更新手冊 Metadata (分類、狀態、出發日期、結案狀態等，並同步密碼與分類到電子書)
    async updateMetadata(id: string, updates: { category?: BrochureCategory; status?: BrochureStatus; departureDate?: string; isClosed?: boolean; password?: string; clearPassword?: boolean }): Promise<{ success: boolean; error?: string }> {
        if (!supabase) return { success: false, error: 'Supabase 未設定' };

        try {
            const user = await auth.getCurrentUser();
            const editorName: string = user?.name || user?.email || '未知使用者';
            const now = new Date().toISOString();

            // 1. 先取得舊的資料內容 (JSONB)，因為我們需要同步更新 data 內的欄位
            const { data: item, error: fetchError } = await supabase
                .from('brochures')
                .select('data, status')
                .eq('id', id)
                .single();

            if (fetchError || !item) return { success: false, error: fetchError?.message || '找不到手冊' };

            const oldStatus = item.status || '待製作';

            // 2. 處理密碼雜湊
            let passwordHash: string | null | undefined = undefined;
            if (updates.clearPassword) {
                passwordHash = null;
            } else if (updates.password) {
                const sha256 = async (text: string) => {
                  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
                  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
                };
                passwordHash = await sha256(updates.password);
            }

            // 3. 準備更新內容
            const updatedData = { ...item.data as any };
            if (updates.category) updatedData.category = updates.category;
            if (updates.status) updatedData.status = updates.status;
            if (updates.departureDate) updatedData.departureDate = updates.departureDate;
            if (updates.isClosed !== undefined) updatedData.isClosed = updates.isClosed;
            if (passwordHash !== undefined) {
                updatedData.passwordHash = passwordHash;
            }

            const updatePayload: any = {
                data: updatedData,
                updated_at: now,
                last_modified_by: editorName
            };

            if (updates.category) updatePayload.category = updates.category;
            if (updates.status) updatePayload.status = updates.status;
            if (updates.departureDate) updatePayload.departure_date = updates.departureDate;

            const { error: updateError } = await supabase
                .from('brochures')
                .update(updatePayload)
                .eq('id', id);

            if (updateError) return { success: false, error: updateError.message };

            // 4. 同步更新 ebooks 資料表 (如果該手冊已經生成了電子書)
            if (updatedData.ebookId) {
                const ebookUpdates: any = {
                    updated_at: now,
                    last_modified_by: editorName
                };
                if (updates.category) ebookUpdates.category = updates.category;

                const { data: ebookItem } = await supabase
                    .from('ebooks')
                    .select('data')
                    .eq('id', updatedData.ebookId)
                    .single();

                if (ebookItem) {
                    const mergedEbookData = {
                        ...ebookItem.data,
                        category: updates.category || ebookItem.data?.category || '',
                        title: updatedData.title || ebookItem.data?.title || ''
                    };
                    if (passwordHash !== undefined) {
                        mergedEbookData.passwordHash = passwordHash;
                    }
                    ebookUpdates.data = mergedEbookData;
                }

                await supabase
                    .from('ebooks')
                    .update(ebookUpdates)
                    .eq('id', updatedData.ebookId);
            }

            // 5. 紀錄歷程
            if (updates.status && updates.status !== oldStatus) {
                await supabase.from('brochure_logs').insert({
                    brochure_id: id,
                    editor_name: editorName,
                    action_type: 'status_change',
                    data: {
                        from: oldStatus,
                        to: updates.status,
                        note: `透過快速選單將進度調整為「${updates.status}」`
                    }
                });
            }

            // 6. 同步更新本地快取
            const list = (await get(LIST_KEY) as BrochureMeta[]) || [];
            const existingIndex = list.findIndex(item => item.id === id);
            if (existingIndex >= 0) {
                const cacheUpdates: any = { ...updates };
                delete cacheUpdates.password;
                delete cacheUpdates.clearPassword;

                list[existingIndex] = { 
                    ...list[existingIndex], 
                    ...cacheUpdates,
                    updatedAt: now, 
                    lastModifiedBy: editorName 
                } as BrochureMeta;
                await set(LIST_KEY, list);
            }

            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // 清除所有本地快取 (用於版本更新或除錯)
    async clearAllCache(): Promise<void> {
        try {
            await clear(); // 清除 IndexedDB
            localStorage.clear(); // 清除 localStorage (包含 Session)
            sessionStorage.clear(); // 清除 sessionStorage
            console.log('所有本地快取已清除');
        } catch (error) {
            console.error('清除快取失敗：', error);
        }
    }
};

// ==========================================
// 圖片實體化輔助功能 (Base64 -> Supabase Storage WebP)
// ==========================================

function normalizeJsonObject(value: any): any {
    if (!value) return {};
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return {};
        }
    }
    return value;
}

function storagePathToPublicUrl(path: string): string {
    if (!supabase) return path;
    let cleanPath = path.trim();
    if (!cleanPath) return '';
    if (cleanPath.startsWith('http') || cleanPath.startsWith('data:')) return cleanPath;
    cleanPath = cleanPath.replace(/^\/+/, '');
    cleanPath = cleanPath.replace(/^brochures\//, '');
    cleanPath = cleanPath.replace(/^storage\/v1\/object\/public\/brochures\//, '');
    const { data: { publicUrl } } = supabase.storage.from('brochures').getPublicUrl(cleanPath);
    return publicUrl;
}

function normalizeEbookPageUrls(...candidates: any[]): string[] {
    const urls: string[] = [];

    const collect = (candidate: any) => {
        if (!candidate) return;
        if (Array.isArray(candidate)) {
            candidate.forEach(collect);
            return;
        }
        if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (!trimmed) return;
            if (trimmed.startsWith('[')) {
                try {
                    collect(JSON.parse(trimmed));
                    return;
                } catch {
                    // fall through
                }
            }
            urls.push(storagePathToPublicUrl(trimmed));
            return;
        }
        if (typeof candidate === 'object') {
            collect(candidate.publicUrl || candidate.url || candidate.src || candidate.path || candidate.name);
        }
    };

    candidates.forEach(collect);
    return Array.from(new Set(urls.filter(Boolean))).sort((a, b) => {
        const pageA = a.match(/page[_-]?(\d+)/i)?.[1];
        const pageB = b.match(/page[_-]?(\d+)/i)?.[1];
        if (pageA && pageB) return Number(pageA) - Number(pageB);
        return a.localeCompare(b);
    });
}

async function listEbookStoragePageUrls(ebookId: string): Promise<string[]> {
    if (!supabase || !ebookId) return [];
    const dirs = [`ebooks/${ebookId}`, `ebooks/ebooks/${ebookId}`, `brochures/${ebookId}`, ebookId];

    for (const dir of dirs) {
        const { data: files, error } = await supabase.storage
            .from('brochures')
            .list(dir, {
                limit: 200,
                sortBy: { column: 'name', order: 'asc' }
            });

        if (error || !files || files.length === 0) continue;

        const pageFiles = files
            .filter((file: any) => /^page[_-]?\d+/i.test(file.name) && !file.name.startsWith('.'))
            .map((file: any) => `${dir}/${file.name}`);

        if (pageFiles.length > 0) {
            return normalizeEbookPageUrls(pageFiles);
        }
    }

    return [];
}

async function uploadAndReplaceBase64Images(id: string, obj: any): Promise<any> {
    if (!obj) return obj;
    
    if (Array.isArray(obj)) {
        return Promise.all(obj.map(item => uploadAndReplaceBase64Images(id, item)));
    }
    
    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.startsWith('data:image/') && value.includes(';base64,')) {
                const publicUrl = await uploadBase64ToStorage(id, key, value);
                result[key] = publicUrl || value;
            } else {
                result[key] = await uploadAndReplaceBase64Images(id, value);
            }
        }
        return result;
    }
    
    return obj;
}

async function uploadBase64ToStorage(brochureId: string, fieldName: string, base64Data: string): Promise<string | null> {
    if (!supabase) return null;
    
    try {
        const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;
        
        const mimeType = matches[1];
        const base64Str = matches[2].replace(/\s/g, '');
        
        const byteCharacters = atob(base64Str);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        let ext = 'webp';
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
        else if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('gif')) ext = 'gif';
        
        const fileName = `${fieldName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const filePath = `brochures/${brochureId}/assets/${fileName}`;
        
        const { error } = await supabase.storage
            .from('brochures')
            .upload(filePath, byteArray, {
                contentType: mimeType,
                cacheControl: '31536000',
                upsert: true
            });
            
        if (error) {
            console.error('上傳圖片至 Storage 失敗:', error.message);
            return null;
        }
        
        const { data: { publicUrl } } = supabase.storage
            .from('brochures')
            .getPublicUrl(filePath);
            
        return publicUrl;
    } catch (err) {
        console.error('處理 Base64 上傳發生錯誤:', err);
        return null;
    }
}
