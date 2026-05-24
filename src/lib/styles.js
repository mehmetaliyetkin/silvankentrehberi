import {
  Style, Stroke, Fill, Circle as CircleStyle,
  Text, RegularShape,
} from "ol/style";
import { hexToRgba } from "./geo";
import { POI_CATEGORIES, SIKAYET_KATEGORILERI } from "../config";

export const polygonStyle = (color, fillAlpha = 0.15, width = 1) =>
  new Style({ stroke: new Stroke({ color, width }), fill: new Fill({ color: hexToRgba(color, fillAlpha) }) });

export const yolStyle = (feature, resolution) =>
  new Style({
    stroke: new Stroke({ color: "#ffffff", width: 3 }),
    text: resolution < 5
      ? new Text({
          text: feature.get("yol_adi") || feature.get("YOL_ADI") || feature.get("AD") || "",
          font: "12px 'Segoe UI', Arial",
          fill: new Fill({ color: "#fff" }),
          stroke: new Stroke({ color: "#000", width: 3 }),
          placement: "line",
        })
      : undefined,
  });

export const numaratajStyle = (feature, resolution) => {
  // resolution > 1 ise (zoom ~19 altı) tamamen gizle
  if (resolution > 2) return null;
  return new Style({
    image: new CircleStyle({ radius: 4, fill: new Fill({ color: "#ffff00" }) }),
    text: resolution < 0.5
      ? new Text({
          text: feature.get("kapi_no") || feature.get("KAPINO") || feature.get("NO") || "",
          font: "11px 'Segoe UI', Arial",
          fill: new Fill({ color: "#ffff00" }),
          stroke: new Stroke({ color: "#000", width: 2 }),
          offsetY: -12,
        })
      : undefined,
  });
};

export const poiStyle = (feature) => {
  const kat = (feature.get("kategori") || "diger").toLowerCase();
  const cat = POI_CATEGORIES.find(c => c.key === kat) || POI_CATEGORIES.at(-1);
  return new Style({
    image: new CircleStyle({ radius: 9, fill: new Fill({ color: cat.color }), stroke: new Stroke({ color: "#fff", width: 2 }) }),
    text:  new Text({ text: cat.symbol, font: "bold 11px 'Segoe UI', Arial", fill: new Fill({ color: "#fff" }) }),
  });
};

export const nobetciEczaneStyle = (feature) => {
  const isOpen = feature.get("__nobetci");
  return new Style({
    image: new RegularShape({
      points: 4, radius: 13, angle: Math.PI / 4,
      fill: new Fill({ color: isOpen ? "#22c55eee" : "#e53935ee" }),
      stroke: new Stroke({ color: "#fff", width: 2 }),
    }),
    text: new Text({ text: "💊", font: "13px serif", offsetY: 0 }),
  });
};

export const addressMarkerStyle = new Style({
  image: new RegularShape({
    points: 3, radius: 14, rotation: Math.PI,
    fill: new Fill({ color: "#ff4081" }),
    stroke: new Stroke({ color: "#fff", width: 2 }),
  }),
});

export const drawStyle = new Style({
  stroke: new Stroke({ color: "#ff6600", width: 2 }),
  fill:   new Fill({ color: "rgba(255,102,0,0.15)" }),
  image:  new CircleStyle({ radius: 6, fill: new Fill({ color: "#ff6600" }), stroke: new Stroke({ color: "#fff", width: 2 }) }),
});

export const selectedEditStyle = new Style({
  stroke: new Stroke({ color: "#facc15", width: 3, lineDash: [6, 4] }),
  fill:   new Fill({ color: "rgba(250,204,21,0.2)" }),
  image:  new CircleStyle({ radius: 8, fill: new Fill({ color: "#facc15" }), stroke: new Stroke({ color: "#1e293b", width: 2 }) }),
});

export const routeStyle = new Style({ stroke: new Stroke({ color: "#3b82f6", width: 5 }) });

export const routePointStyle = (label) => new Style({
  image: new CircleStyle({
    radius: 10,
    fill:   new Fill({ color: label === "A" ? "#22c55e" : "#ef4444" }),
    stroke: new Stroke({ color: "#fff", width: 2 }),
  }),
  text: new Text({ text: label, font: "bold 12px 'Segoe UI', Arial", fill: new Fill({ color: "#fff" }) }),
});

export const sikayetStyle = (feature) => {
  const kat = feature.get("kategori") || "diger";
  const cat = SIKAYET_KATEGORILERI.find(c => c.key === kat) || SIKAYET_KATEGORILERI.at(-1);
  const durum = feature.get("durum") || "beklemede";
  const borderColor = durum === "cozuldu" ? "#22c55e" : durum === "incelemede" ? "#f59e0b" : "#ef4444";
  return new Style({
    image: new RegularShape({
      points: 4, radius: 11, angle: Math.PI / 4,
      fill: new Fill({ color: cat.color + "dd" }),
      stroke: new Stroke({ color: borderColor, width: 2 }),
    }),
    text: new Text({ text: cat.icon, font: "13px serif", offsetY: 0 }),
  });
};

export function styleFor(key, color) {
  if (key === "yol")       return yolStyle;
  if (key === "numarataj") return numaratajStyle;
  if (key === "mahalle")   return new Style({ stroke: new Stroke({ color, width: 2 }) });
  if (key === "poi")       return poiStyle;
  return polygonStyle(color);
}