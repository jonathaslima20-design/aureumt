import { useState } from 'react';
import { X, Plus, GripVertical, Trash2, Check } from 'lucide-react';
import { supabase, ContactStage } from '../../../lib/supabase';

const STAGE_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#6b7280', '#ef4444',
  '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#14b8a6',
];

export function StageManagerModal({
  stages,
  onClose,
  onUpdate,
}: {
  stages: ContactStage[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [items, setItems] = useState<ContactStage[]>(() =>
    [...stages].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(STAGE_COLORS[4]);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const userId = items[0]?.user_id;
    if (!userId) { setSaving(false); return; }

    const { data } = await supabase
      .from('contact_stages')
      .insert({
        user_id: userId,
        name: newName.trim(),
        color: newColor,
        sort_order: items.length + 1,
        is_default: false,
      })
      .select()
      .single();

    if (data) {
      setItems((prev) => [...prev, data]);
      setNewName('');
      onUpdate();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('contact_stages').delete().eq('id', id);
    setItems((prev) => prev.filter((s) => s.id !== id));
    onUpdate();
  };

  const handleSaveEdit = async (stage: ContactStage) => {
    if (!editName.trim()) { setEditId(null); return; }
    await supabase.from('contact_stages').update({ name: editName.trim() }).eq('id', stage.id);
    setItems((prev) => prev.map((s) => s.id === stage.id ? { ...s, name: editName.trim() } : s));
    setEditId(null);
    onUpdate();
  };

  const handleColorChange = async (id: string, color: string) => {
    await supabase.from('contact_stages').update({ color }).eq('id', id);
    setItems((prev) => prev.map((s) => s.id === id ? { ...s, color } : s));
    onUpdate();
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((s, i) => { s.sort_order = i + 1; });
    setItems(updated);
    await Promise.all(
      updated.map((s, i) =>
        supabase.from('contact_stages').update({ sort_order: i + 1 }).eq('id', s.id)
      )
    );
    onUpdate();
  };

  const moveDown = async (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((s, i) => { s.sort_order = i + 1; });
    setItems(updated);
    await Promise.all(
      updated.map((s, i) =>
        supabase.from('contact_stages').update({ sort_order: i + 1 }).eq('id', s.id)
      )
    );
    onUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="font-display font-bold text-sm text-white">Gerenciar Estagios</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {items.map((stage, idx) => (
            <div key={stage.id} className="flex items-center gap-2 group">
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveUp(idx)}
                  className="text-neutral-600 hover:text-neutral-300 transition-colors p-0.5"
                  disabled={idx === 0}
                >
                  <GripVertical size={10} />
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  className="text-neutral-600 hover:text-neutral-300 transition-colors p-0.5"
                  disabled={idx === items.length - 1}
                >
                  <GripVertical size={10} />
                </button>
              </div>

              <div className="relative">
                <input
                  type="color"
                  value={stage.color}
                  onChange={(e) => handleColorChange(stage.id, e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-6 h-6"
                />
                <div
                  className="w-6 h-6 rounded-full border border-white/10 cursor-pointer"
                  style={{ backgroundColor: stage.color }}
                />
              </div>

              {editId === stage.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(stage); }}
                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-accent/50"
                    autoFocus
                  />
                  <button onClick={() => handleSaveEdit(stage)} className="text-emerald-400 hover:text-emerald-300 p-1">
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <span
                  className="flex-1 text-sm text-neutral-200 cursor-pointer hover:text-white transition-colors"
                  onClick={() => { setEditId(stage.id); setEditName(stage.name); }}
                >
                  {stage.name}
                </span>
              )}

              {stage.is_default ? (
                <span className="text-[9px] text-neutral-600 uppercase font-mono">padrao</span>
              ) : (
                <button
                  onClick={() => handleDelete(stage.id)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all p-1"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 shrink-0">
              {STAGE_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${newColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Novo estagio..."
              className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-accent/50"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
