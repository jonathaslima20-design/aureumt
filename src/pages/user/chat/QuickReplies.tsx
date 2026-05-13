import { useEffect, useRef, useState } from 'react';
import {
  Zap, X, Plus, Trash2, Save, Check, ChevronDown, Loader2,
} from 'lucide-react';
import { supabase, Instance, QuickReply } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

type EditState = {
  id: string | null;
  shortcut: string;
  title: string;
  body: string;
  instance_id: string | null;
};

const EMPTY_EDIT: EditState = { id: null, shortcut: '', title: '', body: '', instance_id: null };

export function QuickReplyPicker({
  replies,
  query,
  onSelect,
  onClose,
}: {
  replies: QuickReply[];
  query: string;
  onSelect: (body: string) => void;
  onClose: () => void;
}) {
  const filtered = replies.filter(
    (r) =>
      r.shortcut.toLowerCase().includes(query.toLowerCase()) ||
      r.title.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden z-30 max-h-64 overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
          <Zap size={10} /> Respostas rápidas
        </span>
        <button onClick={onClose} className="text-neutral-600 hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>
      {filtered.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.body)}
          className="w-full text-left px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors border-b border-[#111] last:border-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white">{r.title}</span>
            {r.shortcut && (
              <span className="text-[9px] font-mono text-neutral-500 bg-[#0d0d0d] px-1.5 py-0.5 rounded border border-[#1a1a1a]">
                /{r.shortcut}
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">{r.body}</p>
        </button>
      ))}
    </div>
  );
}

export function QuickRepliesPanel({
  instances,
  replies,
  onReload,
  onClose,
  onInsert,
}: {
  instances: Instance[];
  replies: QuickReply[];
  onReload: () => void;
  onClose: () => void;
  onInsert: (body: string) => void;
}) {
  const { profile } = useAuth();
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (edit && bodyRef.current) bodyRef.current.focus();
  }, [edit?.id]);

  const startCreate = () =>
    setEdit({ ...EMPTY_EDIT, instance_id: instances.length === 1 ? instances[0].id : null });

  const startEdit = (r: QuickReply) =>
    setEdit({ id: r.id, shortcut: r.shortcut, title: r.title, body: r.body, instance_id: r.instance_id });

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
    onReload();
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    await supabase.from('quick_replies').delete().eq('id', id);
    setDeletingId(null);
    onReload();
    if (edit?.id === id) setEdit(null);
  };

  const instanceLabel = (id: string | null) => {
    if (!id) return 'Todos';
    const inst = instances.find((i) => i.id === id);
    return inst?.display_name || inst?.instance_name || 'Agente';
  };

  return (
    <div className="flex flex-col border-l border-[#242424] bg-[#0a0a0a] w-72 shrink-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-neutral-400" />
          <span className="text-xs font-medium text-white">Respostas Rápidas</span>
        </div>
        <div className="flex items-center gap-1">
          {!edit && (
            <button onClick={startCreate} className="text-neutral-500 hover:text-white transition-colors p-1" title="Nova resposta">
              <Plus size={13} />
            </button>
          )}
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-1">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {edit && (
          <div className="p-3 border-b border-[#1a1a1a] space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">
              {edit.id ? 'Editar resposta' : 'Nova resposta'}
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1 block">Atalho</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-mono">/</span>
                <input
                  type="text"
                  value={edit.shortcut}
                  onChange={(e) => setEdit({ ...edit, shortcut: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                  placeholder="saudacao"
                  className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg pl-6 pr-2.5 py-2 text-xs text-white font-mono placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1 block">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                placeholder="Nome no seletor"
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1 block">
                Mensagem <span className="text-red-400">*</span>
              </label>
              <textarea
                ref={bodyRef}
                value={edit.body}
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                placeholder="Texto da mensagem..."
                rows={3}
                className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors resize-none"
              />
            </div>
            {instances.length > 1 && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1 block">Disponível em</label>
                <div className="relative">
                  <select
                    value={edit.instance_id || ''}
                    onChange={(e) => setEdit({ ...edit, instance_id: e.target.value || null })}
                    className="w-full appearance-none bg-[#050505] border border-[#1a1a1a] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-neutral-600 transition-colors pr-7"
                  >
                    <option value="">Todos os agentes</option>
                    {instances.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.display_name || inst.instance_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                disabled={saving || !edit.title.trim() || !edit.body.trim()}
                className="flex items-center gap-1.5 bg-white text-black rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-neutral-200 transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Salvar
              </button>
              <button onClick={cancel} className="text-xs text-neutral-500 hover:text-white px-2 py-1.5 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {replies.length === 0 && !edit ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Zap size={18} className="text-neutral-700 mb-3" strokeWidth={1.5} />
            <p className="text-xs text-neutral-600 mb-3">Nenhuma resposta ainda.</p>
            <button
              onClick={startCreate}
              className="text-xs bg-white text-black rounded-lg px-3 py-1.5 font-medium hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
            >
              <Plus size={11} /> Criar
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#111]">
            {replies.map((r) => {
              const isSaved = savedId === r.id;
              return (
                <div key={r.id} className="group px-3 py-3 hover:bg-[#0d0d0d] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => onInsert(r.body)} className="min-w-0 flex-1 text-left" title="Clique para inserir no chat">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-xs text-white font-medium truncate">{r.title}</span>
                        {r.shortcut && (
                          <span className="text-[9px] font-mono bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-500 px-1 py-0.5 rounded shrink-0">
                            /{r.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-600 leading-relaxed line-clamp-2">{r.body}</p>
                      <span className="text-[9px] text-neutral-700 mt-0.5 block">{instanceLabel(r.instance_id)}</span>
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isSaved ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <button
                          onClick={() => startEdit(r)}
                          className="text-[10px] text-neutral-500 hover:text-white px-1.5 py-1 rounded border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => remove(r.id)}
                        disabled={deletingId === r.id}
                        className="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                      >
                        {deletingId === r.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
