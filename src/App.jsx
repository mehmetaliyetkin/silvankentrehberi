// ============================================================================
// YetkinGIS - Kent Rehberi v2
// 3 Rol: superadmin | belediye_admin | vatandas
//
// YENİ ÖZELLİKLER (v2):
//   - 📱 Mobil uyumluluk (hamburger menü, alt tab bar, touch optimizasyonu)
//   - 💊 Nöbetçi Eczane (Overpass API ile gerçek zamanlı)
//   - ✏️ Geometri Düzenleme & Taşıma (Modify + Translate interaction)
//   - Çizim aracı geçişlerinde siyah ekran / removeChild hatası giderildi
// ============================================================================

import React, {
  useEffect, useLayoutEffect, useRef, useState, useCallback,
} from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import { fromLonLat, toLonLat } from "ol/proj";
import { getCenter } from "ol/extent";
import Draw from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import Snap from "ol/interaction/Snap";
import Translate from "ol/interaction/Translate";
import Select from "ol/interaction/Select";
import { click } from "ol/events/condition";
import {
  Style, Stroke, Fill,
  Circle as CircleStyle, Text, RegularShape,
} from "ol/style";

// ============================================================================
// KONFİGÜRASYON
// ============================================================================
const USE_GEOSERVER   = false;
const GEOSERVER_URL   = "http://localhost:8080/geoserver";
const WORKSPACE       = "silvanvercel";
const DATA_PROJECTION = "EPSG:3857";
const MAP_PROJECTION  = "EPSG:3857";
const INITIAL_CENTER  = [4564000, 4605000];
const INITIAL_ZOOM    = 14;

const LAYER_DEFS = [
  { key: "parsel",    label: "Parsel",    color: "#00ffff", typeName: "parcels",    file: "./data/silvan/parcels.geojson",   zoomTo: true  },
  { key: "yapi",      label: "Yapı",      color: "#ff4444", typeName: "yapi",       file: "./data/silvan/yapi.geojson",      zoomTo: false },
  { key: "mahalle",   label: "Mahalle",   color: "#00ff88", typeName: "mahalle",    file: "./data/silvan/mahalle.geojson",   zoomTo: false },
  { key: "yol",       label: "Yol",       color: "#ffffff", typeName: "yol",        file: "./data/silvan/yol.geojson",       zoomTo: false },
  { key: "numarataj", label: "Numarataj", color: "#ffff00", typeName: "numarataj",  file: "./data/silvan/numarataj.geojson", zoomTo: false },
];

const POI_CATEGORIES = [
  { key: "eczane",   label: "Eczane",       color: "#e53935", symbol: "E" },
  { key: "hastane",  label: "Hastane",      color: "#d32f2f", symbol: "H" },
  { key: "cami",     label: "Cami",         color: "#43a047", symbol: "C" },
  { key: "park",     label: "Park",         color: "#7cb342", symbol: "P" },
  { key: "restoran", label: "Restoran",     color: "#fb8c00", symbol: "R" },
  { key: "otel",     label: "Otel",         color: "#8e24aa", symbol: "O" },
  { key: "turistik", label: "Turistik Yer", color: "#fdd835", symbol: "T" },
  { key: "banka",    label: "Banka/ATM",    color: "#1e88e5", symbol: "B" },
  { key: "okul",     label: "Okul",         color: "#5e35b1", symbol: "K" },
  { key: "diger",    label: "Diğer",        color: "#757575", symbol: "?" },
];

const SIKAYET_KATEGORILERI = [
  { key: "yol_bozuk",    label: "Yol/Kaldırım Bozuk",  icon: "🚧", color: "#f59e0b" },
  { key: "aydinlatma",   label: "Aydınlatma Sorunu",    icon: "💡", color: "#fbbf24" },
  { key: "cop",          label: "Çöp/Temizlik",         icon: "🗑",  color: "#84cc16" },
  { key: "su_ariza",     label: "Su/Kanalizasyon",       icon: "💧", color: "#38bdf8" },
  { key: "park_bahce",   label: "Park/Bahçe",           icon: "🌳", color: "#4ade80" },
  { key: "guvenlik",     label: "Güvenlik",             icon: "🚨", color: "#f87171" },
  { key: "diger",        label: "Diğer",                icon: "📋", color: "#94a3b8" },
];

// ============================================================================
// MOBİL TESPİT
// ============================================================================
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ============================================================================
// LOCALSTORAGE KALICILIK SİSTEMİ
// ============================================================================
const LS_KEYS = {
  cizimler:  "yetkin_cbs_cizimler",
  sikayetler:"yetkin_cbs_sikayetler",
  drawCount: "yetkin_cbs_drawcount",
};

const fmt = new GeoJSON();

function lsSave(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn("LS yazma hatası:", e); }
}

function lsLoad(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}

function saveCizimler(katmanSrcRef, drawSrcRef) {
  const out = { __draw: [] };
  try {
    (drawSrcRef.current?.getFeatures() || []).forEach(f => {
      try {
        const geom = f.getGeometry().clone().transform(MAP_PROJECTION, "EPSG:4326");
        const props = { ...f.getProperties() }; delete props.geometry;
        out.__draw.push({ type:"Feature", geometry:JSON.parse(fmt.writeGeometry(geom)), properties:props });
      } catch {}
    });
    Object.entries(katmanSrcRef.current || {}).forEach(([key, src]) => {
      out[key] = [];
      (src?.getFeatures() || []).forEach(f => {
        try {
          const geom = f.getGeometry().clone().transform(MAP_PROJECTION, "EPSG:4326");
          const props = { ...f.getProperties() }; delete props.geometry;
          out[key].push({ type:"Feature", geometry:JSON.parse(fmt.writeGeometry(geom)), properties:props });
        } catch {}
      });
    });
    lsSave(LS_KEYS.cizimler, out);
  } catch (e) { console.warn("Çizim kaydetme hatası:", e); }
}

function saveSikayetler(sikayetSrcRef) {
  const list = [];
  try {
    (sikayetSrcRef.current?.getFeatures() || []).forEach(f => {
      try {
        const geom = f.getGeometry().clone().transform(MAP_PROJECTION, "EPSG:4326");
        const props = { ...f.getProperties() }; delete props.geometry;
        list.push({ type:"Feature", geometry:JSON.parse(fmt.writeGeometry(geom)), properties:props });
      } catch {}
    });
    lsSave(LS_KEYS.sikayetler, list);
  } catch (e) { console.warn("Şikayet kaydetme hatası:", e); }
}

function loadCizimler(katmanSrcRef, drawSrcRef, setDrawCount) {
  const saved = lsLoad(LS_KEYS.cizimler);
  if (!saved) return;
  let total = 0;
  try {
    (saved.__draw || []).forEach(fdata => {
      try {
        const f = fmt.readFeature(fdata, { dataProjection:"EPSG:4326", featureProjection:MAP_PROJECTION });
        drawSrcRef.current?.addFeature(f); total++;
      } catch {}
    });
    Object.entries(katmanSrcRef.current || {}).forEach(([key, src]) => {
      (saved[key] || []).forEach(fdata => {
        try {
          const f = fmt.readFeature(fdata, { dataProjection:"EPSG:4326", featureProjection:MAP_PROJECTION });
          src?.addFeature(f); total++;
        } catch {}
      });
    });
    setDrawCount(total);
  } catch (e) { console.warn("Çizim yükleme hatası:", e); }
}

function loadSikayetler(sikayetSrcRef) {
  const saved = lsLoad(LS_KEYS.sikayetler);
  if (!saved || !Array.isArray(saved)) return;
  saved.forEach(fdata => {
    try {
      const f = fmt.readFeature(fdata, { dataProjection:"EPSG:4326", featureProjection:MAP_PROJECTION });
      sikayetSrcRef.current?.addFeature(f);
    } catch {}
  });
}

// ============================================================================
// ROL SİSTEMİ
// ============================================================================
const VARSAYILAN_KULLANICILAR = [
  { id: 1, ad: "Sistem Yöneticisi", email: "superadmin@cbs.gov.tr", sifre: "Admin2024!", rol: "superadmin",     belediye: "Tümü" },
  { id: 2, ad: "Ahmet Yılmaz",      email: "admin@silvan.bel.tr",   sifre: "Silvan2024!", rol: "belediye_admin", belediye: "Silvan Belediyesi" },
  { id: 3, ad: "Fatma Demir",       email: "admin@batman.bel.tr",   sifre: "Batman2024!", rol: "belediye_admin", belediye: "Batman Belediyesi" },
];

function kullanicilariYukle() {
  try {
    const saved = localStorage.getItem("yetkin_cbs_kullanicilar");
    return saved ? JSON.parse(saved) : VARSAYILAN_KULLANICILAR;
  } catch { return VARSAYILAN_KULLANICILAR; }
}

function kullanicilariKaydet(liste) {
  try { localStorage.setItem("yetkin_cbs_kullanicilar", JSON.stringify(liste)); } catch {}
}

async function loginRequest(email, sifre) {
  const users = kullanicilariYukle();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.sifre === sifre);
  if (!user) throw new Error("Hatalı e-posta veya şifre");
  return user;
}

// ============================================================================
// STİL FONKSİYONLARI
// ============================================================================
function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const polygonStyle = (color, fillAlpha = 0.15, width = 1) =>
  new Style({ stroke: new Stroke({ color, width }), fill: new Fill({ color: hexToRgba(color, fillAlpha) }) });

const yolStyle = (feature, resolution) =>
  new Style({
    stroke: new Stroke({ color: "#ffffff", width: 3 }),
    text: resolution < 5
      ? new Text({ text: feature.get("yol_adi") || feature.get("YOL_ADI") || feature.get("AD") || "",
          font: "12px 'Segoe UI', Arial", fill: new Fill({ color: "#fff" }),
          stroke: new Stroke({ color: "#000", width: 3 }), placement: "line" })
      : undefined,
  });

const numaratajStyle = (feature, resolution) =>
  new Style({
    image: new CircleStyle({ radius: 4, fill: new Fill({ color: "#ffff00" }) }),
    text: resolution < 2
      ? new Text({ text: feature.get("kapi_no") || feature.get("KAPINO") || feature.get("NO") || "",
          font: "11px 'Segoe UI', Arial", fill: new Fill({ color: "#ffff00" }),
          stroke: new Stroke({ color: "#000", width: 2 }), offsetY: -12 })
      : undefined,
  });

const poiStyle = (feature) => {
  const kat = (feature.get("kategori") || "diger").toLowerCase();
  const cat = POI_CATEGORIES.find(c => c.key === kat) || POI_CATEGORIES.at(-1);
  return new Style({
    image: new CircleStyle({ radius: 9, fill: new Fill({ color: cat.color }), stroke: new Stroke({ color: "#fff", width: 2 }) }),
    text: new Text({ text: cat.symbol, font: "bold 11px 'Segoe UI', Arial", fill: new Fill({ color: "#fff" }) }),
  });
};

const nobetciEczaneStyle = (feature) => {
  const isOpen = feature.get("__nobetci");
  return new Style({
    image: new RegularShape({
      points: 4, radius: 13, angle: Math.PI / 4,
      fill: new Fill({ color: isOpen ? "#22c55eee" : "#e53935ee" }),
      stroke: new Stroke({ color: "#fff", width: 2 }),
    }),
    text: new Text({
      text: "💊",
      font: "13px serif",
      offsetY: 0,
    }),
  });
};

const addressMarkerStyle = new Style({
  image: new RegularShape({ points: 3, radius: 14, rotation: Math.PI,
    fill: new Fill({ color: "#ff4081" }), stroke: new Stroke({ color: "#fff", width: 2 }) }),
});

const drawStyle = new Style({
  stroke: new Stroke({ color: "#ff6600", width: 2 }),
  fill:   new Fill({ color: "rgba(255,102,0,0.15)" }),
  image:  new CircleStyle({ radius: 6, fill: new Fill({ color: "#ff6600" }), stroke: new Stroke({ color: "#fff", width: 2 }) }),
});

// Seçili feature için özel stil (düzenleme/taşıma)
const selectedEditStyle = new Style({
  stroke: new Stroke({ color: "#facc15", width: 3, lineDash: [6, 4] }),
  fill:   new Fill({ color: "rgba(250,204,21,0.2)" }),
  image:  new CircleStyle({ radius: 8, fill: new Fill({ color: "#facc15" }), stroke: new Stroke({ color: "#1e293b", width: 2 }) }),
});

const routeStyle = new Style({
  stroke: new Stroke({ color: "#3b82f6", width: 5 }),
});

const routePointStyle = (label) => new Style({
  image: new CircleStyle({ radius: 10, fill: new Fill({ color: label === "A" ? "#22c55e" : "#ef4444" }),
    stroke: new Stroke({ color: "#fff", width: 2 }) }),
  text: new Text({ text: label, font: "bold 12px 'Segoe UI', Arial", fill: new Fill({ color: "#fff" }) }),
});

const sikayetStyle = (feature) => {
  const kat = (feature.get("kategori") || "diger");
  const cat = SIKAYET_KATEGORILERI.find(c => c.key === kat) || SIKAYET_KATEGORILERI.at(-1);
  const durum = feature.get("durum") || "beklemede";
  const borderColor = durum === "cozuldu" ? "#22c55e" : durum === "incelemede" ? "#f59e0b" : "#ef4444";
  return new Style({
    image: new RegularShape({ points: 4, radius: 11, angle: Math.PI / 4,
      fill: new Fill({ color: cat.color + "dd" }), stroke: new Stroke({ color: borderColor, width: 2 }) }),
    text: new Text({ text: cat.icon, font: "13px serif", offsetY: 0 }),
  });
};

const styleFor = (key, color) => {
  if (key === "yol")       return yolStyle;
  if (key === "numarataj") return numaratajStyle;
  if (key === "mahalle")   return new Style({ stroke: new Stroke({ color, width: 2 }) });
  if (key === "poi")       return poiStyle;
  return polygonStyle(color);
};

function isInsideMahalle(feature, mahalleGeom) {
  if (!mahalleGeom) return true;
  try { return mahalleGeom.intersectsCoordinate(getCenter(feature.getGeometry().getExtent())); }
  catch { return true; }
}

function wfsUrl(typeName) {
  return `${GEOSERVER_URL}/${WORKSPACE}/ows?` + new URLSearchParams({
    service: "WFS", version: "2.0.0", request: "GetFeature",
    typeName: `${WORKSPACE}:${typeName}`, outputFormat: "application/json", srsname: MAP_PROJECTION,
  }).toString();
}

// ============================================================================
// UNDO/REDO HOOK
// ============================================================================
function useUndoRedo() {
  const historyRef = useRef([]);
  const futureRef  = useRef([]);
  const katmanSrcRef = useRef(null);
  const drawSrcRef   = useRef(null);

  const init = (ks, ds) => { katmanSrcRef.current = ks; drawSrcRef.current = ds; };

  const pushAdd = useCallback((feature, srcKey) => {
    historyRef.current.push({ type: "add", feature, srcKey });
    futureRef.current = [];
  }, []);

  const pushRemove = useCallback((feature, srcKey) => {
    historyRef.current.push({ type: "remove", feature, srcKey });
    futureRef.current = [];
  }, []);

  const undo = useCallback(() => {
    const last = historyRef.current.pop();
    if (!last) return;
    futureRef.current.push(last);
    const src = katmanSrcRef.current?.[last.srcKey] || drawSrcRef.current;
    if (!src) return;
    if (last.type === "add")    src.removeFeature(last.feature);
    if (last.type === "remove") src.addFeature(last.feature);
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(next);
    const src = katmanSrcRef.current?.[next.srcKey] || drawSrcRef.current;
    if (!src) return;
    if (next.type === "add")    src.addFeature(next.feature);
    if (next.type === "remove") src.removeFeature(next.feature);
  }, []);

  return { init, pushAdd, pushRemove, undo, redo };
}

