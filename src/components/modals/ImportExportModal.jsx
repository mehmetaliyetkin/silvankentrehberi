import React, { useState } from "react";
import GeoJSON from "ol/format/GeoJSON";
import { LAYER_DEFS, MAP_PROJECTION } from "../../config";
import { validateGeoJSON } from "../../lib/geo";

const ms = {
  primary: { padding:"9px 16px", background:"#3b82f6", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13 },
  ghost:   { padding:"9px 16px", background:"transparent", color:"#7a80a0", border:"1px solid #2a2f45", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13 },
};

export default function ImportExportModal({ onClose, onImport, layersRef, drawSrcRef, katmanSrcRef }) {
  const [aktif,       setAktif]       = useState("import");
  const [validation,  setValidation]  = useState(null);
  const [pendingGJ,   setPendingGJ]   = useState(null);
  const [importing,   setImporting]   = useState(false);
  const [importHedef, setImportHedef] = useState("import");

  const exportKatmanlar = [
    ...LAYER_DEFS.map(def => ({
      v: def.key, l: def.label, color: def.color,
      count: layersRef.current[def.key]?.getSource?.()?.getFeatures?.()?.length ?? 0,
    })),
    { v:"cizim",   l:"Çizimler",        color:"#ff6600", count: (drawSrcRef.current?.getFeatures?.()?.length ?? 0) + Object.values(katmanSrcRef?.current||{}).reduce((s,src) => s+(src?.getFeatures?.()?.length??0), 0) },
    { v:"import",  l:"İçe Aktarılan",   color:"#f59e0b", count: layersRef.current.__import?.getSource?.()?.getFeatures?.()?.length ?? 0 },
    { v:"sikayet", l:"Şikayetler",      color:"#ef4444", count: layersRef.current.__sikayet?.getSource?.()?.getFeatures?.()?.length ?? 0 },
  ];
  const [exportSecili, setExportSecili] = useState(exportKatmanlar.map(k => k.v));

  function handleExport() {
    const fmt = new GeoJSON();
    exportSecili.forEach(katmanKey => {
      let features = [];
      if (katmanKey==="cizim") {
        features.push(...(drawSrcRef.current?.getFeatures()||[]));
        Object.values(katmanSrcRef?.current||{}).forEach(src => { if (src?.getFeatures) features.push(...src.getFeatures()); });
      } else if (katmanKey==="import") {
        features.push(...(layersRef.current.__import?.getSource?.()?.getFeatures?.()||[]));
      } else if (katmanKey==="sikayet") {
        features.push(...(layersRef.current.__sikayet?.getSource?.()?.getFeatures?.()||[]));
      } else {
        features.push(...(layersRef.current[katmanKey]?.getSource?.()?.getFeatures?.()||[]));
      }
      if (features.length === 0) return;
      const meta    = exportKatmanlar.find(k => k.v === katmanKey);
      const geojson = {
        type:"FeatureCollection", crs:{ type:"name", properties:{ name:"EPSG:4326" }},
        katman:katmanKey, katman_adi:meta?.l||katmanKey,
        tarih:new Date().toISOString(), kayit_sayisi:features.length,
        features: features.map(f => {
          try {
            const geom  = f.getGeometry().clone().transform(MAP_PROJECTION, "EPSG:4326");
            const props = { ...f.getProperties() }; delete props.geometry;
            return { type:"Feature", properties:props, geometry:JSON.parse(fmt.writeGeometry(geom)) };
          } catch { return null; }
        }).filter(Boolean),
      };
      const blob = new Blob([JSON.stringify(geojson,null,2)], { type:"application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
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

  const hedefSecenekleri = [
    ...LAYER_DEFS.map(d => ({ v:d.key, l:d.label, color:d.color })),
    { v:"import", l:"İçe Aktarılan (Geçici)", color:"#f59e0b" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(4px)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#1a1d27", border:"1px solid #2a2f45", borderRadius:16, padding:24, width:"min(520px,92vw)", maxHeight:"80vh", overflowY:"auto" }}>
        <div style={{ fontSize:16, fontWeight:600, color:"#e8eaf0", marginBottom:20 }}>📦 GeoJSON Import / Export</div>
        <div style={{ display:"flex", gap:4, marginBottom:20, background:"#0f1117", borderRadius:8, padding:4 }}>
          {["import","export"].map(t => (
            <button key={t} onClick={() => { setAktif(t); setValidation(null); setPendingGJ(null); }}
              style={{ flex:1, padding:8, borderRadius:6, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, background:aktif===t?"#3b82f6":"transparent", color:aktif===t?"white":"#7a80a0" }}>
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
                  {validation.errors.map((e,i)   => <div key={i} style={{ fontSize:12, color:"#f87171", borderLeft:"2px solid #ef4444", paddingLeft:8, marginBottom:4 }}>⚠ {e}</div>)}
                  {validation.warnings.map((w,i) => <div key={i} style={{ fontSize:12, color:"#fbbf24", borderLeft:"2px solid #f59e0b", paddingLeft:8, marginBottom:4 }}>ℹ {w}</div>)}
                </div>
                {validation.count > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:"#7a80a0", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>Hangi katmana aktarılsın?</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                      {hedefSecenekleri.map(({ v,l,color }) => (
                        <button key={v} onClick={() => setImportHedef(v)}
                          style={{ padding:"8px 6px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:11, textAlign:"left",
                            border:importHedef===v?`1px solid ${color}`:"1px solid #2a2f45",
                            background:importHedef===v?`${color}22`:"#0f1117",
                            color:importHedef===v?color:"#7a80a0", display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ width:8, height:8, borderRadius:2, background:color, flexShrink:0, display:"inline-block" }} />{l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                  <button onClick={() => { setValidation(null); setPendingGJ(null); }} style={ms.ghost}>Başka Dosya</button>
                  {validation.count > 0 && (
                    <button onClick={() => { onImport(pendingGJ, importHedef); onClose(); }}
                      style={{ ...ms.primary, opacity:!importHedef?0.4:1, background:validation.valid?"#3b82f6":"#f59e0b" }}
                      disabled={!importHedef}>
                      {validation.valid?"✓ Aktar":"⚠ Yine de Aktar"}
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