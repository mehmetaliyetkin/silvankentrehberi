import React, { useState, useEffect } from "react";
import { LAYER_DEFS, SIKAYET_KATEGORILERI } from "../../config";

const ms = {
  ghost: { padding:"9px 16px", background:"transparent", color:"#7a80a0", border:"1px solid #2a2f45", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13 },
};

export default function StatisticsPanel({ katmanSrcRef, drawSrcRef, sikayetSrcRef, onClose }) {
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
  }, [katmanSrcRef, drawSrcRef, sikayetSrcRef]);

  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:250, backdropFilter:"blur(4px)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
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