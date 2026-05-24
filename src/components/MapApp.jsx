import React, {
  useEffect, useLayoutEffect, useRef, useState, useCallback,
} from "react";
import Map        from "ol/Map";
import View       from "ol/View";
import TileLayer  from "ol/layer/Tile";
import OSM        from "ol/source/OSM";
import XYZ        from "ol/source/XYZ";
import VectorLayer  from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON    from "ol/format/GeoJSON";
import Feature    from "ol/Feature";
import Point      from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import { fromLonLat, toLonLat } from "ol/proj";
import { getCenter } from "ol/extent";
import Draw      from "ol/interaction/Draw";
import Modify    from "ol/interaction/Modify";
import Snap      from "ol/interaction/Snap";
import { Style, Stroke, Fill, Circle as CircleStyle } from "ol/style";

import {
  LAYER_DEFS, POI_CATEGORIES, SIKAYET_KATEGORILERI,
  USE_GEOSERVER, DATA_PROJECTION, MAP_PROJECTION,
  INITIAL_CENTER, INITIAL_ZOOM, LS_KEYS,
} from "../config";
import { kullanicilariYukle } from "../lib/auth";
import { saveCizimler, loadCizimler, saveSikayetler, loadSikayetler } from "../lib/persistence";
import {
  addressMarkerStyle, drawStyle, sikayetStyle, poiStyle,
  nobetciEczaneStyle, routeStyle, routePointStyle, styleFor,
} from "../lib/styles";
import { wfsUrl, isInsideMahalle } from "../lib/geo";
import { useIsMobile }       from "../hooks/useIsMobile";
import { useUndoRedo }       from "../hooks/useUndoRedo";
import { useGeometriDuzenle } from "../hooks/useGeometriDuzenle";

// Modaller — lazy değil direkt import (toplam küçük)
import NobetciEczanePanel    from "./modals/NobetciEczanePanel";
import SikayetFormModal      from "./modals/SikayetFormModal";
import OzellikFormModal      from "./modals/OzellikFormModal";
import ImportExportModal     from "./modals/ImportExportModal";
import LayerOrderModal       from "./modals/LayerOrderModal";
import StatisticsPanel       from "./modals/StatisticsPanel";
import SifreDegistirModal    from "./modals/SifreDegistirModal";
import KullaniciYonetimModal from "./modals/KullaniciYonetimModal";
import TKGMPanel      from "./modals/TKGMPanel";
import HavaDurumuPanel from "./modals/HavaDurumuPanel";
import StreetViewPanel from "./modals/StreetViewPanel";

// Panel bileşenleri
import SolPanel from "./panels/SolPanel";
import SagPanel from "./panels/SagPanel";
import MobileDrawer from "./mobile/MobileDrawer";

