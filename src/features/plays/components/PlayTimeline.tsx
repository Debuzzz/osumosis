import { Activity, Check, List } from "lucide-react";
import { useMemo, useState } from "react";
import type { PlayEvent } from "../../../../shared/types";
import { Chart } from "../../../components/Chart";
import { display, timeLabel } from "../../../lib/format";

import { t } from "../../../lib/i18n";

type Point = { time: number; accuracy: number; pp: number; fcPp?: number };
type ErrorGroup = {
  second: number;
  misses: number;
  sliderBreaks: number;
  accuracy: number;
  pp: number;
};

export function PlayTimeline({
  points,
  events,
  errorsAvailable = true,
}: {
  points: Point[];
  events: PlayEvent[];
  errorsAvailable?: boolean;
}) {
  const [metric, setMetric] = useState<"accuracy" | "pp">("accuracy");
  const groups = useMemo(() => {
    const result = new Map<number, ErrorGroup>();
    for (const event of events) {
      if (
        !["miss", "sliderbreak"].includes(event.kind) ||
        !Number.isFinite(event.time) ||
        event.count <= 0
      )
        continue;
      const second = Math.floor(Math.max(0, event.time) / 1000);
      const group = result.get(second) || {
        second,
        misses: 0,
        sliderBreaks: 0,
        accuracy: event.accuracy,
        pp: event.pp,
      };
      if (event.kind === "miss") group.misses += event.count;
      else group.sliderBreaks += event.count;
      group.accuracy = event.accuracy;
      group.pp = event.pp;
      result.set(second, group);
    }
    return [...result.values()].sort((a, b) => a.second - b.second);
  }, [events]);
  const groupLabel = (group: ErrorGroup) =>
    [
      group.misses ? `${t("Miss")} ×${group.misses}` : "",
      group.sliderBreaks ? `${t("Sliderbreaks")} ×${group.sliderBreaks}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  const data = useMemo(() => {
    const unique = new Map<number, Point>();
    for (const point of points)
      if (Number.isFinite(point.time) && point.time >= 0) unique.set(point.time, point);
    return [...unique.values()].sort((a, b) => a.time - b.time);
  }, [points]);
  const series =
    metric === "accuracy"
      ? [
          {
            name: t("Accuracy (%)"),
            color: "#deb0e9",
            points: data.map((point) => ({ x: point.time, y: point.accuracy })),
          },
        ]
      : [
          {
            name: t("Observed PP"),
            color: "#deb0e9",
            points: data.map((point) => ({ x: point.time, y: point.pp })),
          },
          {
            name: t("PP if FC"),
            color: "#79c9bf",
            points: data
              .filter((point) => point.fcPp !== undefined)
              .map((point) => ({ x: point.time, y: point.fcPp! })),
          },
        ].filter((series) => series.points.length);
  return (
    <section className="play-timeline" aria-label={t("Performance timeline")}>
      <div className="play-timeline-grid">
        <section className="live-panel timeline-chart">
          <div className="section-title">
            <Activity size={17} />
            <h2>{t("Timeline")}</h2>
            <div className="timeline-metric" role="group" aria-label={t("Chart metric")}>
              <button aria-pressed={metric === "accuracy"} onClick={() => setMetric("accuracy")}>
                {t("Accuracy")}
              </button>
              <button aria-pressed={metric === "pp"} onClick={() => setMetric("pp")}>
                PP
              </button>
            </div>
          </div>
          <Chart
            label={
              metric === "accuracy"
                ? t("Accuracy during gameplay")
                : t("Observed and estimated FC PP over time")
            }
            series={series}
            markers={groups.map((group) => ({
              x: group.second * 1000,
              label: `${timeLabel(group.second * 1000)} · ${groupLabel(group)}`,
            }))}
          />
        </section>
        <section className="live-panel timeline-errors">
          <div className="section-title">
            <List size={17} />
            <h2>{t("Observed errors")}</h2>
            <span className="badge">{t("{{count}} seconds", { count: groups.length })}</span>
          </div>
          {!errorsAvailable ? (
            <p className="muted">{t("Error events are unavailable for this replay playback.")}</p>
          ) : groups.length ? (
            <div
              className="timeline-error-list"
              tabIndex={0}
              aria-label={t("Errors grouped by second")}
            >
              <table>
                <caption className="sr-only">{t("Errors grouped by second")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("Time")}</th>
                    <th scope="col">{t("Errors")}</th>
                    <th scope="col">{t("Accuracy")}</th>
                    <th scope="col">PP</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.second}>
                      <th scope="row">{timeLabel(group.second * 1000)}</th>
                      <td>
                        <span className="event-kind">{groupLabel(group)}</span>
                      </td>
                      <td>{display(group.accuracy, 2)} %</td>
                      <td>{display(group.pp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="timeline-no-errors">
              <Check size={24} />
              <p>{t("No errors observed in this capture.")}</p>
            </div>
          )}
        </section>
      </div>
      <p className="timeline-note">
        {t(
          "Errors within the same second are grouped. Their position comes from telemetry; identifying the exact object requires replay analysis.",
        )}
      </p>
    </section>
  );
}
