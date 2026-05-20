import { useEffect, useState, useRef } from 'react';
import { X, Save, Plus, Trash2, MessageSquare, Brain, StickyNote, Bot, Tag } from 'lucide-react';
import { supabase, Contact, ContactStage, ContactLabel, ContactAgent, CustomerMemory, Instance, LABEL_COLORS } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

type AgentInfo = ContactAgent & { instance_name: string; color: string };

export function ContactDetailPanel({
  contact,
  stages,
  instances,
  onClose,
  onUpdate,
}: {
  contact: Contact;
  stages: ContactStage[];
  instances: Instance[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { profile } = useAuth();
  const [name, setName] = useState(contact.display_name);
  const [email, setEmail] = useState(contact.email || '');
  const [company, setCompany] = useState(contact.company || '');
  const [phoneSecondary, setPhoneSecondary] = useState(contact.phone_secondary || '');
  const [stageId, setStageId] = useState(contact.stage_id || '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [labels, setLabels] = useState<ContactLabel[]>([]);
  const [notes, setNotes] = useState<{ id: string; content: string; created_at: string; instance_id: string }[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [memory, setMemory] = useState<CustomerMemory | null>(null);
  const [newNote, setNewNote] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadDetails();
  }, [contact.id, contact.customer_number]);

  const loadDetails = async () => {
    if (!profile) return;
    const instanceIds = instances.map((i) => i.id);
    if (instanceIds.length === 0) return;

    const [labelsRes, notesRes, agentsRes, memoryRes] = await Promise.all([
      supabase
        .from('contact_labels')
        .select('*')
        .in('instance_id', instanceIds)
        .eq('customer_number', contact.customer_number),
      supabase
        .from('contact_notes')
        .select('*')
        .in('instance_id', instanceIds)
        .eq('customer_number', contact.customer_number)
        .order('created_at', { ascending: false }),
      supabase
        .from('contact_agents')
        .select('*')
        .eq('contact_id', contact.id),
      supabase
        .from('customer_memory')
        .select('*')
        .in('instance_id', instanceIds)
        .eq('customer_number', contact.customer_number)
        .limit(1)
        .maybeSingle(),
    ]);

    setLabels(labelsRes.data || []);
    setNotes(notesRes.data || []);
    setMemory(memoryRes.data);

    const agentData: AgentInfo[] = (agentsRes.data || []).map((a: ContactAgent) => {
      const inst = instances.find((i) => i.id === a.instance_id);
      return { ...a, instance_name: inst?.display_name || inst?.instance_name || 'Agente', color: inst?.color || '#6b7280' };
    });
    setAgents(agentData);
  };

  useEffect(() => {
    setName(contact.display_name);
    setEmail(contact.email || '');
    setCompany(contact.company || '');
    setPhoneSecondary(contact.phone_secondary || '');
    setStageId(contact.stage_id || '');
    setDirty(false);
  }, [contact]);

  const handleFieldChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => handleSave(value, setter), 2000);
  };

  const handleSave = async (_?: string, __?: (v: string) => void) => {
    if (!dirty) return;
    setSaving(true);
    await supabase.from('contacts').update({
      display_name: name,
      email: email.trim() || null,
      company: company.trim() || null,
      phone_secondary: phoneSecondary.trim() || null,
      stage_id: stageId || null,
      updated_at: new Date().toISOString(),
    }).eq('id', contact.id);
    setSaving(false);
    setDirty(false);
    onUpdate();
  };

  const handleStageChange = async (newStageId: string) => {
    setStageId(newStageId);
    await supabase.from('contacts').update({
      stage_id: newStageId || null,
      updated_at: new Date().toISOString(),
    }).eq('id', contact.id);
    onUpdate();
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || instances.length === 0) return;
    const { data } = await supabase
      .from('contact_notes')
      .insert({
        instance_id: instances[0].id,
        customer_number: contact.customer_number,
        content: newNote.trim(),
      })
      .select()
      .single();
    if (data) {
      setNotes((prev) => [data, ...prev]);
      setNewNote('');
    }
  };

  const handleDeleteNote = async (id: string) => {
    await supabase.from('contact_notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAddLabel = async () => {
    if (!newLabel.trim() || instances.length === 0) return;
    const color = LABEL_COLORS[labels.length % LABEL_COLORS.length];
    const { data } = await supabase
      .from('contact_labels')
      .insert({
        instance_id: instances[0].id,
        customer_number: contact.customer_number,
        label: newLabel.trim(),
        color,
      })
      .select()
      .single();
    if (data) {
      setLabels((prev) => [...prev, data]);
      setNewLabel('');
      setShowLabelInput(false);
    }
  };

  const handleRemoveLabel = async (id: string) => {
    await supabase.from('contact_labels').delete().eq('id', id);
    setLabels((prev) => prev.filter((l) => l.id !== id));
  };

  const currentStage = stages.find((s) => s.id === stageId);
  const initial = (name || contact.customer_number).slice(0, 1).toUpperCase();

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0a0a0a] border-l border-white/[0.06] overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/[0.06] px-5 py-4 flex items-center justify-between z-10">
          <h3 className="font-display font-bold text-sm text-white">Detalhes do Contato</h3>
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="text-[10px] px-2 py-1 bg-accent/10 text-accent rounded border border-accent/20 hover:bg-accent/20 transition-colors flex items-center gap-1"
              >
                <Save size={10} /> Salvar
              </button>
            )}
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Header / Avatar */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-lg font-bold text-neutral-300">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <input
                value={name}
                onChange={(e) => handleFieldChange(setName, e.target.value)}
                placeholder="Nome do contato"
                className="w-full bg-transparent text-white font-display font-bold text-base outline-none border-b border-transparent focus:border-white/10 transition-colors pb-0.5"
              />
              <p className="text-xs text-neutral-500 font-mono mt-0.5">{contact.customer_number}</p>
            </div>
            {currentStage && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                style={{ background: currentStage.color + '22', color: currentStage.color, border: `1px solid ${currentStage.color}44` }}
              >
                {currentStage.name}
              </span>
            )}
          </div>

          {/* Stage selector */}
          <div>
            <label className="text-[10px] text-neutral-600 uppercase font-mono tracking-wide block mb-1.5 flex items-center gap-1">
              <Bot size={10} /> Estagio
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleStageChange('')}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                  !stageId ? 'bg-white/10 border-white/20 text-white' : 'border-[#1c1c1c] text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Nenhum
              </button>
              {stages.sort((a, b) => a.sort_order - b.sort_order).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStageChange(s.id)}
                  className="text-[10px] px-2.5 py-1 rounded-full border transition-colors"
                  style={stageId === s.id
                    ? { background: s.color + '22', color: s.color, border: `1px solid ${s.color}55` }
                    : { borderColor: '#1c1c1c', color: '#737373' }
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Info fields */}
          <div className="space-y-3">
            <label className="text-[10px] text-neutral-600 uppercase font-mono tracking-wide block flex items-center gap-1">
              <MessageSquare size={10} /> Informacoes
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-neutral-600 block mb-0.5">Email</span>
                <input
                  value={email}
                  onChange={(e) => handleFieldChange(setEmail, e.target.value)}
                  placeholder="-"
                  className="w-full bg-[#141414] border border-white/[0.06] rounded px-2 py-1.5 text-xs text-white outline-none focus:border-accent/30 transition-colors"
                />
              </div>
              <div>
                <span className="text-[9px] text-neutral-600 block mb-0.5">Empresa</span>
                <input
                  value={company}
                  onChange={(e) => handleFieldChange(setCompany, e.target.value)}
                  placeholder="-"
                  className="w-full bg-[#141414] border border-white/[0.06] rounded px-2 py-1.5 text-xs text-white outline-none focus:border-accent/30 transition-colors"
                />
              </div>
              <div className="col-span-2">
                <span className="text-[9px] text-neutral-600 block mb-0.5">Tel. Secundario</span>
                <input
                  value={phoneSecondary}
                  onChange={(e) => handleFieldChange(setPhoneSecondary, e.target.value)}
                  placeholder="-"
                  className="w-full bg-[#141414] border border-white/[0.06] rounded px-2 py-1.5 text-xs text-white outline-none focus:border-accent/30 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="text-[10px] text-neutral-600 uppercase font-mono tracking-wide block mb-1.5 flex items-center gap-1">
              <Tag size={10} /> Etiquetas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium group"
                  style={{ background: l.color + '22', color: l.color, border: `1px solid ${l.color}44` }}
                >
                  {l.label}
                  <button
                    onClick={() => handleRemoveLabel(l.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={8} />
                  </button>
                </span>
              ))}
              {showLabelInput ? (
                <div className="flex items-center gap-1">
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddLabel(); if (e.key === 'Escape') setShowLabelInput(false); }}
                    placeholder="Nova etiqueta"
                    className="bg-[#141414] border border-white/10 rounded px-2 py-0.5 text-[10px] text-white w-24 outline-none focus:border-accent/40"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowLabelInput(true)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-white/10 text-neutral-500 hover:text-white hover:border-white/20 transition-colors flex items-center gap-0.5"
                >
                  <Plus size={8} /> Adicionar
                </button>
              )}
            </div>
          </div>

          {/* Agents */}
          {agents.length > 0 && (
            <div>
              <label className="text-[10px] text-neutral-600 uppercase font-mono tracking-wide block mb-1.5 flex items-center gap-1">
                <Bot size={10} /> Agentes ({agents.length})
              </label>
              <div className="space-y-1.5">
                {agents.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 bg-[#141414] rounded-lg px-3 py-2 border border-white/[0.04]">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: a.color }}>
                      {a.instance_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-200 truncate">{a.instance_name}</p>
                      <p className="text-[10px] text-neutral-600">{a.message_count} msgs</p>
                    </div>
                    <span className="text-[9px] text-neutral-600">
                      {new Date(a.last_interaction_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] text-neutral-600 uppercase font-mono tracking-wide block mb-1.5 flex items-center gap-1">
              <StickyNote size={10} /> Notas ({notes.length})
            </label>
            <div className="flex items-start gap-2 mb-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicionar nota..."
                rows={2}
                className="flex-1 bg-[#141414] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-accent/30 resize-none transition-colors"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-30 shrink-0"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {notes.map((n) => (
                <div key={n.id} className="group bg-[#0f0f0f] rounded-lg px-3 py-2 border border-white/[0.04]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-neutral-300 whitespace-pre-wrap flex-1">{n.content}</p>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all p-0.5 shrink-0"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  <p className="text-[9px] text-neutral-600 mt-1">
                    {new Date(n.created_at).toLocaleDateString('pt-BR')} {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Memory */}
          {memory && (
            <div>
              <label className="text-[10px] text-neutral-600 uppercase font-mono tracking-wide block mb-1.5 flex items-center gap-1">
                <Brain size={10} /> Memoria IA
              </label>
              <div className="bg-[#0f0f0f] rounded-lg px-3 py-3 border border-white/[0.04] space-y-2">
                {memory.customer_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-neutral-600 w-20 shrink-0">Nome detectado</span>
                    <span className="text-xs text-neutral-300">{memory.customer_name}</span>
                  </div>
                )}
                {memory.relationship_level && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-neutral-600 w-20 shrink-0">Relacionamento</span>
                    <span className="text-xs text-neutral-300 capitalize">{memory.relationship_level}</span>
                  </div>
                )}
                {memory.total_interactions > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-neutral-600 w-20 shrink-0">Interacoes</span>
                    <span className="text-xs text-neutral-300">{memory.total_interactions}</span>
                  </div>
                )}
                {memory.last_topics && (
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] text-neutral-600 w-20 shrink-0 mt-0.5">Topicos</span>
                    <span className="text-xs text-neutral-300">{memory.last_topics}</span>
                  </div>
                )}
                {Array.isArray(memory.facts) && memory.facts.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] text-neutral-600 w-20 shrink-0 mt-0.5">Fatos</span>
                    <div className="flex flex-wrap gap-1">
                      {memory.facts.map((f, i) => (
                        <span key={i} className="text-[10px] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 text-neutral-400">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