// ─────────────────────────────────────────────────────────────────────────────
export default function MapApp({ kullanici, onCikis }) {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const mapRef           = useRef(null);
  const mapWrapRef       = useRef(null);
  const mapInstanceRef   = useRef(null);
  const layersRef        = useRef({});
  const hlSrcRef         = useRef(null);
  const visibilityRef    = useRef({});
  const mahalleFilterRef = useRef(null);
  const drawSrcRef       = useRef(null);
  const importSrcRef     = useRef(null);
  const sikayetSrcRef    = useRef(null);
  const nobetciSrcRef    = useRef(null);
  const routeSrcRef      = useRef(null);
  const drawInterRef     = useRef(null);
  const modifyDrawRef    = useRef(null);
  const snapInterRef     = useRef(null);
  const activeCatRef     = useRef(POI_CATEGORIES.reduce((a,c) => ({ ...a,[c.key]:true }), {}));
  const drawToolRef      = useRef(null);
  const cizimKatmanRef   = useRef(LAYER_DEFS[0].key);
  const katmanSrcRef     = useRef({});
  const routeMode        = useRef(null);
  const routePoints      = useRef({ start:null, end:null });
  const sikayetModeRef   = useRef(false);
  const pendingFeatureRef = useRef(null);
  const [showTKGM,       setShowTKGM]       = useState(false);
  const [showHavaDurumu, setShowHavaDurumu] = useState(false);
  const [showStreetView, setShowStreetView] = useState(false);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const isMobile = useIsMobile();
  const undoRedo = useUndoRedo();
  const geomDuzenle = useGeometriDuzenle({
    mapInstanceRef,
    onSave: () => {
      saveCizimler(katmanSrcRef, drawSrcRef);
      saveSikayetler(sikayetSrcRef);
    },
  });

  // ── State ─────────────────────────────────────────────────────────────────
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
  const [mobilePanel,      setMobilePanel]       = useState("map");
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
    setTimeout(async () => {
      await loadCizimler(katmanSrcRef, drawSrcRef, setDrawCount);
      await loadSikayetler(sikayetSrcRef);
    }, 200);
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
      mapInstanceRef.current = null; layersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Rota hesaplama ────────────────────────────────────────────────────────
  const hesaplaRota = useCallback(async () => {
    const { start, end } = routePoints.current;
    if (!start || !end) return;
    setRotaYuk(true); setRotaBilgi(null);
    try {
      const [sLng,sLat] = toLonLat(start);
      const [eLng,eLat] = toLonLat(end);
      const url  = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.[0]) { alert("Rota bulunamadı."); return; }
      const route  = data.routes[0];
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

  // ── Katman yükleme ────────────────────────────────────────────────────────
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

  const refreshStyles = () => { Object.entries(layersRef.current).forEach(([k,l]) => { if (!k.startsWith("__")) l?.changed?.(); }); };

  // ── Yan etkiler ───────────────────────────────────────────────────────────
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
      const layer  = layersRef.current[key];
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
      fetch("https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
        q:addressQuery, format:"json", addressdetails:"1", limit:"8", countrycodes:"tr",
      }).toString(), { headers:{ "Accept-Language":"tr" }})
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

  // ── Callbacks ─────────────────────────────────────────────────────────────
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
    const removeInteraction = (ref) => { if (ref.current) { try { map.removeInteraction(ref.current); } catch {} ref.current = null; } };
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
          setOzellikForm({ katmanKey:katman, feature });
        }));
      });
      map.addInteraction(draw); drawInterRef.current = draw;
      const modify = new Modify({ source:hedefSrc }); map.addInteraction(modify); modifyDrawRef.current = modify;
      const snap   = new Snap({ source:hedefSrc });   map.addInteraction(snap);   snapInterRef.current  = snap;
    } catch (e) { console.warn("Interaction eklenirken hata:", e); }
  }, []);

  const setDrawTool = (val) => {
    drawToolRef.current = val; setDrawToolState(val);
    if (val) geomDuzenle.temizle();
    applyDrawInteraction(val, cizimKatmanRef.current);
  };

  const setCizimKatman = (val) => {
    cizimKatmanRef.current = val; setCizimKatmanState(val);
    if (drawToolRef.current && drawToolRef.current !== "erase") applyDrawInteraction(drawToolRef.current, val);
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
      const hedefAdi = hedefKatman === "import" ? "İçe Aktarılan" : LAYER_DEFS.find(d=>d.key===hedefKatman)?.label||hedefKatman;
      let hedefSrc = hedefKatman === "import" ? importSrcRef.current : katmanSrcRef.current[hedefKatman] || layersRef.current[hedefKatman]?.getSource?.();
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
    routeMode.current   = null;
    setRotaMod(false); setRotaAdim(null); setRotaBilgi(null);
  };

  // ── Ortak props ───────────────────────────────────────────────────────────
  const solPanelProps = {
    kullanici, onCikis, canEdit, isSuperAdmin,
    sikayetMod, setSikayetMod, rotaMod, setRotaMod,
    rotaAdim, setRotaAdim, rotaBilgi, rotaYukleniyor,
    showNobetci: () => setShowNobetci(true),
    searchText, setSearchText, searchResults, zoomToFeature,
    addressQuery, setAddressQuery, addressResults, addressLoading, goToAddress,
    selectedMahalle, mahalleList, handleMahalleChange,
    filterByMahalle, setFilterByMah,
    baseMap, setBaseMap,
    layerVisibility, setLayerVis,
    loading, activeCategories, setActiveCats,
    drawTool, setDrawTool, cizimKatman, setCizimKatman,
    drawCount, katmanSrcRef, drawSrcRef,
    undoRedo, saveCizimler,
    geomDuzenle,
    setShowModal, setShowLayerOrder, setShowStats,
    setShowSifreDegistir,
    setShowKullaniciYon,
    routeMode, temizleRota,
    mobileSideOpen, setMobileSideOpen, isMobile,
    LS_KEYS,
    setShowTKGM,        
    setShowHavaDurumu,  
    setShowStreetView, 
  };

  const sagPanelProps = {
    kullanici, canEdit, isSuperAdmin,
    selectedFeature, setSelectedFeature,
    sikayetSrcRef, hlSrcRef, mapInstanceRef,
    saveSikayetler,
  };

  // ── Ortak Modallar ────────────────────────────────────────────────────────
  const Modallar = () => (
    <>
      {showNobetci      && <NobetciEczanePanel mapInstance={mapInstanceRef.current} nobetciSrcRef={nobetciSrcRef} onClose={() => setShowNobetci(false)} />}
      {ozellikForm      && <OzellikFormModal ozellikForm={ozellikForm} katmanDefs={LAYER_DEFS} onKaydet={handleOzellikKaydet} onIptal={handleOzellikIptal} />}
      {sikayetFormAcik  && <SikayetFormModal konum={sikayetKonum} onKaydet={handleSikayetKaydet} onIptal={() => { setSikayetFormAcik(false); setSikayetKonum(null); }} />}
      {showModal        && <ImportExportModal onClose={() => setShowModal(false)} onImport={handleImport} layersRef={layersRef} drawSrcRef={drawSrcRef} katmanSrcRef={katmanSrcRef} />}
      {showLayerOrder   && <LayerOrderModal layerOrder={layerOrder} setLayerOrder={setLayerOrder} onClose={() => setShowLayerOrder(false)} />}
      {showStats        && <StatisticsPanel katmanSrcRef={katmanSrcRef} drawSrcRef={drawSrcRef} sikayetSrcRef={sikayetSrcRef} onClose={() => setShowStats(false)} />}
      {showSifreDegistir && <SifreDegistirModal kullanici={kullanici} onKapat={() => setShowSifreDegistir(false)} />}
      {showKullaniciYon && <KullaniciYonetimModal onKapat={() => setShowKullaniciYon(false)} />}
   
      {showTKGM        && <TKGMPanel        mapInstance={mapInstanceRef.current} onClose={() => setShowTKGM(false)} />}
      {showHavaDurumu  && <HavaDurumuPanel  mapInstance={mapInstanceRef.current} layersRef={layersRef} onClose={() => setShowHavaDurumu(false)} />}
      {showStreetView  && <StreetViewPanel  mapInstance={mapInstanceRef.current} onClose={() => setShowStreetView(false)} />}
    </>
  );

  // ── Masaüstü render ───────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div style={{ display:"flex", height:"100vh", width:"100vw", overflow:"hidden",
        fontFamily:"'Segoe UI', Arial, sans-serif", background:"#1a1a1a", color:"white" }}>
        <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateX(-50%) translateY(-8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>

        <SolPanel {...solPanelProps} />

        <div ref={mapWrapRef} style={{ flex:1, position:"relative", overflow:"hidden" }}>
          <div ref={mapRef} style={{ width:"100%", height:"100%", minHeight:400 }} />
          {geomDuzenle.sonKayit && (
            <div style={{ position:"absolute", top:12, left:"50%", transform:"translateX(-50%)",
              background:"#0f2a1a", border:"1px solid #22c55e", borderRadius:8, padding:"8px 16px",
              zIndex:20, fontSize:12, color:"#22c55e", fontFamily:"'Segoe UI', Arial, sans-serif",
              boxShadow:"0 4px 20px #22c55e33", pointerEvents:"none", animation:"fadeInDown 0.2s ease" }}>
              💾 {geomDuzenle.sonKayit}
            </div>
          )}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:26,
            background:"rgba(30,30,30,0.85)", borderTop:"1px solid #333",
            display:"flex", alignItems:"center", padding:"0 12px", gap:16,
            fontSize:11, fontFamily:"monospace", color:"#888", zIndex:10 }}>
            <span>📍 {koordinat.lat}, {koordinat.lng}</span>
            {sikayetMod         && <span style={{ color:"#ef4444" }}>🚨 Şikayet modu aktif</span>}
            {geomDuzenle.mod    && <span style={{ color:"#facc15" }}>✏ {geomDuzenle.mod==="modify"?"Geometri düzenleme":"Taşıma"} modu · bırakınca otomatik kaydedilir</span>}
            {rotaMod && rotaAdim && <span style={{ color:"#3b82f6" }}>🗺 Rota: {rotaAdim==="start"?"Başlangıç seç":rotaAdim==="end"?"Bitiş seç":"Hesaplanıyor"}</span>}
            {drawTool && !sikayetMod && !rotaMod && !geomDuzenle.mod && <span style={{ color:"#ff6600" }}>✏ {drawTool} modu aktif</span>}
            <span style={{ marginLeft:"auto", color:"#555" }}>YetkinGIS · {kullanici.belediye}</span>
          </div>
        </div>

        <SagPanel {...sagPanelProps} />
        <Modallar />
      </div>
    );
  }

  // ── Mobil render ──────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", width:"100vw", overflow:"hidden",
      fontFamily:"'Segoe UI', Arial, sans-serif", background:"#1a1a1a", color:"white", position:"relative" }}>

      {/* Mobil Üst Bar */}
      <div style={{ height:52, background:"#1e2030", borderBottom:"1px solid #2a2f45",
        display:"flex", alignItems:"center", padding:"0 12px", gap:10, flexShrink:0, zIndex:20 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:"#3b82f6", display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", fontFamily:"monospace" }}>CBS</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#e8eaf0", lineHeight:1 }}>YetkinGIS</div>
          <div style={{ fontSize:10, color:{ superadmin:"#a855f7", belediye_admin:"#3b82f6", vatandas:"#22c55e" }[kullanici.rol] }}>
            {{ superadmin:"⚡ Süper Admin", belediye_admin:"🔧 Belediye Admin", vatandas:"👤 Vatandaş" }[kullanici.rol]}
          </div>
        </div>
        <button onClick={() => { setSikayetMod(s => !s); setRotaMod(false); temizleRota(); setDrawTool(null); geomDuzenle.temizle(); }}
          style={{ width:36, height:36, borderRadius:8, border:sikayetMod?"1px solid #ef4444":"1px solid #3a3f55",
            background:sikayetMod?"#ef444422":"transparent", color:sikayetMod?"#ef4444":"#7a80a0", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
          🚨
        </button>
        <button onClick={() => setShowNobetci(true)}
          style={{ width:36, height:36, borderRadius:8, border:"1px solid #22c55e44", background:"#0f2a1a", color:"#22c55e", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
          💊
        </button>
        <button onClick={() => setMobileSideOpen(s => !s)}
          style={{ width:36, height:36, borderRadius:8, border:mobileSideOpen?"1px solid #3b82f6":"1px solid #3a3f55",
            background:mobileSideOpen?"#3b82f622":"transparent", color:mobileSideOpen?"#3b82f6":"#7a80a0", cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {mobileSideOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Harita */}
      <div ref={mapWrapRef} style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <div ref={mapRef} style={{ width:"100%", height:"100%", minHeight:200 }} />
        {geomDuzenle.sonKayit && (
          <div style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)",
            background:"#0f2a1a", border:"1px solid #22c55e", borderRadius:8, padding:"7px 14px",
            zIndex:20, fontSize:11, color:"#22c55e", boxShadow:"0 4px 20px #22c55e33", pointerEvents:"none", whiteSpace:"nowrap" }}>
            💾 {geomDuzenle.sonKayit}
          </div>
        )}
        <div style={{ position:"absolute", bottom:60, left:8, background:"rgba(15,17,23,0.85)", borderRadius:6,
          padding:"4px 8px", fontSize:10, fontFamily:"monospace", color:"#666", zIndex:10, pointerEvents:"none" }}>
          {koordinat.lat}, {koordinat.lng}
          {sikayetMod      && <span style={{ color:"#ef4444", marginLeft:6 }}>🚨 Şikayet modu</span>}
          {geomDuzenle.mod && <span style={{ color:"#facc15", marginLeft:6 }}>✏ {geomDuzenle.mod==="modify"?"Düzenleme":"Taşıma"} · bırakınca kaydedilir</span>}
        </div>
        {rotaBilgi && (
          <div style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)",
            background:"rgba(15,23,41,0.95)", border:"1px solid #3b82f6", borderRadius:10, padding:"8px 16px", zIndex:15, textAlign:"center" }}>
            <div style={{ fontSize:13, color:"#e8eaf0" }}>📏 {rotaBilgi.mesafe} km · ⏱ {rotaBilgi.sure} dk</div>
            <button onClick={() => { temizleRota(); setRotaMod(true); routeMode.current="start"; setRotaAdim("start"); }}
              style={{ fontSize:10, marginTop:4, padding:"2px 8px", background:"#3b82f633", border:"1px solid #3b82f6", borderRadius:4, color:"#3b82f6", cursor:"pointer", fontFamily:"inherit" }}>
              ↺ Yeni Rota
            </button>
          </div>
        )}
        {rotaMod && rotaAdim && !rotaBilgi && !rotaYukleniyor && (
          <div style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)",
            background:"rgba(15,23,41,0.95)", border:"1px solid #3b82f6", borderRadius:10, padding:"8px 16px", zIndex:15, whiteSpace:"nowrap" }}>
            <span style={{ color:rotaAdim==="start"?"#22c55e":"#ef4444", fontSize:12 }}>
              {rotaAdim==="start"?"📍 Başlangıç noktasına tıklayın":"📍 Bitiş noktasına tıklayın"}
            </span>
          </div>
        )}
      </div>

      {/* Alt Tab Bar */}
      <div style={{ height:56, background:"#1e2030", borderTop:"1px solid #2a2f45", display:"flex", alignItems:"stretch", flexShrink:0, zIndex:20 }}>
        {[
          { id:"map",    icon:"🗺",  label:"Harita"    },
          { id:"layers", icon:"🗂",  label:"Katmanlar" },
          { id:"search", icon:"🔍",  label:"Arama"     },
          { id:"info",   icon:"📍",  label:"Bilgi"     },
          ...(canEdit ? [{ id:"tools", icon:"✏", label:"Araçlar" }] : []),
        ].map(tab => (
          <button key={tab.id}
            onClick={() => { setMobilePanel(tab.id); if (tab.id!=="map") setMobileSideOpen(true); else setMobileSideOpen(false); }}
            style={{ flex:1, background:"transparent", border:"none", cursor:"pointer",
              color:(mobilePanel===tab.id && mobileSideOpen)||(tab.id==="map" && !mobileSideOpen)?"#3b82f6":"#555",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, padding:0 }}>
            <span style={{ fontSize:18 }}>{tab.icon}</span>
            <span style={{ fontSize:9 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Mobil Drawer */}
      {mobileSideOpen && (
        <MobileDrawer
          mobilePanel={mobilePanel}
          {...solPanelProps}
          {...sagPanelProps}
          setMobileSideOpen={setMobileSideOpen}
          layerOrder={layerOrder}
          setLayerOrder={setLayerOrder}
          setShowModal={setShowModal}
          setShowStats={setShowStats}
        />
      )}

      <Modallar />
    </div>
  );
}