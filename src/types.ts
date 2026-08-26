export interface FlightInfo {
  airline: string;
  airlineLogo?: string;
  flightNumber: string;
  date?: string; // 新增日期欄位
  departureTime: string;
  departurePlace: string;
  arrivalTime: string;
  arrivalPlace: string;
  arrivalNextDay?: boolean; // 新增：到達時間是否為隔日
  duration?: string;
  flightDuration?: string; // 新增：飛行總時數 (e.g. 12h 30m)
  type: 'outbound' | 'middle' | 'return'; // 新增：航段類型
}

export interface Hotel {
  name: string;
  description?: string;
  phone: string;
  address: string;
  morningCall: string;
  image?: string; // 加入飯店圖片支援
  pageBreakBefore?: boolean; // 手動換頁標示
}

export interface ItineraryDay {
  id: string; // 新增：唯一 ID 用於個別設定
  title: string;
  description: string;
  attractions?: string; // 景點介紹
  meals: {
    breakfast: boolean;
    breakfastText?: string;
    lunch: boolean;
    lunchText?: string;
    dinner: boolean;
    dinnerText?: string;
  };
  hotelIndex: number | null;
  images: string[];
  attractionImages?: string[];
  pageBreakBefore?: boolean; // 手動換頁標示
}

export interface TipItem {
  id: string; // 用來綁定預設圖示 (如: clothes, items, weather, time, power, money, custom, comms, bag)
  title: string;
  content: string;
  image?: string; // 使用者自訂上傳的圖示或圖片
}

export type GridTips = TipItem[];

export interface DestinationSection {
  title: string;
  content: string;
  pageBreak?: boolean; // 新增：分層子標題換頁設定
}

export interface Tips {
  airport: string;
  security: string;
  immigration: string;
  luggage: string;
  destination: string; // 回溯相容
  destinationSections?: DestinationSection[]; // 新增：分層注意事項
  order?: string[]; // 新增：段落排序
  pageBreaks?: Record<string, boolean>; // 新增：換頁設定
  customLabels?: Record<string, string>; // 新增：自定義標題
  showAutoNumbering?: boolean; // 新增：內容文字自動編號
  showSectionNumbering?: boolean; // 新增：分層標題自動編號
}

export interface Attraction {
  id: string; // 新增：唯一 ID 用於個別設定
  title: string;
  description: string;
  images: string[];
  layout: 'top-1-bottom-2' | 'left-1-right-2' | 'grid-4' | 'single' | 'side-left' | 'side-right';
  country?: string; // 修正：景點國家資料
  pageBreakAfter?: boolean; // 景點手動分頁
  isTwoPerPage?: boolean; // 新增：是否一頁兩個景點
}

export interface HotelDetail {
  id: string;
  name: string;
  intro: string; // 飯店介紹
  roomType: string;
  facilities: string[];
  images: string[];
  bottomLayout?: 'left-info-right-images' | 'left-images-right-info' | 'full-info'; // 新增底部版面配置
}

export interface MapImage {
  src: string;
  caption?: string;
  fit?: 'cover' | 'contain';   // 滿版裁切 或 保持比例
}

export interface RoomingEntry {
  id: string;
  roomNumber: string; // 回溯相容：預設房號
  names: string[]; // ['Name 1', 'Name 2'] 支援單人或多人
  units?: string[]; // 新增：單位
  titles?: string[]; // 新增：職稱
  roomType: string; // '雙人房', '單人房', etc.
  remarks?: string;
  remarksList?: string[]; // 新增：個別旅客備註
  hotelName?: string; // 回溯相容
  hotelRooms?: Record<string, string>; // 新增：飯店名稱 -> 房號 的對應
}

export interface CustomPageData {
  id: string; // Unique ID for keying multiple custom pages if needed
  title: string;
  content: string; // rich text
  images: string[];
  layout: 'top-1-bottom-2' | 'left-1-right-2' | 'grid-4' | 'single'; // Reuse some standard layouts
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  text: string;
}

export type SectionId =
  | 'flight'
  | 'attraction'
  | 'hotel'
  | 'hotelDetail'
  | 'roomingList' // 新增分房表
  | 'map'
  | 'itinerary'
  | 'packing'
  | 'tips'
  | 'gridTips'
  | 'customPage'; // 新增自由頁面

