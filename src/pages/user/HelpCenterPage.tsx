import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search, ChevronRight, Eye, ThumbsUp, ThumbsDown,
  Star, Play, BookOpen, Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type HelpCategory = {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
};

type HelpArticle = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  video_url: string | null;
  cover_image_url: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  views_count: number;
};

type View = 'home' | 'category' | 'article' | 'search';

export function HelpCenterPage() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('home');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
  const [searching, setSearching] = useState(false);
  const [userReaction, setUserReaction] = useState<'helpful' | 'not_helpful' | null>(null);
  const [reactionLoading, setReactionLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [catRes, artRes] = await Promise.all([
        supabase.from('help_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('help_articles').select('*').eq('is_active', true).order('sort_order'),
      ]);
      setCategories(catRes.data || []);
      setArticles(artRes.data || []);
      setLoading(false);
    })();
  }, []);

  const featured = useMemo(() => articles.filter((a) => a.is_featured).slice(0, 6), [articles]);

  const categoryArticles = useMemo(() => {
    if (!selectedCategory) return [];
    return articles.filter((a) => a.category_id === selectedCategory.id);
  }, [articles, selectedCategory]);

  const articleCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    articles.forEach((a) => { map[a.category_id] = (map[a.category_id] || 0) + 1; });
    return map;
  }, [articles]);

  const handleSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      setView('home');
      return;
    }
    setSearching(true);
    setView('search');
    const { data } = await supabase
      .from('help_articles')
      .select('*')
      .eq('is_active', true)
      .or(`title.ilike.%${term}%,summary.ilike.%${term}%`)
      .order('views_count', { ascending: false })
      .limit(20);
    setSearchResults(data || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) handleSearch(search.trim());
      else if (view === 'search') setView('home');
    }, 300);
    return () => clearTimeout(timer);
  }, [search, handleSearch, view]);

  const openCategory = (cat: HelpCategory) => {
    setSelectedCategory(cat);
    setSelectedArticle(null);
    setView('category');
    setSearch('');
  };

  const openArticle = async (art: HelpArticle) => {
    setSelectedArticle(art);
    setView('article');
    setSearch('');
    setUserReaction(null);
    supabase.rpc('increment_article_views', { article_id: art.id });
    if (profile) {
      const { data } = await supabase
        .from('help_article_reactions')
        .select('reaction')
        .eq('article_id', art.id)
        .eq('user_id', profile.id)
        .maybeSingle();
      if (data) setUserReaction(data.reaction as 'helpful' | 'not_helpful');
    }
  };

  const handleReaction = async (reaction: 'helpful' | 'not_helpful') => {
    if (!profile || !selectedArticle || reactionLoading) return;
    setReactionLoading(true);
    if (userReaction === reaction) {
      await supabase
        .from('help_article_reactions')
        .delete()
        .eq('article_id', selectedArticle.id)
        .eq('user_id', profile.id);
      setUserReaction(null);
    } else {
      await supabase
        .from('help_article_reactions')
        .upsert(
          { article_id: selectedArticle.id, user_id: profile.id, reaction },
          { onConflict: 'article_id,user_id' }
        );
      setUserReaction(reaction);
    }
    setReactionLoading(false);
  };

  const goHome = () => {
    setView('home');
    setSelectedCategory(null);
    setSelectedArticle(null);
    setSearch('');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={20} className="animate-spin text-neutral-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header>
        <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">SUPORTE</span>
        <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Central de Ajuda</h1>
        <p className="text-sm text-neutral-500 mt-1">Encontre tutoriais, guias e respostas sobre como usar o sistema.</p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar na Central de Ajuda..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-accent/40 transition-colors"
        />
      </div>

      {/* Breadcrumb */}
      {view !== 'home' && view !== 'search' && (
        <Breadcrumb
          category={selectedCategory}
          article={selectedArticle}
          onHome={goHome}
          onCategory={() => { setSelectedArticle(null); setView('category'); }}
        />
      )}

      {/* Views */}
      {view === 'home' && (
        <HomeView
          categories={categories}
          featured={featured}
          articleCountByCategory={articleCountByCategory}
          onOpenCategory={openCategory}
          onOpenArticle={openArticle}
        />
      )}
      {view === 'search' && (
        <SearchResultsView
          results={searchResults}
          searching={searching}
          term={search}
          categories={categories}
          onOpenArticle={openArticle}
        />
      )}
      {view === 'category' && selectedCategory && (
        <CategoryView
          category={selectedCategory}
          articles={categoryArticles}
          onOpenArticle={openArticle}
        />
      )}
      {view === 'article' && selectedArticle && (
        <ArticleView
          article={selectedArticle}
          category={categories.find((c) => c.id === selectedArticle.category_id) || null}
          relatedArticles={articles.filter((a) => a.category_id === selectedArticle.category_id && a.id !== selectedArticle.id).slice(0, 3)}
          userReaction={userReaction}
          reactionLoading={reactionLoading}
          onReaction={handleReaction}
          onOpenArticle={openArticle}
        />
      )}
    </div>
  );
}

