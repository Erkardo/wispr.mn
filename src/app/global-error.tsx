'use client'

import { useEffect } from 'react'
import { RefreshCcw, Home } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Fatal Application Error:', error)
    }, [error])

    return (
        <html lang="mn">
            <body style={{
                display: 'flex',
                minHeight: '100vh',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                textAlign: 'center',
                background: 'hsl(240 10% 4%)',
                color: 'hsl(0 0% 98%)',
                fontFamily: 'system-ui, sans-serif',
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😔</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>
                    Үнэхээр уучлаарай
                </h1>
                <p style={{ color: 'hsl(240 5% 65%)', maxWidth: '300px', marginBottom: '2rem', lineHeight: 1.6 }}>
                    Системд ноцтой алдаа гарлаа. Та дахин ачаалаад үзээрэй.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                        onClick={() => reset()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1.5rem', borderRadius: '9999px',
                            background: 'hsl(263.4 95.2% 66.3%)', color: 'white',
                            border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem'
                        }}
                    >
                        <RefreshCcw width={16} height={16} />
                        Дахин оролдох
                    </button>
                    <a
                        href="/"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1.5rem', borderRadius: '9999px',
                            background: 'hsl(240 4% 16%)', color: 'white',
                            textDecoration: 'none', fontWeight: 700, fontSize: '1rem'
                        }}
                    >
                        <Home width={16} height={16} />
                        Нүүр хуудас
                    </a>
                </div>
                {error.digest && (
                    <p style={{ marginTop: '2rem', fontSize: '0.65rem', color: 'hsl(240 5% 45%)', fontFamily: 'monospace' }}>
                        Error ID: {error.digest}
                    </p>
                )}
            </body>
        </html>
    )
}
