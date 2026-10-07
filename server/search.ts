import type { Source } from '../shared/types';

const numericFields: Record<string, string> = { stars: 'm.stars', difficulty: 'm.stars', bpm: 'm.bpm', length: 'm.length', ar: 'm.ar', od: 'm.od', cs: 'm.cs', hp: 'm.hp', objects: 'm.objects', plays: 'm.play_count', mode: 'm.mode', id: 'm.beatmap_id' };
const textFields: Record<string, string> = { artist: 'm.artist', title: 'm.title', creator: 'm.creator', mapper: 'm.creator', version: 'm.version', tag: 'm.tags', tags: 'm.tags', source: 'm.source' };
export interface SearchInput { q?: string; source?: Source; mode?: string; status?: string; collection?: string; sort?: string; page?: number; limit?: number }
export function compileSearch(input: SearchInput) {
  const where: string[] = []; const params: (string | number)[] = [];
  if (!input.source || input.source === 'local') where.push('m.local = 1');
  if (input.source === 'new') where.push('m.local = 0');
  if (input.mode && input.mode !== 'any') { where.push('m.mode = ?'); params.push(Number(input.mode)); }
  if (input.status && input.status !== 'any') { where.push('m.status = ?'); params.push(input.status); }
  if (input.collection) { where.push('EXISTS (SELECT 1 FROM collection_members cm WHERE cm.checksum=m.checksum AND cm.collection_id=?)'); params.push(Number(input.collection)); }
  const tokens = (input.q || '').match(/(?:[^\s"']|"[^"]*"|'[^']*')+/g) || [];
  for (const token of tokens) {
    const comparison = token.match(/^([a-zA-Z_]+)(>=|<=|!=|=|>|<|:)(.*)$/);
    const unquote = (v: string) => v.replace(/^["']|["']$/g, '');
    if (!comparison) {
      const term = unquote(token);
      where.push('m.rowid IN (SELECT rowid FROM maps_fts WHERE maps_fts MATCH ?)');
      params.push('"' + term.replaceAll('"', '""') + '"*'); continue;
    }
    const [, rawField, rawOp, rawValue] = comparison; const field = rawField.toLowerCase(), value = unquote(rawValue), op = rawOp === ':' ? '=' : rawOp;
    if (numericFields[field]) {
      const n = Number(value.replace(/s$/, '')); if (!Number.isFinite(n)) throw new Error(`Valeur numérique attendue pour ${field}.`);
      where.push(`${numericFields[field]} ${op} ?`); params.push(n);
    } else if (textFields[field]) {
      if (!['=', '!='].includes(op)) throw new Error(`Comparaison non prise en charge pour ${field}.`);
      where.push(`${textFields[field]} ${op === '!=' ? 'NOT LIKE' : 'LIKE'} ? ESCAPE '\\'`); params.push('%' + value.replace(/[\\%_]/g, '\\$&') + '%');
    } else if (field === 'status') {
      const choices = value.split(',').map(v => ({ r: 'ranked', a: 'approved', l: 'loved', q: 'qualified', p: 'pending' }[v] || v));
      if (!['=', '!='].includes(op)) throw new Error('Utiliser = ou != pour status.');
      where.push(`m.status ${op === '!=' ? 'NOT IN' : 'IN'} (${choices.map(() => '?').join(',')})`); params.push(...choices);
    } else if (field === 'local' || field === 'played') {
      if (!['true', 'false', '1', '0'].includes(value) || !['=', '!='].includes(op)) throw new Error(`${field} attend true ou false.`);
      where.push(`m.${field} ${op} ?`); params.push(value === 'true' || value === '1' ? 1 : 0);
    } else if (field === 'collection') {
      where.push(`${op === '!=' ? 'NOT ' : ''}EXISTS (SELECT 1 FROM collection_members cm JOIN collections c ON c.id=cm.collection_id WHERE cm.checksum=m.checksum AND c.name=? COLLATE NOCASE)`); params.push(value);
    } else throw new Error(`Filtre « ${field} » non disponible dans cette version.`);
  }
  const sorts: Record<string, string> = { title: 'm.title COLLATE NOCASE ASC', artist: 'm.artist COLLATE NOCASE ASC', difficulty: 'm.stars DESC', length: 'm.length ASC', bpm: 'm.bpm DESC', recent: 'm.indexed_at DESC', played: 'm.last_played DESC' };
  return { clause: where.length ? where.join(' AND ') : '1=1', params, order: sorts[input.sort || 'title'] || sorts.title };
}
