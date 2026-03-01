export const LEVELS = [
    { level: 1, minXp: 0, title: 'Шинэков' },
    { level: 2, minXp: 50, title: 'Сониуч' },
    { level: 3, minXp: 150, title: 'Олны танил' },
    { level: 4, minXp: 300, title: 'Superstar' },
    { level: 5, minXp: 500, title: 'Домог' },
    { level: 6, minXp: 1000, title: 'Wispr хаан/хатан' },
];

export interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    condition: (stats: { totalCompliments: number; xp: number }) => boolean;
    maxProgress: number;
    getProgress: (stats: { totalCompliments: number; xp: number }) => number;
}

export const BADGES: Badge[] = [
    {
        id: 'first_wispr',
        name: 'Анхны Wispr',
        icon: '🎉',
        description: 'Анхны wispr-ээ хүлээж авлаа!',
        condition: (stats) => stats.totalCompliments >= 1,
        maxProgress: 1,
        getProgress: (stats) => Math.min(stats.totalCompliments, 1)
    },
    {
        id: 'popular_5',
        name: 'Олонд танигдсан',
        icon: '🔥',
        description: '5 wispr хүлээж авсан',
        condition: (stats) => stats.totalCompliments >= 5,
        maxProgress: 5,
        getProgress: (stats) => Math.min(stats.totalCompliments, 5)
    },
    {
        id: 'club_20',
        name: '20 Club',
        icon: '💎',
        description: '20 wispr хүлээж авсан!',
        condition: (stats) => stats.totalCompliments >= 20,
        maxProgress: 20,
        getProgress: (stats) => Math.min(stats.totalCompliments, 20)
    },
    {
        id: 'club_50',
        name: 'Амьд домог',
        icon: '👑',
        description: '50 wispr хүлээн авсан амьд домог',
        condition: (stats) => stats.totalCompliments >= 50,
        maxProgress: 50,
        getProgress: (stats) => Math.min(stats.totalCompliments, 50)
    },
    {
        id: 'xp_500',
        name: 'Туршлагатай',
        icon: '🧠',
        description: '500 XP цуглуулсан',
        condition: (stats) => stats.xp >= 500,
        maxProgress: 500,
        getProgress: (stats) => Math.min(stats.xp, 500)
    },
    {
        id: 'xp_1000',
        name: 'Мэргэжилтэн',
        icon: '🌟',
        description: '1000 XP цуглуулсан',
        condition: (stats) => stats.xp >= 1000,
        maxProgress: 1000,
        getProgress: (stats) => Math.min(stats.xp, 1000)
    }
];

export function getLevel(xp: number) {
    return LEVELS.slice().reverse().find(l => xp >= l.minXp) || LEVELS[0];
}

export function getNextLevel(xp: number) {
    return LEVELS.find(l => l.minXp > xp);
}
