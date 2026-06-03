import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_ANON_KEY || '';

// 防禦性檢查：排除 "undefined" 與 "null" 字串（有時會被構建工具或熱更新錯誤注入為字串）
const cleanKey = (key: string) => {
    if (!key || key === 'undefined' || key === 'null') return '';
    return key;
};

const supabaseKey = cleanKey(rawAnonKey);

console.log('🔌 [Supabase] 初始化偵測：', {
    url: supabaseUrl,
    keyExists: !!supabaseKey,
    keyLength: supabaseKey.length,
    isStringUndefined: supabaseKey === 'undefined',
});

// 全域 fetch timeout：讀取維持短 timeout，Storage/寫入請求給較長時間，避免 PDF 圖片上傳被中斷。
const fetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const url = typeof input === 'string'
        ? input
        : input instanceof URL
            ? input.toString()
            : input.url;
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const isUpload = url.includes('/storage/v1/object');
    const isWrite = method !== 'GET' && method !== 'HEAD';
    const timeoutMs = isUpload ? 120000 : isWrite ? 60000 : 10000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        global: { fetch: fetchWithTimeout },
        auth: { persistSession: true },
    })
    : null;
