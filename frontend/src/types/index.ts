// ─── Shared ───────────────────────────────────────────────────────────────
export type UserId = 'lou' | 'amanda';

export interface User {
  name: string;
  city: string;
  shortCity: string;
  tz: number;
  initial: string;
}

// ─── Mood ─────────────────────────────────────────────────────────────────
export interface Mood {
  mark: string;
  label: string;
}

// ─── Thread ───────────────────────────────────────────────────────────────
export type ThreadEntryType =
  | 'letter' | 'voice' | 'photo' | 'prompt' | 'appreciation' | 'checkin';

export interface ThreadEntry {
  id: number;
  from: UserId;
  type: ThreadEntryType;
  text: string;
  date: string;
  time: string;
  transcript?: string;
  caption?: string;
  emoji?: string;
  category?: string;
  heat?: number;
  feeling?: string;
  need?: string;
  thought?: string;
}

// ─── Activities ───────────────────────────────────────────────────────────
export type ActivityStatus = 'active' | 'completed' | 'pending';

export interface Activity {
  id: number;
  label: string;
  duration: string;
  description: string;
  cat: string;
  status: ActivityStatus;
  louDone: boolean;
  amandaDone: boolean;
  mark: string;
  completedDate?: string;
  memory?: string;
  createdAt?: string;
}

// ─── Dates ────────────────────────────────────────────────────────────────
export type DateStatus = 'proposed' | 'accepted' | 'completed' | 'cancelled';

export interface DateEntry {
  id: number;
  status: DateStatus;
  venue: string;
  date?: string;
  exactTime?: string;
  meetType?: 'location' | 'pickup' | 'pickedup';
  title?: string;
  rating?: number;
  memory?: string;
  completedDate?: string;
  lateMinutes?: number;
  lateNote?: string;
  cancelReason?: string;
}

// ─── Milestones ───────────────────────────────────────────────────────────
export interface MilestoneStep {
  id: string;
  text: string;
  done: boolean;
}

export interface Milestone {
  id: string;
  label: string;
  icon: string;
  description: string;
  private: boolean;
  custom: boolean;
  steps: MilestoneStep[];
}

// ─── Map Pins ─────────────────────────────────────────────────────────────
export type PinType = 'home' | 'together' | 'upcoming' | 'bucket';

export interface MapPin {
  id: number;
  city: string;
  country: string;
  lat: number;
  lng: number;
  type: PinType;
  owner?: UserId;
  note?: string;
  dates?: string;
  photos?: string[];
}

// ─── Playlist ─────────────────────────────────────────────────────────────
export type MusicService = 'spotify' | 'apple' | 'youtube';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  addedBy: UserId;
  addedAt: string;
  available: MusicService[];
  isrc?: string;
}

// ─── Vibe Check ───────────────────────────────────────────────────────────
export interface ThisOrThatCard {
  a: string;
  b: string;
  cat: string;
}

export interface PlayHistoryEntry {
  card: ThisOrThatCard;
  myPick: 'a' | 'b';
  theirPick: 'a' | 'b';
  date: string;
  at?: string;
}

export interface VCConnection {
  id: string;
  partnerName: string;
  daysConnected: number;
  matchRate: number;
  solo: boolean;
  preAligned: boolean;
}

export interface Flag {
  id: number;
  type: 'green' | 'yellow' | 'red';
  text: string;
  date: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────
export type AppMode = 'aligned' | 'becoming';
export type AppScreen = 'mode' | 'welcome' | 'onboarding' | 'app';

export type RootStackParamList = {
  ModeSelector: undefined;
  Login: undefined;
  Signup: undefined;
  VerifyEmail: { email: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  AlignedWelcome: undefined;
  AlignedOnboarding: undefined;
  AlignedApp: undefined;
  VibeWelcome: undefined;
  VibeOnboarding: undefined;
  VibeApp: undefined;
  VibeProfile: undefined;
};

export type AlignedTabParamList = {
  Home: undefined;
  Connect: undefined;
  Dates: undefined;
  Thread: undefined;
  Future: undefined;
  Map: undefined;
};

export type VibeTabParamList = {
  Play: undefined;
  VCDates: undefined;
  History: undefined;
  Pulse: undefined;
};