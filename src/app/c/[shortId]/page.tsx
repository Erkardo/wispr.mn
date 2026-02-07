import { Header } from '@/components/Header';
import { ComplimentSubmitClient } from './ComplimentSubmitClient';
import { Metadata } from 'next';
import { db } from '@/lib/db';
import { doc, getDoc } from 'firebase/firestore';

type Props = {
  params: Promise<{ shortId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shortId } = await params;

  // Try to fetch owner info for better SEO
  let title = "Wispr - Надад нэг сэтгэлийн үг үлдээгээч 💛";
  let description = "Нэргүйгээр сэтгэлийн үгээ хуваалцах хамгийн аюулгүй газар.";
  let ogImageUrl = `https://wispr.mn/api/og?name=${encodeURIComponent('Найз')}`;

  try {
    const shortLinkSnap = await getDoc(doc(db, 'shortLinks', shortId));
    if (shortLinkSnap.exists()) {
      const ownerId = shortLinkSnap.data().ownerId;
      const ownerSnap = await getDoc(doc(db, 'complimentOwners', ownerId));
      if (ownerSnap.exists()) {
        const name = ownerSnap.data().displayName || "найздаа";
        title = `Wispr: ${name}-д нэргүйгээр сэтгэлийн үг үлдээгээч 💛`;
        description = `${name}-д хэлж чадаагүй үгээ энд нэрээ нууцлан үлдээгээрэй. Хэн болохыг тань хэн ч мэдэхгүй.`;
        ogImageUrl = `https://wispr.mn/api/og?name=${encodeURIComponent(name)}`;
      }
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

export default async function SubmitComplimentShortIdPage({ params }: Props) {
  const { shortId } = await params;

  return (
    <>
      <Header title="Wispr үлдээх" showBackButton={false} />
      <main>
        <ComplimentSubmitClient shortId={shortId} />
      </main>
    </>
  );
}
