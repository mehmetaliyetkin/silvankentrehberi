import GeoJSON from "ol/format/GeoJSON";
import Feature from "ol/Feature";
import Point   from "ol/geom/Point";
import { fromLonLat, toLonLat } from "ol/proj";
import { supabase, supabaseAktif } from "./supabase";
import { MAP_PROJECTION } from "../config";

export async function saveCizimler(katmanSrcRef, drawSrcRef) {
  if (!supabaseAktif) return;
  try {
    const fmt = new GeoJSON();
    const katmanlar = {};

    const drawFeatures = [];
    (drawSrcRef.current?.getFeatures() || []).forEach(f => {
      try {
        const geom  = f.getGeometry().clone().transform(MAP_PROJECTION, "EPSG:4326");
        const props = { ...f.getProperties() }; delete props.geometry;
        drawFeatures.push({ type: "Feature", geometry: JSON.parse(fmt.writeGeometry(geom)), properties: props });
      } catch {}
    });
    katmanlar["__draw"] = drawFeatures;

    Object.entries(katmanSrcRef.current || {}).forEach(([key, src]) => {
      const features = [];
      (src?.getFeatures() || []).forEach(f => {
        try {
          const geom  = f.getGeometry().clone().transform(MAP_PROJECTION, "EPSG:4326");
          const props = { ...f.getProperties() }; delete props.geometry;
          features.push({ type: "Feature", geometry: JSON.parse(fmt.writeGeometry(geom)), properties: props });
        } catch {}
      });
      katmanlar[key] = features;
    });

    for (const [katman, features] of Object.entries(katmanlar)) {
      if (features.length === 0) continue;
      await supabase.from("cizimler").upsert(
        { katman, geojson: { type: "FeatureCollection", features }, guncellendi: new Date().toISOString() },
        { onConflict: "katman" }
      );
    }
  } catch (e) { console.warn("Supabase çizim kaydetme hatası:", e); }
}

export async function loadCizimler(katmanSrcRef, drawSrcRef, setDrawCount) {
  if (!supabaseAktif) return;
  try {
    const { data, error } = await supabase.from("cizimler").select("*");
    if (error) throw error;
    if (!data || data.length === 0) return;
    const fmt = new GeoJSON();
    let total = 0;
    data.forEach(row => {
      (row.geojson?.features || []).forEach(fdata => {
        try {
          const f = fmt.readFeature(fdata, { dataProjection: "EPSG:4326", featureProjection: MAP_PROJECTION });
          if (row.katman === "__draw") drawSrcRef.current?.addFeature(f);
          else katmanSrcRef.current?.[row.katman]?.addFeature(f);
          total++;
        } catch {}
      });
    });
    setDrawCount(total);
  } catch (e) { console.warn("Supabase çizim yükleme hatası:", e); }
}

export async function saveSikayetler(sikayetSrcRef) {
  if (!supabaseAktif) return;
  try {
    const features = sikayetSrcRef.current?.getFeatures() || [];
    await supabase.from("sikayetler").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    for (const f of features) {
      try {
        const coord = toLonLat(f.getGeometry().getCoordinates());
        const props = { ...f.getProperties() }; delete props.geometry;
        await supabase.from("sikayetler").insert({
          kategori: props.kategori || "diger", baslik: props.baslik || "",
          aciklama: props.aciklama || "", ad_soyad: props.adSoyad || "",
          telefon: props.telefon || "", durum: props.durum || "beklemede",
          lat: coord[1], lng: coord[0],
          tarih: props.tarih || new Date().toLocaleString("tr-TR"),
          belediye: props.belediye || "",
        });
      } catch {}
    }
  } catch (e) { console.warn("Supabase şikayet kaydetme hatası:", e); }
}

export async function loadSikayetler(sikayetSrcRef) {
  if (!supabaseAktif) return;
  try {
    const { data, error } = await supabase.from("sikayetler").select("*");
    if (error) throw error;
    if (!data || data.length === 0) return;
    data.forEach(row => {
      try {
        const coord = fromLonLat([row.lng, row.lat]);
        const f = new Feature(new Point(coord));
        f.setProperties({
          __type: "sikayet", kategori: row.kategori, baslik: row.baslik,
          aciklama: row.aciklama, adSoyad: row.ad_soyad, telefon: row.telefon,
          durum: row.durum, tarih: row.tarih, belediye: row.belediye, __db_id: row.id,
        });
        sikayetSrcRef.current?.addFeature(f);
      } catch {}
    });
  } catch (e) { console.warn("Supabase şikayet yükleme hatası:", e); }
}