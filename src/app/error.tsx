'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Header } from '@/components/Header'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Page Error:', error)
    }, [error])

    return (
        <div className="flex flex-col min-h-[80vh]">
            <Header title="Алдаа" showBackButton={true} />
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-destructive/10 p-4 rounded-full mb-6">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                </div>
                <h2 className="text-xl font-bold mb-2">Алдаа гарлаа</h2>
                <p className="text-muted-foreground mb-8 max-w-sm">
                    Уучлаарай, энэ хуудсыг ачаалахад алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.
                </p>
                <Button
                    onClick={() => reset()}
                    className="gap-2 font-bold"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Дахин оролдох
                </Button>
            </div>
        </div>
    )
}
