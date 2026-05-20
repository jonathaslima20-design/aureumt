import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { supabase, ContactStage } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { parseCSV, detectColumnMapping, CSVParseResult } from './csv';

type Step = 'upload' | 'mapping' | 'importing' | 'done';

export function ImportCSVModal({
  stages,
  onClose,
  onDone,
}: {
  stages: ContactStage[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [parsed, setParsed] = useState<CSVParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [defaultStageId, setDefaultStageId] = useState('');
  const [result, setResult] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const res = parseCSV(text);
      setParsed(res);
      setMapping(detectColumnMapping(res.headers));
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFile(file);
    }
  };

  const handleImport = async () => {
    if (!parsed || !profile) return;
    setStep('importing');

    let success = 0;
    let errors = 0;
    const batchSize = 50;

    for (let i = 0; i < parsed.rows.length; i += batchSize) {
      const batch = parsed.rows.slice(i, i + batchSize);
      const inserts = batch
        .map((row) => {
          const num = mapping.number !== undefined ? row[mapping.number]?.trim() : '';
          const name = mapping.name !== undefined ? row[mapping.name]?.trim() : '';
          if (!num && !name) return null;
          return {
            user_id: profile.id,
            customer_number: num || `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            display_name: name || '',
            email: mapping.email !== undefined ? row[mapping.email]?.trim() || null : null,
            company: mapping.company !== undefined ? row[mapping.company]?.trim() || null : null,
            stage_id: defaultStageId || null,
            source: 'import',
          };
        })
        .filter(Boolean);

      if (inserts.length === 0) continue;

      const { data, error } = await supabase
        .from('contacts')
        .upsert(inserts as typeof inserts & object[], { onConflict: 'user_id,customer_number', ignoreDuplicates: false })
        .select('id');

      if (error) {
        errors += inserts.length;
      } else {
        success += data?.length || 0;
        errors += inserts.length - (data?.length || 0);
      }
    }

    setResult({ success, errors });
    setStep('done');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass rounded-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="font-display font-bold text-sm text-white">Importar Contatos (CSV)</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {step === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <Upload size={32} className="mx-auto text-neutral-500 mb-3" />
              <p className="text-sm text-neutral-300 mb-1">Arraste um arquivo CSV aqui</p>
              <p className="text-xs text-neutral-600">ou clique para selecionar</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          )}

          {step === 'mapping' && parsed && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <FileText size={14} />
                <span>{parsed.rows.length} linhas encontradas</span>
                {parsed.errors.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle size={12} /> {parsed.errors.length} avisos
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs text-neutral-500 uppercase font-mono">Mapeamento de colunas</p>
                {(['name', 'number', 'email', 'company'] as const).map((field) => (
                  <div key={field} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-300 w-20 shrink-0">
                      {field === 'name' ? 'Nome' : field === 'number' ? 'Numero' : field === 'email' ? 'Email' : 'Empresa'}
                    </span>
                    <select
                      value={mapping[field] ?? -1}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [field]: parseInt(e.target.value) }))}
                      className="flex-1 bg-[#141414] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent/40"
                    >
                      <option value={-1}>-- ignorar --</option>
                      {parsed.headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs text-neutral-500 uppercase font-mono block mb-1">Estagio padrao para importados</label>
                <select
                  value={defaultStageId}
                  onChange={(e) => setDefaultStageId(e.target.value)}
                  className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-accent/40"
                >
                  <option value="">Sem estagio</option>
                  {stages.sort((a, b) => a.sort_order - b.sort_order).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {parsed.rows.length > 0 && (
                <div className="bg-[#0a0a0a] rounded-lg border border-white/[0.06] overflow-hidden">
                  <p className="text-[10px] text-neutral-600 uppercase font-mono px-3 py-1.5 border-b border-white/[0.06]">Preview (5 primeiras linhas)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-white/[0.04]">
                          {parsed.headers.map((h, i) => (
                            <th key={i} className="text-left px-2 py-1 text-neutral-500 font-normal">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-white/[0.03]">
                            {row.map((cell, j) => (
                              <td key={j} className="px-2 py-1 text-neutral-300 truncate max-w-[120px]">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setParsed(null); setStep('upload'); }} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors">
                  Voltar
                </button>
                <button
                  onClick={handleImport}
                  disabled={mapping.number === undefined && mapping.name === undefined}
                  className="px-4 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
                >
                  Importar {parsed.rows.length} contatos
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-10">
              <Loader2 size={28} className="mx-auto text-accent animate-spin mb-3" />
              <p className="text-sm text-neutral-300">Importando contatos...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-900/40 flex items-center justify-center mx-auto">
                <Check size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">{result.success} contatos importados</p>
                {result.errors > 0 && (
                  <p className="text-xs text-amber-400 mt-1">{result.errors} nao puderam ser importados (duplicados ou invalidos)</p>
                )}
              </div>
              <button
                onClick={() => { onDone(); onClose(); }}
                className="px-4 py-2 text-xs bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                Concluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
