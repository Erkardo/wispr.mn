import { ComplimentSubmitClient } from './ComplimentSubmitClient';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ shortId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shortId: _ } = await params;

  // Static fallback metadata — dynamic title is set via OG at share time
  const title = "Wispr — Надад нэргүйгээр сэтгэлийн үг үлдээгээч 💛";
  const description = "Хэлмээр байсан тэр үгийг нэрээ нууцлан зоригтойгоор үлдээ. Хэн болохыг тань хэн ч мэдэхгүй.";
  const ogImageUrl = `https://wispr.mn/api/og?name=${encodeURIComponent('Найз')}`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images: [{ url: ogImageUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImageUrl] },
  };
}

export default async function SubmitComplimentShortIdPage({ params }: Props) {
  const { shortId } = await params;

  return (
    <main>
      <ComplimentSubmitClient shortId={shortId} />
    </main>
  );
}
