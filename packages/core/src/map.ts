import { COUNTRY_RINGS } from './map-data';
import { KSA_BBOX } from './geo';

export { COUNTRY_RINGS };

export interface Projection {
  width: number;
  height: number;
  project: (p: [number, number]) => [number, number];
  ringPath: (ring: [number, number][]) => string;
  ringsPath: (rings: [number, number][][]) => string;
}

/** Simple equirectangular projection scaled by cos(mid-latitude). Good enough at national scale. */
export function makeProjection(width: number, bbox = KSA_BBOX, pad = 0.6): Projection {
  const minLon = bbox.minLon - pad;
  const maxLon = bbox.maxLon + pad;
  const minLat = bbox.minLat - pad;
  const maxLat = bbox.maxLat + pad;
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const sx = width / ((maxLon - minLon) * k);
  const height = Math.round((maxLat - minLat) * sx);
  const project = ([lon, lat]: [number, number]): [number, number] => [
    +((lon - minLon) * k * sx).toFixed(1),
    +((maxLat - lat) * sx).toFixed(1),
  ];
  const ringPath = (ring: [number, number][]) => ring.map((p, i) => `${i ? 'L' : 'M'}${project(p).join(',')}`).join('') + 'Z';
  return { width, height, project, ringPath, ringsPath: (rings) => rings.map(ringPath).join('') };
}
