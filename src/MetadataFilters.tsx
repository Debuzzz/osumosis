import { metadataValue, withMetadata, type MetadataField } from '../shared/search-query';
import { t } from './i18n';

export function MetadataFilters({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  const fields: { field: MetadataField; label: string; placeholder: string }[] = [
    { field: 'tags', label: t('Tags de la map'), placeholder: 'stream, jump, tech…' },
    { field: 'source', label: t('Source du morceau'), placeholder: t('Anime, jeu, album…') },
    { field: 'creator', label: t('Mapper'), placeholder: t('Nom du mapper') },
    { field: 'version', label: t('Nom de difficulté'), placeholder: 'Insane, Extra…' },
  ];
  return <fieldset className="metadata-filters"><legend>{t('Métadonnées')}</legend><div className="metadata-filter-grid">{fields.map(({ field, label, placeholder }) => <label key={field}>{label}<input value={metadataValue(query, field)} placeholder={placeholder} onChange={event => onChange(withMetadata(query, field, event.target.value))} /></label>)}</div><p>{t('Ces champs ajoutent des filtres à la recherche. Les tags décrivent la map, mais ne prouvent pas son potentiel de farm.')}</p></fieldset>;
}
