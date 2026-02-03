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
