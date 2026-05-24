import React, { useState, useEffect, useCallback, useRef } from "react";
import TileLayer from "ol/layer/Tile";
import XYZ      from "ol/source/XYZ";
import { toLonLat } from "ol/proj";

// OpenWeatherMap ücretsiz API key'ini .env'e ekle:
// VITE_OWM_KEY=xxxxxx
const OWM_KEY = import.meta.env.VITE_OWM_KEY || "";

const KATMANLAR = [
  { id:"precipitation_new", label:"🌧 Yağış",       renk:"#3b82f6" },
  { id:"clouds_new",        label:"☁ Bulutluluk",   renk:"#94a3b8" },
  { id:"wind_new",          label:"💨 Rüzgar",       renk:"#22c55e" },
  { id:"temp_new",          label:"🌡 Sıcaklık",     renk:"#f59e0b" },
  { id:"pressure_new",      label:"🔵 Basınç",       renk:"#a855f7" },
];

export default function HavaDurumuPanel({ mapInstance, layersRef, onClose }) {
  const [aktifKatman,  setAktifKatman]  = useState(null);
  const [sehirHava,    setSehirHava]    = useState(null);
  const [yukleniyor,   setYuk]          = useState(false);
  const [hata,         setHata]         = useState("");
  const owmLayerRef = useRef(null);

  // OWM hava katmanını haritaya ekle/kaldır
  const katmanDegistir = useCallback((katmanId) => {
    const map = mapInstance; if (!map) return;

    // Önce eskiyi kaldır
    if (owmLayerRef.current) {
      map.removeLayer(owmLayerRef.current);
      owmLayerRef.current = null;
    }

    if (!katmanId || katmanId === aktifKatman) {
      setAktifKatman(null); return;
    }

    if (!OWM_KEY) {
      setHata("OpenWeatherMap API key gerekli. .env dosyasına VITE_OWM_KEY ekleyin.");
      return;
    }

    const layer = new TileLayer({
      source: new XYZ({
        url: `https://tile.openweathermap.org/map/${katmanId}/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
        crossOrigin: "anonymous",
      }),
      opacity: 0.7,
      zIndex:  600,
    });
    map.addLayer(layer);
    owmLayerRef.current = layer;
    setAktifKatman(katmanId);
  }, [mapInstance, aktifKatman]);

  // Harita merkezinin hava durumu
  const merkezHavaDurumu = useCallback(async () => {
    if (!mapInstance || !OWM_KEY) {
      setHata("OpenWeatherMap API key gerekli.");
      return;
    }
    setYuk(true); setHata("");
    try {
      const center   = mapInstance.getView().getCenter();
      const [lng, lat] = toLonLat(center);
      const url = `https://api.openweathermap.org/data/2.5/weather` +
        `?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&appid=${OWM_KEY}&units=metric&lang=tr`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSehirHava(data);
    } catch (e) {
      setHata("Hava durumu alınamadı: " + e.message);
    } finally {
      setYuk(false);
    }
  }, [mapInstance]);

  // Panel açılınca otomatik sorgula
  useEffect(() => { merkezHavaDurumu(); }, []);

  // Panel kapanınca katmanı kaldır
  const handleClose = () => {
    if (owmLayerRef.current && mapInstance) {
      mapInstance.removeLayer(owmLayerRef.current);
      owmLayerRef.current = null;
    }
    onClose();
  };

  const sicaklikRenk = (c) => c > 30 ? "#ef4444" : c > 20 ? "#f59e0b" : c > 10 ? "#22c55e" : "#3b82f6";

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:600, backdropFilter:"blur(4px)" }}
      onClick={e => e.target===e.currentTarget && handleClose()}>
      <div style={{ background:"#0f1629", border:"1px solid #f59e0b44", borderRadius:16,
        padding:24, width:"min(480px,95vw)", maxHeight:"85vh", display:"flex",
        flexDirection:"column", boxShadow:"0 0 60px #f59e0b11" }}>

        {/* Başlık */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#e8eaf0" }}>🌤 Hava Durumu</div>
            <div style={{ fontSize:11, color:"#f59e0b", marginTop:2 }}>OpenWeatherMap · Canlı Veri</div>
          </div>
          <button onClick={handleClose} style={{ background:"transparent", border:"1px solid #2a3a4a",
            borderRadius:8, color:"#7a80a0", cursor:"pointer", padding:"6px 12px", fontSize:13 }}>✕</button>
        </div>

        {/* API key uyarısı */}
        {!OWM_KEY && (
          <div style={{ background:"#2a1f0a", border:"1px solid #f59e0b44", borderRadius:8,
            padding:"10px 12px", color:"#f59e0b", fontSize:12, marginBottom:12 }}>
            ⚠ <strong>.env</strong> dosyasına <code>VITE_OWM_KEY=sizin_key</code> ekleyin.
            <a href="https://openweathermap.org/api" target="_blank" rel="noreferrer"
              style={{ color:"#f59e0b", marginLeft:6 }}>Ücretsiz key al →</a>
          </div>
        )}

        {/* Anlık Hava */}
        {yukleniyor && (
          <div style={{ textAlign:"center", padding:20, color:"#7a80a0", fontSize:13 }}>⏳ Yükleniyor...</div>
        )}
        {hata && (
          <div style={{ background:"#2a0f0f", border:"1px solid #ef444444", borderRadius:8,
            padding:"10px 12px", color:"#ef4444", fontSize:12, marginBottom:12 }}>⚠ {hata}</div>
        )}

        {sehirHava && (
          <div style={{ background:"#1a2535", border:"1px solid #2a3a4a", borderRadius:12,
            padding:16, marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"#e8eaf0" }}>
                  📍 {sehirHava.name || "Harita Merkezi"}
                </div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:2, textTransform:"capitalize" }}>
                  {sehirHava.weather?.[0]?.description}
                </div>
              </div>
              <div style={{ fontSize:32, fontWeight:700, color:sicaklikRenk(sehirHava.main?.temp) }}>
                {Math.round(sehirHava.main?.temp)}°C
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[
                { label:"Hissedilen", val:`${Math.round(sehirHava.main?.feels_like)}°C` },
                { label:"Nem",        val:`${sehirHava.main?.humidity}%` },
                { label:"Rüzgar",     val:`${Math.round((sehirHava.wind?.speed||0)*3.6)} km/h` },
                { label:"Basınç",     val:`${sehirHava.main?.pressure} hPa` },
                { label:"Görüş",      val:`${((sehirHava.visibility||0)/1000).toFixed(1)} km` },
                { label:"Bulutluluk", val:`${sehirHava.clouds?.all}%` },
              ].map(({ label, val }) => (
                <div key={label} style={{ background:"#0f1729", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#64748b", marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:13, color:"#e8eaf0", fontWeight:600 }}>{val}</div>
                </div>
              ))}
            </div>
            <button onClick={merkezHavaDurumu}
              style={{ marginTop:10, width:"100%", padding:"7px", background:"transparent",
                border:"1px solid #2a3a4a", borderRadius:8, color:"#64748b",
                cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>
              🔄 Yenile
            </button>
          </div>
        )}

        {/* Harita Katmanları */}
        <div style={{ fontSize:11, color:"#7a80a0", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>
          Harita Katmanı Seç
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {KATMANLAR.map(k => (
            <button key={k.id} onClick={() => katmanDegistir(k.id)}
              style={{ padding:"10px 8px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12,
                border: aktifKatman===k.id ? `1px solid ${k.renk}` : "1px solid #2a3a4a",
                background: aktifKatman===k.id ? `${k.renk}22` : "#1a2535",
                color: aktifKatman===k.id ? k.renk : "#7a80a0",
                display:"flex", alignItems:"center", gap:6 }}>
              {k.label}
              {aktifKatman===k.id && <span style={{ marginLeft:"auto", fontSize:10 }}>✓ Aktif</span>}
            </button>
          ))}
          {aktifKatman && (
            <button onClick={() => katmanDegistir(null)}
              style={{ padding:"10px 8px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12,
                border:"1px solid #ef444444", background:"#ef444411", color:"#ef4444",
                gridColumn:"1/-1" }}>
              ✕ Katmanı Kaldır
            </button>
          )}
        </div>
      </div>
    </div>
  );
}