export const defaultSectionOrder: SectionId[] = [
  'flight',
  'attraction',
  'hotel',
  'hotelDetail',
  'roomingList',
  'map',
  'itinerary',
  'packing',
  'tips',
  'gridTips',
  'customPage'
];

export type BrochureCategory = '出團' | '報價' | '報價行程';
export type BrochureStatus = '待製作' | '初稿完成' | '待調整' | '內部確認' | '待客戶確認' | '客戶已確認' | '已出團';

export interface BrochureMeta {
  id: string;
  title: string;
  agency: string;
  groupNumber: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: string;
  isDeleted: boolean;
  publishStartAt?: string;
  expiresAt?: string;
  shortId?: string;
  ebookId?: string; // 新增：電子書系統的書籍 ID
  category?: BrochureCategory;
  status?: BrochureStatus;
  departureDate?: string;
  isClosed?: boolean;
  passwordHash?: string;
  source?: 'editor' | 'pdf'; // 新增：來源分類 (手冊編輯器 or PDF上傳)
}

export interface BrochureData {
  agency: string;
  logo: string;
  coverImage?: string; // 新增封面滿版圖支援
  coverStyle?: 'classic' | 'modern' | 'split-gradient' | 'photocentric'; // 封面樣式呈現
  title: string;
  subTitle?: string; // 新增副標題
  destination?: string; // 新增旅遊地點
  startDate: string;
  duration: number;
  tourLeader: string;
  tourLeaderPhone: string;
  meetingPoint: string;
  meetingTime: string;
  meetingInfos?: MeetingInfo[];
  meetingMap?: string; // 機場集合地點地圖圖片
  emergencyContact?: string; // 緊急聯絡人
  emergencyPhone?: string; // 緊急聯絡電話
  agencyName?: string; // 新增：旅行社名稱
  agencyPhone?: string; // 新增：旅行社市話
  agencyMobile?: string; // 新增：旅行社手機
  emergencyContactName?: string; // 新增：聯絡人姓名
  flights: FlightInfo[]; // 修改為數組以支援多段航班 (中轉)
  hotels: Hotel[];
  hotelDetails: HotelDetail[]; // 飯店詳細介紹頁面
  roomingList?: RoomingEntry[]; // 新增：分房表，搭配飯店住宿
  customPages: CustomPageData[]; // 新增：自由編輯頁面
  itineraries: ItineraryDay[];
  attractions: Attraction[];   // 景點介紹頁面
  mapPage?: MapImage;          // 整頁地圖
  packingList: PackingItem[];
  tips: Tips;
  gridTips: GridTips;
  theme: ThemeColors;
  sectionOrder: SectionId[];   // 新增：版塊排序
  tocSettings?: Record<string, boolean>; // 新增：目錄顯示設定
  tocText?: string; // 新增目錄自訂文字
  tocImage?: string; // 新增目錄自訂圖片
  showTOCItineraryDetails?: boolean; // 新增：目錄是否顯示行程詳情
  notesCount?: number; // 新增：筆記頁數
  showRoomNumber?: boolean; // 新增：是否顯示房號
  headerLogo?: string; // 新增頁首專屬(客戶) Logo
  headerText?: string; // 新增頁首自訂名稱(客戶名稱)
  isLocked?: boolean; // 新增：資料鎖定狀態
  isDeleted?: boolean; // 新增：是否已作廢
  showAgencyOnCover?: boolean; // 新增：封面是否顯示旅行社名稱
  backCoverText?: string; // 新增：封底自訂文字
  contentFontSize?: number; // 新增：內容文字字體大小 (px)
  imageHeightScale?: number; // 新增：圖片顯示高度比例 (0.5 ~ 1.5)
  fontFamily?: string; // 新增：字體選擇
  pageSettings?: Record<string, { fontSize?: number; imageScale?: number }>; // 新增：各頁面個別設定
  gridTipsSingle?: boolean; // 新增：貼心小叮嚀是否改用單一卡片模式
  groupNumber?: string; // 新增：內部註記團號
  isPublished?: boolean; // 新增：是否已發佈線上手冊
  publishedAt?: string; // 新增：發佈時間
  publishStartAt?: string; // 新增：預定上架時間
  expiresAt?: string; // 新增：下架時間
  publishHistory?: { timestamp: string; action: 'publish' | 'unpublish' | 'status_change'; user?: string; note?: string }[]; // 新增：發佈紀錄
  version?: number; // 新增：版本號
  shortId?: string; // 新增：短網址代碼
  ebookId?: string; // 新增：電子書系統的書籍 ID
  publishedImages?: string[]; // 新增：發佈時的分頁圖片快照 (High-DPI Captured PNGs)
  serverUpdatedAt?: string; // 新增：雲端最後更新時間，用於併發衝突檢查
  category?: BrochureCategory; // 新增：分類
  status?: BrochureStatus;     // 新增：製作狀態
  departureDate?: string;      // 新增：出發日期 (用於管理與自動轉狀態)
  isClosed?: boolean;           // 新增：是否已結案 (平常隱藏)
  passwordHash?: string;        // 新增：閱讀密碼雜湊值
  source?: 'editor' | 'pdf';    // 新增：來源分類 (手冊編輯器 or PDF上傳)
}

