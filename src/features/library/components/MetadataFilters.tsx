import { metadataValue, withMetadata, type MetadataField } from "../../../../shared/search-query";
import { t } from "../../../lib/i18n";

export function MetadataFilters({
  query,
  onChange,
}: {
  query: string;
  onChange: (query: string) => void;
}) {
  const fields: { field: MetadataField; label: string; placeholder: string }[] = [
    { field: "tags", label: t("Map tags"), placeholder: "stream, jump, tech…" },
    { field: "source", label: t("Song source"), placeholder: t("Anime, game, album…") },
    { field: "creator", label: t("Mapper"), placeholder: t("Mapper name") },
    { field: "version", label: t("Difficulty name"), placeholder: "Insane, Extra…" },
  ];
  return (
    <fieldset className="metadata-filters">
      <legend>{t("Metadata")}</legend>
      <div className="metadata-filter-grid">
        {fields.map(({ field, label, placeholder }) => (
          <label key={field}>
            {label}
            <input
              value={metadataValue(query, field)}
              placeholder={placeholder}
              onChange={(event) => onChange(withMetadata(query, field, event.target.value))}
            />
          </label>
        ))}
      </div>
      <p>
        {t(
          "These fields add search filters. Tags describe a map but do not prove its farming potential.",
        )}
      </p>
    </fieldset>
  );
}
