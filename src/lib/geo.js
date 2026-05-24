import { getCenter } from "ol/extent";
import { MAP_PROJECTION, GEOSERVER_URL, WORKSPACE } from "../config";

export function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function isInsideMahalle(feature, mahalleGeom) {
  if (!mahalleGeom) return true;
  try {
    return mahalleGeom.intersectsCoordinate(getCenter(feature.getGeometry().getExtent()));
  } catch { return true; }
}

export function wfsUrl(typeName) {
  return `${GEOSERVER_URL}/${WORKSPACE}/ows?` + new URLSearchParams({
    service: "WFS", version: "2.0.0", request: "GetFeature",
    typeName: `${WORKSPACE}:${typeName}`, outputFormat: "application/json", srsname: MAP_PROJECTION,
  }).toString();
}

export function validateGeoJSON(geojson) {
  const errors = [], warnings = [];
  if (!geojson || typeof geojson !== "object") {
    errors.push("Geçersiz JSON formatı");
    return { valid: false, errors, warnings, count: 0 };
  }
  if (geojson.type !== "FeatureCollection" && geojson.type !== "Feature")
    errors.push(`Desteklenmeyen tip: ${geojson.type}. FeatureCollection veya Feature bekleniyor.`);

  const features = geojson.type === "FeatureCollection"
    ? (geojson.features || [])
    : geojson.type === "Feature" ? [geojson] : [];

  if (features.length === 0) warnings.push("Dosya boş — hiç özellik yok.");

  const validGeomTypes = [
    "Point","MultiPoint","LineString","MultiLineString",
    "Polygon","MultiPolygon","GeometryCollection",
  ];
  let nullGeomCount = 0, invalidGeomCount = 0;

  features.forEach((f, i) => {
    if (!f.geometry) { nullGeomCount++; return; }
    if (!validGeomTypes.includes(f.geometry.type)) {
      invalidGeomCount++;
      if (invalidGeomCount <= 3)
        errors.push(`Özellik #${i + 1}: Bilinmeyen geometri tipi "${f.geometry.type}"`);
    }
    if (!f.geometry.coordinates && f.geometry.type !== "GeometryCollection")
      errors.push(`Özellik #${i + 1}: coordinates eksik`);
  });

  if (nullGeomCount > 0) warnings.push(`${nullGeomCount} özelliğin geometrisi null — atlanacak.`);
  if (invalidGeomCount > 3) errors.push(`...ve ${invalidGeomCount - 3} özellik daha geçersiz geometriye sahip.`);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    count: features.length,
    geomTypes: [...new Set(features.filter(f => f.geometry).map(f => f.geometry.type))],
    propKeys: features.length > 0 ? Object.keys(features[0]?.properties || {}) : [],
  };
}