const EARTH_RADIUS_M = 6_378_137;

/** GeoJSON polygon approximating a circle — used for the 5km radius ring. */
export function circlePolygon(
  longitude: number,
  latitude: number,
  radiusMeters: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: GeoJSON.Position[] = [];
  const latRad = (latitude * Math.PI) / 180;
  const dLat = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.cos(latRad);
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([longitude + dLng * Math.cos(theta), latitude + dLat * Math.sin(theta)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}
