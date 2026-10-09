import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Beatmap } from "../../../../shared/types";
import { api } from "../../../lib/api";

export function Background({ checksum, live }: { checksum: string; live: boolean }) {
  const detail = useQuery({
    queryKey: ["performance-map", checksum],
    queryFn: () => api<{ map: Beatmap }>("/api/maps/" + encodeURIComponent(checksum)),
    enabled: !!checksum,
    retry: false,
    staleTime: 60000,
  });
  const candidates = [
    ...(detail.data?.map.hasBackground
      ? [`/api/assets/${encodeURIComponent(checksum)}/background`]
      : []),
    ...(live ? [`/api/live/background?checksum=${encodeURIComponent(checksum)}`] : []),
    ...(!live && detail.data?.map.cover
      ? [`/api/covers/${encodeURIComponent(checksum)}?fetch=0`]
      : []),
  ];
  const sources = candidates.join("|");
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => setFailed([]), [checksum, live, sources]);
  const src = candidates.find((candidate) => !failed.includes(candidate));
  return src ? (
    <img
      className="live-backdrop"
      src={src}
      alt=""
      onError={() => setFailed((previous) => [...previous, src])}
    />
  ) : null;
}
