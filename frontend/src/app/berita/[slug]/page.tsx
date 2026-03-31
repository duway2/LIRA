import { notFound } from "next/navigation";
import Link from "next/link";
import axios from "axios";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params;
    const res = await axios.get(`http://127.0.0.1:8080/api/v1/articles/${resolvedParams.slug}`);
    const article = res.data.article;
    
    const plainTextDescription = article.content.replace(/<[^>]+>/g, '').substring(0, 160) + '...';
    
    return {
      title: `${article.title} - Kabar LIRA`,
      description: plainTextDescription,
      openGraph: {
        title: article.title,
        description: plainTextDescription,
        type: 'article',
        publishedTime: article.published_at,
        authors: [article.author_name],
        images: article.featured_image_url ? [`http://127.0.0.1:8080${article.featured_image_url}`] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description: plainTextDescription,
        images: article.featured_image_url ? [`http://127.0.0.1:8080${article.featured_image_url}`] : [],
      }
    };
  } catch (err) {
    return { title: "Berita Tidak Ditemukan" };
  }
}

export default async function ReadArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  let article = null;
  
  try {
    const resolvedParams = await params;
    const res = await axios.get(`http://127.0.0.1:8080/api/v1/articles/${resolvedParams.slug}`);
    article = res.data.article;
  } catch (err) {
    notFound();
  }

  if (!article) return notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "image": article.featured_image_url ? [`http://127.0.0.1:8080${article.featured_image_url}`] : [],
    "datePublished": article.published_at || article.created_at,
    "dateModified": article.updated_at,
    "author": [{
      "@type": "Person",
      "name": article.author_name || "Redaksi LIRA",
    }],
    "publisher": {
      "@type": "Organization",
      "name": "Lumbung Informasi Rakyat",
      "logo": {
        "@type": "ImageObject",
        "url": "https://lira.org/logo.png"
      }
    }
  };

  return (
    <article className="max-w-4xl mx-auto px-4 lg:px-8 py-16 pb-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      <Link href="/berita" className="text-lira-red hover:text-lira-red-dark transition-colors text-sm font-bold flex items-center gap-2 mb-8">
        &larr; Indeks Berita
      </Link>

      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight font-sans tracking-tight">
          {article.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-6 mt-8 py-6 border-y border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-lira-red flex items-center justify-center font-bold text-white shadow-md">
              {article.author_name[0]?.toUpperCase() || "R"}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{article.author_name || "Redaksi LIRA"}</p>
              <p className="text-xs text-gray-500 font-medium">Pewarta Jurnalis Independen</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

          <div>
            <p className="text-xs text-gray-400 font-medium">Diterbitkan pada</p>
            <p className="text-sm font-bold text-gray-700">
              {new Date(article.published_at || article.created_at).toLocaleDateString("id-ID", {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          
          <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

          <div>
            <p className="text-xs text-gray-400 font-medium">Telah Dibaca</p>
            <p className="text-sm font-bold text-gray-700">{article.view_count} kali</p>
          </div>
        </div>
      </div>

      {article.featured_image_url && (
        <figure className="mb-12 rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
          <img src={`http://127.0.0.1:8080${article.featured_image_url}`} alt={article.title} className="w-full h-auto object-cover max-h-[600px]" />
          <figcaption className="p-4 bg-gray-50 text-center text-xs text-gray-500 italic font-medium">Ilustrasi Laporan Kegiatan / Dokumen Investigasi</figcaption>
        </figure>
      )}

      {/* TIPTAP RENDER AREA */}
      <div 
        className="prose prose-red md:prose-lg xl:prose-xl max-w-none prose-img:rounded-2xl prose-img:border prose-img:border-gray-200 prose-img:shadow-lg prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-lira-red hover:prose-a:text-lira-red-dark prose-p:text-gray-700 prose-p:leading-relaxed transition-all"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
      
      <div className="mt-24 pt-8 border-t border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">&copy; Hak Cipta Jurnalistik LIRA Indonesia. Dilarang mereproduksi tanpa izin.</span>
        <div className="flex gap-3">
          <button className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors font-bold text-sm shadow-sm" title="Bagikan ke Facebook">F</button>
          <button className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors font-bold text-sm shadow-sm" title="Bagikan ke X">X</button>
          <button className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors font-bold text-sm shadow-sm" title="Salin Tautan">S</button>
        </div>
      </div>
    </article>
  );
}
