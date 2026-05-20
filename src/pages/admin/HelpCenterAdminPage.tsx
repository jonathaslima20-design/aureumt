import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Loader2, Pencil, Trash2, Eye, EyeOff, Star, ArrowUp, ArrowDown,
  X, Search, BookOpen, FolderOpen, Save, ThumbsUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../../lib/supabase';

type HelpCategory = {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
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
  created_at: string;
};

type Tab = 'categories' | 'articles';

const ICON_OPTIONS = [
  'book-open', 'rocket', 'settings', 'users', 'message-square', 'zap',
  'shield', 'link', 'database', 'bot', 'credit-card', 'globe',
  'layout-dashboard', 'code', 'phone', 'mail', 'image', 'video',
  'file-text', 'help-circle', 'lightbulb', 'target', 'trending-up', 'folder',
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function HelpCenterAdminPage() {
  const [tab, setTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactionStats, setReactionStats] = useState<Record<string, { helpful: number; total: number }>>({});

  const fetchData = async () => {
    const [catRes, artRes, reactRes] = await Promise.all([
      supabase.from('help_categories').select('*').order('sort_order'),
      supabase.from('help_articles').select('*').order('sort_order'),
      supabase.from('help_article_reactions').select('article_id, reaction'),
    ]);
    setCategories(catRes.data || []);
    setArticles(artRes.data || []);
    const stats: Record<string, { helpful: number; total: number }> = {};
    (reactRes.data || []).forEach((r: { article_id: string; reaction: string }) => {
      if (!stats[r.article_id]) stats[r.article_id] = { helpful: 0, total: 0 };
      stats[r.article_id].total++;
      if (r.reaction === 'helpful') stats[r.article_id].helpful++;
    });
    setReactionStats(stats);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={20} className="animate-spin text-neutral-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader />

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('categories')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${
            tab === 'categories' ? 'bg-white/[0.08] text-white' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><FolderOpen size={12} /> Categorias ({categories.length})</span>
        </button>
        <button
          onClick={() => setTab('articles')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${
            tab === 'articles' ? 'bg-white/[0.08] text-white' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><BookOpen size={12} /> Artigos ({articles.length})</span>
        </button>
      </div>

      {tab === 'categories' && (
        <CategoriesTab
          categories={categories}
          articleCounts={articles.reduce((acc, a) => { acc[a.category_id] = (acc[a.category_id] || 0) + 1; return acc; }, {} as Record<string, number>)}
          onRefresh={fetchData}
        />
      )}
      {tab === 'articles' && (
        <ArticlesTab
          articles={articles}
          categories={categories}
          reactionStats={reactionStats}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}

function SectionHeader() {
  return (
    <header>
      <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent block mb-1">GESTAO DE CONTEUDO</span>
      <h1 className="font-display font-bold text-xl tracking-tighter text-white uppercase">Central de Ajuda</h1>
      <p className="text-sm text-neutral-500 mt-1">Gerencie categorias e artigos do manual de uso.</p>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Categories Tab
   ═══════════════════════════════════════════════════════════════════════════════ */

function CategoriesTab({
  categories,
  articleCounts,
  onRefresh,
}: {
  categories: HelpCategory[];
  articleCounts: Record<string, number>;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HelpCategory | null>(null);

  const handleMove = async (cat: HelpCategory, dir: 'up' | 'down') => {
    const idx = categories.findIndex((c) => c.id === cat.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const other = categories[swapIdx];
    await Promise.all([
      supabase.from('help_categories').update({ sort_order: other.sort_order }).eq('id', cat.id),
      supabase.from('help_categories').update({ sort_order: cat.sort_order }).eq('id', other.id),
    ]);
    onRefresh();
  };

  const handleToggle = async (cat: HelpCategory) => {
    await supabase.from('help_categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    onRefresh();
  };

  const handleDelete = async (cat: HelpCategory) => {
    if (!confirm(`Excluir a categoria "${cat.title}"? Todos os artigos desta categoria serão removidos.`)) return;
    await supabase.from('help_categories').delete().eq('id', cat.id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-accent text-white rounded-lg px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(255,59,0,0.25)] hover:shadow-[0_0_30px_rgba(255,59,0,0.4)] transition-all"
        >
          <Plus size={13} /> Nova categoria
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="border border-dashed border-[#242424] rounded-xl p-12 text-center bg-[#0d0d0d]">
          <p className="text-sm text-neutral-400">Nenhuma categoria criada</p>
          <p className="text-xs text-neutral-600 mt-1">Crie categorias para organizar os artigos.</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-neutral-500">Categoria</th>
                <th className="text-center px-3 py-3 text-[10px] font-mono uppercase tracking-wider text-neutral-500">Artigos</th>
                <th className="text-center px-3 py-3 text-[10px] font-mono uppercase tracking-wider text-neutral-500">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-neutral-500">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-[#141414] border border-[#242424] flex items-center justify-center">
                        <DynamicIcon name={cat.icon_name} size={13} className="text-accent" />
                      </div>
                      <div>
                        <div className="text-white font-medium text-xs">{cat.title}</div>
                        <div className="text-neutral-600 text-[10px] mt-0.5">{cat.description || 'Sem descricao'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="text-xs text-neutral-400">{articleCounts[cat.id] || 0}</span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={`inline-block text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded ${
                      cat.is_active ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                    }`}>
                      {cat.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="text-right px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => handleMove(cat, 'up')} disabled={idx === 0} className="p-1 text-neutral-600 hover:text-white disabled:opacity-30 transition-colors"><ArrowUp size={12} /></button>
                      <button onClick={() => handleMove(cat, 'down')} disabled={idx === categories.length - 1} className="p-1 text-neutral-600 hover:text-white disabled:opacity-30 transition-colors"><ArrowDown size={12} /></button>
                      <button onClick={() => handleToggle(cat)} className="p-1 text-neutral-600 hover:text-white transition-colors">{cat.is_active ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                      <button onClick={() => { setEditing(cat); setShowForm(true); }} className="p-1 text-neutral-600 hover:text-white transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(cat)} className="p-1 text-neutral-600 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CategoryFormModal
          category={editing}
          nextOrder={categories.length}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

/* ─── Category Form Modal ─── */
function CategoryFormModal({
  category,
  nextOrder,
  onClose,
  onSaved,
}: {
  category: HelpCategory | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(category?.title || '');
  const [slug, setSlug] = useState(category?.slug || '');
  const [description, setDescription] = useState(category?.description || '');
  const [iconName, setIconName] = useState(category?.icon_name || 'book-open');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const data = {
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      description: description.trim(),
      icon_name: iconName,
      updated_at: new Date().toISOString(),
    };

    if (category) {
      await supabase.from('help_categories').update(data).eq('id', category.id);
    } else {
      await supabase.from('help_categories').insert({ ...data, sort_order: nextOrder });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-display font-bold text-white uppercase">
            {category ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Titulo</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (!category) setSlug(slugify(e.target.value)); }}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none focus:border-accent/40"
              placeholder="Ex: Primeiros Passos"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-neutral-400 focus:outline-none focus:border-accent/40 font-mono"
              placeholder="primeiros-passos"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Descricao</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none focus:border-accent/40 resize-none"
              placeholder="Uma breve descricao da categoria..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Icone</label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map((name) => (
                <button
                  key={name}
                  onClick={() => setIconName(name)}
                  className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                    iconName === name
                      ? 'bg-accent/20 border border-accent/50'
                      : 'bg-[#141414] border border-[#242424] hover:border-white/[0.12]'
                  }`}
                >
                  <DynamicIcon name={name} size={13} className={iconName === name ? 'text-accent' : 'text-neutral-500'} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 border border-[#1e1e1e] text-neutral-300 hover:text-white rounded-lg py-2.5 text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 bg-accent text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Articles Tab
   ═══════════════════════════════════════════════════════════════════════════════ */

function ArticlesTab({
  articles,
  categories,
  reactionStats,
  onRefresh,
}: {
  articles: HelpArticle[];
  categories: HelpCategory[];
  reactionStats: Record<string, { helpful: number; total: number }>;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<HelpArticle | null>(null);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (filterCat !== 'all' && a.category_id !== filterCat) return false;
      if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [articles, search, filterCat]);

  const catMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => { m[c.id] = c.title; });
    return m;
  }, [categories]);

  const handleToggle = async (art: HelpArticle) => {
    await supabase.from('help_articles').update({ is_active: !art.is_active }).eq('id', art.id);
    onRefresh();
  };

  const handleToggleFeatured = async (art: HelpArticle) => {
    await supabase.from('help_articles').update({ is_featured: !art.is_featured }).eq('id', art.id);
    onRefresh();
  };

  const handleDelete = async (art: HelpArticle) => {
    if (!confirm(`Excluir o artigo "${art.title}"?`)) return;
    await supabase.from('help_articles').delete().eq('id', art.id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artigo..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-xs text-white focus:outline-none focus:border-accent/40"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-xs text-white focus:outline-none"
          >
            <option value="all">Todas categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setEditing(null); setShowEditor(true); }}
          className="bg-accent text-white rounded-lg px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(255,59,0,0.25)] hover:shadow-[0_0_30px_rgba(255,59,0,0.4)] transition-all"
        >
          <Plus size={13} /> Novo artigo
        </button>
      </div>

      {/* Articles list */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-[#242424] rounded-xl p-12 text-center bg-[#0d0d0d]">
          <p className="text-sm text-neutral-400">Nenhum artigo encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((art) => {
            const stats = reactionStats[art.id];
            const pct = stats && stats.total > 0 ? Math.round((stats.helpful / stats.total) * 100) : null;
            return (
              <div key={art.id} className="glass rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white font-medium truncate">{art.title}</span>
                    {art.is_featured && <Star size={10} className="text-accent shrink-0" fill="currentColor" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-neutral-600">
                    <span className="flex items-center gap-1"><FolderOpen size={9} /> {catMap[art.category_id] || '?'}</span>
                    <span className="flex items-center gap-1"><Eye size={9} /> {art.views_count}</span>
                    {pct !== null && (
                      <span className="flex items-center gap-1"><ThumbsUp size={9} /> {pct}%</span>
                    )}
                    <span className={art.is_active ? 'text-emerald-500' : 'text-neutral-600'}>
                      {art.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggleFeatured(art)} className={`p-1.5 rounded transition-colors ${art.is_featured ? 'text-accent' : 'text-neutral-600 hover:text-accent'}`} title="Destaque"><Star size={12} /></button>
                  <button onClick={() => handleToggle(art)} className="p-1.5 text-neutral-600 hover:text-white transition-colors" title="Toggle status">{art.is_active ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                  <button onClick={() => { setEditing(art); setShowEditor(true); }} className="p-1.5 text-neutral-600 hover:text-white transition-colors" title="Editar"><Pencil size={12} /></button>
                  <button onClick={() => handleDelete(art)} className="p-1.5 text-neutral-600 hover:text-red-400 transition-colors" title="Excluir"><Trash2 size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditor && (
        <ArticleEditorModal
          article={editing}
          categories={categories}
          nextOrder={articles.length}
          onClose={() => { setShowEditor(false); setEditing(null); }}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

/* ─── Article Editor Modal ─── */
function ArticleEditorModal({
  article,
  categories,
  nextOrder,
  onClose,
  onSaved,
}: {
  article: HelpArticle | null;
  categories: HelpCategory[];
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(article?.title || '');
  const [slug, setSlug] = useState(article?.slug || '');
  const [categoryId, setCategoryId] = useState(article?.category_id || (categories[0]?.id || ''));
  const [summary, setSummary] = useState(article?.summary || '');
  const [content, setContent] = useState(article?.content || '');
  const [videoUrl, setVideoUrl] = useState(article?.video_url || '');
  const [coverUrl, setCoverUrl] = useState(article?.cover_image_url || '');
  const [isFeatured, setIsFeatured] = useState(article?.is_featured || false);
  const [isActive, setIsActive] = useState(article?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !categoryId) return;
    setSaving(true);
    const data = {
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      category_id: categoryId,
      summary: summary.trim(),
      content,
      video_url: videoUrl.trim() || null,
      cover_image_url: coverUrl.trim() || null,
      is_featured: isFeatured,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    if (article) {
      await supabase.from('help_articles').update(data).eq('id', article.id);
    } else {
      await supabase.from('help_articles').insert({ ...data, sort_order: nextOrder });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <h3 className="text-sm font-display font-bold text-white uppercase">
            {article ? 'Editar Artigo' : 'Novo Artigo'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-colors ${
                previewMode ? 'bg-accent/20 text-accent border border-accent/40' : 'text-neutral-500 border border-[#242424] hover:text-white'
              }`}
            >
              {previewMode ? 'Editar' : 'Preview'}
            </button>
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!previewMode ? (
            <>
              {/* Meta fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Titulo</label>
                  <input
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); if (!article) setSlug(slugify(e.target.value)); }}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none focus:border-accent/40"
                    placeholder="Titulo do artigo"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Slug</label>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-neutral-400 font-mono focus:outline-none focus:border-accent/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none"
                  >
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">URL do Video (YouTube/Vimeo)</label>
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none focus:border-accent/40"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">URL da Imagem de Capa</label>
                <input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none focus:border-accent/40"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Resumo</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white focus:outline-none focus:border-accent/40 resize-none"
                  placeholder="Descricao breve do artigo..."
                />
              </div>

              {/* Markdown editor - split view */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">Conteudo (Markdown)</label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] text-sm text-white font-mono focus:outline-none focus:border-accent/40 resize-none min-h-[300px]"
                    placeholder="# Titulo&#10;&#10;Escreva o conteudo em Markdown..."
                  />
                  <div className="rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] p-4 overflow-y-auto min-h-[300px] max-h-[500px]">
                    <div className="prose-help">
                      {content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                      ) : (
                        <p className="text-neutral-600 text-xs italic">Preview aparecera aqui...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="accent-accent w-3.5 h-3.5"
                  />
                  <span className="text-xs text-neutral-300">Destaque</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-accent w-3.5 h-3.5"
                  />
                  <span className="text-xs text-neutral-300">Ativo</span>
                </label>
              </div>
            </>
          ) : (
            /* Full preview mode */
            <div className="space-y-4">
              <div className="glass rounded-xl p-6">
                <h2 className="font-display font-bold text-lg text-white mb-2">{title || 'Sem titulo'}</h2>
                {summary && <p className="text-sm text-neutral-400 mb-4">{summary}</p>}
                {videoUrl && <VideoPreview url={videoUrl} />}
                <div className="prose-help mt-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '*Sem conteudo*'}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-white/[0.06] shrink-0">
          <button onClick={onClose} className="flex-1 border border-[#1e1e1e] text-neutral-300 hover:text-white rounded-lg py-2.5 text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !categoryId}
            className="flex-1 bg-accent text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {article ? 'Salvar Alteracoes' : 'Publicar Artigo'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Video Preview ─── */
function VideoPreview({ url }: { url: string }) {
  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) return <p className="text-xs text-neutral-600 italic">URL de video invalida</p>;
  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#1e1e1e] bg-black mb-4" style={{ paddingBottom: '56.25%' }}>
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Video preview"
      />
    </div>
  );
}

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

/* ─── Dynamic Icon (shared utility) ─── */
import { DynamicIcon } from '../../lib/iconMap';
