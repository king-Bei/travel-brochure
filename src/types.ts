export interface FlightInfo {
  airline: string;
  flightNumber: string;
  departureTime: string;
  departurePlace: string;
  arrivalTime: string;
  arrivalPlace: string;
}

export interface Hotel {
  name: string;
  phone: string;
  address: string;
  morningCall: string;
}

export interface ItineraryDay {
  title: string;
  description: string;
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  hotelIndex: number | null;
  images: string[];
}

export interface Tips {
  airport: string;
  security: string;
  immigration: string;
  luggage: string;
  destination: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  text: string;
}

export interface BrochureData {
  agency: string;
  logo: string;
  title: string;
  startDate: string;
  duration: number;
  tourLeader: string;
  tourLeaderPhone: string;
  meetingPoint: string;
  meetingTime: string;
  flights: {
    outbound: FlightInfo;
    return: FlightInfo;
  };
  hotels: Hotel[];
  itineraries: ItineraryDay[];
  packingList: string[];
  tips: Tips;
  theme: ThemeColors;
}

export const defaultTheme: ThemeColors = {
  primary: '#1e3a5f',
  secondary: '#f8fafc',
  text: '#1e293b',
};

export const themes = {
  business: {
    primary: '#1e3a5f',
    secondary: '#f8fafc',
    text: '#1e293b',
  },
  nature: {
    primary: '#2d6a4f',
    secondary: '#f0fdf4',
    text: '#1c1917',
  },
  romance: {
    primary: '#be185d',
    secondary: '#fdf2f8',
    text: '#831843',
  },
  energy: {
    primary: '#ea580c',
    secondary: '#fff7ed',
    text: '#7c2d12',
  },
};

export const defaultTips: Tips = {
  airport: '請提前出門，準時抵達機場。由於機場旅客眾多，建議請您攜帶台灣手機，並請主動與領隊電話聯絡。',
  security: '通過安檢時，液體物品需置於100ml以下容器並放入透明夾鏈袋內。電子設備需单独取出。',
  immigration: '請您耐心等候檢驗護照，切勿隨意更換排列隊伍或插隊。驗照時若遇到困難，可以高聲呼叫領隊驅前協助。',
  luggage: '托運行李請務必上鎖，並於行李牌上寫上姓名、聯絡電話。貴重物品請隨身攜帶。',
  destination: '步出入境大廳後，留意小偷非常多，隨時要留心隨身手提物品與行李。',
};

export const defaultPackingList = [
  '護照',
  '機票/電子機票',
  '手機 + 充電線',
  '個人藥物',
  '換洗衣物',
  '防晒乳',
  '雨具',
  '行動電源',
];

export function createDefaultData(): BrochureData {
  return {
    agency: '',
    logo: '',
    title: '',
    startDate: '',
    duration: 5,
    tourLeader: '',
    tourLeaderPhone: '',
    meetingPoint: '',
    meetingTime: '',
    flights: {
      outbound: {
        airline: '',
        flightNumber: '',
        departureTime: '',
        departurePlace: '',
        arrivalTime: '',
        arrivalPlace: '',
      },
      return: {
        airline: '',
        flightNumber: '',
        departureTime: '',
        departurePlace: '',
        arrivalTime: '',
        arrivalPlace: '',
      },
    },
    hotels: [],
    itineraries: [],
    packingList: [...defaultPackingList],
    tips: { ...defaultTips },
    theme: { ...defaultTheme },
  };
}

export function initializeItineraries(duration: number): ItineraryDay[] {
  return Array.from({ length: duration }, (_, i) => ({
    title: `第 ${i + 1} 天`,
    description: '',
    meals: {
      breakfast: false,
      lunch: false,
      dinner: false,
    },
    hotelIndex: null,
    images: [],
  }));
}

export function initializeHotels(duration: number): Hotel[] {
  // Day 1 is departure, no hotel needed
  return Array.from({ length: Math.max(0, duration - 1) }, () => ({
    name: '',
    phone: '',
    address: '',
    morningCall: '',
  }));
}
