import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownUp,
  ArrowRight,
  FolderHeart,
  FolderOpen,
  Grid2X2,
  Layers3,
  List,
  LoaderCircle,
  Map as MapIcon,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Beatmap, Collection, SearchResult, Source, Status } from "../../../shared/types";
import { Stat } from "../../components/Stat";
import { api } from "../../lib/api";
import { locale, t } from "../../lib/i18n";
import { MapCard } from "./MapCard";
import { LibraryFilters } from "./components/LibraryFilters";
export function Library({
  status,
  collections,
  collection,
  setCollection,
  onSelect,
  onIndex,
  onSettings,
  busy,
  notify,
}: {
  status?: Status;
  collections: Collection[];
  collection: string;
  setCollection: (s: string) => void;
  onSelect: (m: Beatmap) => void;
  onIndex: () => void;
  onSettings: () => void;
  busy: boolean;
  notify: (s: string) => void;
}) {
  const [source, setSource] = useState<Source>("local");
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("any"),
    [category, setCategory] = useState("any"),
    [sort, setSort] = useState("title");
  const [view, setView] = useState("grid"),
    [discovering, setDiscovering] = useState(false),
    [hasMore, setHasMore] = useState(false);
  const client = useQueryClient();
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const params = new URLSearchParams({
    source,
    q,
    mode,
    status: category,
    sort,
    collection,
    group: "sets",
    limit: "20",
  }).toString();
  const result = useInfiniteQuery({
    queryKey: ["maps", "infinite", params],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api<SearchResult>(`/api/maps?${params}&page=${pageParam}`),
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const sentinel = useRef<HTMLDivElement>(null);
  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError } = result;
  useEffect(() => {
    if (!sentinel.current || !hasNextPage || isFetching || isFetchNextPageError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting))
          void fetchNextPage({ cancelRefetch: false });
      },
      { rootMargin: "120px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetching, isFetchNextPageError, params]);
  const discover = async (more = false) => {
    setDiscovering(true);
    try {
      const data = await api<{ imported: number; cached: boolean; hasMore: boolean }>(
        "/api/discover",
        { q: query, mode, status: category, more },
      );
      setHasMore(data.hasMore);
      setQ(query);
      await client.invalidateQueries({ queryKey: ["maps"] });
      await client.invalidateQueries({ queryKey: ["status"] });
      notify(
        data.cached
          ? t("Search reused from cache.")
          : t("{{p0}} difficulties added to the catalog. Nothing installed in the game.", {
              p0: data.imported,
            }),
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setDiscovering(false);
    }
  };
  const groups = useMemo(
    () => result.data?.pages.flatMap((batch) => batch.groups || []) || [],
    [result.data],
  );
  const total = result.data?.pages[0]?.total || 0;
  const totalSets = result.data?.pages[0]?.totalSets || 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> {t("EXPLORE. PLAY. REPEAT.")}
          </div>
          <h1>
            {t("Your next good map")}
            <span>.</span>
          </h1>
          <p>{t("Your osu! library, with a few more possibilities.")}</p>
        </div>
        <button
          className="secondary-button"
          onClick={onIndex}
          disabled={busy || status?.index.running}
        >
          <RefreshCw size={15} className={status?.index.running ? "spin" : ""} />
          {status?.index.running ? t("Indexing…") : t("Index library")}
        </button>
      </div>
      <div className="stat-strip">
        <Stat
          label={t("INSTALLED DIFFICULTIES")}
          value={(status?.installed || 0).toLocaleString(locale())}
          icon={Layers3}
        />
        <Stat
          label={t("LOCAL SETS")}
          value={(status?.sets || 0).toLocaleString(locale())}
          icon={MapIcon}
        />
        <Stat
          label={t("COLLECTIONS")}
          value={String(status?.collections || 0)}
          icon={FolderHeart}
        />
        <Stat label={t("OBSERVED ATTEMPTS")} value={String(status?.plays || 0)} icon={Activity} />
      </div>
      {status?.index.running && (
        <div className="index-progress">
          <LoaderCircle size={16} className="spin" />
          <span>
            {status.index.phase === "collections" ? t("Reading collections") : t("Reading maps")} ·{" "}
            {status.index.processed.toLocaleString(locale())} {t("files")}
          </span>
          <div className="indeterminate" />
        </div>
      )}
      {status?.index.phase === "error" && <div className="error-box">{status.index.message}</div>}
      <LibraryFilters
        source={source}
        setSource={setSource}
        query={query}
        setQuery={setQuery}
        mode={mode}
        setMode={setMode}
        category={category}
        setCategory={setCategory}
        collection={collection}
        setCollection={setCollection}
        collections={collections}
        status={status}
        discover={discover}
        discovering={discovering}
        hasMore={hasMore}
      />
      <div className="results-toolbar">
        <div>
          <span className="results-number">{total.toLocaleString(locale())}</span>{" "}
          {t("difficulties")}{" "}
          <span className="muted">
            {collection
              ? `· ${collections.find((c) => String(c.id) === collection)?.name || t("Collection")}`
              : t("· to explore")}
          </span>
          {result.isFetching && <LoaderCircle className="spin" size={14} />}
        </div>
        <div className="sort-tools">
          <ArrowDownUp size={14} />
          <select
            aria-label={t("Sort maps")}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="title">{t("Title")}</option>
            <option value="artist">{t("Artist")}</option>
            <option value="difficulty">{t("Difficulty")}</option>
            <option value="length">{t("Length")}</option>
            <option value="bpm">BPM</option>
            <option value="recent">{t("Recently added")}</option>
            <option value="played">{t("Last played")}</option>
          </select>
          <div className="view-toggle">
            <button
              title={t("Grid")}
              aria-pressed={view === "grid"}
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
            >
              <Grid2X2 size={16} />
            </button>
            <button
              title={t("List")}
              aria-pressed={view === "list"}
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>
      {result.isPending ? (
        <div className="catalog-loading" role="status">
          <LoaderCircle className="spin" size={18} />
          {t("Loading maps…")}
        </div>
      ) : result.isError && !groups.length ? (
        <div className="error-box">
          {result.error.message}
          <button className="secondary-button small" onClick={() => void result.refetch()}>
            {t("Try again")}
          </button>
        </div>
      ) : groups.length ? (
        <div className={`map-grid ${view === "list" ? "list-view" : ""}`}>
          {groups.map((maps) => (
            <MapCard
              key={maps[0].key}
              maps={maps}
              onSelect={onSelect}
              allowFetch={source === "new"}
            />
          ))}
        </div>
      ) : (
        <div className="empty-library">
          <div className="empty-orbits">
            <span />
            <span />
            <span />
            <MapIcon size={33} />
          </div>
          <div className="eyebrow">{t("A CATALOG THAT GROWS WITH YOU")}</div>
          <h2>
            {query || collection || category !== "any" || mode !== "any"
              ? t("No maps match these filters.")
              : source === "local"
                ? t("Your library starts here.")
                : t("No maps in this view yet.")}
          </h2>
          <p>
            {source === "local"
              ? t(
                  "Choose your stable or lazer profile in Settings, then index maps, images and collections on this computer.",
                )
              : t("Maps discovered online will be saved here for your next search.")}
          </p>
          <button className="primary-button" onClick={onSettings}>
            <FolderOpen size={17} />
            {t("Configure osu!")}
            <ArrowRight size={15} />
          </button>
          <span className="empty-footnote">{t("Game files are read, never modified.")}</span>
        </div>
      )}
      {groups.length > 0 && (
        <div ref={sentinel} className="catalog-load-more" aria-live="polite">
          <span>
            {groups.length.toLocaleString(locale())} / {totalSets.toLocaleString(locale())}{" "}
            {t("sets shown")}
          </span>
          {result.isFetchingNextPage ? (
            <span role="status">
              <LoaderCircle className="spin" size={16} />
              {t("Loading 20 more sets…")}
            </span>
          ) : result.isFetchNextPageError ? (
            <>
              <span className="error-box">{result.error.message}</span>
              <button
                className="secondary-button"
                onClick={() => void result.fetchNextPage({ cancelRefetch: false })}
              >
                {t("Try again")}
              </button>
            </>
          ) : result.hasNextPage ? (
            <button
              className="secondary-button"
              disabled={result.isFetching}
              onClick={() => void result.fetchNextPage({ cancelRefetch: false })}
            >
              {t("Load 20 more sets")}
            </button>
          ) : (
            <span>{t("End of results")}</span>
          )}
        </div>
      )}
    </>
  );
}
