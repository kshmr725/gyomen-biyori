export type Coordinates = { lat: number; lng: number };
export type BudgetChoice = "cheap" | "standard" | "unlimited";
export type QueueChoice = "none" | "under30" | "unlimited";
export type QueueLevel = "none" | "under30" | "over30" | "unknown";
export type NoveltyChoice = "new" | "repeat";
export type QueueEstimate = { weekdayLunch: QueueLevel; weekdayDinner: QueueLevel; holidayLunch: QueueLevel; holidayDinner: QueueLevel; offPeak: QueueLevel };
export type AdminScores = { soup: number; noodles: number; toppings: number; completeness: number };
export type TimeRange = { open: string; close: string };
export type WeeklyHours = Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, TimeRange[]>>;
export type MenuItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  photo: string;
  tags: string[];
  isSignature?: boolean;
};

export type TravelMode = "walk" | "mrt" | "any";

export type DataSource = { title: string; url: string };

export type Shop = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  basePrice: number;
  googleRating: number;
  openNow: boolean;
  openingHours: WeeklyHours;
  hoursSummary: string;
  recommendationReady: boolean;
  description: string;
  coverImage: string;
  photos: string[];
  menuItems: MenuItem[];
  mrtInfo?: { station: string; walkMinutes: number };
  queue: QueueEstimate;
  adminScores: AdminScores;
  editorialStatus: "neutral" | "reviewed";
  dataSources: DataSource[];
  verifiedAt: string;
};
export type RecommendationPreferences = {
  travelMode?: TravelMode;
  travelMinutes?: number;
  walkMinutes?: number;
  budget: BudgetChoice;
  queue: QueueChoice;
  novelty: NoveltyChoice;
  eatenIds: Set<string>;
};
export type RecommendationResult = { selected: Shop | null; alternatives: Shop[]; ranked: Array<{ shop: Shop; score: number }>; reason: string };


