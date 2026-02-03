'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { RefreshCcw } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Fatal Application Error:', error)
    }, [error])

    return (
        <html>
            <body className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-background">
                <div className="mb-8">
                    <Logo className="w-48 text-primary mx-auto" />
                </div>
                <h2 className="text-2xl font-black mb-4 tracking-tight">Үнэхээр уучлаарай 🥺</h2>
                <p className="text-muted-foreground max-w-xs mb-8">
                    Системд ноцтой алдаа гарлаа. Та дахин ачаалаад үзээрэй.
                </p>
                <Button
                    onClick={() => reset()}
                    size="lg"
                    className="font-bold gap-2"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Дахин ачаалах
                </Button>
                <p className="mt-8 text-[10px] text-muted-foreground font-mono opacity-50">
                    Error Digest: {error.digest}
                </p>
            </body>
        </html>
    )
}
