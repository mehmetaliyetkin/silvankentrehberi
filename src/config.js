export const USE_GEOSERVER   = false;
export const GEOSERVER_URL   = "http://localhost:8080/geoserver";
export const WORKSPACE       = "silvanvercel";
export const DATA_PROJECTION = "EPSG:3857";
export const MAP_PROJECTION  = "EPSG:3857";
export const INITIAL_CENTER  = [4564000, 4605000];
export const INITIAL_ZOOM    = 14;

export const LAYER_DEFS = [
  { key: "parsel",    label: "Parsel",    color: "#00ffff", typeName: "parcels",   file: "./data/silvan/parcels.geojson",   zoomTo: true  },
  { key: "yapi",      label: "Yapı",      color: "#ff4444", typeName: "yapi",      file: "./data/silvan/yapi.geojson",      zoomTo: false },
  { key: "mahalle",   label: "Mahalle",   color: "#00ff88", typeName: "mahalle",   file: "./data/silvan/mahalle.geojson",   zoomTo: false },
  { key: "yol",       label: "Yol",       color: "#ffffff", typeName: "yol",       file: "./data/silvan/yol.geojson",       zoomTo: false },
  { key: "numarataj", label: "Numarataj", color: "#ffff00", typeName: "numarataj", file: "./data/silvan/numarataj.geojson", zoomTo: false },
];

export const POI_CATEGORIES = [
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

export const SIKAYET_KATEGORILERI = [
  { key: "yol_bozuk",  label: "Yol/Kaldırım Bozuk", icon: "🚧", color: "#f59e0b" },
  { key: "aydinlatma", label: "Aydınlatma Sorunu",   icon: "💡", color: "#fbbf24" },
  { key: "cop",        label: "Çöp/Temizlik",        icon: "🗑",  color: "#84cc16" },
  { key: "su_ariza",   label: "Su/Kanalizasyon",      icon: "💧", color: "#38bdf8" },
  { key: "park_bahce", label: "Park/Bahçe",           icon: "🌳", color: "#4ade80" },
  { key: "guvenlik",   label: "Güvenlik",             icon: "🚨", color: "#f87171" },
  { key: "diger",      label: "Diğer",                icon: "📋", color: "#94a3b8" },
];

export const LS_KEYS = {
  cizimler:   "yetkin_cbs_cizimler",
  sikayetler: "yetkin_cbs_sikayetler",
  drawCount:  "yetkin_cbs_drawcount",
};