# 旅遊手冊產生器 - 規格書

## 1. 專案概述

- **專案名稱**：Travel Brochure Generator（旅遊手冊產生器）
- **類型**：單頁應用程式（React + TypeScript + Vite）
- **核心功能**：輸入旅遊資料，生成 A4 格式可列印的旅遊手冊
- **目標用戶**：旅行社業務、領隊

## 2. UI/UX 規格

### 2.1 整體佈局

```
┌─────────────────────────────────────────────────────────────┐
│  Header: 標題 + 列印按鈕                                    │
├──────────────────────┬──────────────────────────────────────┤
│                      │                                      │
│   編輯器側邊欄        │         A4 預覽區                  │
│   (左側 40%)         │         (右側 60%)                  │
│                      │                                      │
│   - 基本資料          │   響應式顯示                        │
│   - 航班資訊         │   實際列印效果                        │
│   - 飯店資料         │                                      │
│   - 行程介紹         │   支援滾動                          │
│   - 物品清單         │                                      │
│   - 旅遊叮嚀         │                                      │
│   - 色系設定         │                                      │
│                      │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

### 2.2 響應式斷點

- **Desktop** (>1024px)：雙欄佈局
- **Tablet** (768-1024px)：雙欄縮小
- **Mobile** (<768px)：單欄，切換編輯/預覽

### 2.3 色彩系統

#### 預設主題

1. **商務風** (預設)
   - 主色：#1e3a5f（深藍）
   - 輔助色：#f8fafc（淺灰背景）
   - 文字色：#1e293b

2. **自然風**
   - 主色：#2d6a4f（森林綠）
   - 輔助色：#f0fdf4（淺綠背景）
   - 文字色：#1c1917

3. **浪漫風**
   - 主色：#be185d（玫紅）
   - 輔助色：#fdf2f8（淺粉背景）
   - 文字色：#831843

4. **活力風**
   - 主色：#ea580c（橙紅）
   - 輔助色：#fff7ed（淺橙背景）
   - 文字色：#7c2d12

#### 自訂顏色

- 使用 `<input type="color">` 或 hex 輸入
- 即時預覽顏色變化

### 2.4 字體

- **中文**：Noto Sans TC（Google Fonts）
- **英文**：Inter
- **標題**：24px / 18px / 16px（依層級）
- **內文**：14px
- **小字**：12px

### 2.5 A4 規格

- 尺寸：210mm × 297mm
- 邊距：20mm
- 內容區域：170mm × 257mm
- 縮放預覽：70-100%

## 3. 功能規格

### 3.1 基本資料表單

| 欄位 | 類型 | 必填 | 預設 |
|------|------|------|------|
| 旅行社名稱 | text | 否 | - |
| Logo | image upload | 否 | - |
| 旅遊主題 | text | 是 | - |
| 出發日期 | date | 是 | - |
| 天數 | number (1-30) | 是 | 5 |
| 領隊姓名 | text | 否 | - |
| 領隊電話 | tel | 否 | - |
| 集合地點 | text | 否 | - |
| 集合時間 | time | 否 | - |

### 3.2 航班資訊

- **去程**：航空公司、班機號碼、起飛/到達時間/地點
- **回程**：同上
- 表格格式呈現

### 3.3 飯店資料

- 依據天數自動生成欄位
- 每間飯店：
  - 飯店名稱
  - 電話
  - 地址
  - Morning Call 時間
- Day 1 不需要住宿（出發日）

### 3.4 行程介紹

- 依據天數自動生成欄位
- 每一天：
  - 標題（第 N 天）
  - 行程描述（文字輸入，多行）
  - 餐食（早餐/午餐/晚餐，可選）
  - 住宿（關聯飯店資料）
  - 圖片上傳（最多 3 張）

### 3.5 旅遊物品一覽

- 預設清單項目：
  - □ 護照
  - □ 機票/電子機票
  - □ 手機 + 充電線
  - □ 個人藥物
  - □ 換洗衣物
  - □ 防晒乳
  - □ 雨具
  - □ 行動電源
- 可新增/刪除項目

### 3.6 旅遊小叮嚀

- 可編輯的區塊：
  - 機場集合與行李準備
  - 安檢規定
  - 出境流程
  - 托運行李相關規定
  - 目的地注意事項
- 預設文字範本（可修改）

### 3.7 色系設定

- 預設主題選擇（4 種）
- 自訂顏色輸入
- 即時預覽套用

### 3.8 列印功能

- 瀏覽器列印對話框
- 自動分頁
- 隱藏編輯器，僅顯示預覽區
- 頁面邊距設定

## 4. 技術實作

### 4.1 狀態管理

- React Context 或 Zustand
- 資料結構：

```typescript
interface BrochureData {
  // 基本資料
  agency: string;
  logo: string;
  title: string;
  startDate: string;
  duration: number;
  tourLeader: string;
  tourLeaderPhone: string;
  meetingPoint: string;
  meetingTime: string;
  
  // 航班
  flights: {
    outbound: FlightInfo;
    return: FlightInfo;
  };
  
  // 飯店
  hotels: Hotel[];
  
  // 行程
  itineraries: Itinerary[];
  
  // 物品清單
  packingList: string[];
  
  // 叮嚀
  tips: {
    airport: string;
    security: string;
    immigration: string;
    luggage: string;
    destination: string;
  };
  
  // 色系
  theme: ThemeColors;
}
```

### 4.2 元件結構

```
App
├── Header
├── EditorPanel
│   ├── BasicInfoForm
│   ├── FlightForm
│   ├── HotelForm
│   ├── ItineraryForm
│   ├── PackingListForm
│   ├── TipsForm
│   └── ThemeSettings
└── PreviewPanel
    ├── CoverPage
    ├── FlightPage
    ├── HotelPage
    ├── ItineraryPage
    ├── PackingPage
    └── TipsPage
```

## 5. 驗收標準

- [ ] 可輸入基本資料並即時預覽
- [ ] 天數變更時自動增減行程欄位
- [ ] 可上傳圖片並顯示在預覽中
- [ ] 4 種預設主題可切換
- [ ] 可自訂顏色
- [ ] 列印輸出為 PDF 格式
- [ ] A4 尺寸正確
- [ ] 響應式設計（Desktop/Tablet/Mobile）
