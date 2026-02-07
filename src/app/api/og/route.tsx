import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name')?.slice(0, 100) || 'Найз';
        const text = searchParams.get('text')?.slice(0, 100) || 'Сэтгэлийн үгээ шивнээч';

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
                        backgroundColor: '#fff',
                        backgroundImage: 'linear-gradient(to bottom right, #8b5cf6, #ec4899)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '24px',
                            padding: '40px 60px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                            width: '85%',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 60,
                                fontWeight: 900,
                                background: 'linear-gradient(to right, #8b5cf6, #ec4899)',
                                backgroundClip: 'text',
                                color: 'transparent',
                                marginBottom: 20,
                                letterSpacing: '-2px',
                            }}
                        >
                            Wispr
                        </div>
                        <div
                            style={{
                                fontSize: 40,
                                fontStyle: 'normal',
                                letterSpacing: '-1px',
                                color: '#1f2937',
                                marginBottom: 10,
                                whiteSpace: 'pre-wrap',
                                fontWeight: 700,
                            }}
                        >
                            {name}-д
                        </div>
                        <div
                            style={{
                                fontSize: 32,
                                fontStyle: 'normal',
                                color: '#4b5563',
                                lineHeight: 1.4,
                                marginBottom: 30,
                                fontWeight: 500,
                            }}
                        >
                            нэргүйгээр сэтгэлийн үг үлдээгээч 💛
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                padding: '12px 30px',
                                borderRadius: '50px',
                                fontSize: 24,
                                fontWeight: 600,
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
