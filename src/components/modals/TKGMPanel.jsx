import React, { useState, useCallback } from "react";
import { toLonLat } from "ol/proj";

export default function TKGMPanel({ mapInstance, onClose }) {
  const [koordinat, setKoordinat] = useState({ lat: "", lng: "" });
  const [sonuc,     setSonuc]     = useState(null);
  const [yukleniyor,setYuk]       = useState(false);
  const [hata,      setHata]      = useState("");

  const sorgula = useCallback(async () => {
    if (!koordinat.lat || !koordinat.lng) return;
    setYuk(true); setHata(""); setSonuc(null);

    const lat = parseFloat(koordinat.lat);
    const lng = parseFloat(koordinat.lng);

    // Yöntem 1: TKGM CORS-proxy üzerinden
    try {
      const url = `/tkgm-api/megsiswebservis/ows?` + new URLSearchParams({
        SERVICE:      "WFS",
        VERSION:      "2.0.0",
        REQUEST:      "GetFeature",
        typeName:     "parselsorgu:PARSEL",
        outputFormat: "application/json",
        CQL_FILTER:   `INTERSECTS(GEOM,POINT(${lng} ${lat}))`,
        srsName:      "EPSG:4326",
        count:        "1",
      });

      const res  = await fetch(url);
      const data = await res.json();
      const features = data?.features || [];

      if (features.length > 0) {
        setSonuc(features[0].properties);
        setYuk(false); return;
      }
    } catch {}

    // Yöntem 2: Alternatif endpoint
    try {
      const url2 = `/tkgm-api/megsiswebservis/ows?` + new URLSearchParams({
        SERVICE:      "WMS",
        VERSION:      "1.1.1",
        REQUEST:      "GetFeatureInfo",
        LAYERS:       "parselsorgu:PARSEL",
        QUERY_LAYERS: "parselsorgu:PARSEL",
        INFO_FORMAT:  "application/json",
        FEATURE_COUNT:"1",
        SRS:          "EPSG:4326",
        BBOX:         `${lng-0.0001},${lat-0.0001},${lng+0.0001},${lat+0.0001}`,
        WIDTH:        "11",
        HEIGHT:       "11",
        X:            "5",
        Y:            "5",
      });

      const res2  = await fetch(url2);
      const data2 = await res2.json();
      const features2 = data2?.features || [];

      if (features2.length > 0) {
        setSonuc(features2[0].properties);
        setYuk(false); return;
      }
    } catch {}

    // Yöntem 3: Tapu.gov.tr servisi
    try {
      const url3 = `https://tapu.gov.tr/parselSorgulama?lat=${lat}&lng=${lng}`;
      window.open(url3, "_blank");
      setHata("Otomatik sorgu başarısız. TKGM sitesi açıldı — oradan manuel sorgulayabilirsiniz.");
    } catch {
      setHata("TKGM servisine ulaşılamadı.");
    }

    setYuk(false);
  }, [koordinat]);

  const haritadanAl = useCallback(() => {
    if (!mapInstance) return;
    const center   = mapInstance.getView().getCenter();
    const [lng, lat] = toLonLat(center);
    setKoordinat({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
  }, [mapInstance]);

  const ETIKETLER = {
    IL_ADI:      "İl",
    ILCE_ADI:    "İlçe",
    MAHALLE_ADI: "Mahalle",
    KÖYADI:      "Köy",
    ADA_NO:      "Ada No",
    PARSEL_NO:   "Parsel No",
    ALAN:        "Alan (m²)",
    NİTELİK:     "Nitelik",
    BAGIMSIZ_BOLUM_SAYISI: "Bağımsız Bölüm",
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:600, backdropFilter:"blur(4px)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#0f1629", border:"1px solid #3b82f644", borderRadius:16,
        padding:24, width:"min(500px,95vw)", maxHeight:"85vh", display:"flex",
        flexDirection:"column", boxShadow:"0 0 60px #3b82f622" }}>

        {/* Başlık */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#e8eaf0" }}>🏛 TKGM Parsel Sorgulama</div>
            <div style={{ fontSize:11, color:"#3b82f6", marginTop:2 }}>Tapu Kadastro · Resmi Veri</div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid #2a3a4a",
            borderRadius:8, color:"#7a80a0", cursor:"pointer", padding:"6px 12px", fontSize:13 }}>✕</button>
        </div>

        {/* Koordinat */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
          {[
            { label:"Enlem (Lat)", key:"lat", placeholder:"37.924584" },
            { label:"Boylam (Lng)", key:"lng", placeholder:"40.276543" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <div style={{ fontSize:11, color:"#7a80a0", marginBottom:4 }}>{label}</div>
              <input value={koordinat[key]}
                onChange={e => setKoordinat(k => ({ ...k, [key]:e.target.value }))}
                placeholder={placeholder}
                style={{ width:"100%", padding:"8px 10px", background:"#1a2535",
                  border:"1px solid #3b82f644", borderRadius:8, color:"#e8eaf0",
                  fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <button onClick={haritadanAl}
            style={{ flex:1, padding:"9px 12px", background:"#1a2535",
              border:"1px solid #3b82f644", borderRadius:8, color:"#3b82f6",
              cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>
            🎯 Harita Merkezinden Al
          </button>
          <button onClick={sorgula} disabled={yukleniyor || !koordinat.lat || !koordinat.lng}
            style={{ flex:1, padding:"9px 12px", background:"#3b82f6", border:"none",
              borderRadius:8, color:"#fff", cursor:"pointer", fontFamily:"inherit",
              fontSize:13, fontWeight:600, opacity:yukleniyor?0.6:1 }}>
            {yukleniyor ? "⏳ Sorgulanıyor..." : "🔍 Sorgula"}
          </button>
        </div>

        {hata && (
          <div style={{ background:"#2a0f0f", border:"1px solid #ef444444", borderRadius:8,
            padding:"10px 12px", color:"#ef4444", fontSize:12, marginBottom:12 }}>
            ⚠ {hata}
          </div>
        )}

        {/* Sonuç */}
        {sonuc && (
          <div style={{ overflowY:"auto", flex:1 }}>
            <div style={{ fontSize:12, color:"#22c55e", marginBottom:10, fontWeight:600 }}>✅ Parsel bulundu</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {Object.entries(sonuc)
                .filter(([k]) => !k.startsWith("_") && k !== "GEOM" && k !== "geometry")
                .map(([key, val]) => (
                  <div key={key} style={{ background:"#1a2535", borderRadius:8,
                    padding:"8px 10px", border:"1px solid #2a3a4a" }}>
                    <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase",
                      letterSpacing:"0.05em", marginBottom:3 }}>
                      {ETIKETLER[key] || key}
                    </div>
                    <div style={{ fontSize:13, color:"#e8eaf0", wordBreak:"break-word" }}>
                      {String(val ?? "—")}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {!sonuc && !yukleniyor && !hata && (
          <div style={{ textAlign:"center", padding:32, color:"#374151" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🏛</div>
            <div style={{ fontSize:13, color:"#64748b" }}>Koordinat girin veya harita merkezinden alın</div>
            <div style={{ fontSize:11, marginTop:6, color:"#2a3a4a" }}>
              TKGM WFS servisi üzerinden parsel bilgisi sorgulanır
            </div>
          </div>
        )}

        {/* Manuel sorgulama linkleri */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:12 }}>
          <a href="https://parselsorgu.tkgm.gov.tr" target="_blank" rel="noreferrer"
            style={{ padding:"8px", background:"#1a2535", border:"1px solid #3b82f644",
              borderRadius:8, color:"#3b82f6", fontSize:11, textAlign:"center", textDecoration:"none" }}>
            🌐 TKGM Parsel Sorgu →
          </a>
          <a href={koordinat.lat && koordinat.lng
              ? `https://parselsorgu.tkgm.gov.tr/#${koordinat.lat},${koordinat.lng},17`
              : "https://parselsorgu.tkgm.gov.tr"}
            target="_blank" rel="noreferrer"
            style={{ padding:"8px", background:"#1a2535", border:"1px solid #22c55e44",
              borderRadius:8, color:"#22c55e", fontSize:11, textAlign:"center", textDecoration:"none" }}>
            📍 Konumla Aç →
          </a>
        </div>
      </div>
    </div>
  );
}