// ============================================================================
// GEOJSONDoğrulama
// ============================================================================
function validateGeoJSON(geojson) {
  const errors = [];
  const warnings = [];

  if (!geojson || typeof geojson !== "object") {
    errors.push("Geçersiz JSON formatı");
    return { valid: false, errors, warnings, count: 0 };
  }
  if (geojson.type !== "FeatureCollection" && geojson.type !== "Feature") {
    errors.push(`Desteklenmeyen tip: ${geojson.type}. FeatureCollection veya Feature bekleniyor.`);
  }
  const features = geojson.type === "FeatureCollection"
    ? (geojson.features || [])
    : geojson.type === "Feature" ? [geojson] : [];

  if (features.length === 0) warnings.push("Dosya boş — hiç özellik yok.");

  const validGeomTypes = ["Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon","GeometryCollection"];
  let nullGeomCount = 0;
  let invalidGeomCount = 0;

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

// ============================================================================
// NÖBETÇİ ECZANE PANELİ
// ============================================================================
function NobetciEczanePanel({ mapInstance, nobetciSrcRef, onClose }) {
  const [sehir,      setSehir]      = useState("Silvan");
  const [eczaneler,  setEczaneler]  = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata,       setHata]       = useState("");

  const ara = useCallback(async () => {
    if (!sehir.trim()) return;
    setYukleniyor(true); setHata(""); setEczaneler([]);

    // Overpass API ile nöbetçi eczane arama
    const query = `
      [out:json][timeout:25];
      area[name="${sehir.trim()}"]->.searchArea;
      (
        node["amenity"="pharmacy"](area.searchArea);
        way["amenity"="pharmacy"](area.searchArea);
      );
      out body;
    `;

    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const data = await res.json();
      const items = (data.elements || []).map(el => ({
        id: el.id,
        ad: el.tags?.name || "İsimsiz Eczane",
        adres: el.tags?.["addr:street"]
          ? `${el.tags["addr:street"]} ${el.tags["addr:housenumber"] || ""}`.trim()
          : "Adres bilgisi yok",
        telefon: el.tags?.phone || el.tags?.["contact:phone"] || "",
        lat: el.lat || (el.center?.lat),
        lon: el.lon || (el.center?.lon),
        acik: el.tags?.opening_hours?.includes("24/7") || false,
      })).filter(e => e.lat && e.lon);

      setEczaneler(items);

      // Haritaya ekle
      if (nobetciSrcRef?.current) {
        nobetciSrcRef.current.clear();
        items.forEach(e => {
          const f = new Feature(new Point(fromLonLat([e.lon, e.lat])));
          f.setProperties({
            __type: "nobetci_eczane",
            __nobetci: true,
            Ad: e.ad,
            Adres: e.adres,
            Telefon: e.telefon,
            "24/7": e.acik ? "Evet" : "Bilinmiyor",
          });
          nobetciSrcRef.current.addFeature(f);
        });

        if (items.length > 0) {
          const extent = nobetciSrcRef.current.getExtent();
          if (extent[0] !== Infinity) {
            mapInstance?.getView().fit(extent, { duration: 800, maxZoom: 16, padding: [60, 60, 60, 60] });
          }
        }
      }

      if (items.length === 0) setHata(`"${sehir}" için eczane bulunamadı. Şehir adını kontrol edin.`);
    } catch (e) {
      setHata("Overpass API'ye ulaşılamadı. İnternet bağlantınızı kontrol edin.");
    } finally {
      setYukleniyor(false);
    }
  }, [sehir, mapInstance, nobetciSrcRef]);

  const zoomTo = (e) => {
    if (!e.lat || !e.lon || !mapInstance) return;
    mapInstance.getView().animate({ center: fromLonLat([e.lon, e.lat]), zoom: 18, duration: 600 });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000c",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 600, backdropFilter: "blur(4px)",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#0f1629", border: "1px solid #22c55e44",
        borderRadius: 16, padding: 24, width: "min(480px, 95vw)",
        maxHeight: "80vh", display: "flex", flexDirection: "column",
        boxShadow: "0 0 60px #22c55e22",
      }}>
        {/* Başlık */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8eaf0" }}>💊 Nöbetçi Eczane</div>
            <div style={{ fontSize: 11, color: "#22c55e", marginTop: 2 }}>Overpass API · Gerçek Zamanlı</div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid #2a3a4a",
            borderRadius: 8, color: "#7a80a0", cursor: "pointer", padding: "6px 12px", fontSize: 13,
          }}>✕ Kapat</button>
        </div>

        {/* Arama */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={sehir}
            onChange={e => setSehir(e.target.value)}
            onKeyDown={e => e.key === "Enter" && ara()}
            placeholder="Şehir / ilçe adı (ör: Silvan, Batman)"
            style={{
              flex: 1, padding: "9px 12px", background: "#1a2535",
              border: "1px solid #22c55e44", borderRadius: 8,
              color: "#e8eaf0", fontSize: 13, outline: "none", fontFamily: "inherit",
            }}
          />
          <button onClick={ara} disabled={yukleniyor} style={{
            padding: "9px 18px", background: "#22c55e", border: "none",
            borderRadius: 8, color: "#fff", cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: 600,
            opacity: yukleniyor ? 0.6 : 1,
          }}>
            {yukleniyor ? "⏳" : "🔍 Ara"}
          </button>
        </div>

        {hata && (
          <div style={{
            background: "#2a0f0f", border: "1px solid #ef444444",
            borderRadius: 8, padding: "10px 12px", color: "#ef4444",
            fontSize: 12, marginBottom: 12,
          }}>⚠ {hata}</div>
        )}

        {/* Sonuçlar */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {eczaneler.length > 0 && (
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
              {eczaneler.length} eczane bulundu · Haritada <span style={{ color: "#22c55e" }}>💊</span> ile gösteriliyor
            </div>
          )}
          {eczaneler.map((e, i) => (
            <div key={e.id || i}
              onClick={() => zoomTo(e)}
              style={{
                background: "#1a2535", border: `1px solid ${e.acik ? "#22c55e" : "#2a3a4a"}`,
                borderRadius: 10, padding: "10px 14px", marginBottom: 8,
                cursor: "pointer", transition: "border-color 0.2s",
              }}
              onMouseEnter={el => el.currentTarget.style.borderColor = "#22c55e"}
              onMouseLeave={el => el.currentTarget.style.borderColor = e.acik ? "#22c55e" : "#2a3a4a"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>💊</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0", flex: 1 }}>{e.ad}</span>
                {e.acik && (
                  <span style={{
                    background: "#22c55e22", border: "1px solid #22c55e",
                    borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "#22c55e",
                  }}>24/7</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>📍 {e.adres}</div>
              {e.telefon && <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 2 }}>📞 {e.telefon}</div>}
              <div style={{ fontSize: 10, color: "#374151", marginTop: 4 }}>
                📌 {e.lat?.toFixed(5)}, {e.lon?.toFixed(5)} · Tıkla yaklaş
              </div>
            </div>
          ))}
          {!yukleniyor && eczaneler.length === 0 && !hata && (
            <div style={{ textAlign: "center", padding: 32, color: "#374151" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💊</div>
              <div style={{ fontSize: 13 }}>Şehir adı girin ve ara butonuna basın</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GEOMETRİ DÜZENLEME & TAŞIMA YÖNETİCİSİ
// ============================================================================
// Mod: null | "modify" | "translate"
function useGeometriDuzenle({ mapInstanceRef, layersRef, katmanSrcRef, drawSrcRef, sikayetSrcRef, onSave }) {
  const [mod, setMod] = useState(null);
  const [secilenInfo, setSecilenInfo] = useState(null);
  const [sonKayit, setSonKayit] = useState(null); // kullanıcıya geri bildirim
  const modRef    = useRef(null);
  const interRef  = useRef({ select: null, modify: null, translate: null });
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const temizle = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    Object.values(interRef.current).forEach(inter => {
      if (inter) { try { map.removeInteraction(inter); } catch {} }
    });
    interRef.current = { select: null, modify: null, translate: null };
    setMod(null);
    setSecilenInfo(null);
    setSonKayit(null);
    modRef.current = null;
    map.getTargetElement().style.cursor = "";
  }, [mapInstanceRef]);

  const aktifEt = useCallback((yeniMod) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Önce temizle
    Object.values(interRef.current).forEach(inter => {
      if (inter) { try { map.removeInteraction(inter); } catch {} }
    });
    interRef.current = { select: null, modify: null, translate: null };

    if (yeniMod === modRef.current) {
      modRef.current = null;
      setMod(null);
      map.getTargetElement().style.cursor = "";
      return;
    }

    // Select interaction
    const select = new Select({
      condition: click,
      style: selectedEditStyle,
      layers: layer => layer instanceof VectorLayer && !layer.get("__isHL"),
    });

    select.on("select", e => {
      if (e.selected.length > 0) {
        const f = e.selected[0];
        const props = { ...f.getProperties() };
        delete props.geometry;
        setSecilenInfo(props);
      } else {
        setSecilenInfo(null);
      }
    });

    map.addInteraction(select);
    interRef.current.select = select;

    // ── Kaydetme yardımcısı ──────────────────────────────────────────────
    const kaydet = (ne) => {
      try {
        onSaveRef.current?.();
        const saat = new Date().toLocaleTimeString("tr-TR");
        setSonKayit(`${ne} kaydedildi · ${saat}`);
        setTimeout(() => setSonKayit(null), 3000);
      } catch (e) {
        console.warn("Geometri kaydetme hatası:", e);
      }
    };

    if (yeniMod === "modify") {
      const modify = new Modify({ features: select.getFeatures() });
      // modifyend → otomatik kaydet
      modify.on("modifyend", () => kaydet("Geometri düzenleme"));
      map.addInteraction(modify);
      interRef.current.modify = modify;
      map.getTargetElement().style.cursor = "crosshair";
    } else if (yeniMod === "translate") {
      const translate = new Translate({ features: select.getFeatures() });
      // translateend → otomatik kaydet
      translate.on("translateend", () => kaydet("Taşıma"));
      map.addInteraction(translate);
      interRef.current.translate = translate;
      map.getTargetElement().style.cursor = "move";
    }

    modRef.current = yeniMod;
    setMod(yeniMod);
  }, [mapInstanceRef, drawSrcRef, sikayetSrcRef, katmanSrcRef]);

  return { mod, aktifEt, temizle, secilenInfo, sonKayit };
}

// ============================================================================
// ŞİFRE DEĞİŞTİRME MODALİ
// ============================================================================
function SifreDegistirModal({ kullanici, onKapat }) {
  const [eskiSifre, setEskiSifre] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [tekrar,    setTekrar]    = useState("");
  const [hata,      setHata]      = useState("");
  const [basari,    setBasari]    = useState(false);

  function handleKaydet() {
    setHata("");
    const users = kullanicilariYukle();
    const user = users.find(u => u.id === kullanici.id);
    if (!user) { setHata("Kullanıcı bulunamadı."); return; }
    if (user.sifre !== eskiSifre) { setHata("Mevcut şifre yanlış."); return; }
    if (yeniSifre.length < 6) { setHata("Yeni şifre en az 6 karakter olmalı."); return; }
    if (yeniSifre !== tekrar) { setHata("Şifreler eşleşmiyor."); return; }
    user.sifre = yeniSifre;
    kullanicilariKaydet(users);
    setBasari(true);
    setTimeout(onKapat, 1500);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:500, backdropFilter:"blur(4px)" }}>
      <div style={{ background:"#1e2030", border:"1px solid #2a2f45", borderRadius:16, padding:28, width:"min(360px,90vw)" }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#e8eaf0", marginBottom:4 }}>🔑 Şifre Değiştir</div>
        <div style={{ fontSize:12, color:"#7a80a0", marginBottom:20 }}>{kullanici.ad} · {kullanici.email}</div>
        {basari && <div style={{ background:"#0f2a1a", border:"1px solid #22c55e44", borderRadius:8, padding:"10px 12px", color:"#22c55e", fontSize:13, marginBottom:14 }}>✅ Şifre başarıyla değiştirildi!</div>}
        {hata && <div style={{ background:"#2a0f0f", border:"1px solid #ef444444", borderRadius:8, padding:"10px 12px", color:"#ef4444", fontSize:13, marginBottom:14 }}>⚠ {hata}</div>}
        {[
          { label:"Mevcut Şifre", val:eskiSifre, set:setEskiSifre },
          { label:"Yeni Şifre",   val:yeniSifre, set:setYeniSifre },
          { label:"Tekrar Gir",   val:tekrar,    set:setTekrar    },
        ].map(({ label, val, set }) => (
          <div key={label} style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#7a80a0", marginBottom:5 }}>{label}</div>
            <input type="password" value={val} onChange={e => set(e.target.value)}
              style={{ width:"100%", padding:"9px 12px", background:"#0f1117", border:"1px solid #2a2f45",
                borderRadius:8, color:"#e8eaf0", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
          </div>
        ))}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
          <button onClick={onKapat} style={{ padding:"9px 16px", background:"transparent", border:"1px solid #2a2f45", borderRadius:8, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>İptal</button>
          <button onClick={handleKaydet} style={{ padding:"9px 16px", background:"#3b82f6", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>💾 Kaydet</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// KULLANICI YÖNETİM MODALİ
// ============================================================================
function KullaniciYonetimModal({ onKapat }) {
  const [users,     setUsers]    = useState(kullanicilariYukle());
  const [editId,    setEditId]   = useState(null);
  const [yeniSifre, setYeniSifre]= useState("");
  const [yeniAd,    setYeniAd]   = useState("");
  const [basari,    setBasari]   = useState("");
  const [hata,      setHata]     = useState("");

  function handleEdit(u) { setEditId(u.id); setYeniSifre(""); setYeniAd(u.ad); setBasari(""); setHata(""); }
  function handleKaydet(u) {
    if (!yeniAd.trim()) { setHata("Ad boş olamaz."); return; }
    if (yeniSifre && yeniSifre.length < 6) { setHata("Şifre en az 6 karakter olmalı."); return; }
    const updated = users.map(x => x.id === u.id ? { ...x, ad: yeniAd, ...(yeniSifre ? { sifre: yeniSifre } : {}) } : x);
    kullanicilariKaydet(updated);
    setUsers(updated);
    setEditId(null); setBasari(`${yeniAd} güncellendi.`); setHata("");
  }

  const rolRenk  = { superadmin:"#a855f7", belediye_admin:"#3b82f6", vatandas:"#22c55e" };
  const rolLabel = { superadmin:"Süper Admin", belediye_admin:"Belediye Admin", vatandas:"Vatandaş" };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, backdropFilter:"blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onKapat()}>
      <div style={{ background:"#1a1d27", border:"1px solid #a855f744", borderRadius:16, padding:28, width:"min(480px,92vw)", maxHeight:"80vh", overflowY:"auto" }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#e8eaf0", marginBottom:4 }}>⚡ Kullanıcı Yönetimi</div>
        <div style={{ fontSize:12, color:"#7a80a0", marginBottom:20 }}>Şifre değiştirme ve kullanıcı bilgilerini düzenleme</div>
        {basari && <div style={{ background:"#0f2a1a", border:"1px solid #22c55e44", borderRadius:8, padding:"8px 12px", color:"#22c55e", fontSize:12, marginBottom:12 }}>✅ {basari}</div>}
        {hata && <div style={{ background:"#2a0f0f", border:"1px solid #ef444444", borderRadius:8, padding:"8px 12px", color:"#ef4444", fontSize:12, marginBottom:12 }}>⚠ {hata}</div>}
        {users.map(u => (
          <div key={u.id} style={{ background:"#0f1117", border:`1px solid ${rolRenk[u.rol]}33`, borderRadius:10, padding:14, marginBottom:10 }}>
            {editId === u.id ? (
              <>
                <div style={{ fontSize:11, color:rolRenk[u.rol], marginBottom:10, fontWeight:600 }}>✏ {rolLabel[u.rol]} — {u.email}</div>
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:11, color:"#7a80a0", marginBottom:4 }}>Ad Soyad</div>
                  <input value={yeniAd} onChange={e => setYeniAd(e.target.value)}
                    style={{ width:"100%", padding:"7px 10px", background:"#1a1d27", border:"1px solid #2a2f45", borderRadius:6, color:"#e8eaf0", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, color:"#7a80a0", marginBottom:4 }}>Yeni Şifre <span style={{ color:"#4a5070" }}>(boş bırakırsan değişmez)</span></div>
                  <input type="password" value={yeniSifre} onChange={e => setYeniSifre(e.target.value)} placeholder="En az 6 karakter"
                    style={{ width:"100%", padding:"7px 10px", background:"#1a1d27", border:"1px solid #2a2f45", borderRadius:6, color:"#e8eaf0", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => { setEditId(null); setHata(""); }} style={{ padding:"6px 12px", background:"transparent", border:"1px solid #2a2f45", borderRadius:6, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>İptal</button>
                  <button onClick={() => handleKaydet(u)} style={{ padding:"6px 12px", background:rolRenk[u.rol], border:"none", borderRadius:6, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:600 }}>💾 Kaydet</button>
                </div>
              </>
            ) : (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e8eaf0" }}>{u.ad}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{u.email}</div>
                  <div style={{ fontSize:10, color:rolRenk[u.rol], marginTop:2 }}>{rolLabel[u.rol]} · {u.belediye}</div>
                </div>
                <button onClick={() => handleEdit(u)} style={{ padding:"6px 12px", background:"#21253a", border:`1px solid ${rolRenk[u.rol]}55`, borderRadius:6, color:rolRenk[u.rol], cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>✏ Düzenle</button>
              </div>
            )}
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
          <button onClick={onKapat} style={{ padding:"9px 16px", background:"transparent", border:"1px solid #2a2f45", borderRadius:8, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>Kapat</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GİRİŞ EKRANI
// ============================================================================
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata]   = useState("");
  const [yuk, setYuk]     = useState(false);

  async function handleLogin() {
    if (!email.trim()) { setHata("E-posta giriniz"); return; }
    setYuk(true); setHata("");
    try { const user = await loginRequest(email.trim(), sifre); onLogin(user); }
    catch (e) { setHata(e.message); }
    finally { setYuk(false); }
  }

  return (
    <div style={{ width:"100vw", height:"100vh", background:"#0f1117",
      backgroundImage:"radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.07) 0%, transparent 60%)",
      display:"flex", alignItems:"center", justifyContent:"center", padding: 16, boxSizing: "border-box" }}>
      <div style={{ background:"#1a1d27", border:"1px solid #2a2f45", borderRadius:20, padding:36, width:"100%", maxWidth:380 }}>
        <div style={{ width:52, height:52, borderRadius:14, background:"#3b82f6",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, fontWeight:700, color:"#fff", fontFamily:"monospace", marginBottom:18 }}>CBS</div>
        <div style={{ fontSize:20, fontWeight:700, color:"#e8eaf0", marginBottom:4 }}>YetkinGIS</div>
        <div style={{ fontSize:13, color:"#7a80a0", marginBottom:28 }}>Kent Rehberi</div>
        {hata && <div style={{ background:"#ef444422", border:"1px solid #ef444466", borderRadius:8, padding:"10px 12px", fontSize:13, color:"#ef4444", marginBottom:14 }}>{hata}</div>}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, color:"#7a80a0", marginBottom:6 }}>E-posta</div>
          <input style={ls.input} type="email" placeholder="ornek@belediye.bel.tr"
            value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} />
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, color:"#7a80a0", marginBottom:6 }}>Şifre</div>
          <input style={ls.input} type="password" placeholder="••••••••"
            value={sifre} onChange={e => setSifre(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} />
        </div>
        <button style={ls.btnPrimary} onClick={handleLogin} disabled={yuk}>{yuk ? "Giriş yapılıyor..." : "Giriş Yap"}</button>
        <button style={{ ...ls.btnPrimary, background:"transparent", border:"1px solid #2a2f45", color:"#7a80a0", marginTop:8 }}
          onClick={() => onLogin({ id:0, ad:"Vatandaş", email:"", sifre:"", rol:"vatandas", belediye:"Silvan" })}>
          👤 Vatandaş olarak devam et
        </button>
      </div>
    </div>
  );
}

const ls = {
  input: { width:"100%", padding:"9px 12px", background:"#0f1117", border:"1px solid #2a2f45",
    borderRadius:8, color:"#e8eaf0", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  btnPrimary: { width:"100%", padding:"10px 16px", background:"#3b82f6", color:"white",
    border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"block" },
};

// ============================================================================
// ŞİKAYET FORMU
// ============================================================================
function SikayetFormModal({ konum, onKaydet, onIptal }) {
  const [kategori, setKategori] = useState("yol_bozuk");
  const [baslik,   setBaslik]   = useState("");
  const [aciklama, setAciklama] = useState("");
  const [adSoyad,  setAdSoyad]  = useState("");
  const [telefon,  setTelefon]  = useState("");
  const secilenKat = SIKAYET_KATEGORILERI.find(k => k.key === kategori);

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400, backdropFilter:"blur(4px)" }}>
      <div style={{ background:"#1e2030", border:`1px solid ${secilenKat?.color}44`, borderRadius:16, padding:24, width:"min(420px,92vw)", maxHeight:"85vh", overflowY:"auto", boxShadow:`0 0 40px ${secilenKat?.color}22` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <span style={{ fontSize:24 }}>{secilenKat?.icon}</span>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#e8eaf0" }}>Şikayet / Talep Bildir</div>
            <div style={{ fontSize:11, color:"#7a80a0" }}>📍 {konum ? `${konum[1].toFixed(5)}, ${konum[0].toFixed(5)}` : "Konum seçilmedi"}</div>
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={sf.label}>Kategori</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            {SIKAYET_KATEGORILERI.map(k => (
              <button key={k.key} onClick={() => setKategori(k.key)}
                style={{ padding:"8px 6px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                  border: kategori===k.key ? `1px solid ${k.color}` : "1px solid #2a2f45",
                  background: kategori===k.key ? `${k.color}22` : "#0f1117",
                  color: kategori===k.key ? k.color : "#7a80a0", fontSize:11,
                  display:"flex", alignItems:"center", gap:5 }}>
                <span>{k.icon}</span><span>{k.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={sf.label}>Başlık *</div>
          <input style={sf.input} placeholder="Kısa bir başlık girin" value={baslik} onChange={e => setBaslik(e.target.value)} />
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={sf.label}>Açıklama</div>
          <textarea style={{ ...sf.input, height:80, resize:"vertical" }} placeholder="Sorunu detaylıca açıklayın..." value={aciklama} onChange={e => setAciklama(e.target.value)} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          <div>
            <div style={sf.label}>Ad Soyad</div>
            <input style={sf.input} placeholder="İsteğe bağlı" value={adSoyad} onChange={e => setAdSoyad(e.target.value)} />
          </div>
          <div>
            <div style={sf.label}>Telefon</div>
            <input style={sf.input} placeholder="İsteğe bağlı" value={telefon} onChange={e => setTelefon(e.target.value)} />
          </div>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onIptal} style={{ padding:"9px 16px", background:"transparent", border:"1px solid #3a3f55", borderRadius:8, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>İptal</button>
          <button onClick={() => {
              if (!baslik.trim()) { alert("Başlık zorunludur."); return; }
              onKaydet({ kategori, baslik, aciklama, adSoyad, telefon, durum:"beklemede", tarih:new Date().toLocaleString("tr-TR") });
            }}
            style={{ padding:"9px 16px", background:secilenKat?.color||"#3b82f6", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>
            📤 Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

const sf = {
  label: { fontSize:11, color:"#7a80a0", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" },
  input: { width:"100%", padding:"8px 10px", background:"#0f1117", border:"1px solid #2a2f45", borderRadius:8, color:"#e8eaf0", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
};

// ============================================================================
// ÖZNİTELİK FORMU
// ============================================================================
function OzellikFormModal({ ozellikForm, katmanDefs, onKaydet, onIptal }) {
  const katman = katmanDefs.find(d => d.key === ozellikForm.katmanKey) || katmanDefs[0];
  const KATMAN_ALANLARI = {
    parsel:    [{ ad:"ada_no", label:"Ada No", tip:"text" },{ ad:"parsel_no", label:"Parsel No", tip:"text" },{ ad:"alan_m2", label:"Alan (m²)", tip:"number" },{ ad:"malik", label:"Malik", tip:"text" }],
    yapi:      [{ ad:"yapi_adi", label:"Yapı Adı", tip:"text" },{ ad:"kat_sayisi", label:"Kat Sayısı", tip:"number" },{ ad:"yapi_turu", label:"Yapı Türü", tip:"select", secenekler:["Konut","Ticari","Kamu","Dini","Sanayi","Diğer"] }],
    mahalle:   [{ ad:"AD", label:"Mahalle Adı", tip:"text" },{ ad:"nufus", label:"Nüfus", tip:"number" }],
    yol:       [{ ad:"yol_adi", label:"Yol Adı", tip:"text" },{ ad:"yol_tipi", label:"Yol Tipi", tip:"select", secenekler:["Bulvar","Cadde","Sokak","Ara Yol"] },{ ad:"uzunluk_m", label:"Uzunluk (m)", tip:"number" }],
    numarataj: [{ ad:"kapi_no", label:"Kapı No", tip:"text" },{ ad:"daire_no", label:"Daire No", tip:"text" },{ ad:"adres", label:"Adres", tip:"text" }],
  };
  const alanlar = KATMAN_ALANLARI[ozellikForm.katmanKey] || [{ ad:"aciklama", label:"Açıklama", tip:"text" }];
  const [degerler, setDegerler] = useState(() => Object.fromEntries(alanlar.map(a => [a.ad, ""])));

  return (
    <div style={{ position:"fixed", inset:0, background:"#000b", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(4px)" }}>
      <div style={{ background:"#1e2030", border:`1px solid ${katman.color}44`, borderRadius:14, padding:24, width:"min(380px,92vw)", maxHeight:"85vh", overflowY:"auto", boxShadow:`0 0 32px ${katman.color}22` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
          <div style={{ width:12, height:12, borderRadius:"50%", background:katman.color, flexShrink:0 }} />
          <div style={{ fontSize:15, fontWeight:600, color:"#e8eaf0" }}>{katman.label} — Öznitelik Gir</div>
        </div>
        {alanlar.map(alan => (
          <div key={alan.ad} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:"#7a80a0", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{alan.label}</label>
            {alan.tip === "select" ? (
              <select value={degerler[alan.ad]||""} onChange={e => setDegerler(d => ({ ...d, [alan.ad]:e.target.value }))} style={sf.input}>
                <option value="">Seçin...</option>
                {alan.secenekler.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input type={alan.tip} placeholder={alan.label+" girin"} value={degerler[alan.ad]||""} onChange={e => setDegerler(d => ({ ...d, [alan.ad]:e.target.value }))} style={sf.input} />
            )}
          </div>
        ))}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, color:"#7a80a0", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>Not (opsiyonel)</label>
          <textarea placeholder="Ek açıklama..." value={degerler.not||""} onChange={e => setDegerler(d => ({ ...d, not:e.target.value }))} style={{ ...sf.input, height:60, resize:"vertical" }} />
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onIptal} style={{ padding:"8px 16px", background:"transparent", border:"1px solid #3a3f55", borderRadius:7, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>İptal</button>
          <button onClick={() => onKaydet(degerler)} style={{ padding:"8px 16px", background:katman.color, border:"none", borderRadius:7, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>✓ Kaydet</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// IMPORT/EXPORT MODALİ
// ============================================================================
function ImportExportModal({ onClose, onImport, layersRef, drawSrcRef, katmanSrcRef }) {
  const [aktif, setAktif] = useState("import");
  const [validation, setValidation] = useState(null);
  const [pendingGJ, setPendingGJ] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importHedef, setImportHedef] = useState("import");

  const exportKatmanlar = [
    ...LAYER_DEFS.map(def => ({
      v: def.key, l: def.label, color: def.color,
      count: layersRef.current[def.key]?.getSource?.()?.getFeatures?.()?.length ?? 0,
    })),
    { v:"cizim", l:"Çizimler", color:"#ff6600",
      count: (drawSrcRef.current?.getFeatures?.()?.length ?? 0) + Object.values(katmanSrcRef?.current||{}).reduce((s,src) => s+(src?.getFeatures?.()?.length??0), 0) },
    { v:"import", l:"İçe Aktarılan", color:"#f59e0b", count: layersRef.current.__import?.getSource?.()?.getFeatures?.()?.length ?? 0 },
    { v:"sikayet", l:"Şikayetler", color:"#ef4444", count: layersRef.current.__sikayet?.getSource?.()?.getFeatures?.()?.length ?? 0 },
  ];
  const [exportSecili, setExportSecili] = useState(exportKatmanlar.map(k => k.v));

  function handleExport() {
    const fmt = new GeoJSON();
    exportSecili.forEach(katmanKey => {
      let features = [];
      if (katmanKey === "cizim") {
        features.push(...(drawSrcRef.current?.getFeatures()||[]));
        Object.values(katmanSrcRef?.current||{}).forEach(src => { if (src?.getFeatures) features.push(...src.getFeatures()); });
      } else if (katmanKey === "import") {
        features.push(...(layersRef.current.__import?.getSource?.()?.getFeatures?.()||[]));
      } else if (katmanKey === "sikayet") {
        features.push(...(layersRef.current.__sikayet?.getSource?.()?.getFeatures?.()||[]));
      } else {
        features.push(...(layersRef.current[katmanKey]?.getSource?.()?.getFeatures?.()||[]));
      }
      if (features.length === 0) return;
      const meta = exportKatmanlar.find(k => k.v === katmanKey);
      const geojson = {
        type:"FeatureCollection",
        crs:{ type:"name", properties:{ name:"EPSG:4326" }},
        katman:katmanKey, katman_adi:meta?.l||katmanKey,
        tarih:new Date().toISOString(), kayit_sayisi:features.length,
        features:features.map(f => {
          try {
            const geom = f.getGeometry().clone().transform(MAP_PROJECTION,"EPSG:4326");
            const props = { ...f.getProperties() }; delete props.geometry;
            return { type:"Feature", properties:props, geometry:JSON.parse(fmt.writeGeometry(geom)) };
          } catch { return null; }
        }).filter(Boolean),
      };
      const blob = new Blob([JSON.stringify(geojson,null,2)], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `yetkin_cbs_${katmanKey}_${Date.now()}.geojson`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target.result);
        setValidation(validateGeoJSON(parsed)); setPendingGJ(parsed);
      } catch { setValidation({ valid:false, errors:["Dosya parse edilemedi."], warnings:[], count:0 }); }
      finally { setImporting(false); }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#1a1d27", border:"1px solid #2a2f45", borderRadius:16, padding:24, width:"min(520px,92vw)", maxHeight:"80vh", overflowY:"auto" }}>
        <div style={{ fontSize:16, fontWeight:600, color:"#e8eaf0", marginBottom:20 }}>📦 GeoJSON Import / Export</div>
        <div style={{ display:"flex", gap:4, marginBottom:20, background:"#0f1117", borderRadius:8, padding:4 }}>
          {["import","export"].map(t => (
            <button key={t} onClick={() => { setAktif(t); setValidation(null); setPendingGJ(null); }}
              style={{ flex:1, padding:8, borderRadius:6, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13,
                background:aktif===t?"#3b82f6":"transparent", color:aktif===t?"white":"#7a80a0" }}>
              {t==="import"?"⬆ Import (Yükle)":"⬇ Export (İndir)"}
            </button>
          ))}
        </div>
        {aktif === "import" && (
          <>
            {!validation ? (
              <>
                <label htmlFor="gj-file" style={{ display:"block", border:"2px dashed #2a2f45", borderRadius:10, padding:24, textAlign:"center", cursor:"pointer", marginBottom:12 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
                  <div style={{ fontSize:13, color:"#7a80a0" }}>GeoJSON dosyası seç veya sürükle bırak</div>
                </label>
                <input id="gj-file" type="file" accept=".json,.geojson" style={{ display:"none" }} onChange={handleFile} />
                {importing && <div style={{ color:"#7a80a0", fontSize:12, textAlign:"center" }}>🔍 Analiz ediliyor...</div>}
              </>
            ) : (
              <div>
                <div style={{ background:validation.valid?"#0f2a1a":"#2a0f0f", border:`1px solid ${validation.valid?"#22c55e":"#ef4444"}44`, borderRadius:10, padding:14, marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:validation.valid?"#22c55e":"#ef4444", marginBottom:8 }}>{validation.valid?"✅ Dosya Geçerli":"❌ Doğrulama Hatası"}</div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginBottom:8 }}><strong>{validation.count}</strong> özellik{validation.geomTypes?.length > 0 && ` · ${validation.geomTypes.join(", ")}`}</div>
                  {validation.errors.map((e,i) => <div key={i} style={{ fontSize:12, color:"#f87171", borderLeft:"2px solid #ef4444", paddingLeft:8, marginBottom:4 }}>⚠ {e}</div>)}
                  {validation.warnings.map((w,i) => <div key={i} style={{ fontSize:12, color:"#fbbf24", borderLeft:"2px solid #f59e0b", paddingLeft:8, marginBottom:4 }}>ℹ {w}</div>)}
                </div>
                {validation.count > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:"#7a80a0", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>Hangi katmana aktarılsın?</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                      {[...LAYER_DEFS.map(d => ({ v:d.key, l:d.label, color:d.color })), { v:"import", l:"İçe Aktarılan (Geçici)", color:"#f59e0b" }].map(({ v,l,color }) => (
                        <button key={v} onClick={() => setImportHedef(v)}
                          style={{ padding:"8px 6px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:11, textAlign:"left",
                            border: importHedef===v?`1px solid ${color}`:"1px solid #2a2f45",
                            background: importHedef===v?`${color}22`:"#0f1117",
                            color: importHedef===v?color:"#7a80a0",
                            display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ width:8, height:8, borderRadius:2, background:color, flexShrink:0, display:"inline-block" }} />{l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                  <button onClick={() => { setValidation(null); setPendingGJ(null); }} style={{ padding:"8px 14px", background:"transparent", border:"1px solid #3a3f55", borderRadius:8, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>Başka Dosya</button>
                  {validation.count > 0 && (
                    <button onClick={() => { onImport(pendingGJ, importHedef); onClose(); }}
                      style={{ padding:"8px 14px", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600, color:"#fff", background:validation.valid?"#3b82f6":"#f59e0b", opacity:!importHedef?0.4:1 }}
                      disabled={!importHedef}>
                      {validation.valid?`✓ Aktar`:"⚠ Yine de Aktar"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {aktif === "export" && (
          <>
            <div style={{ fontSize:12, color:"#7a80a0", marginBottom:10 }}>Hangi katmanları indirmek istiyorsun?</div>
            <label style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8, cursor:"pointer", marginBottom:8, fontSize:12, background:"#1a1d27", border:"1px solid #2a2f45" }}>
              <input type="checkbox" checked={exportSecili.length===exportKatmanlar.length} onChange={e => setExportSecili(e.target.checked?exportKatmanlar.map(k=>k.v):[])} />
              <span style={{ color:"#e8eaf0", fontWeight:600 }}>Tümünü Seç</span>
              <span style={{ marginLeft:"auto", fontSize:10, color:"#4a5070" }}>{exportSecili.length}/{exportKatmanlar.length} seçili</span>
            </label>
            {exportKatmanlar.map(({ v,l,color,count }) => (
              <label key={v} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8, cursor:"pointer", marginBottom:4, fontSize:12,
                background:exportSecili.includes(v)?"#3b82f611":"transparent",
                border:exportSecili.includes(v)?"1px solid #3b82f644":"1px solid transparent" }}>
                <input type="checkbox" checked={exportSecili.includes(v)} onChange={e => setExportSecili(s => e.target.checked?[...s,v]:s.filter(x=>x!==v))} />
                <span style={{ width:10, height:10, borderRadius:2, background:color, flexShrink:0 }} />
                <span style={{ color:"#e8eaf0", flex:1 }}>{l}</span>
                <span style={{ fontSize:11, color:"#4a5070" }}>{count} özellik</span>
              </label>
            ))}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
              <button style={ms.ghost} onClick={onClose}>İptal</button>
              <button style={{ ...ms.primary, opacity:exportSecili.length===0?0.4:1 }} disabled={exportSecili.length===0} onClick={handleExport}>
                ⬇ {exportSecili.length > 1 ? `${exportSecili.length} Dosya` : "GeoJSON"} İndir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const ms = {
  primary: { padding:"9px 16px", background:"#3b82f6", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13 },
  ghost:   { padding:"9px 16px", background:"transparent", color:"#7a80a0", border:"1px solid #2a2f45", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13 },
};

// ============================================================================
// KATMAN SIRALAMA
// ============================================================================
function LayerOrderModal({ layerOrder, setLayerOrder, onClose }) {
  const [order, setOrder] = useState([...layerOrder]);
  const dragIdx = useRef(null);
  const allLayerMeta = [
    ...LAYER_DEFS,
    { key:"poi",     label:"POI",            color:"#ffffff" },
    { key:"cizim",   label:"Çizimler",       color:"#ff6600" },
    { key:"import",  label:"İçe Aktarılan",  color:"#f59e0b" },
    { key:"sikayet", label:"Şikayetler",     color:"#ef4444" },
  ];
  const getMeta = key => allLayerMeta.find(l => l.key === key) || { key, label:key, color:"#888" };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:250, backdropFilter:"blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#1a1d27", border:"1px solid #2a2f45", borderRadius:16, padding:24, width:"min(360px,92vw)" }}>
        <div style={{ fontSize:16, fontWeight:600, color:"#e8eaf0", marginBottom:6 }}>🗂 Katman Sıralaması</div>
        <div style={{ fontSize:12, color:"#7a80a0", marginBottom:16 }}>Sürükle-bırak ile sırayı değiştir. Üstteki = önde.</div>
        {order.map((key, idx) => {
          const meta = getMeta(key);
          return (
            <div key={key} draggable
              onDragStart={() => { dragIdx.current = idx; }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragIdx.current === null || dragIdx.current === idx) return;
                const next = [...order]; const [moved] = next.splice(dragIdx.current, 1);
                next.splice(idx, 0, moved); setOrder(next); dragIdx.current = null;
              }}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:6,
                background:"#0f1117", border:"1px solid #2a2f45", borderRadius:8, cursor:"grab", userSelect:"none" }}>
              <span style={{ color:"#3a3f55", fontSize:16 }}>⠿</span>
              <span style={{ width:12, height:12, borderRadius:2, background:meta.color, flexShrink:0 }} />
              <span style={{ fontSize:13, color:"#e8eaf0", flex:1 }}>{meta.label}</span>
              <span style={{ fontSize:11, color:"#3a3f55" }}>#{idx+1}</span>
            </div>
          );
        })}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <button style={ms.ghost} onClick={onClose}>İptal</button>
          <button style={ms.primary} onClick={() => { setLayerOrder(order); onClose(); }}>✓ Uygula</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// İSTATİSTİK PANELİ
// ============================================================================
function StatisticsPanel({ katmanSrcRef, drawSrcRef, sikayetSrcRef, onClose }) {
  const [stats, setStats] = useState([]);
  useEffect(() => {
    const result = [];
    LAYER_DEFS.forEach(def => {
      const src = katmanSrcRef.current?.[def.key]; if (!src) return;
      const features = src.getFeatures(); if (features.length === 0) return;
      let totalArea = 0, totalLength = 0;
      features.forEach(f => {
        const geom = f.getGeometry();
        try {
          const type = geom.getType();
          if (type==="Polygon"||type==="MultiPolygon") { const ext=geom.getExtent(); totalArea+=Math.abs((ext[2]-ext[0])*(ext[3]-ext[1])); }
          if (type==="LineString"||type==="MultiLineString") {
            const coords = type==="LineString"?geom.getCoordinates():geom.getCoordinates().flat();
            for (let i=1;i<coords.length;i++) { const dx=coords[i][0]-coords[i-1][0],dy=coords[i][1]-coords[i-1][1]; totalLength+=Math.sqrt(dx*dx+dy*dy); }
          }
        } catch {}
      });
      result.push({ label:def.label, color:def.color, count:features.length, area:totalArea>0?(totalArea/10000).toFixed(2)+" ha":null, length:totalLength>0?(totalLength/1000).toFixed(2)+" km":null });
    });
    const dc = drawSrcRef.current?.getFeatures()||[];
    if (dc.length > 0) result.push({ label:"Çizimler", color:"#ff6600", count:dc.length, area:null, length:null });
    const sf = sikayetSrcRef.current?.getFeatures()||[];
    if (sf.length > 0) {
      const byD = { beklemede:0, incelemede:0, cozuldu:0 };
      sf.forEach(f => { const d=f.get("durum")||"beklemede"; byD[d]=(byD[d]||0)+1; });
      result.push({ label:"Şikayetler", color:"#ef4444", count:sf.length, extra:`Bekleyen:${byD.beklemede} · İncelenen:${byD.incelemede} · Çözülen:${byD.cozuldu}`, area:null, length:null });
    }
    setStats(result);
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:250, backdropFilter:"blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#1a1d27", border:"1px solid #2a2f45", borderRadius:16, padding:24, width:"min(400px,92vw)", maxHeight:"70vh", overflowY:"auto" }}>
        <div style={{ fontSize:16, fontWeight:600, color:"#e8eaf0", marginBottom:16 }}>📊 Çizim İstatistikleri</div>
        {stats.length === 0 ? (
          <div style={{ color:"#7a80a0", fontSize:13, textAlign:"center", padding:24 }}>Henüz hiç çizim verisi yok.</div>
        ) : stats.map((s,i) => (
          <div key={i} style={{ background:"#0f1117", border:`1px solid ${s.color}33`, borderRadius:10, padding:12, marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ width:10, height:10, borderRadius:2, background:s.color, flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight:600, color:"#e8eaf0" }}>{s.label}</span>
              <span style={{ marginLeft:"auto", fontSize:20, fontWeight:700, color:s.color }}>{s.count}</span>
            </div>
            {(s.area||s.length) && <div style={{ display:"flex", gap:12, fontSize:12, color:"#64748b" }}>{s.area&&<span>Alan: <strong style={{color:"#94a3b8"}}>{s.area}</strong></span>}{s.length&&<span>Uzunluk: <strong style={{color:"#94a3b8"}}>{s.length}</strong></span>}</div>}
            {s.extra && <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>{s.extra}</div>}
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
          <button style={ms.ghost} onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HARİTA BİLEŞENİ
// ============================================================================
function MapApp({ kullanici, onCikis }) {
  const mapRef          = useRef(null);
  const mapWrapRef      = useRef(null);
  const mapInstanceRef  = useRef(null);
  const layersRef       = useRef({});
  const hlSrcRef        = useRef(null);
  const visibilityRef   = useRef({});
  const mahalleFilterRef = useRef(null);
  const drawSrcRef      = useRef(null);
  const importSrcRef    = useRef(null);
  const sikayetSrcRef   = useRef(null);
  const nobetciSrcRef   = useRef(null);
  const routeSrcRef     = useRef(null);
  const drawInterRef    = useRef(null);
  const modifyDrawRef   = useRef(null);
  const snapInterRef    = useRef(null);
  const activeCatRef    = useRef(POI_CATEGORIES.reduce((a,c) => ({ ...a,[c.key]:true }), {}));
  const drawToolRef     = useRef(null);
  const cizimKatmanRef  = useRef(LAYER_DEFS[0].key);
  const katmanSrcRef    = useRef({});
  const routeMode       = useRef(null);
  const routePoints     = useRef({ start:null, end:null });
  const sikayetModeRef  = useRef(false);
  const pendingFeatureRef = useRef(null);
  const undoRedo = useUndoRedo();
  const isMobile = useIsMobile();

  // Geometri düzenleme hook — translateend/modifyend sonrası otomatik kaydet
  const geomDuzenle = useGeometriDuzenle({
    mapInstanceRef, layersRef, katmanSrcRef, drawSrcRef, sikayetSrcRef,
    onSave: () => {
      saveCizimler(katmanSrcRef, drawSrcRef);
      saveSikayetler(sikayetSrcRef);
    },
  });

  const [selectedFeature,  setSelectedFeature]  = useState(null);
  const [searchText,       setSearchText]        = useState("");
  const [searchResults,    setSearchResults]     = useState([]);
  const [addressQuery,     setAddressQuery]      = useState("");
  const [addressResults,   setAddressResults]    = useState([]);
  const [addressLoading,   setAddrLoad]          = useState(false);
  const [selectedMahalle,  setSelMahalle]        = useState("");
  const [mahalleList,      setMahalleList]       = useState([]);
  const [filterByMahalle,  setFilterByMah]       = useState(false);
  const [baseMap,          setBaseMap]           = useState("osm");
  const [loading,          setLoading]           = useState({});
  const [activeCategories, setActiveCats]        = useState(POI_CATEGORIES.reduce((a,c) => ({...a,[c.key]:true}), {}));
  const [layerVisibility,  setLayerVis]          = useState({
    ...LAYER_DEFS.reduce((a,l) => ({...a,[l.key]:true}), {}),
    poi:true, cizim:true, import:true, sikayet:true, nobetci:true,
  });
  const [drawTool,         setDrawToolState]     = useState(null);
  const [cizimKatman,      setCizimKatmanState]  = useState(LAYER_DEFS[0].key);
  const [showModal,        setShowModal]         = useState(false);
  const [showLayerOrder,   setShowLayerOrder]    = useState(false);
  const [showStats,        setShowStats]         = useState(false);
  const [showSifreDegistir,setShowSifreDegistir] = useState(false);
  const [showKullaniciYon, setShowKullaniciYon]  = useState(false);
  const [showNobetci,      setShowNobetci]       = useState(false);
  const [koordinat,        setKoordinat]         = useState({ lat:"—", lng:"—" });
  const [drawCount,        setDrawCount]         = useState(0);
  const [ozellikForm,      setOzellikForm]       = useState(null);
  const [sikayetMod,       setSikayetMod]        = useState(false);
  const [sikayetKonum,     setSikayetKonum]      = useState(null);
  const [sikayetFormAcik,  setSikayetFormAcik]   = useState(false);
  const [rotaMod,          setRotaMod]           = useState(false);
  const [rotaAdim,         setRotaAdim]          = useState(null);
  const [rotaBilgi,        setRotaBilgi]         = useState(null);
  const [rotaYukleniyor,   setRotaYuk]           = useState(false);

  // Mobil panel kontrolü
  const [mobilePanel,      setMobilePanel]       = useState("map"); // "map" | "layers" | "info" | "tools"
  const [mobileSideOpen,   setMobileSideOpen]    = useState(false);

  const defaultOrder = [...LAYER_DEFS.map(d=>d.key), "poi", "sikayet", "cizim", "import", "nobetci"];
  const [layerOrder, setLayerOrder] = useState(defaultOrder);

  const isAdmin      = kullanici.rol === "belediye_admin";
  const isSuperAdmin = kullanici.rol === "superadmin";
  const canEdit      = isAdmin || isSuperAdmin;

  // ── Layout resize ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const wrap = mapWrapRef.current; if (!wrap) return;
    const ro = new ResizeObserver(() => { mapInstanceRef.current?.updateSize(); });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // ── Klavye kısayolları ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (!canEdit) return;
      if ((e.ctrlKey||e.metaKey) && e.key==="z") { e.preventDefault(); undoRedo.undo(); setTimeout(() => saveCizimler(katmanSrcRef,drawSrcRef), 50); }
      if ((e.ctrlKey||e.metaKey) && (e.key==="y"||(e.shiftKey&&e.key==="z"))) { e.preventDefault(); undoRedo.redo(); setTimeout(() => saveCizimler(katmanSrcRef,drawSrcRef), 50); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canEdit]);

  // ── Harita kurulumu ───────────────────────────────────────────────────────
  useEffect(() => {
    const osmLayer  = new TileLayer({ source: new OSM(), visible:true });
    const uyduLayer = new TileLayer({
      source: new XYZ({ url:"https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" }),
      visible:false,
    });

    const hlSrc = new VectorSource();
    hlSrcRef.current = hlSrc;
    const hlLayer = new VectorLayer({
      source: hlSrc,
      style: f => f.get("__address") ? addressMarkerStyle : new Style({
        stroke: new Stroke({ color:"#ffff00", width:3 }),
        fill:   new Fill({ color:"rgba(255,255,0,0.3)" }),
        image:  new CircleStyle({ radius:10, stroke:new Stroke({ color:"#ffff00", width:3 }), fill:new Fill({ color:"rgba(255,255,0,0.3)" }) }),
      }),
      zIndex:1000,
    });
    hlLayer.set("__isHL", true);

    const drawSrc = new VectorSource();
    drawSrcRef.current = drawSrc;
    const drawLayer = new VectorLayer({ source:drawSrc, style:drawStyle, zIndex:900 });
    layersRef.current.__draw = drawLayer;

    const importSrc = new VectorSource();
    importSrcRef.current = importSrc;
    const importLayer = new VectorLayer({
      source: importSrc,
      style: new Style({ stroke:new Stroke({ color:"#f59e0b", width:2 }), fill:new Fill({ color:"rgba(245,158,11,0.12)" }), image:new CircleStyle({ radius:6, fill:new Fill({ color:"#f59e0b" }) }) }),
      zIndex:800,
    });
    layersRef.current.__import = importLayer;

    const sikayetSrc = new VectorSource();
    sikayetSrcRef.current = sikayetSrc;
    const sikayetLayer = new VectorLayer({ source:sikayetSrc, style:sikayetStyle, zIndex:850 });
    layersRef.current.__sikayet = sikayetLayer;

    // Nöbetçi eczane katmanı
    const nobetciSrc = new VectorSource();
    nobetciSrcRef.current = nobetciSrc;
    const nobetciLayer = new VectorLayer({ source:nobetciSrc, style:nobetciEczaneStyle, zIndex:870 });
    layersRef.current.__nobetci = nobetciLayer;

    const routeSrc = new VectorSource();
    routeSrcRef.current = routeSrc;
    const routeLayer = new VectorLayer({
      source: routeSrc,
      style: f => {
        const t = f.get("__type");
        if (t==="route") return routeStyle;
        if (t==="start") return routePointStyle("A");
        if (t==="end")   return routePointStyle("B");
        return null;
      },
      zIndex:950,
    });
    layersRef.current.__route = routeLayer;

    const map = new Map({
      target: mapRef.current,
      layers: [osmLayer, uyduLayer, drawLayer, importLayer, sikayetLayer, nobetciLayer, routeLayer, hlLayer],
      view:   new View({ center:INITIAL_CENTER, zoom:INITIAL_ZOOM, projection:MAP_PROJECTION }),
    });
    mapInstanceRef.current = map;
    layersRef.current.__base = { osm:osmLayer, uydu:uyduLayer };

    LAYER_DEFS.forEach(def => {
      const src = new VectorSource();
      katmanSrcRef.current[def.key] = src;
      const lyr = new VectorLayer({
        source: src,
        style: new Style({
          stroke: new Stroke({ color:def.color, width:2 }),
          fill:   new Fill({ color:def.color+"28" }),
          image:  new CircleStyle({ radius:6, fill:new Fill({ color:def.color }), stroke:new Stroke({ color:"#fff", width:1.5 }) }),
        }),
        zIndex:850,
      });
      layersRef.current[`__cizim_${def.key}`] = lyr;
      map.addLayer(lyr);
    });

    undoRedo.init(katmanSrcRef, drawSrcRef);
    setTimeout(() => { loadCizimler(katmanSrcRef, drawSrcRef, setDrawCount); loadSikayetler(sikayetSrcRef); }, 200);
    LAYER_DEFS.forEach(def => loadLayer(def, map));
    loadPoiLayer(map);

    // Harita tıklama
    map.on("click", evt => {
      if (sikayetModeRef.current) {
        const lonLat = toLonLat(evt.coordinate);
        setSikayetKonum(lonLat); setSikayetFormAcik(true); return;
      }
      if (routeMode.current === "start") {
        const coord = evt.coordinate;
        routePoints.current.start = coord;
        const f = new Feature(new Point(coord)); f.set("__type","start");
        routeSrcRef.current.getFeatures().filter(f => f.get("__type")==="start").forEach(f => routeSrcRef.current.removeFeature(f));
        routeSrcRef.current.addFeature(f);
        routeMode.current = "end"; setRotaAdim("end"); return;
      }
      if (routeMode.current === "end") {
        const coord = evt.coordinate;
        routePoints.current.end = coord;
        const f = new Feature(new Point(coord)); f.set("__type","end");
        routeSrcRef.current.getFeatures().filter(f => f.get("__type")==="end").forEach(f => routeSrcRef.current.removeFeature(f));
        routeSrcRef.current.addFeature(f);
        routeMode.current = "ready"; setRotaAdim("ready"); hesaplaRota(); return;
      }
      // Geometri düzenleme modundaysa normal tıklama işlemini atla
      if (geomDuzenle.mod) return;

      hlSrcRef.current.clear();
      let found = false;
      map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (layer === hlLayer) return;
        found = true; hlSrcRef.current.addFeature(feature);
        setSelectedFeature(feature.getProperties()); return true;
      });
      if (!found) setSelectedFeature(null);
    });

    map.on("pointermove", evt => {
      const [lng, lat] = toLonLat(evt.coordinate);
      setKoordinat({ lat:lat.toFixed(5), lng:lng.toFixed(5) });
      if (geomDuzenle.mod) return;
      const cursor = sikayetModeRef.current || routeMode.current
        ? "crosshair"
        : map.hasFeatureAtPixel(map.getEventPixel(evt.originalEvent)) ? "pointer" : "";
      map.getTargetElement().style.cursor = cursor;
    });

    // Silgi
    map.on("click", evt => {
      if (drawToolRef.current !== "erase") return;
      map.forEachFeatureAtPixel(evt.pixel, (f, layer) => {
        Object.entries(layersRef.current).forEach(([key, lyr]) => {
          if (key.startsWith("__cizim_") && lyr === layer) {
            const srcKey = key.replace("__cizim_","");
            katmanSrcRef.current[srcKey]?.removeFeature(f);
            undoRedo.pushRemove(f, srcKey);
            setDrawCount(n => Math.max(0,n-1));
          }
        });
        if (layer === layersRef.current.__draw) {
          drawSrcRef.current.removeFeature(f);
          undoRedo.pushRemove(f, "__draw");
          setDrawCount(n => Math.max(0,n-1));
        }
        return true;
      });
    });

    const forceSize = () => mapInstanceRef.current?.updateSize();
    requestAnimationFrame(() => { forceSize(); requestAnimationFrame(forceSize); });
    setTimeout(forceSize, 100); setTimeout(forceSize, 500);
    window.addEventListener("resize", forceSize);

    return () => {
      window.removeEventListener("resize", forceSize);
      const currentMap = mapInstanceRef.current;
      if (currentMap) {
        [drawInterRef, modifyDrawRef, snapInterRef].forEach(ref => {
          if (ref.current) { try { currentMap.removeInteraction(ref.current); } catch {} ref.current = null; }
        });
        currentMap.setTarget(null);
      }
      mapInstanceRef.current = null;
      layersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hesaplaRota
  const hesaplaRota = useCallback(async () => {
    const { start, end } = routePoints.current;
    if (!start || !end) return;
    setRotaYuk(true); setRotaBilgi(null);
    try {
      const [sLng,sLat] = toLonLat(start);
      const [eLng,eLat] = toLonLat(end);
      const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.[0]) { alert("Rota bulunamadı."); return; }
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map(c => fromLonLat(c));
      routeSrcRef.current.getFeatures().filter(f => f.get("__type")==="route").forEach(f => routeSrcRef.current.removeFeature(f));
      const routeFeature = new Feature(new LineString(coords));
      routeFeature.set("__type","route");
      routeSrcRef.current.addFeature(routeFeature);
      setRotaBilgi({ mesafe:(route.distance/1000).toFixed(1), sure:Math.round(route.duration/60) });
      mapInstanceRef.current?.getView().fit(routeSrcRef.current.getExtent(), { duration:800, maxZoom:16, padding:[40,40,40,40] });
    } catch (e) { alert("Rota hesaplanamadı: " + e.message); }
    finally { setRotaYuk(false); }
  }, []);

  const loadLayer = (def, mapInst) => {
    const url = USE_GEOSERVER ? wfsUrl(def.typeName) : def.file;
    setLoading(s => ({ ...s, [def.key]:true }));
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const map = mapInst || mapInstanceRef.current; if (!map) return;
        const existing = layersRef.current[def.key]; if (existing) map.removeLayer(existing);
        const features = new GeoJSON().readFeatures(data, { dataProjection:USE_GEOSERVER?MAP_PROJECTION:DATA_PROJECTION, featureProjection:MAP_PROJECTION });
        const layer = new VectorLayer({ source:new VectorSource({ features }), style:makeFilterStyle(styleFor(def.key,def.color),def.key), visible:visibilityRef.current[def.key]!==false });
        map.addLayer(layer); layersRef.current[def.key] = layer;
        if (def.key === "mahalle") {
          const names = new Set();
          features.forEach(f => { const n = f.get("AD")||f.get("ad"); if (n) names.add(String(n).trim()); });
          setMahalleList(Array.from(names).sort());
        }
        if (def.zoomTo && features.length > 0)
          map.getView().fit(layer.getSource().getExtent(), { duration:1000, maxZoom:18 });
      })
      .catch(err => console.warn("Katman yüklenemedi:", def.key, err.message))
      .finally(() => setLoading(s => ({ ...s, [def.key]:false })));
  };

  const loadPoiLayer = (mapInst) => {
    const url = USE_GEOSERVER ? wfsUrl("poi") : "./data/silvan/poi.geojson";
    setLoading(s => ({ ...s, poi:true }));
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const map = mapInst || mapInstanceRef.current; if (!map) return;
        const features = new GeoJSON().readFeatures(data, { dataProjection:USE_GEOSERVER?MAP_PROJECTION:DATA_PROJECTION, featureProjection:MAP_PROJECTION });
        const layer = new VectorLayer({ source:new VectorSource({ features }), style:makeFilterStyle(poiStyle,"poi"), zIndex:500, visible:visibilityRef.current.poi!==false });
        map.addLayer(layer); layersRef.current.poi = layer;
      })
      .catch(err => console.warn("POI bulunamadı:", err.message))
      .finally(() => setLoading(s => ({ ...s, poi:false })));
  };

  const makeFilterStyle = (baseStyle, key) => (feature, resolution) => {
    if (mahalleFilterRef.current && key !== "mahalle") { if (!isInsideMahalle(feature, mahalleFilterRef.current)) return null; }
    if (key === "poi") { const kat=(feature.get("kategori")||"diger").toLowerCase(); if (!activeCatRef.current[kat]) return null; }
    return typeof baseStyle === "function" ? baseStyle(feature, resolution) : baseStyle;
  };

  useEffect(() => {
    const base = layersRef.current.__base; if (!base) return;
    base.osm.setVisible(baseMap==="osm"); base.uydu.setVisible(baseMap==="uydu");
  }, [baseMap]);

  useEffect(() => {
    visibilityRef.current = layerVisibility;
    Object.entries(layerVisibility).forEach(([key,vis]) => { const l=layersRef.current[key]; if (l?.setVisible) l.setVisible(vis); });
    layersRef.current.__draw?.setVisible(layerVisibility.cizim!==false);
    layersRef.current.__import?.setVisible(layerVisibility.import!==false);
    layersRef.current.__sikayet?.setVisible(layerVisibility.sikayet!==false);
    layersRef.current.__nobetci?.setVisible(layerVisibility.nobetci!==false);
  }, [layerVisibility]);

  useEffect(() => {
    layerOrder.forEach((key, idx) => {
      const zIndex = (layerOrder.length - idx) * 10 + 100;
      const layer = layersRef.current[key];
      if (layer?.setZIndex) layer.setZIndex(zIndex);
    });
  }, [layerOrder]);

  useEffect(() => { activeCatRef.current = activeCategories; layersRef.current.poi?.changed(); }, [activeCategories]);
  useEffect(() => { sikayetModeRef.current = sikayetMod; }, [sikayetMod]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!searchText || searchText.length < 2) { setSearchResults([]); return; }
      const q = searchText.toLowerCase();
      const fields = ["AD","ad","yol_adi","YOL_ADI","ADA_NO","ada_no","PARSEL_NO","parsel_no","kapi_no","KAPINO","NO"];
      const results = [];
      Object.entries(layersRef.current).forEach(([key, layer]) => {
        if (key.startsWith("__")) return;
        const src = layer?.getSource?.(); if (!src?.forEachFeature) return;
        src.forEachFeature(f => {
          const props = f.getProperties();
          for (const field of fields) {
            if (props[field] && String(props[field]).toLowerCase().includes(q)) {
              results.push({ feature:f, layerKey:key, label:String(props[field]) }); break;
            }
          }
        });
      });
      setSearchResults(results.slice(0,25));
    }, 250);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    if (!addressQuery || addressQuery.length < 3) { setAddressResults([]); return; }
    setAddrLoad(true);
    const t = setTimeout(() => {
      fetch("https://nominatim.openstreetmap.org/search?" + new URLSearchParams({ q:addressQuery, format:"json", addressdetails:"1", limit:"8", countrycodes:"tr", viewbox:"40.7,38.4,41.3,37.9", bounded:"0" }).toString(), { headers:{ "Accept-Language":"tr" }})
        .then(r => r.json()).then(d => setAddressResults(d||[]))
        .catch(() => setAddressResults([]))
        .finally(() => setAddrLoad(false));
    }, 500);
    return () => clearTimeout(t);
  }, [addressQuery]);

  useEffect(() => {
    if (filterByMahalle && selectedMahalle) {
      const src = layersRef.current["mahalle"]?.getSource();
      let found = null;
      src?.forEachFeature(f => { if (String(f.get("AD")||f.get("ad")||"").trim()===selectedMahalle) found=f; });
      mahalleFilterRef.current = found ? found.getGeometry() : null;
    } else { mahalleFilterRef.current = null; }
    refreshStyles();
  }, [filterByMahalle, selectedMahalle]);

  const zoomToFeature = useCallback((feature) => {
    const map = mapInstanceRef.current; const hl = hlSrcRef.current;
    if (!map || !hl) return;
    const geom = feature.getGeometry();
    geom.getType()==="Point"
      ? map.getView().animate({ center:geom.getCoordinates(), zoom:19, duration:800 })
      : map.getView().fit(geom.getExtent(), { duration:800, maxZoom:19 });
    hl.clear(); hl.addFeature(feature);
    setSelectedFeature(feature.getProperties()); setSearchResults([]);
    if (isMobile) setMobilePanel("info");
  }, [isMobile]);

  const goToAddress = (item) => {
    const map = mapInstanceRef.current; const hl = hlSrcRef.current;
    if (!map || !hl) return;
    const coord = fromLonLat([parseFloat(item.lon), parseFloat(item.lat)]);
    map.getView().animate({ center:coord, zoom:18, duration:800 });
    hl.clear();
    const f = new Feature({ geometry:new Point(coord) });
    f.setProperties({ __address:true, Adres:item.display_name, Enlem:parseFloat(item.lat).toFixed(6), Boylam:parseFloat(item.lon).toFixed(6) });
    hl.addFeature(f);
    setSelectedFeature({ Adres:item.display_name, Enlem:parseFloat(item.lat).toFixed(6), Boylam:parseFloat(item.lon).toFixed(6) });
    setAddressResults([]); setAddressQuery(item.display_name.split(",")[0]);
    if (isMobile) setMobilePanel("info");
  };

  const handleMahalleChange = (ad) => {
    setSelMahalle(ad);
    const map = mapInstanceRef.current; const hl = hlSrcRef.current;
    if (!map || !hl) return;
    if (!ad) { hl.clear(); mahalleFilterRef.current = null; refreshStyles(); return; }
    const src = layersRef.current["mahalle"]?.getSource();
    let found = null;
    src?.forEachFeature(f => { if (String(f.get("AD")||f.get("ad")||"").trim()===ad) found=f; });
    if (!found) return;
    map.getView().fit(found.getGeometry().getExtent(), { duration:1000, maxZoom:16 });
    hl.clear(); hl.addFeature(found); setSelectedFeature(found.getProperties());
    if (filterByMahalle) { mahalleFilterRef.current = found.getGeometry(); refreshStyles(); }
  };

  const applyDrawInteraction = useCallback((tool, katman) => {
    const map = mapInstanceRef.current; if (!map) return;
    const removeInteraction = (ref) => {
      if (ref.current) { try { map.removeInteraction(ref.current); } catch {} ref.current = null; }
    };
    removeInteraction(snapInterRef); removeInteraction(modifyDrawRef); removeInteraction(drawInterRef);
    mapInstanceRef.current?.render();
    if (!tool || tool === "erase") return;
    const hedefSrc = katmanSrcRef.current[katman] || drawSrcRef.current;
    if (!hedefSrc) return;
    try {
      const draw = new Draw({ source:hedefSrc, type:tool });
      draw.on("drawend", (evt) => {
        const feature = evt.feature;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          try { hedefSrc.removeFeature(feature); } catch {}
          pendingFeatureRef.current = feature;
          setOzellikForm({ katmanKey:katman, feature:feature });
        }));
      });
      map.addInteraction(draw); drawInterRef.current = draw;
      const modify = new Modify({ source:hedefSrc }); map.addInteraction(modify); modifyDrawRef.current = modify;
      const snap = new Snap({ source:hedefSrc }); map.addInteraction(snap); snapInterRef.current = snap;
    } catch (e) { console.warn("Interaction eklenirken hata:", e); }
  }, []);

  const setDrawTool = (val) => {
    drawToolRef.current = val; setDrawToolState(val);
    // Geometri düzenleme ile çakışmayı önle
    if (val) geomDuzenle.temizle();
    applyDrawInteraction(val, cizimKatmanRef.current);
  };

  const setCizimKatman = (val) => {
    cizimKatmanRef.current = val; setCizimKatmanState(val);
    if (drawToolRef.current && drawToolRef.current !== "erase") applyDrawInteraction(drawToolRef.current, val);
  };

  const refreshStyles = () => {
    Object.entries(layersRef.current).forEach(([k,l]) => { if (!k.startsWith("__")) l?.changed?.(); });
  };

  const handleOzellikKaydet = (degerler) => {
    const f = pendingFeatureRef.current; if (!f || !ozellikForm) return;
    f.setProperties({ ...degerler, __katman:ozellikForm.katmanKey });
    const src = katmanSrcRef.current[ozellikForm.katmanKey] || drawSrcRef.current;
    src.addFeature(f);
    undoRedo.pushAdd(f, ozellikForm.katmanKey);
    setDrawCount(n => n+1);
    pendingFeatureRef.current = null; setOzellikForm(null);
    setTimeout(() => saveCizimler(katmanSrcRef, drawSrcRef), 50);
  };

  const handleOzellikIptal = () => { pendingFeatureRef.current = null; setOzellikForm(null); };

  const handleSikayetKaydet = (degerler) => {
    if (!sikayetKonum) return;
    const coord = fromLonLat(sikayetKonum);
    const f = new Feature(new Point(coord));
    f.setProperties({ ...degerler, __type:"sikayet" });
    sikayetSrcRef.current.addFeature(f);
    setSikayetFormAcik(false); setSikayetKonum(null); setSikayetMod(false);
    setTimeout(() => saveSikayetler(sikayetSrcRef), 50);
    alert("✅ Şikayetiniz kaydedildi. Teşekkürler!");
  };

  const handleImport = (geojson, hedefKatman = "import") => {
    try {
      const features = new GeoJSON().readFeatures(geojson, { dataProjection:"EPSG:4326", featureProjection:MAP_PROJECTION });
      if (features.length === 0) { alert("Dosyada özellik bulunamadı."); return; }
      let hedefSrc = null;
      const hedefAdi = hedefKatman === "import" ? "İçe Aktarılan" : LAYER_DEFS.find(d=>d.key===hedefKatman)?.label||hedefKatman;
      if (hedefKatman === "import") hedefSrc = importSrcRef.current;
      else if (katmanSrcRef.current[hedefKatman]) hedefSrc = katmanSrcRef.current[hedefKatman];
      else hedefSrc = layersRef.current[hedefKatman]?.getSource?.();
      if (!hedefSrc) { alert("Hedef katman bulunamadı."); return; }
      features.forEach(f => f.set("__import_katman", hedefKatman));
      hedefSrc.addFeatures(features);
      const extent = hedefSrc.getExtent();
      if (extent && extent[0] !== Infinity) mapInstanceRef.current?.getView().fit(extent, { duration:800, maxZoom:18, padding:[40,40,40,40] });
      alert(`✅ ${features.length} özellik "${hedefAdi}" katmanına aktarıldı.`);
    } catch (e) { alert("Import hatası: " + e.message); }
  };

  const temizleRota = () => {
    routeSrcRef.current?.clear();
    routePoints.current = { start:null, end:null };
    routeMode.current = null;
    setRotaMod(false); setRotaAdim(null); setRotaBilgi(null);
  };

  // ── Render yardımcıları ───────────────────────────────────────────────────
  const rolRenk  = { superadmin:"#a855f7", belediye_admin:"#3b82f6", vatandas:"#22c55e" };
  const rolLabel = { superadmin:"⚡ Süper Admin", belediye_admin:"🔧 Belediye Admin", vatandas:"👤 Vatandaş" };
  const drawTools = [
    { id:"Point",      label:"📍 Nokta"  },
    { id:"LineString", label:"📏 Çizgi"  },
    { id:"Polygon",    label:"⬡ Alan"    },
    { id:"erase",      label:"🗑 Sil"    },
  ];

  // ── SOL PANEL İÇERİĞİ (hem masaüstü hem mobil drawer'da kullanılır) ──────
  const SolPanelIcerik = () => (
    <>
      {/* Profil */}
      <div style={{ marginBottom:8 }}>
        <h3 style={{ margin:"0 0 2px 0", fontSize:15 }}>YetkinGIS</h3>
        <div style={{ fontSize:10, color:"#888", marginBottom:6 }}>{USE_GEOSERVER?"GeoServer WFS":"Yerel veri"}</div>
        <div style={{ background:"#333", borderRadius:6, padding:"6px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600 }}>{kullanici.ad}</div>
            <div style={{ fontSize:10, color:rolRenk[kullanici.rol] }}>{rolLabel[kullanici.rol]}</div>
            <div style={{ fontSize:10, color:"#666" }}>{kullanici.belediye}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <button onClick={onCikis} style={{ background:"transparent", border:"1px solid #555", borderRadius:4, color:"#aaa", fontSize:11, cursor:"pointer", padding:"3px 6px" }}>Çıkış</button>
            {canEdit && (
              <button onClick={() => setShowSifreDegistir(true)} style={{ background:"transparent", border:"1px solid #3b82f655", borderRadius:4, color:"#3b82f6", fontSize:10, cursor:"pointer", padding:"2px 6px" }}>🔑 Şifre</button>
            )}
            {isSuperAdmin && (
              <button onClick={() => setShowKullaniciYon(true)} style={{ background:"transparent", border:"1px solid #a855f755", borderRadius:4, color:"#a855f7", fontSize:10, cursor:"pointer", padding:"2px 6px" }}>👥 Kullanıcılar</button>
            )}
          </div>
        </div>
      </div>

      {/* Vatandaş Araçları */}
      <hr style={ss.hr} />
      <h4 style={ss.h4}>Vatandaş Araçları</h4>

      {/* Nöbetçi Eczane */}
      <button onClick={() => setShowNobetci(true)}
        style={{ ...ss.btn, width:"100%", textAlign:"center", marginBottom:6, background:"#0f2a1a", border:"1px solid #22c55e44", color:"#22c55e" }}>
        💊 Nöbetçi Eczane Bul
      </button>

      {/* Şikayet */}
      <button onClick={() => { if (sikayetMod) { setSikayetMod(false); } else { setSikayetMod(true); setRotaMod(false); temizleRota(); setDrawTool(null); geomDuzenle.temizle(); } }}
        style={{ ...ss.btn, width:"100%", textAlign:"center", marginBottom:6,
          background:sikayetMod?"#ef444422":"#444", border:sikayetMod?"1px solid #ef4444":"1px solid #555", color:sikayetMod?"#ef4444":"#ccc" }}>
        🚨 {sikayetMod ? "Şikayet Modu Aktif — İptal" : "Şikayet / Talep Bildir"}
      </button>
      {sikayetMod && (
        <div style={{ fontSize:11, color:"#f59e0b", padding:"5px 8px", background:"#2a1f0a", borderRadius:6, marginBottom:6, border:"1px solid #f59e0b44" }}>
          Haritada şikayet lokasyonuna tıklayın
        </div>
      )}

      {/* Rota */}
      <button onClick={() => {
          if (rotaMod) { temizleRota(); }
          else { setRotaMod(true); setSikayetMod(false); routeMode.current="start"; setRotaAdim("start"); setDrawTool(null); geomDuzenle.temizle(); }
        }}
        style={{ ...ss.btn, width:"100%", textAlign:"center", marginBottom:6,
          background:rotaMod?"#3b82f622":"#444", border:rotaMod?"1px solid #3b82f6":"1px solid #555", color:rotaMod?"#3b82f6":"#ccc" }}>
        🗺 {rotaMod ? "Rota Modundan Çık" : "Rota Hesapla"}
      </button>
      {rotaMod && (
        <div style={{ background:"#0f1729", border:"1px solid #3b82f644", borderRadius:8, padding:"8px 10px", marginBottom:6, fontSize:11 }}>
          {rotaAdim==="start" && <div style={{ color:"#22c55e" }}>📍 Başlangıç noktasına tıklayın (A)</div>}
          {rotaAdim==="end"   && <div style={{ color:"#ef4444" }}>📍 Bitiş noktasına tıklayın (B)</div>}
          {rotaAdim==="ready" && rotaYukleniyor && <div style={{ color:"#f59e0b" }}>⏳ Rota hesaplanıyor...</div>}
          {rotaBilgi && (
            <div style={{ color:"#e8eaf0" }}>
              <div>📏 Mesafe: <strong style={{color:"#3b82f6"}}>{rotaBilgi.mesafe} km</strong></div>
              <div>⏱ Süre: <strong style={{color:"#3b82f6"}}>{rotaBilgi.sure} dk</strong></div>
              <button onClick={() => { temizleRota(); setRotaMod(true); routeMode.current="start"; setRotaAdim("start"); }}
                style={{ marginTop:6, padding:"4px 10px", background:"#3b82f633", border:"1px solid #3b82f6", borderRadius:6, color:"#3b82f6", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>
                ↺ Yeni Rota
              </button>
            </div>
          )}
        </div>
      )}

      <h4 style={ss.h4}>Veri Arama</h4>
      <input type="text" placeholder="Parsel, mahalle, yol..." value={searchText} onChange={e => setSearchText(e.target.value)} style={ss.input} />
      {searchResults.length > 0 && (
        <div style={ss.results}>
          {searchResults.map((item, idx) => (
            <div key={idx} onClick={() => { zoomToFeature(item.feature); if (isMobile) setMobileSideOpen(false); }} style={ss.resultItem}
              onMouseEnter={e => e.currentTarget.style.background="#555"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <span style={ss.tag}>{item.layerKey}</span>{item.label.substring(0,28)}
            </div>
          ))}
        </div>
      )}

      <h4 style={ss.h4}>Adres Arama</h4>
      <input type="text" placeholder="Sokak, mahalle, yer adı..." value={addressQuery} onChange={e => setAddressQuery(e.target.value)} style={ss.input} />
      {addressLoading && <div style={{ fontSize:10, color:"#aaa", padding:"4px 0" }}>🔍 Aranıyor...</div>}
      {addressResults.length > 0 && (
        <div style={ss.results}>
          {addressResults.map((item, idx) => (
            <div key={item.place_id||idx} onClick={() => { goToAddress(item); if (isMobile) setMobileSideOpen(false); }} style={ss.resultItem}
              onMouseEnter={e => e.currentTarget.style.background="#555"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <div style={{ color:"#4fc3f7", fontWeight:500 }}>{item.display_name.split(",")[0]}</div>
              <div style={{ color:"#888", fontSize:10 }}>{item.display_name.split(",").slice(1,3).join(",")}</div>
            </div>
          ))}
        </div>
      )}

      <h4 style={ss.h4}>Mahalle</h4>
      <select value={selectedMahalle} onChange={e => handleMahalleChange(e.target.value)} style={ss.input}>
        <option value="">Tüm Mahalleler</option>
        {mahalleList.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      {selectedMahalle && (
        <label style={{ ...ss.layerRow, color:"#4fc3f7", marginTop:4 }}>
          <input type="checkbox" checked={filterByMahalle} onChange={e => setFilterByMah(e.target.checked)} />
          <span>Sadece bu mahalle</span>
        </label>
      )}

      <hr style={ss.hr} />
      <h4 style={ss.h4}>Altlık</h4>
      <button onClick={() => setBaseMap("osm")}  style={{ ...ss.btn, ...(baseMap==="osm"  ? ss.btnActive : {}) }}>🗺️ OSM</button>
      <button onClick={() => setBaseMap("uydu")} style={{ ...ss.btn, ...(baseMap==="uydu" ? ss.btnActive : {}) }}>🛰️ Uydu</button>

      <hr style={ss.hr} />
      <h4 style={ss.h4}>Katmanlar</h4>
      {[
        ...LAYER_DEFS,
        { key:"poi",     label:"POI",            color:"#ffffff" },
        { key:"sikayet", label:"Şikayetler",     color:"#ef4444" },
        { key:"nobetci", label:"Nöbetçi Eczane", color:"#22c55e" },
        { key:"cizim",   label:"Çizimler",       color:"#ff6600" },
        { key:"import",  label:"İçe Aktarılan",  color:"#f59e0b" },
      ].map(({ key, label, color }) => (
        <label key={key} style={ss.layerRow}>
          <input type="checkbox" checked={layerVisibility[key]!==false} onChange={e => setLayerVis(st => ({ ...st, [key]:e.target.checked }))} />
          <span style={{ color }}>■</span>
          <span>{label}</span>
          {loading[key] && <span style={ss.loadingDot}>...</span>}
        </label>
      ))}

      {layerVisibility.poi && (
        <>
          <hr style={ss.hr} />
          <h4 style={ss.h4}>POI Kategorileri</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
            {POI_CATEGORIES.map(cat => (
              <label key={cat.key} style={{ ...ss.layerRow, fontSize:11, padding:"3px 4px", background:activeCategories[cat.key]?"#3a3a3a":"transparent", borderRadius:3 }}>
                <input type="checkbox" checked={activeCategories[cat.key]} onChange={() => setActiveCats(s => ({ ...s, [cat.key]:!s[cat.key] }))} />
                <span style={{ display:"inline-block", width:14, height:14, borderRadius:"50%", background:cat.color, color:"#fff", fontSize:9, textAlign:"center", lineHeight:"14px", fontWeight:"bold" }}>{cat.symbol}</span>
                <span>{cat.label}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* Çizim Araçları */}
      {canEdit && (
        <>
          <hr style={ss.hr} />
          <h4 style={ss.h4}>Çizim Araçları</h4>

          {/* Undo/Redo */}
          <div style={{ display:"flex", gap:4, marginBottom:8 }}>
            <button onClick={() => { undoRedo.undo(); setTimeout(() => saveCizimler(katmanSrcRef,drawSrcRef), 50); }}
              style={{ flex:1, padding:"6px 4px", fontSize:11, borderRadius:6, cursor:"pointer", fontFamily:"inherit", border:"1px solid #555", background:"#444", color:"#ccc" }}>
              ↩ Geri Al
            </button>
            <button onClick={() => { undoRedo.redo(); setTimeout(() => saveCizimler(katmanSrcRef,drawSrcRef), 50); }}
              style={{ flex:1, padding:"6px 4px", fontSize:11, borderRadius:6, cursor:"pointer", fontFamily:"inherit", border:"1px solid #555", background:"#444", color:"#ccc" }}>
              ↪ İleri Al
            </button>
          </div>

          {/* ── YENİ: GEOMETRİ DÜZENLEME & TAŞIMA ─────────────────────── */}
          <div style={{ background:"#1a2535", border:"1px solid #facc1544", borderRadius:8, padding:"10px 10px", marginBottom:10 }}>
            <div style={{ fontSize:10, color:"#facc15", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:600 }}>
              ✏ Geometri Düzenle / Taşı
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              <button
                onClick={() => {
                  setDrawTool(null); setSikayetMod(false); setRotaMod(false);
                  geomDuzenle.aktifEt("modify");
                }}
                style={{
                  padding:"8px 6px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                  border: geomDuzenle.mod==="modify" ? "1px solid #facc15" : "1px solid #334155",
                  background: geomDuzenle.mod==="modify" ? "#facc1522" : "#0f1729",
                  color: geomDuzenle.mod==="modify" ? "#facc15" : "#7a80a0",
                  display:"flex", alignItems:"center", gap:5, justifyContent:"center",
                }}>
                ✏ Düzenle
              </button>
              <button
                onClick={() => {
                  setDrawTool(null); setSikayetMod(false); setRotaMod(false);
                  geomDuzenle.aktifEt("translate");
                }}
                style={{
                  padding:"8px 6px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                  border: geomDuzenle.mod==="translate" ? "1px solid #facc15" : "1px solid #334155",
                  background: geomDuzenle.mod==="translate" ? "#facc1522" : "#0f1729",
                  color: geomDuzenle.mod==="translate" ? "#facc15" : "#7a80a0",
                  display:"flex", alignItems:"center", gap:5, justifyContent:"center",
                }}>
                ↔ Taşı
              </button>
            </div>
            {geomDuzenle.mod && (
              <div style={{ fontSize:10, color:"#fbbf24", marginTop:8, background:"#2a1f0a", padding:"5px 8px", borderRadius:6 }}>
                {geomDuzenle.mod==="modify"
                  ? "🖱 Noktayı sürükleyerek geometriyi düzenle. Tekrar tıkla = çıkış."
                  : "✋ Objeye tıkla, sürükleyerek taşı. Tekrar tıkla = çıkış."}
                <div style={{ marginTop:4 }}>
                  <button onClick={geomDuzenle.temizle} style={{ fontSize:10, padding:"3px 8px", background:"#ef444422", border:"1px solid #ef4444", borderRadius:4, color:"#ef4444", cursor:"pointer", fontFamily:"inherit" }}>
                    ✕ Modu Kapat
                  </button>
                </div>
              </div>
            )}
            {geomDuzenle.secilenInfo && (
              <div style={{ fontSize:10, color:"#94a3b8", marginTop:6, background:"#0f1729", padding:"5px 8px", borderRadius:6 }}>
                <div style={{ color:"#facc15", marginBottom:3 }}>Seçilen:</div>
                {Object.entries(geomDuzenle.secilenInfo).filter(([k]) => !k.startsWith("__") && k!=="geometry").slice(0,3).map(([k,v]) => (
                  <div key={k}>{k}: <span style={{ color:"#e8eaf0" }}>{String(v).substring(0,20)}</span></div>
                ))}
              </div>
            )}
          </div>

          <div style={{ fontSize:10, color:"#7a80a0", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>1. Katman Seç</div>
          <div style={{ marginBottom:10 }}>
            {LAYER_DEFS.map(def => (
              <button key={def.key} onClick={() => setCizimKatman(def.key)}
                style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"6px 8px", marginBottom:3, borderRadius:6, cursor:"pointer",
                  border:cizimKatman===def.key?`1px solid ${def.color}`:"1px solid #444",
                  background:cizimKatman===def.key?`${def.color}18`:"#383838",
                  color:cizimKatman===def.key?def.color:"#aaa", fontSize:12, fontFamily:"inherit", textAlign:"left" }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:def.color, flexShrink:0, display:"inline-block" }} />
                {def.label}
                {cizimKatman===def.key && <span style={{ marginLeft:"auto", fontSize:10 }}>✓</span>}
              </button>
            ))}
          </div>

          <div style={{ fontSize:10, color:"#7a80a0", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>2. Çizim Aracı Seç</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:8 }}>
            {drawTools.map(({ id, label }) => {
              const aktifKatman = LAYER_DEFS.find(d => d.key === cizimKatman);
              const aktifRenk = aktifKatman?.color || "#1976d2";
              return (
                <button key={id} onClick={() => setDrawTool(drawTool===id?null:id)}
                  style={{ padding:"6px 4px", fontSize:11, textAlign:"center", borderRadius:6, cursor:"pointer", fontFamily:"inherit",
                    border:drawTool===id?`1px solid ${aktifRenk}`:"1px solid #555",
                    background:drawTool===id?`${aktifRenk}22`:"#444",
                    color:drawTool===id?aktifRenk:"#ccc" }}>
                  {label}
                </button>
              );
            })}
          </div>

          {drawTool && drawTool !== "erase" && (() => {
            const kat = LAYER_DEFS.find(d => d.key === cizimKatman);
            return (
              <div style={{ fontSize:11, padding:"6px 8px", borderRadius:6, marginBottom:8, background:`${kat?.color||"#1976d2"}18`, border:`1px solid ${kat?.color||"#1976d2"}44`, color:kat?.color||"#4fc3f7" }}>
                <div style={{ fontWeight:600, marginBottom:2 }}>{kat?.label} katmanına çiziyorsun</div>
                <div style={{ fontSize:10, opacity:0.8 }}>
                  {drawTool==="Point"&&"Tıkla → öznitelik gir → kaydet"}
                  {drawTool==="LineString"&&"Tıkla çiz → çift tıkla bitir → öznitelik gir"}
                  {drawTool==="Polygon"&&"Tıkla çiz → ilk noktaya dön → öznitelik gir"}
                </div>
              </div>
            );
          })()}
          {drawTool==="erase" && <div style={{ fontSize:11, color:"#ff6666", padding:"5px 8px", background:"#3a1a1a", borderRadius:6, marginBottom:8 }}>Silmek istediğin çizime tıkla</div>}

          <div style={{ fontSize:11, color:"#555", marginBottom:8 }}>
            Toplam {drawCount} çizim · <span style={{color:"#22c55e",fontSize:10}}>💾 Otomatik kaydediliyor</span>
          </div>

          <button onClick={() => { Object.values(katmanSrcRef.current).forEach(src => src.clear()); drawSrcRef.current?.clear(); setDrawCount(0); localStorage.removeItem(LS_KEYS.cizimler); }}
            style={{ ...ss.btn, color:"#ff6666", borderColor:"#ff6666", width:"100%", marginBottom:4 }}>
            🗑 Tüm Çizimleri Temizle
          </button>
          <button onClick={() => setShowModal(true)} style={{ ...ss.btn, background:"#1976d2", borderColor:"#1976d2", color:"white", width:"100%", marginBottom:4 }}>📦 GeoJSON Import / Export</button>
          <button onClick={() => setShowLayerOrder(true)} style={{ ...ss.btn, background:"#374151", borderColor:"#555", color:"#ccc", width:"100%", marginBottom:4 }}>🗂 Katman Sıralama</button>
          <button onClick={() => setShowStats(true)} style={{ ...ss.btn, background:"#1a2a1a", borderColor:"#22c55e88", color:"#22c55e", width:"100%", marginBottom:4 }}>📊 Çizim İstatistikleri</button>
        </>
      )}

      {!canEdit && (
        <div style={{ fontSize:11, color:"#666", marginTop:8, padding:6, background:"#333", borderRadius:4 }}>
          Çizim ve veri yönetimi için belediye hesabıyla giriş yapın.
        </div>
      )}
    </>
  );

  // ── SAĞ PANEL İÇERİĞİ ────────────────────────────────────────────────────
  const SagPanelIcerik = () => (
    <>
      <h3 style={{ margin:0, fontSize:14 }}>📍 Bilgi Paneli</h3>
      <hr style={{ borderColor:"#444", margin:"10px 0" }} />
      {selectedFeature ? (
        <div>
          {Object.entries(selectedFeature).filter(([k]) => k!=="geometry" && !k.startsWith("__")).map(([key, value]) => (
            <div key={key} style={ss.propRow}>
              <span style={{ color:"#888", fontSize:11, textTransform:"uppercase" }}>{key}</span>
              <div style={{ fontSize:13, marginTop:2, wordBreak:"break-word" }}>{String(value??"")}</div>
            </div>
          ))}
          {canEdit && selectedFeature.__type === "sikayet" && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6 }}>Durum Güncelle</div>
              {["beklemede","incelemede","cozuldu"].map(d => (
                <button key={d} onClick={() => {
                    hlSrcRef.current.getFeatures().forEach(f => {
                      if (f.get("__type")==="sikayet") {
                        f.set("durum",d); sikayetSrcRef.current?.changed();
                        setSelectedFeature({ ...selectedFeature, durum:d });
                        setTimeout(() => saveSikayetler(sikayetSrcRef), 50);
                      }
                    });
                  }}
                  style={{ marginRight:4, marginBottom:4, padding:"4px 10px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                    background:selectedFeature.durum===d?"#3b82f6":"#2a2f45", border:"none",
                    color:selectedFeature.durum===d?"#fff":"#7a80a0" }}>
                  {d==="beklemede"?"🔴 Beklemede":d==="incelemede"?"🟡 İnceleniyor":"🟢 Çözüldü"}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p style={{ color:"gray", textAlign:"center", marginTop:20, fontSize:13 }}>Haritada bir obje seçin</p>
      )}

      {isSuperAdmin && (
        <>
          <hr style={{ borderColor:"#444", margin:"16px 0 10px" }} />
          <h4 style={{ ...ss.h4, color:"#a855f7" }}>⚡ Bağlı Belediyeler</h4>
          {kullanicilariYukle().filter(u => u.rol==="belediye_admin").map(u => (
            <div key={u.id} style={{ background:"#2a2a2a", borderRadius:6, padding:"6px 8px", marginBottom:4, fontSize:12 }}>
              <div style={{ color:"#3b82f6", fontWeight:500 }}>{u.belediye}</div>
              <div style={{ color:"#666" }}>{u.ad} · {u.email}</div>
            </div>
          ))}
        </>
      )}

      {canEdit && (
        <>
          <hr style={{ borderColor:"#444", margin:"16px 0 10px" }} />
          <h4 style={{ ...ss.h4, color:"#ef4444" }}>🚨 Son Şikayetler</h4>
          {(sikayetSrcRef.current?.getFeatures()?.length ?? 0) === 0 ? (
            <div style={{ color:"#555", fontSize:12 }}>Henüz şikayet yok.</div>
          ) : (
            sikayetSrcRef.current?.getFeatures().slice(-5).reverse().map((f, i) => {
              const kat = SIKAYET_KATEGORILERI.find(k => k.key===f.get("kategori")) || SIKAYET_KATEGORILERI.at(-1);
              return (
                <div key={i} style={{ background:"#2a2a2a", borderRadius:6, padding:"6px 8px", marginBottom:4, borderLeft:`3px solid ${kat.color}`, cursor:"pointer" }}
                  onClick={() => {
                    const coord = f.getGeometry().getCoordinates();
                    mapInstanceRef.current?.getView().animate({ center:coord, zoom:18, duration:600 });
                    hlSrcRef.current?.clear(); hlSrcRef.current?.addFeature(f);
                    setSelectedFeature(f.getProperties());
                  }}>
                  <div style={{ fontSize:12, fontWeight:500, color:"#e8eaf0" }}>{kat.icon} {f.get("baslik")}</div>
                  <div style={{ fontSize:10, color:"#666" }}>{f.get("tarih")} · {f.get("durum")||"beklemede"}</div>
                </div>
              );
            })
          )}
        </>
      )}
    </>
  );

  // ── MASAÜSTÜ RENDER ───────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div style={{ display:"flex", height:"100vh", width:"100vw", overflow:"hidden",
        fontFamily:"'Segoe UI', Arial, sans-serif", background:"#1a1a1a", color:"white" }}>
        <style>{`
          @keyframes fadeInDown {
            from { opacity:0; transform:translateX(-50%) translateY(-8px); }
            to   { opacity:1; transform:translateX(-50%) translateY(0); }
          }
        `}</style>

        {/* Sol Panel */}
        <div style={ss.left}>
          <SolPanelIcerik />
        </div>

        {/* Harita */}
        <div ref={mapWrapRef} style={{ flex:1, position:"relative", overflow:"hidden" }}>
          <div ref={mapRef} style={{ width:"100%", height:"100%", minHeight:400 }} />

          {/* Kaydetme toast bildirimi */}
          {geomDuzenle.sonKayit && (
            <div style={{
              position:"absolute", top:12, left:"50%", transform:"translateX(-50%)",
              background:"#0f2a1a", border:"1px solid #22c55e",
              borderRadius:8, padding:"8px 16px", zIndex:20,
              fontSize:12, color:"#22c55e", fontFamily:"'Segoe UI', Arial, sans-serif",
              boxShadow:"0 4px 20px #22c55e33", pointerEvents:"none",
              animation:"fadeInDown 0.2s ease",
            }}>
              💾 {geomDuzenle.sonKayit}
            </div>
          )}

          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:26,
            background:"rgba(30,30,30,0.85)", borderTop:"1px solid #333",
            display:"flex", alignItems:"center", padding:"0 12px", gap:16,
            fontSize:11, fontFamily:"monospace", color:"#888", zIndex:10 }}>
            <span>📍 {koordinat.lat}, {koordinat.lng}</span>
            {sikayetMod && <span style={{ color:"#ef4444" }}>🚨 Şikayet modu aktif</span>}
            {geomDuzenle.mod && <span style={{ color:"#facc15" }}>✏ {geomDuzenle.mod==="modify"?"Geometri düzenleme":"Taşıma"} modu · bırakınca otomatik kaydedilir</span>}
            {rotaMod && rotaAdim && <span style={{ color:"#3b82f6" }}>🗺 Rota: {rotaAdim==="start"?"Başlangıç seç":rotaAdim==="end"?"Bitiş seç":"Hesaplanıyor"}</span>}
            {drawTool && !sikayetMod && !rotaMod && !geomDuzenle.mod && <span style={{ color:"#ff6600" }}>✏ {drawTool} modu aktif</span>}
            <span style={{ marginLeft:"auto", color:"#555" }}>YetkinGIS · {kullanici.belediye}</span>
          </div>
        </div>

        {/* Sağ Panel */}
        <div style={ss.right}>
          <SagPanelIcerik />
        </div>

        {/* Modallar */}
        {showNobetci && <NobetciEczanePanel mapInstance={mapInstanceRef.current} nobetciSrcRef={nobetciSrcRef} onClose={() => setShowNobetci(false)} />}
        {ozellikForm && <OzellikFormModal ozellikForm={ozellikForm} katmanDefs={LAYER_DEFS} onKaydet={handleOzellikKaydet} onIptal={handleOzellikIptal} />}
        {sikayetFormAcik && <SikayetFormModal konum={sikayetKonum} onKaydet={handleSikayetKaydet} onIptal={() => { setSikayetFormAcik(false); setSikayetKonum(null); }} />}
        {showModal && <ImportExportModal onClose={() => setShowModal(false)} onImport={handleImport} layersRef={layersRef} drawSrcRef={drawSrcRef} katmanSrcRef={katmanSrcRef} />}
        {showLayerOrder && <LayerOrderModal layerOrder={layerOrder} setLayerOrder={setLayerOrder} onClose={() => setShowLayerOrder(false)} />}
        {showStats && <StatisticsPanel katmanSrcRef={katmanSrcRef} drawSrcRef={drawSrcRef} sikayetSrcRef={sikayetSrcRef} onClose={() => setShowStats(false)} />}
        {showSifreDegistir && <SifreDegistirModal kullanici={kullanici} onKapat={() => setShowSifreDegistir(false)} />}
        {showKullaniciYon && <KullaniciYonetimModal onKapat={() => setShowKullaniciYon(false)} />}
      </div>
    );
  }

  // ── MOBİL RENDER ─────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", width:"100vw", overflow:"hidden",
      fontFamily:"'Segoe UI', Arial, sans-serif", background:"#1a1a1a", color:"white", position:"relative" }}>

      {/* Mobil Üst Bar */}
      <div style={{
        height: 52, background:"#1e2030", borderBottom:"1px solid #2a2f45",
        display:"flex", alignItems:"center", padding:"0 12px", gap:10, flexShrink:0, zIndex:20,
      }}>
        <div style={{ width:32, height:32, borderRadius:8, background:"#3b82f6",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, fontWeight:700, color:"#fff", fontFamily:"monospace" }}>CBS</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#e8eaf0", lineHeight:1 }}>YetkinGIS</div>
          <div style={{ fontSize:10, color:rolRenk[kullanici.rol] }}>{rolLabel[kullanici.rol]}</div>
        </div>

        {/* Hızlı işlem butonları */}
        <button onClick={() => { setSikayetMod(s => !s); setRotaMod(false); temizleRota(); setDrawTool(null); geomDuzenle.temizle(); }}
          style={{ width:36, height:36, borderRadius:8, border: sikayetMod ? "1px solid #ef4444":"1px solid #3a3f55",
            background:sikayetMod?"#ef444422":"transparent", color:sikayetMod?"#ef4444":"#7a80a0",
            cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
          🚨
        </button>
        <button onClick={() => setShowNobetci(true)}
          style={{ width:36, height:36, borderRadius:8, border:"1px solid #22c55e44",
            background:"#0f2a1a", color:"#22c55e", cursor:"pointer", fontSize:16,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
          💊
        </button>
        <button onClick={() => setMobileSideOpen(s => !s)}
          style={{ width:36, height:36, borderRadius:8, border: mobileSideOpen ? "1px solid #3b82f6":"1px solid #3a3f55",
            background:mobileSideOpen?"#3b82f622":"transparent", color:mobileSideOpen?"#3b82f6":"#7a80a0",
            cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {mobileSideOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Harita Alanı */}
      <div ref={mapWrapRef} style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <div ref={mapRef} style={{ width:"100%", height:"100%", minHeight:200 }} />

        {/* Kaydetme toast bildirimi (mobil) */}
        {geomDuzenle.sonKayit && (
          <div style={{
            position:"absolute", top:8, left:"50%", transform:"translateX(-50%)",
            background:"#0f2a1a", border:"1px solid #22c55e",
            borderRadius:8, padding:"7px 14px", zIndex:20,
            fontSize:11, color:"#22c55e", fontFamily:"'Segoe UI', Arial, sans-serif",
            boxShadow:"0 4px 20px #22c55e33", pointerEvents:"none", whiteSpace:"nowrap",
          }}>
            💾 {geomDuzenle.sonKayit}
          </div>
        )}

        {/* Koordinat bar */}
        <div style={{ position:"absolute", bottom:60, left:8, background:"rgba(15,17,23,0.85)", borderRadius:6,
          padding:"4px 8px", fontSize:10, fontFamily:"monospace", color:"#666", zIndex:10, pointerEvents:"none" }}>
          {koordinat.lat}, {koordinat.lng}
          {sikayetMod && <span style={{ color:"#ef4444", marginLeft:6 }}>🚨 Şikayet modu</span>}
          {geomDuzenle.mod && <span style={{ color:"#facc15", marginLeft:6 }}>✏ {geomDuzenle.mod==="modify"?"Düzenleme":"Taşıma"} · bırakınca kaydedilir</span>}
        </div>

        {/* Rota bilgisi (harita üstünde) */}
        {rotaBilgi && (
          <div style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)",
            background:"rgba(15,23,41,0.95)", border:"1px solid #3b82f6",
            borderRadius:10, padding:"8px 16px", zIndex:15, textAlign:"center" }}>
            <div style={{ fontSize:13, color:"#e8eaf0" }}>📏 {rotaBilgi.mesafe} km · ⏱ {rotaBilgi.sure} dk</div>
            <button onClick={() => { temizleRota(); setRotaMod(true); routeMode.current="start"; setRotaAdim("start"); }}
              style={{ fontSize:10, marginTop:4, padding:"2px 8px", background:"#3b82f633", border:"1px solid #3b82f6", borderRadius:4, color:"#3b82f6", cursor:"pointer", fontFamily:"inherit" }}>
              ↺ Yeni Rota
            </button>
          </div>
        )}

        {/* Rota adım göstergesi */}
        {rotaMod && rotaAdim && !rotaBilgi && !rotaYukleniyor && (
          <div style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)",
            background:"rgba(15,23,41,0.95)", border:"1px solid #3b82f6",
            borderRadius:10, padding:"8px 16px", zIndex:15, whiteSpace:"nowrap" }}>
            <span style={{ color: rotaAdim==="start"?"#22c55e":"#ef4444", fontSize:12 }}>
              {rotaAdim==="start"?"📍 Başlangıç noktasına tıklayın":"📍 Bitiş noktasına tıklayın"}
            </span>
          </div>
        )}
      </div>

      {/* Mobil Alt Tab Bar */}
      <div style={{
        height: 56, background:"#1e2030", borderTop:"1px solid #2a2f45",
        display:"flex", alignItems:"stretch", flexShrink:0, zIndex:20,
      }}>
        {[
          { id:"map",    icon:"🗺",  label:"Harita"  },
          { id:"layers", icon:"🗂",  label:"Katmanlar" },
          { id:"search", icon:"🔍",  label:"Arama"   },
          { id:"info",   icon:"📍",  label:"Bilgi"   },
          ...(canEdit ? [{ id:"tools", icon:"✏", label:"Araçlar" }] : []),
        ].map(tab => (
          <button key={tab.id}
            onClick={() => { setMobilePanel(tab.id); if (tab.id!=="map") setMobileSideOpen(true); else setMobileSideOpen(false); }}
            style={{ flex:1, background:"transparent", border:"none", cursor:"pointer",
              color: (mobilePanel===tab.id && mobileSideOpen) || (tab.id==="map" && !mobileSideOpen) ? "#3b82f6" : "#555",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, padding:0 }}>
            <span style={{ fontSize:18 }}>{tab.icon}</span>
            <span style={{ fontSize:9 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Mobil Drawer (panel içeriği) */}
      {mobileSideOpen && (
        <div style={{
          position:"absolute", bottom:56, left:0, right:0,
          height:"65vh", background:"#2c2c2c",
          borderTop:"1px solid #3a3f55", borderRadius:"16px 16px 0 0",
          zIndex:15, overflowY:"auto", padding:16,
          animation:"slideUp 0.25s ease",
          // iOS momentum scroll
          WebkitOverflowScrolling:"touch",
        }}>
          <style>{`@keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }`}</style>

          {/* Panel seçimine göre içerik */}
          {mobilePanel === "layers" && (
            <>
              <h4 style={{ margin:"0 0 12px 0", color:"#e8eaf0", fontSize:14 }}>🗂 Katmanlar</h4>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6, textTransform:"uppercase" }}>Altlık</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:10 }}>
                  {[{ id:"osm", label:"🗺️ OSM" },{ id:"uydu", label:"🛰️ Uydu" }].map(b => (
                    <button key={b.id} onClick={() => setBaseMap(b.id)}
                      style={{ padding:"10px 6px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12,
                        border: baseMap===b.id?"1px solid #3b82f6":"1px solid #444",
                        background: baseMap===b.id?"#3b82f622":"#383838", color:baseMap===b.id?"#3b82f6":"#aaa" }}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6, textTransform:"uppercase" }}>Katman Görünürlüğü</div>
              {[
                ...LAYER_DEFS,
                { key:"poi",     label:"POI",            color:"#ffffff" },
                { key:"sikayet", label:"Şikayetler",     color:"#ef4444" },
                { key:"nobetci", label:"Nöbetçi Eczane", color:"#22c55e" },
                { key:"cizim",   label:"Çizimler",       color:"#ff6600" },
                { key:"import",  label:"İçe Aktarılan",  color:"#f59e0b" },
              ].map(({ key, label, color }) => (
                <label key={key} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", cursor:"pointer", borderBottom:"1px solid #333" }}>
                  <input type="checkbox" checked={layerVisibility[key]!==false} onChange={e => setLayerVis(st => ({ ...st, [key]:e.target.checked }))} style={{ width:18, height:18 }} />
                  <span style={{ width:12, height:12, borderRadius:2, background:color, flexShrink:0 }} />
                  <span style={{ fontSize:14, color:"#e8eaf0" }}>{label}</span>
                  {loading[key] && <span style={{ marginLeft:"auto", fontSize:10, color:"#3b82f6" }}>...</span>}
                </label>
              ))}
            </>
          )}

          {mobilePanel === "search" && (
            <>
              <h4 style={{ margin:"0 0 12px 0", color:"#e8eaf0", fontSize:14 }}>🔍 Arama</h4>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6 }}>Veri Ara</div>
                <input type="text" placeholder="Parsel, mahalle, yol..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ ...ss.input, fontSize:15, padding:"11px 12px" }} />
                {searchResults.length > 0 && (
                  <div style={{ maxHeight:120, overflowY:"auto", background:"#3a3a3a", borderRadius:8, marginTop:6 }}>
                    {searchResults.map((item, idx) => (
                      <div key={idx} onClick={() => { zoomToFeature(item.feature); setMobileSideOpen(false); }}
                        style={{ padding:"10px 12px", borderBottom:"1px solid #444", cursor:"pointer" }}>
                        <span style={ss.tag}>{item.layerKey}</span><span style={{ color:"#ddd", fontSize:13 }}>{item.label.substring(0,30)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6 }}>Adres Ara</div>
                <input type="text" placeholder="Sokak, mahalle, yer adı..." value={addressQuery} onChange={e => setAddressQuery(e.target.value)} style={{ ...ss.input, fontSize:15, padding:"11px 12px" }} />
                {addressLoading && <div style={{ color:"#7a80a0", fontSize:12, marginTop:4 }}>🔍 Aranıyor...</div>}
                {addressResults.length > 0 && (
                  <div style={{ maxHeight:150, overflowY:"auto", background:"#3a3a3a", borderRadius:8, marginTop:6 }}>
                    {addressResults.map((item, idx) => (
                      <div key={item.place_id||idx} onClick={() => { goToAddress(item); setMobileSideOpen(false); }}
                        style={{ padding:"10px 12px", borderBottom:"1px solid #444", cursor:"pointer" }}>
                        <div style={{ color:"#4fc3f7", fontWeight:500, fontSize:13 }}>{item.display_name.split(",")[0]}</div>
                        <div style={{ color:"#888", fontSize:11 }}>{item.display_name.split(",").slice(1,3).join(",")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6 }}>Mahalle Seç</div>
                <select value={selectedMahalle} onChange={e => { handleMahalleChange(e.target.value); setMobileSideOpen(false); }} style={{ ...ss.input, fontSize:15, padding:"11px 12px" }}>
                  <option value="">Tüm Mahalleler</option>
                  {mahalleList.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {/* Rota */}
              <div style={{ marginTop:12 }}>
                <button onClick={() => {
                    if (rotaMod) { temizleRota(); setMobileSideOpen(false); }
                    else { setRotaMod(true); setSikayetMod(false); routeMode.current="start"; setRotaAdim("start"); setDrawTool(null); geomDuzenle.temizle(); setMobileSideOpen(false); }
                  }}
                  style={{ ...ss.btn, width:"100%", textAlign:"center",
                    background:rotaMod?"#3b82f622":"#444", border:rotaMod?"1px solid #3b82f6":"1px solid #555", color:rotaMod?"#3b82f6":"#ccc", padding:"12px 10px", fontSize:14 }}>
                  🗺 {rotaMod?"Rota Modundan Çık":"Rota Hesapla"}
                </button>
              </div>
            </>
          )}

          {mobilePanel === "info" && (
            <>
              <h4 style={{ margin:"0 0 12px 0", color:"#e8eaf0", fontSize:14 }}>📍 Bilgi Paneli</h4>
              {selectedFeature ? (
                <div>
                  {Object.entries(selectedFeature).filter(([k]) => k!=="geometry" && !k.startsWith("__")).map(([key, value]) => (
                    <div key={key} style={{ ...ss.propRow, marginBottom:8, padding:"10px 12px" }}>
                      <span style={{ color:"#888", fontSize:11, textTransform:"uppercase" }}>{key}</span>
                      <div style={{ fontSize:14, marginTop:2, wordBreak:"break-word" }}>{String(value??"")}</div>
                    </div>
                  ))}
                  {canEdit && selectedFeature.__type === "sikayet" && (
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:11, color:"#7a80a0", marginBottom:8 }}>Durum Güncelle</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                        {["beklemede","incelemede","cozuldu"].map(d => (
                          <button key={d} onClick={() => {
                              hlSrcRef.current.getFeatures().forEach(f => {
                                if (f.get("__type")==="sikayet") { f.set("durum",d); sikayetSrcRef.current?.changed(); setSelectedFeature({ ...selectedFeature, durum:d }); setTimeout(() => saveSikayetler(sikayetSrcRef), 50); }
                              });
                            }}
                            style={{ padding:"8px 4px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:10,
                              background:selectedFeature.durum===d?"#3b82f6":"#2a2f45", border:"none", color:selectedFeature.durum===d?"#fff":"#7a80a0" }}>
                            {d==="beklemede"?"🔴 Bekl.":d==="incelemede"?"🟡 İnc.":"🟢 Çözd."}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:32, color:"#555" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📍</div>
                  <div style={{ fontSize:13 }}>Haritada bir objeye tıklayın</div>
                </div>
              )}
            </>
          )}

          {mobilePanel === "tools" && canEdit && (
            <>
              <h4 style={{ margin:"0 0 12px 0", color:"#e8eaf0", fontSize:14 }}>✏ Araçlar</h4>

              {/* Geometri düzenleme */}
              <div style={{ background:"#1a2535", border:"1px solid #facc1544", borderRadius:10, padding:12, marginBottom:12 }}>
                <div style={{ fontSize:12, color:"#facc15", marginBottom:8, fontWeight:600 }}>✏ Geometri Düzenle / Taşı</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <button onClick={() => { setDrawTool(null); setSikayetMod(false); geomDuzenle.aktifEt("modify"); }}
                    style={{ padding:"12px 8px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13,
                      border:geomDuzenle.mod==="modify"?"1px solid #facc15":"1px solid #334155",
                      background:geomDuzenle.mod==="modify"?"#facc1522":"#0f1729",
                      color:geomDuzenle.mod==="modify"?"#facc15":"#7a80a0" }}>
                    ✏ Düzenle
                  </button>
                  <button onClick={() => { setDrawTool(null); setSikayetMod(false); geomDuzenle.aktifEt("translate"); }}
                    style={{ padding:"12px 8px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13,
                      border:geomDuzenle.mod==="translate"?"1px solid #facc15":"1px solid #334155",
                      background:geomDuzenle.mod==="translate"?"#facc1522":"#0f1729",
                      color:geomDuzenle.mod==="translate"?"#facc15":"#7a80a0" }}>
                    ↔ Taşı
                  </button>
                </div>
                {geomDuzenle.mod && (
                  <div style={{ fontSize:11, color:"#fbbf24", background:"#2a1f0a", padding:"6px 8px", borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span>{geomDuzenle.mod==="modify"?"Noktaları sürükle":"Objeye tıkla, taşı"}</span>
                    <button onClick={() => { geomDuzenle.temizle(); }} style={{ fontSize:11, padding:"3px 8px", background:"#ef444422", border:"1px solid #ef4444", borderRadius:4, color:"#ef4444", cursor:"pointer", fontFamily:"inherit" }}>✕</button>
                  </div>
                )}
              </div>

              {/* Undo/Redo */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                <button onClick={() => { undoRedo.undo(); setTimeout(() => saveCizimler(katmanSrcRef,drawSrcRef), 50); }}
                  style={{ padding:"12px 8px", fontSize:13, borderRadius:8, cursor:"pointer", fontFamily:"inherit", border:"1px solid #555", background:"#444", color:"#ccc" }}>
                  ↩ Geri Al
                </button>
                <button onClick={() => { undoRedo.redo(); setTimeout(() => saveCizimler(katmanSrcRef,drawSrcRef), 50); }}
                  style={{ padding:"12px 8px", fontSize:13, borderRadius:8, cursor:"pointer", fontFamily:"inherit", border:"1px solid #555", background:"#444", color:"#ccc" }}>
                  ↪ İleri Al
                </button>
              </div>

              {/* Katman seçimi */}
              <div style={{ fontSize:11, color:"#7a80a0", marginBottom:8, textTransform:"uppercase" }}>Çizim Katmanı</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:12 }}>
                {LAYER_DEFS.map(def => (
                  <button key={def.key} onClick={() => setCizimKatman(def.key)}
                    style={{ padding:"10px 8px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12,
                      border:cizimKatman===def.key?`1px solid ${def.color}`:"1px solid #444",
                      background:cizimKatman===def.key?`${def.color}18`:"#383838",
                      color:cizimKatman===def.key?def.color:"#aaa",
                      display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:def.color, flexShrink:0 }} />
                    {def.label}
                  </button>
                ))}
              </div>

              {/* Çizim araçları */}
              <div style={{ fontSize:11, color:"#7a80a0", marginBottom:8, textTransform:"uppercase" }}>Çizim Aracı</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                {drawTools.map(({ id, label }) => {
                  const kat = LAYER_DEFS.find(d => d.key===cizimKatman);
                  const renk = kat?.color||"#1976d2";
                  return (
                    <button key={id} onClick={() => { setDrawTool(drawTool===id?null:id); if (mobileSideOpen && drawTool!==id) setMobileSideOpen(false); }}
                      style={{ padding:"12px 8px", fontSize:13, borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                        border:drawTool===id?`1px solid ${renk}`:"1px solid #555",
                        background:drawTool===id?`${renk}22`:"#444",
                        color:drawTool===id?renk:"#ccc" }}>
                      {label}
                    </button>
                  );
                })}
              </div>

              {drawTool && drawTool!=="erase" && (
                <div style={{ padding:"8px 10px", borderRadius:8, background:"#0f1729", border:"1px solid #3b82f644", marginBottom:12, fontSize:12, color:"#3b82f6" }}>
                  <strong>Aktif:</strong> {cizimKatman} / {drawTool} · Haritada çizin, sonra kapatın
                </div>
              )}

              <button onClick={() => setShowModal(true)} style={{ ...ss.btn, background:"#1976d2", borderColor:"#1976d2", color:"white", width:"100%", marginBottom:8, padding:"12px 10px", fontSize:14 }}>📦 GeoJSON Import / Export</button>
              <button onClick={() => setShowStats(true)} style={{ ...ss.btn, background:"#1a2a1a", borderColor:"#22c55e88", color:"#22c55e", width:"100%", padding:"12px 10px", fontSize:14 }}>📊 Çizim İstatistikleri</button>
            </>
          )}
        </div>
      )}

      {/* Modallar */}
      {showNobetci && <NobetciEczanePanel mapInstance={mapInstanceRef.current} nobetciSrcRef={nobetciSrcRef} onClose={() => setShowNobetci(false)} />}
      {ozellikForm && <OzellikFormModal ozellikForm={ozellikForm} katmanDefs={LAYER_DEFS} onKaydet={handleOzellikKaydet} onIptal={handleOzellikIptal} />}
      {sikayetFormAcik && <SikayetFormModal konum={sikayetKonum} onKaydet={handleSikayetKaydet} onIptal={() => { setSikayetFormAcik(false); setSikayetKonum(null); }} />}
      {showModal && <ImportExportModal onClose={() => setShowModal(false)} onImport={handleImport} layersRef={layersRef} drawSrcRef={drawSrcRef} katmanSrcRef={katmanSrcRef} />}
      {showLayerOrder && <LayerOrderModal layerOrder={layerOrder} setLayerOrder={setLayerOrder} onClose={() => setShowLayerOrder(false)} />}
      {showStats && <StatisticsPanel katmanSrcRef={katmanSrcRef} drawSrcRef={drawSrcRef} sikayetSrcRef={sikayetSrcRef} onClose={() => setShowStats(false)} />}
      {showSifreDegistir && <SifreDegistirModal kullanici={kullanici} onKapat={() => setShowSifreDegistir(false)} />}
      {showKullaniciYon && <KullaniciYonetimModal onKapat={() => setShowKullaniciYon(false)} />}
    </div>
  );
}

const ss = {
  left: { width:265, minWidth:265, background:"#2c2c2c", color:"white", padding:12, display:"flex", flexDirection:"column", gap:4, overflowY:"auto" },
  right: { width:300, background:"#1e1e1e", color:"white", padding:15, overflowY:"auto", flexShrink:0 },
  h4: { fontSize:11, color:"#aaa", margin:"8px 0 4px 0", textTransform:"uppercase", letterSpacing:"0.5px" },
  hr: { borderColor:"#444", margin:"8px 0" },
  input: { width:"100%", padding:8, borderRadius:4, border:"1px solid #555", background:"#444", color:"white", fontSize:12, boxSizing:"border-box" },
  results: { maxHeight:200, overflowY:"auto", background:"#3a3a3a", borderRadius:4, marginTop:4, fontSize:11 },
  resultItem: { padding:"6px 8px", cursor:"pointer", borderBottom:"1px solid #555", color:"#ddd" },
  tag: { background:"#1976d2", color:"#fff", fontSize:9, padding:"1px 5px", borderRadius:3, marginRight:6, textTransform:"uppercase" },
  btn: { padding:"6px 10px", background:"#444", color:"white", border:"1px solid #555", borderRadius:4, cursor:"pointer", fontSize:12, marginBottom:4, textAlign:"left", width:"100%" },
  btnActive: { background:"#1976d2", borderColor:"#1976d2" },
  layerRow: { display:"flex", alignItems:"center", gap:6, padding:"3px 0", cursor:"pointer", fontSize:13 },
  loadingDot: { fontSize:10, color:"#1976d2", marginLeft:"auto" },
  propRow: { margin:"8px 0", padding:8, background:"#2a2a2a", borderRadius:4, borderLeft:"3px solid #1976d2" },
};

// ============================================================================
// ANA UYGULAMA
// ============================================================================
export default function App() {
  const [kullanici, setKullanici] = useState(null);
  if (!kullanici) return <LoginScreen onLogin={setKullanici} />;
  return <MapApp kullanici={kullanici} onCikis={() => setKullanici(null)} />;
}
