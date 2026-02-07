'use client';

import { useMemo } from 'react';
import { themes } from '@/lib/themes';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ComplimentOwner } from '@/types';

interface ThemeSelectorProps {
    currentThemeId?: string;
    ownerData?: ComplimentOwner | null;
}

export function ThemeSelector({ currentThemeId = 'default', ownerData }: ThemeSelectorProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleThemeChange = async (themeId: string) => {
        if (!user || !firestore) return;

        try {
            const userRef = doc(firestore, 'complimentOwners', user.uid);
            await updateDoc(userRef, {
                theme: themeId
            });
            toast({
                title: "Загвар солигдлоо",
                description: `Таны профайл загвар "${themes[themeId].name}" болж өөрчлөгдлөө.`,
            });
        } catch (error) {
            console.error("Error updating theme:", error);
            toast({
                title: "Алдаа гарлаа",
                description: "Загвар солиход алдаа гарлаа.",
                variant: "destructive",
            });
        }
    };

    const themeList = useMemo(() => Object.values(themes), []);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    <CardTitle>Профайл Загвар</CardTitle>
                </div>
                <CardDescription>
                    Таны профайл хуудас бусдад хэрхэн харагдахыг тохируулаарай.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {themeList.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => handleThemeChange(theme.id)}
                            className={cn(
                                "relative group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                currentThemeId === theme.id ? "border-primary bg-primary/5" : "border-transparent hover:border-gray-200 bg-gray-50"
                            )}
                        >
                            <div
                                className="w-full aspect-video rounded-lg shadow-sm border"
                                style={{
                                    background: `hsl(${theme.colors.background})`,
                                    borderColor: `hsl(${theme.colors.border})`
                                }}
                            >
                                <div className="h-full w-full flex flex-col p-2 gap-1.5 opacity-80">
                                    <div className="h-2 w-1/3 rounded-full opacity-50" style={{ background: `hsl(${theme.colors.primary})` }} />
                                    <div className="h-8 w-full rounded-md shadow-sm opacity-90" style={{ background: `hsl(${theme.colors.card})` }} />
                                </div>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                                {theme.name}
                            </span>
                            {currentThemeId === theme.id && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                    <Check className="h-3 w-3" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
