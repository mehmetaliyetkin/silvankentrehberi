import React, { useState, useEffect, useRef, useCallback } from "react";
import { toLonLat } from "ol/proj";

// Mapillary ücretsiz, kayıt gerekli: https://www.mapillary.com/developer
// .env: VITE_MAPILLARY_KEY=xxxxxx
const MAPILLARY_KEY = import.meta.env.VITE_MAPILLARY_KEY || "";

export default function StreetViewPanel({ mapInstance, onClose }) {
  const [koordinat,  setKoordinat]  = useState(null);
  const [goruntu,    setGoruntu]    = useState(null);
  const [yukleniyor, setYuk]        = useState(false);
  const [hata,       setHata]       = useState("");
  const [mod,        setMod]        = useState("mapillary"); // "mapillary" | "google"
  const viewerRef = useRef(null);

  // Harita merkezinin koordinatını al
  const koordinatAl = useCallback(() => {
    if (!mapInstance) return;
    const center   = mapInstance.getView().getCenter();
    const [lng, lat] = toLonLat(center);
    setKoordinat({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
  }, [mapInstance]);

  useEffect(() => { koordinatAl(); }, []);

  // Mapillary — yakın görüntü ara
  const mapillaryAra = useCallback(async (lat, lng) => {
    if (!MAPILLARY_KEY) {
      setHata("Mapillary API key gerekli. .env dosyasına VITE_MAPILLARY_KEY ekleyin.");
      return;
    }
    setYuk(true); setHata(""); setGoruntu(null);
    try {
      // Yakın 500m içindeki görüntüleri getir
      const url = `https://graph.mapillary.com/images?access_token=${MAPILLARY_KEY}` +
        `&fields=id,thumb_2048_url,captured_at,compass_angle,geometry` +
        `&closeto=${lng},${lat}&radius=500&limit=5`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const images = data.data || [];
      if (images.length === 0) {
        setHata("Bu konumda yakın Mapillary görüntüsü bulunamadı (500m içinde).");
      } else {
        setGoruntu(images[0]);
      }
    } catch (e) {
      setHata("Mapillary görüntüsü alınamadı: " + e.message);
    } finally {
      setYuk(false);
    }
  }, []);

  useEffect(() => {
    if (koordinat && mod === "mapillary") {
      mapillaryAra(koordinat.lat, koordinat.lng);
    }
  }, [koordinat, mod]);

  // Google Street View URL oluştur (API key gerekmez, Maps web'e yönlendirir)
  const googleStreetViewUrl = koordinat
    ? `https://www.google.com/maps?q=&layer=c&cbll=${koordinat.lat},${koordinat.lng}&cbp=12,0,0,0,0`
    : null;

  // Mapillary embed URL
  const mapillaryEmbedUrl = goruntu
    ? `https://www.mapillary.com/embed?image_key=${goruntu.id}&style=photo`
    : null;

  const tarihFormat = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("tr-TR", { year:"numeric", month:"long", day:"numeric" });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000d", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:600, backdropFilter:"blur(4px)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#0f1629", border:"1px solid #a855f744", borderRadius:16,
        padding:24, width:"min(700px,96vw)", maxHeight:"90vh", display:"flex",
        flexDirection:"column", boxShadow:"0 0 60px #a855f711" }}>

        {/* Başlık */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#e8eaf0" }}>🏙 Sokak Görünümü</div>
            <div style={{ fontSize:11, color:"#a855f7", marginTop:2 }}>Mapillary · Google Street View</div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid #2a3a4a",
            borderRadius:8, color:"#7a80a0", cursor:"pointer", padding:"6px 12px", fontSize:13 }}>✕</button>
        </div>

        {/* Mod Seçimi */}
        <div style={{ display:"flex", gap:4, marginBottom:16, background:"#0f1117", borderRadius:8, padding:4 }}>
          {[
            { id:"mapillary", label:"🗺 Mapillary", renk:"#a855f7" },
            { id:"google",    label:"🌐 Google Maps", renk:"#22c55e" },
          ].map(m => (
            <button key={m.id} onClick={() => setMod(m.id)}
              style={{ flex:1, padding:"8px", borderRadius:6, border:"none", cursor:"pointer",
                fontFamily:"inherit", fontSize:13,
                background: mod===m.id ? m.renk : "transparent",
                color: mod===m.id ? "#fff" : "#7a80a0" }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Koordinat */}
        {koordinat && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12,
            background:"#1a2535", borderRadius:8, padding:"8px 12px" }}>
            <span style={{ fontSize:12, color:"#64748b" }}>
              📍 {koordinat.lat}, {koordinat.lng}
            </span>
            <button onClick={koordinatAl}
              style={{ marginLeft:"auto", padding:"4px 10px", background:"transparent",
                border:"1px solid #2a3a4a", borderRadius:6, color:"#7a80a0",
                cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>
              🎯 Harita Merkezini Güncelle
            </button>
          </div>
        )}

        {/* Mapillary Modu */}
        {mod === "mapillary" && (
          <>
            {!MAPILLARY_KEY && (
              <div style={{ background:"#2a1f2a", border:"1px solid #a855f744", borderRadius:8,
                padding:"10px 12px", color:"#a855f7", fontSize:12, marginBottom:12 }}>
                ⚠ <strong>.env</strong> dosyasına <code>VITE_MAPILLARY_KEY=sizin_key</code> ekleyin.
                <a href="https://www.mapillary.com/developer" target="_blank" rel="noreferrer"
                  style={{ color:"#a855f7", marginLeft:6 }}>Ücretsiz key al →</a>
              </div>
            )}

            {yukleniyor && (
              <div style={{ textAlign:"center", padding:40, color:"#7a80a0", fontSize:13 }}>
                ⏳ Yakın görüntü aranıyor...
              </div>
            )}

            {hata && (
              <div style={{ background:"#2a0f0f", border:"1px solid #ef444444", borderRadius:8,
                padding:"10px 12px", color:"#ef4444", fontSize:12, marginBottom:12 }}>
                ⚠ {hata}
              </div>
            )}

            {goruntu && mapillaryEmbedUrl && (
              <>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:8 }}>
                  📅 Çekim tarihi: {tarihFormat(goruntu.captured_at)} ·
                  🧭 {goruntu.compass_angle ? Math.round(goruntu.compass_angle)+"°" : "—"}
                </div>
                <iframe
                  src={mapillaryEmbedUrl}
                  style={{ width:"100%", height:380, border:"none", borderRadius:12,
                    background:"#1a2535" }}
                  allowFullScreen
                  title="Mapillary Street View"
                />
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <a href={`https://www.mapillary.com/app/?image_key=${goruntu.id}`}
                    target="_blank" rel="noreferrer"
                    style={{ flex:1, padding:"9px", background:"#a855f722",
                      border:"1px solid #a855f744", borderRadius:8, color:"#a855f7",
                      fontSize:12, textAlign:"center", textDecoration:"none" }}>
                    🔗 Mapillary'de Aç →
                  </a>
                  <button onClick={() => koordinat && mapillaryAra(koordinat.lat, koordinat.lng)}
                    style={{ flex:1, padding:"9px", background:"#1a2535",
                      border:"1px solid #2a3a4a", borderRadius:8, color:"#7a80a0",
                      cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>
                    🔄 Başka Görüntü Ara
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Google Maps Modu */}
        {mod === "google" && koordinat && (
          <>
            <div style={{ background:"#1a2535", border:"1px solid #22c55e33", borderRadius:10,
              padding:16, textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🌐</div>
              <div style={{ fontSize:14, color:"#e8eaf0", marginBottom:6 }}>
                Google Street View — Harici Bağlantı
              </div>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>
                Google Maps embed API ücretli olduğu için harici bağlantı açılır.
              </div>
              <a href={googleStreetViewUrl} target="_blank" rel="noreferrer"
                style={{ display:"inline-block", padding:"12px 24px",
                  background:"#22c55e", border:"none", borderRadius:8,
                  color:"#fff", fontSize:14, fontWeight:600, textDecoration:"none" }}>
                🗺 Google Street View'ı Aç →
              </a>
            </div>

            {/* Google Maps Embed (statik görünüm) */}
            <div style={{ marginTop:12, borderRadius:12, overflow:"hidden", border:"1px solid #2a3a4a" }}>
              <iframe
                src={`https://maps.google.com/maps?q=${koordinat.lat},${koordinat.lng}&hl=tr&z=18&output=embed`}
                style={{ width:"100%", height:280, border:"none" }}
                title="Google Maps"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}