export interface MeetingInfo {
  id: string;
  point: string;
  time: string;
  people?: string;
  contactName?: string;
  contactPhone?: string;
  map?: string;
}

export interface User {
  id: number;
  employee_id: string;
  name: string;
  role: string;
  is_active: boolean;
  is_sales: boolean;
  is_manager: boolean;
  can_manage_users: boolean;
  can_view_all_contracts: boolean;
  email: string;
  group_team?: string;
  notify_email?: string;
  permissions?: any;
  name_en?: string;
  job_title?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: User | null;
  mode: 'custom' | 'supabase' | null;
}

export const defaultTheme: ThemeColors = {
  primary: '#2C3E50', // 商務深藍
  secondary: '#F8F9FA', // 極簡灰白
  text: '#34495E', // 內文深灰
};

export const themes = {
  business: {
    primary: '#2C3E50',
    secondary: '#F8F9FA',
    text: '#34495E',
  },
  nature: {
    primary: '#435E55', // 質感森綠
    secondary: '#F4F7F6', // 淺灰綠
    text: '#2C3E38',
  },
  romance: {
    primary: '#8A5A6D', // 煙燻玫瑰
    secondary: '#FAF5F7', // 暖白粉
    text: '#4A333C',
  },
  energy: {
    primary: '#B66046', // 質感陶土橘
    secondary: '#FCF8F5',
    text: '#5D3528',
  },
};

export const defaultTips: Tips = {
  airport: '請提前出門，準時抵達機場。由於機場旅客眾多，建議請您攜帶台灣手機，並請主動與領隊電話聯絡。',
  security: '通過安檢時，液體物品需置於100ml以下容器並放入透明夾鏈袋內。電子設備需单独取出。',
  immigration: '請您耐心等候檢驗護照，切勿隨意更換排列隊伍或插隊。驗照時若遇到困難，可以高聲呼叫領隊驅前協助。',
  luggage: '托運行李請務必上鎖，並於行李牌上寫上姓名、聯絡電話。貴重物品請隨身攜帶。',
  destination: '步出入境大廳後，留意小偷非常多，隨時要留心隨身手提物品與行李。',
};

export const defaultGridTips: GridTips = [
  {
    id: 'clothes',
    title: '衣著',
    content: '便服以夏季服裝為主，建議選擇方便隨時穿脫、輕便的服裝，鞋子則以休閒鞋為主。',
  },
  {
    id: 'items',
    title: '攜帶物品',
    content: '雨具、牙膏、牙刷、拖鞋、刮刀、帽子、護膚油或乳液、太陽眼鏡、個人常用藥品等...',
  },
  {
    id: 'weather',
    title: '氣溫',
    content: '當地氣候溫差大，請備妥薄外套。\n白天均溫約 30°C\n夜晚均溫約 22°C',
  },
  {
    id: 'time',
    title: '時差',
    content: '目的地比台灣慢4小時',
  },
  {
    id: 'power',
    title: '電壓',
    content: '當地電壓為220V，頻率為60HZ，插頭是三孔方型，建議預先準備萬國轉換插頭。',
  },
  {
    id: 'money',
    title: '錢幣',
    content: '1台幣 ≈ 約0.12當地貨幣\n1當地貨幣 ≈ 8.36台幣\n※以當日牌告匯率為主',
  },
  {
    id: 'customs',
    title: '海關',
    content: '台灣出境，攜帶外幣不可超過美金壹萬元現金(旅行支票不限)，新台幣不可超過拾萬元。',
  },
  {
    id: 'comms',
    title: '通訊',
    content: '直撥回台灣時可打:\n國際冠碼 (00) + 台灣國碼 (886) + 區域號碼 + 家中電話號碼。',
  },
  {
    id: 'bag',
    title: '行李',
    content: '托運行李方面，經濟艙一件25公斤。而手提行李則是一件7公斤，敬請上鎖。\n※不能隨身攜帶水果刀、小剪刀、火柴等。',
  },
];

