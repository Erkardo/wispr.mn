import { Header } from '@/components/Header';
import { ComplimentSubmitClient } from '@/app/c/[shortId]/ComplimentSubmitClient';
import { Metadata } from 'next';
import { getAdminDb } from '@/lib/admin-db';
import { notFound } from 'next/navigation';

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    if (!decodedSlug.startsWith('@')) {
        return {};
    }

    const username = decodedSlug.substring(1).toLowerCase();

    let title = `Wispr - @${username}-д сэтгэлийн үг үлдээгээч 💛`;
    let description = "Нэргүйгээр сэтгэлийн үгээ хуваалцах хамгийн аюулгүй газар.";
    let ogImageUrl = `https://wispr.mn/api/og?name=${encodeURIComponent(username)}`;

    try {
        const adminDb = getAdminDb();
        const snapshot = await adminDb.collection('complimentOwners').where('username', '==', username).limit(1).get();
        if (!snapshot.empty) {
            const ownerSnap = snapshot.docs[0];
            const name = ownerSnap.data().displayName || `@${username}`;
            title = `Wispr: ${name}-д нэргүйгээр сэтгэлийн үг үлдээгээч 💛`;
            description = `${name}-д хэлж чадаагүй үгээ энд нэрээ нууцлан үлдээгээрэй. Хэн болохыг тань хэн ч мэдэхгүй.`;
            ogImageUrl = `https://wispr.mn/api/og?name=${encodeURIComponent(name)}`;
        }
    } catch (e) {
        console.error("Metadata generation error:", e);
    }

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl],
        }
    };
}

export default async function SlugPage({ params }: Props) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    if (!decodedSlug.startsWith('@')) {
        notFound();
    }

    const username = decodedSlug.substring(1).toLowerCase();

    try {
        const adminDb = getAdminDb();
        const snapshot = await adminDb.collection('complimentOwners')
            .where('username', '==', username)
            .limit(1)
            .get();

        if (snapshot.empty) {
            notFound();
        }

        const ownerId = snapshot.docs[0].id;

        return (
            <>
                <Header title="Wispr үлдээх" showBackButton={true} />
                <main>
                    <ComplimentSubmitClient ownerIdProp={ownerId} />
                </main>
            </>
        );
    } catch (e) {
        console.error("Error fetching user profile for slug", e);
        notFound();
    }
}
