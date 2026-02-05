export type StoryDesign = {
    id: string;
    name: string;
    gradient: string;
    textColor: string;
    stickerStyle: string; // 'glass' | 'solid' | 'outline'
    stickerColor?: string;
    overlayColor?: string; // For the instructional overlay arrows/text
};

export const STORY_DESIGNS: StoryDesign[] = [
    {
        id: 'purple-dream',
        name: 'Purple Dream',
        gradient: 'from-purple-400 via-pink-500 to-indigo-600',
        textColor: 'text-white',
        stickerStyle: 'glass',
        overlayColor: 'text-white/90'
    },
    {
        id: 'ocean-breeze',
        name: 'Ocean Breeze',
        gradient: 'from-cyan-400 via-blue-500 to-blue-700',
        textColor: 'text-white',
        stickerStyle: 'glass',
        overlayColor: 'text-white/90'
    },
    {
        id: 'sunset-vibes',
        name: 'Sunset Vibes',
        gradient: 'from-orange-400 via-red-500 to-purple-600',
        textColor: 'text-white',
        stickerStyle: 'glass',
        overlayColor: 'text-white/90'
    },
    {
        id: 'dark-knight',
        name: 'Dark Knight',
        gradient: 'from-gray-800 via-gray-900 to-black',
        textColor: 'text-white',
        stickerStyle: 'outline',
        overlayColor: 'text-white/70'
    },
    {
        id: 'cotton-candy',
        name: 'Cotton Candy',
        gradient: 'from-pink-300 via-purple-300 to-indigo-300',
        textColor: 'text-indigo-900',
        stickerStyle: 'solid',
        stickerColor: 'bg-white/80 text-indigo-900',
        overlayColor: 'text-indigo-900/90'
    }
];
