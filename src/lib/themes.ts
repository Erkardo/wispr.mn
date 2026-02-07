export type ThemeConfig = {
    id: string;
    name: string;
    colors: {
        primary: string;
        background: string;
        card: string;
        text: string;
        muted: string;
        border: string;
    };
};

// HSL values without 'hsl()' wrapping, to use with Tailwind's <alpha-value> syntax
// e.g. "262.1 83.3% 57.8%"

export const themes: Record<string, ThemeConfig> = {
    default: {
        id: 'default',
        name: 'Үндсэн (Basic)',
        colors: {
            // These will be ignored or should match globals.css defaults if applied
            primary: '262.1 83.3% 57.8%',
            background: '0 0% 100%',
            card: '0 0% 100%',
            text: '222.2 84% 4.9%', // foreground
            muted: '215.4 16.3% 46.9%', // muted-foreground
            border: '214.3 31.8% 91.4%',
        },
    },
    rose: {
        id: 'rose',
        name: 'Сарнай (Rose)',
        colors: {
            primary: '343 88% 50%', // #e11d48
            background: '350 89% 97%', // #fff1f2 (rose-50)
            card: '0 0% 100%', // white
            text: '341 77% 15%', // #881337 (rose-900)
            muted: '342 82% 41%', // #be123c (rose-700) (using as muted text? maybe too dark. Let's use rose-600 for muted text/icon) -> actually muted-foreground usually gray-ish
            border: '349 88% 90%', // #fecdd3 (rose-200)
        },
    },
    ocean: {
        id: 'ocean',
        name: 'Далай (Ocean)',
        colors: {
            primary: '199 89% 48%', // #0ea5e9 (sky-500)
            background: '204 94% 97%', // #f0f9ff (sky-50)
            card: '0 0% 100%',
            text: '201 80% 24%', // #0c4a6e (sky-900)
            muted: '202 92% 32%', // #0369a1 (sky-700)
            border: '200 96% 86%', // #bae6fd (sky-200)
        },
    },
    midnight: {
        id: 'midnight',
        name: 'Шөнө (Midnight)',
        colors: {
            primary: '239 84% 67%', // #818cf8 (indigo-400)
            background: '245 47% 20%', // #1e1b4b (indigo-950) -> Dark background
            card: '244 47% 34%', // #312e81 (indigo-900) -> Card bg
            text: '233 100% 94%', // #e0e7ff (indigo-100) -> Light text
            muted: '235 94% 82%', // #a5b4fc (indigo-300)
            border: '242 57% 51%', // #4338ca (indigo-700)
        },
    },
    sunset: {
        id: 'sunset',
        name: 'Жаргах нар (Sunset)',
        colors: {
            primary: '25 95% 53%', // #f97316 (orange-500)
            background: '28 92% 96%', // #fff7ed (orange-50)
            card: '0 0% 100%',
            text: '15 74% 28%', // #7c2d12 (orange-900)
            muted: '20 90% 48%', // #ea580c (orange-600)
            border: '29 93% 86%', // #fed7aa (orange-200)
        },
    },
};

export function getTheme(themeId?: string): ThemeConfig {
    return themes[themeId as keyof typeof themes] || themes.default;
}
