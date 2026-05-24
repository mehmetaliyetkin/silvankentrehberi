import React from "react";
import { LAYER_DEFS, POI_CATEGORIES, SIKAYET_KATEGORILERI } from "../../config";
import { saveCizimler, saveSikayetler } from "../../lib/persistence";

const DRAW_TOOLS = [
  { id:"Point",      label:"📍 Nokta"  },
  { id:"LineString", label:"📏 Çizgi"  },
  { id:"Polygon",    label:"⬡ Alan"    },
  { id:"erase",      label:"🗑 Sil"    },
];

const inp = { width:"100%", padding:"8px 10px", background:"#3a3a3a", border:"1px solid #555", borderRadius:8, color:"#e8eaf0", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

export default function MobileDrawer(props) {
  const {
    mobilePanel, setMobileSideOpen,
    // layers
    layerVisibility, setLayerVis, loading, baseMap, setBaseMap,
    // search
    searchText, setSearchText, searchResults, zoomToFeature,
    addressQuery, setAddressQuery, addressResults, addressLoading, goToAddress,
    selectedMahalle, mahalleList, handleMahalleChange,
    // rota
    rotaMod, setRotaMod, routeMode, temizleRota, setRotaAdim,
    // info
    selectedFeature, setSelectedFeature,
    canEdit, sikayetSrcRef, hlSrcRef, mapInstanceRef,
    // tools
    undoRedo, katmanSrcRef, drawSrcRef,
    cizimKatman, setCizimKatman,
    drawTool, setDrawTool,
    geomDuzenle,
    setShowModal, setShowStats,
  } = props;

  return (
    <div style={{
      position:"absolute", bottom:56, left:0, right:0, height:"65vh",
      background:"#2c2c2c", borderTop:"1px solid #3a3f55",
      borderRadius:"16px 16px 0 0", zIndex:15, overflowY:"auto",
      padding:16, WebkitOverflowScrolling:"touch",
      animation:"slideUp 0.25s ease",
    }}>
      <style>{`@keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }`}</style>

      {/* ── KATMANLAR ── */}
      {mobilePanel==="layers" && (
        <>
          <h4 style={{ margin:"0 0 12px 0", color:"#e8eaf0", fontSize:14 }}>🗂 Katmanlar</h4>
          <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6, textTransform:"uppercase" }}>Altlık</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:12 }}>
            {[{ id:"osm", label:"🗺️ OSM" },{ id:"uydu", label:"🛰️ Uydu" }].map(b => (
              <button key={b.id} onClick={() => setBaseMap(b.id)}
                style={{ padding:"10px 6px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12,
                  border:baseMap===b.id?"1px solid #3b82f6":"1px solid #444",
                  background:baseMap===b.id?"#3b82f622":"#383838",
                  color:baseMap===b.id?"#3b82f6":"#aaa" }}>
                {b.label}
              </button>
            ))}
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

      {/* ── ARAMA ── */}
      {mobilePanel==="search" && (
        <>
          <h4 style={{ margin:"0 0 12px 0", color:"#e8eaf0", fontSize:14 }}>🔍 Arama</h4>

          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6 }}>Veri Ara</div>
            <input type="text" placeholder="Parsel, mahalle, yol..." value={searchText}
              onChange={e => setSearchText(e.target.value)} style={inp} />
            {searchResults.length > 0 && (
              <div style={{ maxHeight:120, overflowY:"auto", background:"#3a3a3a", borderRadius:8, marginTop:6 }}>
                {searchResults.map((item, idx) => (
                  <div key={idx}
                    onClick={() => { zoomToFeature(item.feature); setMobileSideOpen(false); }}
                    style={{ padding:"10px 12px", borderBottom:"1px solid #444", cursor:"pointer" }}>
                    <span style={{ background:"#1976d2", color:"#fff", fontSize:9, padding:"1px 5px", borderRadius:3, marginRight:6 }}>{item.layerKey}</span>
                    <span style={{ color:"#ddd", fontSize:13 }}>{item.label.substring(0,30)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6 }}>Adres Ara</div>
            <input type="text" placeholder="Sokak, mahalle, yer adı..." value={addressQuery}
              onChange={e => setAddressQuery(e.target.value)} style={inp} />
            {addressLoading && <div style={{ color:"#7a80a0", fontSize:12, marginTop:4 }}>🔍 Aranıyor...</div>}
            {addressResults.length > 0 && (
              <div style={{ maxHeight:150, overflowY:"auto", background:"#3a3a3a", borderRadius:8, marginTop:6 }}>
                {addressResults.map((item, idx) => (
                  <div key={item.place_id||idx}
                    onClick={() => { goToAddress(item); setMobileSideOpen(false); }}
                    style={{ padding:"10px 12px", borderBottom:"1px solid #444", cursor:"pointer" }}>
                    <div style={{ color:"#4fc3f7", fontWeight:500, fontSize:13 }}>{item.display_name.split(",")[0]}</div>
                    <div style={{ color:"#888", fontSize:11 }}>{item.display_name.split(",").slice(1,3).join(",")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6 }}>Mahalle Seç</div>
            <select value={selectedMahalle} onChange={e => { handleMahalleChange(e.target.value); setMobileSideOpen(false); }}
              style={inp}>
              <option value="">Tüm Mahalleler</option>
              {mahalleList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <button
            onClick={() => {
              if (rotaMod) { temizleRota(); setMobileSideOpen(false); }
              else { setRotaMod(true); routeMode.current="start"; setRotaAdim("start"); setDrawTool(null); geomDuzenle.temizle(); setMobileSideOpen(false); }
            }}
            style={{ width:"100%", padding:"12px 10px", fontSize:14, borderRadius:8, cursor:"pointer", fontFamily:"inherit",
              border:rotaMod?"1px solid #3b82f6":"1px solid #555",
              background:rotaMod?"#3b82f622":"#444",
              color:rotaMod?"#3b82f6":"#ccc" }}>
            🗺 {rotaMod ? "Rota Modundan Çık" : "Rota Hesapla"}
          </button>
        </>
      )}

      {/* ── BİLGİ ── */}
      {mobilePanel==="info" && (
        <>
          <h4 style={{ margin:"0 0 12px 0", color:"#e8eaf0", fontSize:14 }}>📍 Bilgi Paneli</h4>
          {selectedFeature ? (
            <div>
              {Object.entries(selectedFeature)
                .filter(([k]) => k!=="geometry" && !k.startsWith("__"))
                .map(([key, value]) => (
                  <div key={key} style={{ background:"#3a3a3a", borderRadius:8, padding:"10px 12px", marginBottom:8, borderLeft:"3px solid #1976d2" }}>
                    <span style={{ color:"#888", fontSize:11, textTransform:"uppercase" }}>{key}</span>
                    <div style={{ fontSize:14, marginTop:2, wordBreak:"break-word" }}>{String(value??"")}</div>
                  </div>
                ))}
              {canEdit && selectedFeature.__type==="sikayet" && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:11, color:"#7a80a0", marginBottom:8 }}>Durum Güncelle</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                    {["beklemede","incelemede","cozuldu"].map(d => (
                      <button key={d}
                        onClick={() => {
                          hlSrcRef.current.getFeatures().forEach(f => {
                            if (f.get("__type")==="sikayet") {
                              f.set("durum", d);
                              sikayetSrcRef.current?.changed();
                              setSelectedFeature({ ...selectedFeature, durum:d });
                              setTimeout(() => saveSikayetler(sikayetSrcRef), 50);
                            }
                          });
                        }}
                        style={{ padding:"8px 4px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:10,
                          background:selectedFeature.durum===d?"#3b82f6":"#2a2f45", border:"none",
                          color:selectedFeature.durum===d?"#fff":"#7a80a0" }}>
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

      {/* ── ARAÇLAR ── */}
      {mobilePanel==="tools" && canEdit && (
        <>
          <h4 style={{ margin:"0 0 12px 0", color:"#e8eaf0", fontSize:14 }}>✏ Araçlar</h4>

          {/* Geometri düzenle / taşı */}
          <div style={{ background:"#1a2535", border:"1px solid #facc1544", borderRadius:10, padding:12, marginBottom:12 }}>
            <div style={{ fontSize:12, color:"#facc15", marginBottom:8, fontWeight:600 }}>✏ Geometri Düzenle / Taşı</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
              {[{ mod:"modify", label:"✏ Düzenle" },{ mod:"translate", label:"↔ Taşı" }].map(({ mod, label }) => (
                <button key={mod}
                  onClick={() => { setDrawTool(null); geomDuzenle.aktifEt(mod); }}
                  style={{ padding:"12px 8px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13,
                    border:geomDuzenle.mod===mod?"1px solid #facc15":"1px solid #334155",
                    background:geomDuzenle.mod===mod?"#facc1522":"#0f1729",
                    color:geomDuzenle.mod===mod?"#facc15":"#7a80a0" }}>
                  {label}
                </button>
              ))}
            </div>
            {geomDuzenle.mod && (
              <div style={{ fontSize:11, color:"#fbbf24", background:"#2a1f0a", padding:"6px 8px", borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>{geomDuzenle.mod==="modify"?"Noktaları sürükle":"Objeye tıkla, taşı"}</span>
                <button onClick={geomDuzenle.temizle}
                  style={{ fontSize:11, padding:"3px 8px", background:"#ef444422", border:"1px solid #ef4444", borderRadius:4, color:"#ef4444", cursor:"pointer", fontFamily:"inherit" }}>✕</button>
              </div>
            )}
          </div>

          {/* Undo / Redo */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            <button onClick={() => { undoRedo.undo(); setTimeout(() => saveCizimler(katmanSrcRef, drawSrcRef), 50); }}
              style={{ padding:"12px 8px", fontSize:13, borderRadius:8, cursor:"pointer", fontFamily:"inherit", border:"1px solid #555", background:"#444", color:"#ccc" }}>
              ↩ Geri Al
            </button>
            <button onClick={() => { undoRedo.redo(); setTimeout(() => saveCizimler(katmanSrcRef, drawSrcRef), 50); }}
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
            {DRAW_TOOLS.map(({ id, label }) => {
              const kat  = LAYER_DEFS.find(d => d.key===cizimKatman);
              const renk = kat?.color || "#1976d2";
              return (
                <button key={id}
                  onClick={() => { setDrawTool(drawTool===id ? null : id); if (drawTool!==id) setMobileSideOpen(false); }}
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

          <button onClick={() => setShowModal(true)}
            style={{ width:"100%", padding:"12px 10px", fontSize:14, marginBottom:8, borderRadius:8, cursor:"pointer", fontFamily:"inherit", background:"#1976d2", border:"none", color:"white" }}>
            📦 GeoJSON Import / Export
          </button>
          <button onClick={() => setShowStats(true)}
            style={{ width:"100%", padding:"12px 10px", fontSize:14, borderRadius:8, cursor:"pointer", fontFamily:"inherit", background:"#1a2a1a", border:"1px solid #22c55e88", color:"#22c55e" }}>
            📊 Çizim İstatistikleri
          </button>
        </>
      )}
    </div>
  );
}