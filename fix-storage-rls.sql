-- ================================================
-- Storage Bucket RLS 政策修復
-- 目的：修復「上傳頁面圖片失敗: new row violates row-level security policy」
-- 
-- 說明：Supabase Storage 的 bucket 上傳/刪除 受到獨立的
--      storage.objects 資料表 RLS 控制，與 public.* 表格無關。
--      此腳本修復 brochures bucket 的完整存取政策。
--
-- 請在 Supabase Dashboard > SQL Editor 中執行
-- ================================================


-- ────────────────────────────────────────────────
-- 步驟 1: 確保 brochures bucket 存在且為 public
-- ────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'brochures',
    'brochures',
    true,                                          -- 公開 bucket，允許匿名讀取 URL
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
    52428800                                       -- 最大 50MB
)
ON CONFLICT (id) DO UPDATE
    SET public = true,
        allowed_mime_types = EXCLUDED.allowed_mime_types,
        file_size_limit = EXCLUDED.file_size_limit;


-- ────────────────────────────────────────────────
-- 步驟 2: 清除舊有可能衝突的 Storage 政策
-- ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public read brochures storage"      ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload brochures"     ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update brochures"     ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete brochures"     ON storage.objects;
DROP POLICY IF EXISTS "brochures public read"                    ON storage.objects;
DROP POLICY IF EXISTS "brochures authenticated upload"           ON storage.objects;
DROP POLICY IF EXISTS "brochures authenticated delete"           ON storage.objects;


-- ────────────────────────────────────────────────
-- 步驟 3: 建立完整的 Storage RLS 政策
-- ────────────────────────────────────────────────

-- [READ] 允許所有人（包含匿名）讀取 brochures bucket 中的檔案
-- 目的：讓分享出去的 PDF/圖片 URL 可以正常存取
CREATE POLICY "Allow public read brochures storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'brochures');


-- [INSERT] 允許前端 App 上傳新檔案到 brochures bucket 的指定路徑
-- 注意：本系統主要使用自訂 RPC 登入，Storage 端可能仍是 anon role，
--      因此這裡同時允許 anon / authenticated，但限制只能寫入電子書與手冊圖片路徑。
CREATE POLICY "Allow authenticated upload brochures"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'brochures'
    AND (
        name LIKE 'ebooks/%'
        OR name LIKE 'brochures/%/assets/%'
    )
);


-- [UPDATE] 允許前端 App 更新（覆蓋）指定路徑檔案
-- 目的：支援 upsert: true 的覆蓋上傳
CREATE POLICY "Allow authenticated update brochures"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
    bucket_id = 'brochures'
    AND (
        name LIKE 'ebooks/%'
        OR name LIKE 'brochures/%/assets/%'
    )
)
WITH CHECK (
    bucket_id = 'brochures'
    AND (
        name LIKE 'ebooks/%'
        OR name LIKE 'brochures/%/assets/%'
    )
);


-- [DELETE] 允許前端 App 刪除指定路徑檔案
-- 目的：允許替換舊版本時清理舊檔
CREATE POLICY "Allow authenticated delete brochures"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
    bucket_id = 'brochures'
    AND (
        name LIKE 'ebooks/%'
        OR name LIKE 'brochures/%/assets/%'
    )
);


-- ────────────────────────────────────────────────
-- 步驟 4: 驗證 — 確認政策已正確建立
-- ────────────────────────────────────────────────
SELECT
    policyname     AS "政策名稱",
    cmd            AS "操作類型",
    roles          AS "適用角色",
    qual           AS "USING 條件",
    with_check     AS "WITH CHECK 條件"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename  = 'objects'
ORDER BY cmd;
