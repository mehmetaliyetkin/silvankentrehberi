import React, { useState, useCallback } from "react";
import Feature from "ol/Feature";
import Point   from "ol/geom/Point";
import { fromLonLat } from "ol/proj";

export default function NobetciEczanePanel({ mapInstance, nobetciSrcRef, onClose }) {
  const [sehir,      setSehir]      = useState("Silvan");
  const [eczaneler,  setEczaneler]  = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata,       setHata]       = useState("");

  const ara = useCallback(async () => {
    if (!sehir.trim()) return;
    setYukleniyor(true); setHata(""); setEczaneler([]);
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
      const res  = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST", body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const data  = await res.json();
      const items = (data.elements || []).map(el => ({
        id: el.id, ad: el.tags?.name || "İsimsiz Eczane",
        adres: el.tags?.["addr:street"]
          ? `${el.tags["addr:street"]} ${el.tags["addr:housenumber"] || ""}`.trim()
          : "Adres bilgisi yok",
        telefon: el.tags?.phone || el.tags?.["contact:phone"] || "",
        lat: el.lat || el.center?.lat, lon: el.lon || el.center?.lon,
        acik: el.tags?.opening_hours?.includes("24/7") || false,
      })).filter(e => e.lat && e.lon);
      setEczaneler(items);
      if (nobetciSrcRef?.current) {
        nobetciSrcRef.current.clear();
        items.forEach(e => {
          const f = new Feature(new Point(fromLonLat([e.lon, e.lat])));
          f.setProperties({ __type:"nobetci_eczane", __nobetci:true, Ad:e.ad, Adres:e.adres, Telefon:e.telefon, "24/7":e.acik?"Evet":"Bilinmiyor" });
          nobetciSrcRef.current.addFeature(f);
        });
        if (items.length > 0) {
          const extent = nobetciSrcRef.current.getExtent();
          if (extent[0] !== Infinity) mapInstance?.getView().fit(extent, { duration:800, maxZoom:16, padding:[60,60,60,60] });
        }
      }
      if (items.length === 0) setHata(`"${sehir}" için eczane bulunamadı.`);
    } catch { setHata("Overpass API'ye ulaşılamadı."); }
    finally { setYukleniyor(false); }
  }, [sehir, mapInstance, nobetciSrcRef]);

  const zoomTo = (e) => {
    if (!e.lat || !e.lon || !mapInstance) return;
    mapInstance.getView().animate({ center: fromLonLat([e.lon, e.lat]), zoom: 18, duration: 600 });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex", alignItems:"center", justifyContent:"center", zIndex:600, backdropFilter:"blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#0f1629", border:"1px solid #22c55e44", borderRadius:16, padding:24, width:"min(480px, 95vw)", maxHeight:"80vh", display:"flex", flexDirection:"column", boxShadow:"0 0 60px #22c55e22" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#e8eaf0" }}>💊 Nöbetçi Eczane</div>
            <div style={{ fontSize:11, color:"#22c55e", marginTop:2 }}>Overpass API · Gerçek Zamanlı</div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid #2a3a4a", borderRadius:8, color:"#7a80a0", cursor:"pointer", padding:"6px 12px", fontSize:13 }}>✕ Kapat</button>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <input value={sehir} onChange={e => setSehir(e.target.value)} onKeyDown={e => e.key==="Enter"&&ara()}
            placeholder="Şehir / ilçe adı (ör: Silvan, Batman)"
            style={{ flex:1, padding:"9px 12px", background:"#1a2535", border:"1px solid #22c55e44", borderRadius:8, color:"#e8eaf0", fontSize:13, outline:"none", fontFamily:"inherit" }} />
          <button onClick={ara} disabled={yukleniyor}
            style={{ padding:"9px 18px", background:"#22c55e", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600, opacity:yukleniyor?0.6:1 }}>
            {yukleniyor?"⏳":"🔍 Ara"}
          </button>
        </div>
        {hata && <div style={{ background:"#2a0f0f", border:"1px solid #ef444444", borderRadius:8, padding:"10px 12px", color:"#ef4444", fontSize:12, marginBottom:12 }}>⚠ {hata}</div>}
        <div style={{ overflowY:"auto", flex:1 }}>
          {eczaneler.length > 0 && <div style={{ fontSize:11, color:"#64748b", marginBottom:8 }}>{eczaneler.length} eczane bulundu · Haritada <span style={{color:"#22c55e"}}>💊</span> ile gösteriliyor</div>}
          {eczaneler.map((e, i) => (
            <div key={e.id||i} onClick={() => zoomTo(e)}
              style={{ background:"#1a2535", border:`1px solid ${e.acik?"#22c55e":"#2a3a4a"}`, borderRadius:10, padding:"10px 14px", marginBottom:8, cursor:"pointer" }}
              onMouseEnter={el => el.currentTarget.style.borderColor="#22c55e"}
              onMouseLeave={el => el.currentTarget.style.borderColor=e.acik?"#22c55e":"#2a3a4a"}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:16 }}>💊</span>
                <span style={{ fontSize:13, fontWeight:600, color:"#e8eaf0", flex:1 }}>{e.ad}</span>
                {e.acik && <span style={{ background:"#22c55e22", border:"1px solid #22c55e", borderRadius:4, padding:"2px 6px", fontSize:10, color:"#22c55e" }}>24/7</span>}
              </div>
              <div style={{ fontSize:11, color:"#64748b" }}>📍 {e.adres}</div>
              {e.telefon && <div style={{ fontSize:11, color:"#3b82f6", marginTop:2 }}>📞 {e.telefon}</div>}
            </div>
          ))}
          {!yukleniyor && eczaneler.length===0 && !hata && (
            <div style={{ textAlign:"center", padding:32, color:"#374151" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>💊</div>
              <div style={{ fontSize:13 }}>Şehir adı girin ve ara butonuna basın</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}