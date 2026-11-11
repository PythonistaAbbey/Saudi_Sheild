import type { Region, WarningArea } from './types';

/**
 * Public geography (approximate city coordinates) and FICTIONAL exercise zones.
 * Exercise zones are coarse hexagons around city centres. They do not represent
 * real incidents or official warning areas.
 */
export const REGIONS: Region[] = [
  {
    code: 'RIY',
    name: { ar: 'منطقة الرياض', en: 'Riyadh Region' },
    cities: [
      { code: 'RIY-RIYADH', name: { ar: 'الرياض', en: 'Riyadh' }, lonLat: [46.72, 24.69] },
      { code: 'RIY-KHARJ', name: { ar: 'الخرج', en: 'Al-Kharj' }, lonLat: [47.31, 24.15] },
    ],
  },
  {
    code: 'MKK',
    name: { ar: 'منطقة مكة المكرمة', en: 'Makkah Region' },
    cities: [
      { code: 'MKK-JEDDAH', name: { ar: 'جدة', en: 'Jeddah' }, lonLat: [39.19, 21.54] },
      { code: 'MKK-MAKKAH', name: { ar: 'مكة المكرمة', en: 'Makkah' }, lonLat: [39.83, 21.42] },
      { code: 'MKK-TAIF', name: { ar: 'الطائف', en: 'Taif' }, lonLat: [40.42, 21.27] },
    ],
  },
  {
    code: 'MDN',
    name: { ar: 'منطقة المدينة المنورة', en: 'Madinah Region' },
    cities: [{ code: 'MDN-MADINAH', name: { ar: 'المدينة المنورة', en: 'Madinah' }, lonLat: [39.61, 24.47] }],
  },
  {
    code: 'EAS',
    name: { ar: 'المنطقة الشرقية', en: 'Eastern Province' },
    cities: [
      { code: 'EAS-DAMMAM', name: { ar: 'الدمام', en: 'Dammam' }, lonLat: [50.1, 26.43] },
      { code: 'EAS-AHSA', name: { ar: 'الأحساء', en: 'Al-Ahsa' }, lonLat: [49.59, 25.38] },
    ],
  },
  {
    code: 'QAS',
    name: { ar: 'منطقة القصيم', en: 'Qassim Region' },
    cities: [{ code: 'QAS-BURAYDAH', name: { ar: 'بريدة', en: 'Buraydah' }, lonLat: [43.97, 26.33] }],
  },
  {
    code: 'TBK',
    name: { ar: 'منطقة تبوك', en: 'Tabuk Region' },
    cities: [{ code: 'TBK-TABUK', name: { ar: 'تبوك', en: 'Tabuk' }, lonLat: [36.57, 28.38] }],
  },
  {
    code: 'ASR',
    name: { ar: 'منطقة عسير', en: 'Asir Region' },
    cities: [{ code: 'ASR-ABHA', name: { ar: 'أبها', en: 'Abha' }, lonLat: [42.5, 18.22] }],
  },
  {
    code: 'JAZ',
    name: { ar: 'منطقة جازان', en: 'Jazan Region' },
    cities: [{ code: 'JAZ-JAZAN', name: { ar: 'جازان', en: 'Jazan' }, lonLat: [42.55, 16.89] }],
  },
  {
    code: 'HAI',
    name: { ar: 'منطقة حائل', en: 'Hail Region' },
    cities: [{ code: 'HAI-HAIL', name: { ar: 'حائل', en: 'Hail' }, lonLat: [41.69, 27.52] }],
  },
];

function hexagon([lon, lat]: [number, number], r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push([+(lon + r * Math.cos(a)).toFixed(4), +(lat + r * 0.9 * Math.sin(a)).toFixed(4)]);
  }
  pts.push(pts[0]);
  return pts;
}

function zone(code: string, cityCode: string, letter: string, r = 0.45): WarningArea {
  const region = REGIONS.find((rg) => rg.cities.some((c) => c.code === cityCode))!;
  const city = region.cities.find((c) => c.code === cityCode)!;
  return {
    code,
    name: {
      ar: `منطقة التمرين ${letter} (${city.name.ar})`,
      en: `Exercise Zone ${letter} (${city.name.en})`,
    },
    regionCode: region.code,
    polygon: hexagon(city.lonLat, r),
  };
}

export const WARNING_AREAS: WarningArea[] = [
  zone('EX-RIY-A', 'RIY-RIYADH', 'R1', 0.55),
  zone('EX-RIY-B', 'RIY-KHARJ', 'R2'),
  zone('EX-MKK-A', 'MKK-JEDDAH', 'M1'),
  zone('EX-MKK-B', 'MKK-MAKKAH', 'M2', 0.35),
  zone('EX-MKK-C', 'MKK-TAIF', 'M3', 0.35),
  zone('EX-MDN-A', 'MDN-MADINAH', 'N1'),
  zone('EX-EAS-A', 'EAS-DAMMAM', 'E1'),
  zone('EX-EAS-B', 'EAS-AHSA', 'E2'),
  zone('EX-QAS-A', 'QAS-BURAYDAH', 'Q1'),
  zone('EX-TBK-A', 'TBK-TABUK', 'T1'),
  zone('EX-ASR-A', 'ASR-ABHA', 'A1'),
  zone('EX-JAZ-A', 'JAZ-JAZAN', 'J1'),
  zone('EX-HAI-A', 'HAI-HAIL', 'H1'),
];

export function areaByCode(code: string): WarningArea | undefined {
  return WARNING_AREAS.find((a) => a.code === code);
}

export function cityByCode(code: string) {
  for (const r of REGIONS) {
    const c = r.cities.find((x) => x.code === code);
    if (c) return { region: r, city: c };
  }
  return undefined;
}

/** Ray-casting point-in-polygon. Runs on the device so the server never learns the user's location. */
export function pointInPolygon([x, y]: [number, number], poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function areasContaining(point: [number, number], codes?: string[]): WarningArea[] {
  const pool = codes ? WARNING_AREAS.filter((a) => codes.includes(a.code)) : WARNING_AREAS;
  return pool.filter((a) => pointInPolygon(point, a.polygon));
}

/** Rough bounding box of the Kingdom for map framing. */
export const KSA_BBOX = { minLon: 34.4, maxLon: 55.7, minLat: 16.3, maxLat: 32.2 };
