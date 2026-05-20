import { Contact, ContactStage, ContactLabel } from '../../../lib/supabase';

export type ExportRow = {
  contact: Contact;
  stage: ContactStage | null;
  labels: ContactLabel[];
  agents: { instance_name: string }[];
};

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportContactsCSV(rows: ExportRow[], filename?: string) {
  const headers = ['Nome', 'Numero', 'Email', 'Empresa', 'Estagio', 'Etiquetas', 'Agentes', 'Origem', 'Criado em'];
  const lines = rows.map((r) => [
    escapeCSV(r.contact.display_name || ''),
    escapeCSV(r.contact.customer_number),
    escapeCSV(r.contact.email || ''),
    escapeCSV(r.contact.company || ''),
    escapeCSV(r.stage?.name || ''),
    escapeCSV(r.labels.map((l) => l.label).join('; ')),
    escapeCSV(r.agents.map((a) => a.instance_name).join('; ')),
    escapeCSV(r.contact.source),
    escapeCSV(new Date(r.contact.created_at).toLocaleDateString('pt-BR')),
  ].join(','));

  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `contatos_auratalk_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type CSVParseResult = {
  headers: string[];
  rows: string[][];
  errors: string[];
};

export function parseCSV(text: string): CSVParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [], errors: ['Arquivo vazio'] };

  const headers = parseCSVLine(lines[0]);
  const rows: string[][] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parsed = parseCSVLine(lines[i]);
    if (parsed.length !== headers.length) {
      errors.push(`Linha ${i + 1}: numero de colunas diferente do cabecalho`);
    } else {
      rows.push(parsed);
    }
  }

  return { headers, rows, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',' || ch === ';') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function detectColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const lower = headers.map((h) => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  const namePatterns = ['nome', 'name', 'contato', 'contact'];
  const numberPatterns = ['numero', 'number', 'telefone', 'phone', 'whatsapp', 'celular', 'tel'];
  const emailPatterns = ['email', 'e-mail', 'mail'];
  const companyPatterns = ['empresa', 'company', 'organizacao', 'organization', 'org'];

  for (let i = 0; i < lower.length; i++) {
    if (namePatterns.some((p) => lower[i].includes(p)) && mapping.name === undefined) {
      mapping.name = i;
    } else if (numberPatterns.some((p) => lower[i].includes(p)) && mapping.number === undefined) {
      mapping.number = i;
    } else if (emailPatterns.some((p) => lower[i].includes(p)) && mapping.email === undefined) {
      mapping.email = i;
    } else if (companyPatterns.some((p) => lower[i].includes(p)) && mapping.company === undefined) {
      mapping.company = i;
    }
  }

  return mapping;
}