/* ─── Breadcrumb ─── */
function Breadcrumb({
  category,
  article,
  onHome,
  onCategory,
}: {
  category: HelpCategory | null;
  article: HelpArticle | null;
  onHome: () => void;
  onCategory: () => void;
}) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-neutral-500">
      <button onClick={onHome} className="hover:text-white transition-colors">Central de Ajuda</button>
      {category && (
        <>
          <ChevronRight size={10} />
          <button onClick={onCategory} className="hover:text-white transition-colors">{category.title}</button>
        </>
      )}
      {article && (
        <>
          <ChevronRight size={10} />
          <span className="text-neutral-300 truncate max-w-[200px]">{article.title}</span>
        </>
      )}
    </nav>
  );
}

/* ─── Home View ─── */
function HomeView({
  categories,
  featured,
  articleCountByCategory,
  onOpenCategory,
  onOpenArticle,
}: {
  categories: HelpCategory[];
  featured: HelpArticle[];
  articleCountByCategory: Record<string, number>;
  onOpenCategory: (cat: HelpCategory) => void;
  onOpenArticle: (art: HelpArticle) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star size={14} className="text-accent" />
            <h2 className="text-sm font-display font-medium text-white">Artigos em destaque</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {featured.map((art) => (
              <FeaturedCard key={art.id} article={art} onClick={() => onOpenArticle(art)} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={14} className="text-accent" />
            <h2 className="text-sm font-display font-medium text-white">Categorias</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onOpenCategory(cat)}
                className="group text-left bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-[#121212] aura-card"
              >
                <div className="w-9 h-9 rounded-lg bg-[#141414] border border-[#242424] flex items-center justify-center mb-3">
                  <DynamicIcon name={cat.icon_name} size={16} className="text-accent" />
                </div>
                <div className="text-sm font-medium text-white mb-1">{cat.title}</div>
                <div className="text-[11px] text-neutral-500 line-clamp-2">{cat.description}</div>
                <div className="mt-3 text-[10px] text-neutral-600 font-mono uppercase tracking-wider">
                  {articleCountByCategory[cat.id] || 0} artigo{(articleCountByCategory[cat.id] || 0) !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {categories.length === 0 && featured.length === 0 && (
        <div className="border border-dashed border-[#242424] rounded-xl p-16 text-center bg-[#0d0d0d]">
          <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#242424] flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-neutral-600" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-neutral-400 mb-1">Nenhum conteudo disponivel</p>
          <p className="text-xs text-neutral-600">A Central de Ajuda sera preenchida em breve.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Featured Card ─── */
function FeaturedCard({ article, onClick }: { article: HelpArticle; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl overflow-hidden border border-[#1e1e1e] bg-[#0f0f0f] transition-all duration-300 hover:border-white/[0.12] aura-card flex flex-col"
    >
      {article.cover_image_url && (
        <div className="h-32 w-full overflow-hidden">
          <img
            src={article.cover_image_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        {article.video_url && (
          <div className="flex items-center gap-1 text-[10px] text-accent font-mono uppercase tracking-wider mb-2">
            <Play size={9} /> Video
          </div>
        )}
        <div className="text-sm font-medium text-white mb-1 line-clamp-2">{article.title}</div>
        <div className="text-[11px] text-neutral-500 line-clamp-2 flex-1">{article.summary}</div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-neutral-600">
          <Eye size={10} /> {article.views_count}
        </div>
      </div>
    </button>
  );
}

/* ─── Search Results ─── */
function SearchResultsView({
  results,
  searching,
  term,
  categories,
  onOpenArticle,
}: {
  results: HelpArticle[];
  searching: boolean;
  term: string;
  categories: HelpCategory[];
  onOpenArticle: (art: HelpArticle) => void;
}) {
  const catMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => { m[c.id] = c.title; });
    return m;
  }, [categories]);

  if (searching) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={18} className="animate-spin text-neutral-600" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-neutral-400">Nenhum resultado para "{term}"</p>
        <p className="text-xs text-neutral-600 mt-1">Tente termos diferentes ou navegue pelas categorias.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500 mb-3">{results.length} resultado{results.length !== 1 ? 's' : ''} para "{term}"</p>
      {results.map((art) => (
        <button
          key={art.id}
          onClick={() => onOpenArticle(art)}
          className="w-full text-left p-4 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] hover:border-white/[0.12] transition-all aura-card"
        >
          <div className="text-sm font-medium text-white mb-0.5">{art.title}</div>
          <div className="text-[11px] text-neutral-500 line-clamp-2">{art.summary}</div>
          <div className="mt-2 text-[10px] text-neutral-600 font-mono uppercase tracking-wider">
            {catMap[art.category_id] || ''}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Category View ─── */
function CategoryView({
  category,
  articles,
  onOpenArticle,
}: {
  category: HelpCategory;
  articles: HelpArticle[];
  onOpenArticle: (art: HelpArticle) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-center">
          <DynamicIcon name={category.icon_name} size={18} className="text-accent" />
        </div>
        <div>
          <h2 className="text-base font-display font-bold text-white">{category.title}</h2>
          <p className="text-xs text-neutral-500">{category.description}</p>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#242424] rounded-xl bg-[#0d0d0d]">
          <p className="text-sm text-neutral-500">Nenhum artigo nesta categoria ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((art) => (
            <button
              key={art.id}
              onClick={() => onOpenArticle(art)}
              className="w-full text-left p-4 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] hover:border-white/[0.12] transition-all flex items-center gap-4 aura-card"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white mb-0.5">{art.title}</div>
                <div className="text-[11px] text-neutral-500 line-clamp-1">{art.summary}</div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-neutral-600 shrink-0">
                {art.video_url && <Play size={10} className="text-accent" />}
                <span className="flex items-center gap-1"><Eye size={10} /> {art.views_count}</span>
                <ChevronRight size={12} className="text-neutral-600" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Article View ─── */
function ArticleView({
  article,
  category,
  relatedArticles,
  userReaction,
  reactionLoading,
  onReaction,
  onOpenArticle,
}: {
  article: HelpArticle;
  category: HelpCategory | null;
  relatedArticles: HelpArticle[];
  userReaction: 'helpful' | 'not_helpful' | null;
  reactionLoading: boolean;
  onReaction: (r: 'helpful' | 'not_helpful') => void;
  onOpenArticle: (art: HelpArticle) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Article header */}
      <div>
        <h2 className="font-display font-bold text-lg text-white">{article.title}</h2>
        {article.summary && (
          <p className="text-sm text-neutral-400 mt-1">{article.summary}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-neutral-600">
          <span className="flex items-center gap-1"><Eye size={10} /> {article.views_count} visualizacoes</span>
          {category && (
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono uppercase tracking-wider">
              {category.title}
            </span>
          )}
        </div>
      </div>

      {/* Video embed */}
      {article.video_url && <VideoEmbed url={article.video_url} />}

      {/* Markdown content */}
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="prose-help">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </div>
      </div>

      {/* Reaction */}
      <div className="glass rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
        <span className="text-sm text-neutral-300">Este artigo foi util?</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReaction('helpful')}
            disabled={reactionLoading}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              userReaction === 'helpful'
                ? 'bg-emerald-950/60 border border-emerald-700/50 text-emerald-400'
                : 'border border-[#242424] text-neutral-400 hover:text-white hover:border-white/[0.12]'
            }`}
          >
            <ThumbsUp size={13} /> Sim
          </button>
          <button
            onClick={() => onReaction('not_helpful')}
            disabled={reactionLoading}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              userReaction === 'not_helpful'
                ? 'bg-red-950/60 border border-red-700/50 text-red-400'
                : 'border border-[#242424] text-neutral-400 hover:text-white hover:border-white/[0.12]'
            }`}
          >
            <ThumbsDown size={13} /> Nao
          </button>
        </div>
      </div>

      {/* Related articles */}
      {relatedArticles.length > 0 && (
        <section>
          <h3 className="text-sm font-display font-medium text-white mb-3">Artigos relacionados</h3>
          <div className="space-y-2">
            {relatedArticles.map((art) => (
              <button
                key={art.id}
                onClick={() => onOpenArticle(art)}
                className="w-full text-left p-3 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] hover:border-white/[0.12] transition-all flex items-center gap-3"
              >
                <BookOpen size={12} className="text-neutral-600 shrink-0" />
                <span className="text-xs text-neutral-300 truncate">{art.title}</span>
                <ChevronRight size={10} className="text-neutral-600 ml-auto shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Video Embed ─── */
function VideoEmbed({ url }: { url: string }) {
  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#1e1e1e] bg-black" style={{ paddingBottom: '56.25%' }}>
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Video"
      />
    </div>
  );
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

/* ─── Dynamic Icon (re-export from shared map) ─── */
import { DynamicIcon } from '../../lib/iconMap';
