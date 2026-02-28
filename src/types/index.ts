'use client';

import type { Timestamp } from 'firebase/firestore';

export type ComplimentOwner = {
  ownerId: string;
  shareUrl: string;
  shortId: string;
  hintsUsedToday?: number;
  lastHintResetAt?: Timestamp;
  referredBy?: string;
  bonusHints?: number;
  theme?: string; // e.g. 'default', 'dark', 'love', 'ocean'
  xp?: number;
  level?: number;
  badges?: string[]; // e.g. ['first_wispr', '100_club']
  totalCompliments?: number;

  // Social Profile Fields (Phase 1)
  username?: string;
  displayName?: string;
  bio?: string;
  photoURL?: string;
  school?: string;
  workplace?: string;
  isPublic?: boolean;
  lastRadarLocation?: any; // GeoPoint from firebase
  geohash?: string;
  radarExpiresAt?: Timestamp;
  coins?: number; // Phase 10: Virtual currency
};

export type ShortLink = {
  ownerId: string;
};

export type HintContext = {
  frequency: 'Өдөр бүр' | 'Заримдаа' | 'Хааяа' | 'Одоо харьцдаггүй' | '';
  location: 'Ажил' | 'Сургууль' | 'Онлайн' | 'Өөр' | '';
};

export type Compliment = {
  id: string;
  ownerId: string;
  text: string;
  createdAt: Timestamp;
  reactions: { [key: string]: number };
  isRead?: boolean;
  hints?: string[];
  hintContext?: HintContext;
  audioUrl?: string;
  duration?: number;

  // Phase 4: Reply fields
  senderId?: string;
  replyText?: string;
  replyRead?: boolean;
  repliedAt?: Timestamp;

  // Phase 10: Advanced Metadata & Safety
  senderOS?: string;
  senderDistrict?: string;
  reportsCount?: number;
  isFlagged?: boolean;
  isArchived?: boolean;
};

export type ReactionEmoji = '❤️' | '👍' | '😢' | '🔥';

export type Confession = {
  id: string;
  text: string;
  createdAt: Timestamp;
  reactionsCount: Record<ReactionEmoji, number>;
  reportsCount: number;
  isHidden: boolean;
};

export type Invoice = {
  id: string;
  ownerId: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  amount: number;
  numHints: number;
  qpayInvoiceId?: string;
  localInvoiceId: string;
  createdAt: Timestamp;
};

export type PollOption = {
  id: string;
  text: string;
  votes: number;
};

export type Poll = {
  id: string;
  ownerId: string;
  question: string;
  type: 'text' | 'choice';
  options?: PollOption[];
  isActive: boolean;
  createdAt: Timestamp;
  responseCount: number;
};

export type PollResponse = {
  id: string;
  pollId: string;
  answerText?: string;
  optionId?: string;
  createdAt: Timestamp;
};
