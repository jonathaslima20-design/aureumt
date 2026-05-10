import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Save, Loader2, Zap, Check, X, ChevronDown } from 'lucide-react';
import { supabase, QuickReply, Instance, LABEL_COLORS } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type EditState = {
  id: string | null;
  shortcut: string;
  title: string;
  body: string;
  instance_id: string | null;
};

const EMPTY: EditState = { id: null, shortcut: '', title: '', body: '', instance_id: null };

export function QuickRepliesPage({ instances }: { instances: Instance[] }) {
  const { profile } = useAuth();
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('user_id', profile.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setReplies(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile?.id]);

  useEffect(() => {
    if (edit && bodyRef.current) bodyRef.current.focus();
  }, [edit?.id]);

  const startCreate = () => {
    setEdit({ ...EMPTY, instance_id: instances.length === 1 ? instances[0].id : null });
  };

  const startEdit = (r: QuickReply) => {
    setEdit({ id: r.id, shortcut: r.shortcut, title: r.title, body: r.body, instance_id: r.instance_id });
  };

  const cancel = () => setEdit(null);

  const save = async () => {
    if (!edit || !profile) return;
    if (!edit.title.trim() || !edit.body.trim()) return;
    setSaving(true);
    if (edit.id) {
      await supabase.from('quick_replies').update({
        shortcut: edit.shortcut.trim(),
        title: edit.title.trim(),
        body: edit.body.trim(),
        instance_id: edit.instance_id,
      }).eq('id', edit.id);
      setSavedId(edit.id);
      setTimeout(() => setSavedId(null), 1500);
    } else {
      await supabase.from('quick_replies').insert({
        user_id: profile.id,
        shortcut: edit.shortcut.trim(),
        title: edit.title.trim(),
        body: edit.body.trim(),
        instance_id: edit.instance_id,
        sort_order: replies.length,
      });
    }
    setSaving(false);
    setEdit(null);
    load();
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    await supabase.from('quick_replies').delete().eq('id', id);
    setDeletingId(null);
    setReplies((prev) => prev.filter((r) => r.id !== id));
    if (edit?.id === id) setEdit(null);
  };

  const instanceLabel = (id: string | null) => {
    if (!id) return 'Todos os agentes';
    const inst = instances.find((i) => i.id === id);
    return inst?.display_name || inst?.instance_name || 'Agente';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={18} className="text-neutral-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Respostas Rápidas</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Mensagens pré-configuradas disponíveis no chat via atalho <span className="font-mono text-neutral-400">/</span> ou pelo seletor.
          </p>
        </div>
        {!edit && (
          <button
            onClick={startCreate}
            className="shrink-0 flex items-center gap-2 bg-white text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} />
            Nova resposta
          </button>
        )}
      </div>

      {/* Inline create / edit form */}
      {edit && (
        <div className="border border-[#2a2a2a] rounded-xl bg-[#0f0f0f] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-white">
              {edit.id ? 'Editar resposta' : 'Nova resposta rápida'}
            </div>
            <button onClick={cancel} className="text-neutral-500 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Atalho <span className="normal-case text-neutral-600">(opcional — ex: saudacao)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-mono">/</span>
                <input
                  type="text"
                  value={edit.shortcut}
                  onChange={(e) => setEdit({ ...edit, shortcut: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                  placeholder="saudacao"
                  className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg pl-7 pr-3 py-2.5 text-sm text-white font-mono placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                placeholder="Nome exibido no seletor"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5 block">
              Mensagem <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={bodyRef}
              value={edit.body}
              onChange={(e) => setEdit({ ...edit, body: e.target.value })}
              placeholder="Texto da mensagem que será inserido no chat..."
              rows={4}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors resize-none"
            />
          </div>

          {instances.length > 1 && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5 block">
                Disponível em
              </label>
              <div className="relative">
                <select
                  value={edit.instance_id || ''}
                  onChange={(e) => setEdit({ ...edit, instance_id: e.target.value || null })}
                  className="w-full appearance-none bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors pr-8"
                >
                  <option value="">Todos os agentes</option>
                  {instances.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.display_name || inst.instance_name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving || !edit.title.trim() || !edit.body.trim()}
              className="flex items-center gap-1.5 bg-white text-black rounded-lg px-4 py-2 text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Salvar
            </button>
            <button
              onClick={cancel}
              className="text-sm text-neutral-500 hover:text-white px-3 py-2 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {replies.length === 0 && !edit ? (
        <div className="border border-dashed border-[#242424] rounded-xl p-16 text-center">
          <Zap size={20} className="text-neutral-700 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-neutral-500 mb-4">Nenhuma resposta rápida ainda.</p>
          <button
            onClick={startCreate}
            className="bg-white text-black rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 hover:bg-neutral-200 transition-colors"
          >
            <Plus size={14} />
            Criar a primeira
          </button>
        </div>
      ) : (
        <div className="border border-[#1a1a1a] rounded-xl overflow-hidden bg-[#0a0a0a]">
          <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
            <Zap size={13} className="text-neutral-500" />
            <span className="text-xs uppercase tracking-wider text-neutral-500">
              {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
            </span>
          </div>
          <div className="divide-y divide-[#111]">
            {replies.map((r) => {
              const isEditing = edit?.id === r.id;
              const isSaved = savedId === r.id;
              return (
                <div
                  key={r.id}
                  className={`group px-5 py-4 hover:bg-[#0d0d0d] transition-colors ${isEditing ? 'bg-[#0d0d0d]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm text-white font-medium">{r.title}</span>
                        {r.shortcut && (
                          <span className="text-[10px] font-mono bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-400 px-1.5 py-0.5 rounded">
                            /{r.shortcut}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-600 border border-[#1a1a1a] rounded px-1.5 py-0.5">
                          {instanceLabel(r.instance_id)}
                        </span>
                      </div>
                      <p className="text-[12px] text-neutral-500 leading-relaxed line-clamp-2">{r.body}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isSaved ? (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <Check size={11} /> Salvo
                        </span>
                      ) : (
                        <button
                          onClick={() => startEdit(r)}
                          className="text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded-md border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => remove(r.id)}
                        disabled={deletingId === r.id}
                        className="p-1.5 text-neutral-600 hover:text-red-400 transition-colors"
                      >
                        {deletingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Color reference — not used here but shows the palette is imported */}
      <div className="hidden">{LABEL_COLORS.join(',')}</div>
    </div>
  );
}
