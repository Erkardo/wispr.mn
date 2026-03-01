import { ImageResponse } from 'next/og';
import { Logo } from '@/components/Logo';

export const runtime = 'edge';

// Image metadata
export const alt = 'Wispr - Сэтгэлийн үгээ шивнээч';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: '#09090b', // zinc-950 (Dark mode background)
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}
            >
                {/* Ambient Glow */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '800px',
                        height: '800px',
                        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(0,0,0,0) 70%)',
                    }}
                />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* Logo SVG rendered directly for @vercel/og compatibility */}
                    <svg
                        width="400"
                        height="120"
                        viewBox="0 0 800 240"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M141.6 37.6C122.4 37.6 109.6 50.4 109.6 69.6V117.6C109.6 136.8 122.4 149.6 141.6 149.6H167.2V175.2H141.6C108.8 175.2 84 150.4 84 117.6V69.6C84 36.8 108.8 12 141.6 12H192.8V37.6H141.6Z"
                            fill="url(#paint0_linear)"
                        />
                        <path
                            d="M173.6 202.4C192.8 202.4 205.6 189.6 205.6 170.4V122.4C205.6 103.2 192.8 90.4 173.6 90.4H148V64.8H173.6C206.4 64.8 231.2 89.6 231.2 122.4V170.4C231.2 203.2 206.4 228 173.6 228H122.4V202.4H173.6Z"
                            fill="url(#paint1_linear)"
                        />
                        <path d="M280 178V62H308.8V178H280Z" fill="white" />
                        <path d="M344 142.8V62H372.8V142.8C372.8 155.6 384 165.2 396.8 165.2C409.6 165.2 420.8 155.6 420.8 142.8V62H449.6V142.8C449.6 171.6 426.4 194.8 396.8 194.8C367.2 194.8 344 171.6 344 142.8Z" fill="white" />
                        <path d="M490.4 178V62H519.2V178H490.4Z" fill="white" />
                        <path d="M547.2 178V62H626.4V87.6H576V107.6H616.8V133.2H576V152.4H626.4V178H547.2Z" fill="white" />
                        <path d="M652.8 178V62H716.8C739.2 62 756 78.8 756 101.2C756 117.2 746.4 130.8 732.8 137.6L761.6 178H728L702.4 140.4H681.6V178H652.8ZM716.8 114.8C724.8 114.8 730.4 109.2 730.4 101.2C730.4 93.2 724.8 87.6 716.8 87.6H681.6V114.8H716.8Z" fill="white" />
                        <defs>
                            <linearGradient
                                id="paint0_linear"
                                x1="84"
                                y1="12"
                                x2="192.8"
                                y2="175.2"
                                gradientUnits="userSpaceOnUse"
                            >
                                <stop stopColor="#F97316" />
                                <stop offset="1" stopColor="#EAB308" />
                            </linearGradient>
                            <linearGradient
                                id="paint1_linear"
                                x1="122.4"
                                y1="64.8"
                                x2="231.2"
                                y2="228"
                                gradientUnits="userSpaceOnUse"
                            >
                                <stop stopColor="#F43F5E" />
                                <stop offset="1" stopColor="#F97316" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
