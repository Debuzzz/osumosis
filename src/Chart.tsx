import { t, locale } from './i18n';
import { useId } from 'react';

export function Chart({ series, markers = [], label }: { series: { name: string; color: string; points: { x: number; y: number }[] }[]; markers?: { x: number; label: string }[]; label: string }) {
  const id = useId();
  const all = series.flatMap(s => s.points).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!all.length) return <div className="chart-empty">{t("Aucune série disponible pour cette map.")}</div>;
  const maxX = Math.max(1, ...all.map(p => p.x)), maxY = Math.max(1, ...all.map(p => p.y));
  const x = (v: number) => 42 + v / maxX * 558, y = (v: number) => 160 - v / maxY * 130;
  return <div className="chart"><svg viewBox="0 0 620 195" role="img" aria-labelledby={id}><title id={id}>{label}</title>
    {[0, 0.25, 0.5, 0.75, 1].map(v => <g key={v}><line x1="42" x2="600" y1={y(v * maxY)} y2={y(v * maxY)} stroke="var(--line)" /><text x="32" y={y(v * maxY) + 4} textAnchor="end">{Math.round(v * maxY)}</text></g>)}
    {series.map(s => <polyline key={s.name} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" points={s.points.filter(p => Number.isFinite(p.y)).map(p => `${x(p.x)},${y(p.y)}`).join(' ')} />)}
    {markers.slice(0, 250).map((m, i) => <g key={i}><title>{m.label}</title><line x1={x(m.x)} x2={x(m.x)} y1="26" y2="160" stroke="#ef8297" strokeDasharray="3 4" opacity=".65" /><circle cx={x(m.x)} cy="22" r="3" fill="#ef8297" /></g>)}
    {[0, 0.25, 0.5, 0.75, 1].map(v => <text key={v} x={x(v * maxX)} y="185" textAnchor="middle">{Math.floor(v * maxX / 60000)}:{String(Math.floor(v * maxX / 1000) % 60).padStart(2, '0')}</text>)}
  </svg><div className="chart-legend">{series.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}{markers.length > 0 && <span><i style={{ background: '#ef8297' }} />{t("Erreurs observées")}</span>}</div></div>;
}
