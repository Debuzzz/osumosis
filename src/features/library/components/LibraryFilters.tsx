import {
  CircleHelp,
  Database,
  FolderOpen,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Collection, Source, Status } from "../../../../shared/types";
import { t } from "../../../lib/i18n";
import { modes } from "../model";
import { MetadataFilters } from "./MetadataFilters";
export function LibraryFilters({
  source,
  setSource,
  query,
  setQuery,
  mode,
  setMode,
  category,
  setCategory,
  collection,
  setCollection,
  collections,
  status,
  discover,
  discovering,
  hasMore,
}: {
  source: Source;
  setSource: (source: Source) => void;
  query: string;
  setQuery: (query: string) => void;
  mode: string;
  setMode: (mode: string) => void;
  category: string;
  setCategory: (category: string) => void;
  collection: string;
  setCollection: (collection: string) => void;
  collections: Collection[];
  status?: Status;
  discover: (more?: boolean) => Promise<void>;
  discovering: boolean;
  hasMore: boolean;
}) {
  const [advanced, setAdvanced] = useState(false),
    [help, setHelp] = useState(false);
  return (
    <section className="search-panel">
      <div className="source-tabs">
        {(
          [
            ["local", t("Installées"), FolderOpen],
            ["cached", t("Catalogue"), Database],
            ["new", t("Découvrir"), Sparkles],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            aria-pressed={source === id}
            className={source === id ? "active" : ""}
            onClick={() => setSource(id)}
          >
            <Icon size={15} />
            {label}
            {id === "local" && <span>{status?.installed || 0}</span>}
          </button>
        ))}
        <span className="source-note">
          {source === "new"
            ? t("Réseau sur demande · 5 appels / min")
            : t("Recherche locale · aucun appel API")}
        </span>
      </div>
      <div className="search-input">
        <Search size={21} />
        <input
          aria-label={t("Rechercher des maps")}
          placeholder={t("Artiste, titre, mapper… ou stars>=5 bpm>180")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && source === "new") void discover();
          }}
        />
        {query && (
          <button
            className="icon-button"
            title={t("Effacer la recherche")}
            onClick={() => setQuery("")}
          >
            <X size={16} />
          </button>
        )}
        <button
          className={`icon-button ${help ? "selected" : ""}`}
          aria-expanded={help}
          onClick={() => setHelp(!help)}
          title={t("Syntaxe de recherche")}
        >
          <CircleHelp size={18} />
        </button>
      </div>
      {help && (
        <div className="search-help">
          <code>{t("stars>=5 stars<6.5")}</code>
          <code>{t("bpm>180 length<180")}</code>
          <code>{t('collection:"DT farm"')}</code>
          <code>{t("played=false")}</code>
          <code>tags="stream" source="Touhou"</code>
          <p>
            {t(
              "Champs : stars, bpm, length (secondes), ar, od, cs, hp, objects, artist, title, creator, version, tag, status, local, played. Les filtres avancés de PP arriveront avec le profil joueur.",
            )}
          </p>
        </div>
      )}
      <div className="filter-row">
        <span className="filter-label">{t("Mode")}</span>
        <div className="chips">
          {[["any", t("Tous")], ...modes.map((name, i) => [String(i), name])].map(
            ([value, label]) => (
              <button
                key={value}
                aria-pressed={mode === value}
                className={mode === value ? "active" : ""}
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ),
          )}
        </div>
        <button
          className={`more-filters ${advanced ? "active" : ""}`}
          aria-expanded={advanced}
          onClick={() => setAdvanced(!advanced)}
        >
          <SlidersHorizontal size={14} />
          {t("Filtres")}
        </button>
      </div>
      <div className="filter-row">
        <span className="filter-label">{t("Statut")}</span>
        <div className="chips">
          {[
            ["any", t("Tous")],
            ["ranked", "Ranked"],
            ["loved", "Loved"],
            ["qualified", "Qualified"],
            ["pending", "Pending"],
            ["graveyard", "Graveyard"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={category === value}
              className={category === value ? "active" : ""}
              onClick={() => setCategory(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {advanced && (
        <>
          <div className="advanced-filters">
            <label>
              {t("Collection")}
              <select value={collection} onChange={(e) => setCollection(e.target.value)}>
                <option value="">{t("Toutes les collections")}</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.installed}/{c.total})
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="field-label">{t("Raccourcis")}</span>
              <div className="chips">
                {[
                  [t("Jamais observée"), "played=false"],
                  [t("Courte (< 2 min)"), "length<120"],
                  ["5–6 ★", "stars>=5 stars<6"],
                ].map(([name, predicate]) => (
                  <button
                    key={name}
                    onClick={() => setQuery(query ? `${query} ${predicate}` : predicate)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <MetadataFilters query={query} onChange={setQuery} />
        </>
      )}
      {source === "new" && (
        <div className="discovery-row">
          <p>{t("Les découvertes restent dans le catalogue, même sans téléchargement.")}</p>
          <button
            className="primary-button small"
            onClick={() => void discover()}
            disabled={discovering}
          >
            {discovering ? <LoaderCircle size={14} className="spin" /> : <Sparkles size={14} />}
            {t("Chercher en ligne")}
          </button>
          {hasMore && (
            <button
              className="secondary-button small"
              onClick={() => void discover(true)}
              disabled={discovering}
            >
              {t("Découvrir davantage")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
