import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name')?.slice(0, 100) || 'Найз';

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #1e1b4b 0%, #3b1d8a 50%, #6d28d9 100%)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                >
                    {/* Ambient glow */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '700px',
                        height: '700px',
                        background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
                        display: 'flex',
                    }} />

                    {/* Card */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '32px',
                            padding: '50px 70px',
                            width: '82%',
                            textAlign: 'center',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        {/* Logo wordmark - solid white, no gradient so all messengers render it */}
                        <div
                            style={{
                                fontSize: 72,
                                fontWeight: 900,
                                color: '#ffffff',
                                letterSpacing: '-3px',
                                marginBottom: 8,
                                lineHeight: 1,
                            }}
                        >
                            Wispr
                        </div>

                        {/* Tagline */}
                        <div style={{
                            fontSize: 22,
                            color: 'rgba(255,255,255,0.5)',
                            fontWeight: 500,
                            marginBottom: 40,
                            letterSpacing: '0.05em',
                        }}>
                            wispr.mn
                        </div>

                        {/* Recipient name */}
                        <div
                            style={{
                                fontSize: 44,
                                fontWeight: 800,
                                color: '#e9d5ff',
                                marginBottom: 16,
                                letterSpacing: '-1px',
                            }}
                        >
                            {name}-д
                        </div>

                        {/* Description */}
                        <div
                            style={{
                                fontSize: 28,
                                color: 'rgba(255,255,255,0.7)',
                                lineHeight: 1.5,
                                marginBottom: 40,
                                fontWeight: 500,
                            }}
                        >
                            нэргүйгээр сэтгэлийн үг үлдээгээч 💛
                        </div>

                        {/* CTA Button */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#8b5cf6',
                                color: 'white',
                                padding: '16px 40px',
                                borderRadius: '50px',
                                fontSize: 26,
                                fontWeight: 700,
                                boxShadow: '0 8px 32px rgba(139,92,246,0.5)',
                            }}
                        >
                            Энд дарж бичих ✍️
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            },
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
