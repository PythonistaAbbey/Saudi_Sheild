'use client';

import { COUNTRY_RINGS, REGIONS, makeProjection, type AlertLevel, type WarningArea } from '@saudi-shield/core';
import { useMemo } from 'react';

const FILL: Record<AlertLevel | 'none', { fill: string; stroke: string }> = {
  red: { fill: 'rgba(180,35,24,0.55)', stroke: '#b42318' },
  yellow: { fill: 'rgba(227,160,8,0.55)', stroke: '#b07a00' },
  white: { fill: 'rgba(255,255,255,0.95)', stroke: '#0e5e43' },
  none: { fill: 'rgba(14,94,67,0.08)', stroke: 'rgba(14,94,67,0.45)' },
};

export function KsaMap({
  areas,
  selected,
  onSelect,
  showCities = true,
  width = 640,
}: {
  areas: (WarningArea & { currentLevel?: AlertLevel | null })[];
  selected?: string | null;
  onSelect?: (code: string) => void;
  showCities?: boolean;
  width?: number;
}) {
  const proj = useMemo(() => makeProjection(width), [width]);
  return (
    <svg className="map-svg" viewBox={`0 0 ${proj.width} ${proj.height}`} role="img" aria-label="Map of exercise warning zones in Saudi Arabia (fictional)">
      <defs>
        <pattern id="sea" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#eef3f1" />
        </pattern>
      </defs>
      <rect width={proj.width} height={proj.height} fill="url(#sea)" />
      {Object.entries(COUNTRY_RINGS)
        .filter(([k]) => k !== 'SAU')
        .map(([k, rings]) => (
          <path key={k} d={proj.ringsPath(rings)} fill="#f6f5f1" stroke="#d4d1c9" strokeWidth={0.8} />
        ))}
      <path d={proj.ringsPath(COUNTRY_RINGS.SAU)} fill="#ffffff" stroke="#0a3d2c" strokeWidth={1.4} />
      {areas.map((a) => {
        const s = FILL[a.currentLevel ?? 'none'];
        const isSel = selected === a.code;
        return (
          <path
            key={a.code}
            d={proj.ringPath(a.polygon)}
            fill={s.fill}
            stroke={isSel ? '#1b1f22' : s.stroke}
            strokeWidth={isSel ? 2.4 : 1.2}
            strokeDasharray={a.currentLevel ? undefined : '3 3'}
            style={{ cursor: onSelect ? 'pointer' : undefined }}
            onClick={() => onSelect?.(a.code)}
          >
            <title>{a.name.en}</title>
          </path>
        );
      })}
      {showCities &&
        REGIONS.flatMap((r) => r.cities).map((c) => {
          const [x, y] = proj.project(c.lonLat);
          if (c.code === 'MKK-TAIF' || c.code === 'RIY-KHARJ') return null;
          const west = c.code === 'MKK-JEDDAH';
          return (
            <g key={c.code} pointerEvents="none">
              <circle cx={x} cy={y} r={2.4} fill="#1b1f22" />
              <text x={west ? x - 5 : x + 5} y={y - 4} textAnchor={west ? 'end' : 'start'} fontSize={10.5} fill="#343a3f" fontFamily="IBM Plex Sans Arabic, sans-serif" fontWeight={500}>
                {c.name.en}
              </text>
            </g>
          );
        })}
      <text x={proj.width - 10} y={proj.height - 10} textAnchor="end" fontSize={10} fill="#7d858c">
        Fictional exercise zones · Boundaries: Natural Earth
      </text>
    </svg>
  );
}
