/** Shared token boundaries keep quoted metadata filters consistent with free search. */
export function searchTokens(query: string) {
  return query.match(/(?:[^\s"']|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')+/g) || [];
}
export function searchValue(value: string) {
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.at(-1) === quote) return value.slice(1, -1).replace(/\\([\\"'])/g, '$1');
  return value;
}
export type MetadataField = 'tags' | 'source' | 'creator' | 'version';
const aliases: Record<MetadataField, string[]> = { tags: ['tag', 'tags'], source: ['source'], creator: ['creator', 'mapper'], version: ['version'] };
function matches(token: string, field: MetadataField) {
  const match = token.match(/^([a-z_]+)(=|:)(.*)$/i);
  return match && aliases[field].includes(match[1].toLowerCase()) ? match[3] : null;
}
export function metadataValue(query: string, field: MetadataField) {
  const token = searchTokens(query).reverse().find(token => matches(token, field) !== null);
  return token === undefined ? '' : searchValue(matches(token, field)!);
}
export function withMetadata(query: string, field: MetadataField, value: string) {
  const tokens = searchTokens(query).filter(token => matches(token, field) === null);
  if (value !== '') tokens.push(`${field}=${JSON.stringify(value)}`);
  return tokens.join(' ');
}