export interface PackingItem {
  text: string;
  important: boolean;
}

export const defaultPackingList: PackingItem[] = [
  { text: '護照', important: true },
  { text: '機票/電子機票', important: true },
  { text: '手機 + 充電線', important: true },
  { text: '個人藥物', important: false },
  { text: '換洗衣物', important: false },
  { text: '防晒乳', important: false },
  { text: '雨具', important: false },
  { text: '行動電源', important: true },
];

export function createDefaultData(): BrochureData {
  return {
    agency: '',
    logo: '',
    title: '',
    subTitle: '',
    destination: '',
    startDate: '',
    duration: 5,
    tourLeader: '',
    tourLeaderPhone: '',
    meetingPoint: '',
    meetingTime: '',
    meetingInfos: [],
    meetingMap: '',
    emergencyContact: '',
    emergencyPhone: '',
    flights: [
      {
        airline: '',
        airlineLogo: '',
        flightNumber: '',
        date: '',
        departureTime: '',
        departurePlace: '',
        arrivalTime: '',
        arrivalPlace: '',
        arrivalNextDay: false,
        duration: '',
        flightDuration: '',
        type: 'outbound',
      },
      {
        airline: '',
        airlineLogo: '',
        flightNumber: '',
        date: '',
        departureTime: '',
        departurePlace: '',
        arrivalTime: '',
        arrivalPlace: '',
        arrivalNextDay: false,
        duration: '',
        flightDuration: '',
        type: 'return',
      }
    ],
    hotels: [],
    hotelDetails: [],
    roomingList: Array.from({ length: 15 }, (_, i) => ({
      id: `room-${i}`,
      roomNumber: (i + 1).toString(),
      names: ['', ''],
      units: ['', ''],
      titles: ['', ''],
      roomType: '雙人房',
      remarks: '',
      hotelName: ''
    })), // 預設產生15間房，最多30人
    customPages: [], // 新增預設空白
    showRoomNumber: true, // 預設顯示房號
    itineraries: [],
    attractions: [],
    packingList: [...defaultPackingList],
    tips: { ...defaultTips },
    gridTips: [...defaultGridTips],
    theme: { ...defaultTheme },
    sectionOrder: [...defaultSectionOrder],
    tocSettings: defaultSectionOrder.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
    tocText: '',
    tocImage: '',
    coverStyle: 'classic',
    showTOCItineraryDetails: false,
    notesCount: 0,
    headerLogo: '',
    headerText: '',
    showAgencyOnCover: true,
    contentFontSize: 14, // 預設 14px
    imageHeightScale: 1.0, // 預設 1.0
    fontFamily: "'Noto Sans TC', sans-serif", // 預設思源黑體
    groupNumber: '', // 預設空白
    isPublished: false, // 預設未發佈
    publishedImages: [], // 預設無快照
    category: '報價行程',     // 預設分類
    status: '待製作',      // 預設進度
    isClosed: false,       // 預設未結案
    passwordHash: '',      // 預設密碼雜湊為空
    source: 'editor',      // 預設來源為編輯器發佈
  };
}

export function initializeItineraries(duration: number): ItineraryDay[] {
  return Array.from({ length: duration }, (_, i) => ({
    id: crypto.randomUUID(),
    title: `第 ${i + 1} 天`,
    description: '',
    attractions: '',
    meals: {
      breakfast: false,
      breakfastText: '',
      lunch: false,
      lunchText: '',
      dinner: false,
      dinnerText: '',
    },
    hotelIndex: null,
    images: [],
    attractionImages: [],
  }));
}

export function initializeHotels(duration: number): Hotel[] {
  // Day 1 is departure, no hotel needed
  return Array.from({ length: Math.max(0, duration - 1) }, () => ({
    name: '',
    description: '',
    phone: '',
    address: '',
    morningCall: '',
  }));
}
