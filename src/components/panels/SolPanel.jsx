import React from "react";
import { LAYER_DEFS, POI_CATEGORIES } from "../../config";
import { saveCizimler } from "../../lib/persistence";

const ss = {
  h4:        { fontSize:11, color:"#aaa", margin:"8px 0 4px 0", textTransform:"uppercase", letterSpacing:"0.5px" },
  hr:        { borderColor:"#444", margin:"8px 0" },
  input:     { width:"100%", padding:8, borderRadius:4, border:"1px solid #555", background:"#444", color:"white", fontSize:12, boxSizing:"border-box" },
  results:   { maxHeight:200, overflowY:"auto", background:"#3a3a3a", borderRadius:4, marginTop:4, fontSize:11 },
  resultItem:{ padding:"6px 8px", cursor:"pointer", borderBottom:"1px solid #555", color:"#ddd" },
  tag:       { background:"#1976d2", color:"#fff", fontSize:9, padding:"1px 5px", borderRadius:3, marginRight:6, textTransform:"uppercase" },
  btn:       { padding:"6px 10px", background:"#444", color:"white", border:"1px solid #555", borderRadius:4, cursor:"pointer", fontSize:12, marginBottom:4, textAlign:"left", width:"100%" },
  btnActive: { background:"#1976d2", borderColor:"#1976d2" },
  layerRow:  { display:"flex", alignItems:"center", gap:6, padding:"3px 0", cursor:"pointer", fontSize:13 },
  loadingDot:{ fontSize:10, color:"#1976d2", marginLeft:"auto" },
};

const ROL_RENK  = { superadmin:"#a855f7", belediye_admin:"#3b82f6", vatandas:"#22c55e" };
const ROL_LABEL = { superadmin:"⚡ Süper Admin", belediye_admin:"🔧 Belediye Admin", vatandas:"👤 Vatandaş" };
const DRAW_TOOLS = [
  { id:"Point",      label:"📍 Nokta"  },
  { id:"LineString", label:"📏 Çizgi"  },
  { id:"Polygon",    label:"⬡ Alan"    },
  { id:"erase",      label:"🗑 Sil"    },
];

export default function SolPanel(props) {
  const {
    kullanici, onCikis, canEdit, isSuperAdmin,
    sikayetMod, setSikayetMod, rotaMod, setRotaMod,
    rotaAdim, rotaBilgi, rotaYukleniyor,
    showNobetci,
    searchText, setSearchText, searchResults, zoomToFeature,
    addressQuery, setAddressQuery, addressResults, addressLoading, goToAddress,
    selectedMahalle, mahalleList, handleMahalleChange,
    filterByMahalle, setFilterByMah,
    baseMap, setBaseMap,
    layerVisibility, setLayerVis,
    loading, activeCategories, setActiveCats,
    drawTool, setDrawTool, cizimKatman, setCizimKatman,
    drawCount, katmanSrcRef, drawSrcRef,
    undoRedo, geomDuzenle,
    setShowModal, setShowLayerOrder, setShowStats,
    setShowSifreDegistir, setShowKullaniciYon,
    // ── YENİ ──
    setShowTKGM, setShowHavaDurumu, setShowStreetView,
    routeMode, temizleRota,
    isMobile, setMobileSideOpen,
    LS_KEYS,
  } = props;

  return (
    <div style={{ width:265, minWidth:265, background:"#2c2c2c", color:"white", padding:12, display:"flex", flexDirection:"column", gap:4, overflowY:"auto" }}>

      {/* ── Profil ── */}
      <div style={{ marginBottom:8 }}>
        <h3 style={{ margin:"0 0 2px 0", fontSize:15 }}>YetkinGIS</h3>
        <div style={{ fontSize:10, color:"#888", marginBottom:6 }}>Yerel veri</div>
        <div style={{ background:"#333", borderRadius:6, padding:"6px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600 }}>{kullanici.ad}</div>
            <div style={{ fontSize:10, color:ROL_RENK[kullanici.rol] }}>{ROL_LABEL[kullanici.rol]}</div>
            <div style={{ fontSize:10, color:"#666" }}>{kullanici.belediye}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <button onClick={onCikis} style={{ background:"transparent", border:"1px solid #555", borderRadius:4, color:"#aaa", fontSize:11, cursor:"pointer", padding:"3px 6px" }}>Çıkış</button>
            {canEdit && <button onClick={() => setShowSifreDegistir(true)} style={{ background:"transparent", border:"1px solid #3b82f655", borderRadius:4, color:"#3b82f6", fontSize:10, cursor:"pointer", padding:"2px 6px" }}>🔑 Şifre</button>}
            {isSuperAdmin && <button onClick={() => setShowKullaniciYon(true)} style={{ background:"transparent", border:"1px solid #a855f755", borderRadius:4, color:"#a855f7", fontSize:10, cursor:"pointer", padding:"2px 6px" }}>👥 Kullanıcılar</button>}
          </div>
        </div>
      </div>

      {/* ── Vatandaş Araçları ── */}
      <hr style={ss.hr} />
      <h4 style={ss.h4}>Vatandaş Araçları</h4>

      <button onClick={showNobetci}
        style={{ ...ss.btn, background:"#0f2a1a", border:"1px solid #22c55e44", color:"#22c55e", textAlign:"center" }}>
        💊 Nöbetçi Eczane Bul
      </button>

      <button
        onClick={() => {
          if (sikayetMod) { setSikayetMod(false); }
          else { setSikayetMod(true); setRotaMod(false); temizleRota(); setDrawTool(null); geomDuzenle.temizle(); }
        }}
        style={{ ...ss.btn, textAlign:"center",
          background:sikayetMod?"#ef444422":"#444", border:sikayetMod?"1px solid #ef4444":"1px solid #555",
          color:sikayetMod?"#ef4444":"#ccc" }}>
        🚨 {sikayetMod ? "Şikayet Modu Aktif — İptal" : "Şikayet / Talep Bildir"}
      </button>
      {sikayetMod && (
        <div style={{ fontSize:11, color:"#f59e0b", padding:"5px 8px", background:"#2a1f0a", borderRadius:6, marginBottom:6, border:"1px solid #f59e0b44" }}>
          Haritada şikayet lokasyonuna tıklayın
        </div>
      )}

      <button
        onClick={() => {
          if (rotaMod) { temizleRota(); }
          else { setRotaMod(true); setSikayetMod(false); routeMode.current="start"; props.setRotaAdim?.("start"); setDrawTool(null); geomDuzenle.temizle(); }
        }}
        style={{ ...ss.btn, textAlign:"center",
          background:rotaMod?"#3b82f622":"#444", border:rotaMod?"1px solid #3b82f6":"1px solid #555",
          color:rotaMod?"#3b82f6":"#ccc" }}>
        🗺 {rotaMod ? "Rota Modundan Çık" : "Rota Hesapla"}
      </button>
      {rotaMod && (
        <div style={{ background:"#0f1729", border:"1px solid #3b82f644", borderRadius:8, padding:"8px 10px", marginBottom:6, fontSize:11 }}>
          {rotaAdim==="start" && <div style={{ color:"#22c55e" }}>📍 Başlangıç noktasına tıklayın (A)</div>}
          {rotaAdim==="end"   && <div style={{ color:"#ef4444" }}>📍 Bitiş noktasına tıklayın (B)</div>}
          {rotaAdim==="ready" && rotaYukleniyor && <div style={{ color:"#f59e0b" }}>⏳ Rota hesaplanıyor...</div>}
          {rotaBilgi && (
            <div style={{ color:"#e8eaf0" }}>
              <div>📏 Mesafe: <strong style={{ color:"#3b82f6" }}>{rotaBilgi.mesafe} km</strong></div>
              <div>⏱ Süre: <strong style={{ color:"#3b82f6" }}>{rotaBilgi.sure} dk</strong></div>
              <button
                onClick={() => { temizleRota(); setRotaMod(true); routeMode.current="start"; props.setRotaAdim?.("start"); }}
                style={{ marginTop:6, padding:"4px 10px", background:"#3b82f633", border:"1px solid #3b82f6", borderRadius:6, color:"#3b82f6", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>
                ↺ Yeni Rota
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Dış Servisler ── */}
      <hr style={ss.hr} />
      <h4 style={ss.h4}>Dış Servisler</h4>
      <button onClick={() => setShowTKGM(true)}
        style={{ ...ss.btn, background:"#0f1729", border:"1px solid #3b82f644", color:"#3b82f6", textAlign:"center" }}>
        🏛 TKGM Parsel Sorgula
      </button>
      <button onClick={() => setShowHavaDurumu(true)}
        style={{ ...ss.btn, background:"#1a1a0f", border:"1px solid #f59e0b44", color:"#f59e0b", textAlign:"center" }}>
        🌤 Hava Durumu
      </button>
      <button onClick={() => setShowStreetView(true)}
        style={{ ...ss.btn, background:"#1a0f29", border:"1px solid #a855f744", color:"#a855f7", textAlign:"center" }}>
        🏙 Sokak Görünümü
      </button>

      {/* ── Veri Arama ── */}
      <h4 style={ss.h4}>Veri Arama</h4>
      <input type="text" placeholder="Parsel, mahalle, yol..." value={searchText}
        onChange={e => setSearchText(e.target.value)} style={ss.input} />
      {searchResults.length > 0 && (
        <div style={ss.results}>
          {searchResults.map((item, idx) => (
            <div key={idx}
              onClick={() => { zoomToFeature(item.feature); if (isMobile) setMobileSideOpen(false); }}
              style={ss.resultItem}
              onMouseEnter={e => e.currentTarget.style.background="#555"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <span style={ss.tag}>{item.layerKey}</span>{item.label.substring(0,28)}
            </div>
          ))}
        </div>
      )}

      {/* ── Adres Arama ── */}
      <h4 style={ss.h4}>Adres Arama</h4>
      <input type="text" placeholder="Sokak, mahalle, yer adı..." value={addressQuery}
        onChange={e => setAddressQuery(e.target.value)} style={ss.input} />
      {addressLoading && <div style={{ fontSize:10, color:"#aaa", padding:"4px 0" }}>🔍 Aranıyor...</div>}
      {addressResults.length > 0 && (
        <div style={ss.results}>
          {addressResults.map((item, idx) => (
            <div key={item.place_id||idx}
              onClick={() => { goToAddress(item); if (isMobile) setMobileSideOpen(false); }}
              style={ss.resultItem}
              onMouseEnter={e => e.currentTarget.style.background="#555"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <div style={{ color:"#4fc3f7", fontWeight:500 }}>{item.display_name.split(",")[0]}</div>
              <div style={{ color:"#888", fontSize:10 }}>{item.display_name.split(",").slice(1,3).join(",")}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Mahalle ── */}
      <h4 style={ss.h4}>Mahalle</h4>
      <select value={selectedMahalle} onChange={e => handleMahalleChange(e.target.value)} style={ss.input}>
        <option value="">Tüm Mahalleler</option>
        {mahalleList.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      {selectedMahalle && (
        <label style={{ ...ss.layerRow, color:"#4fc3f7", marginTop:4 }}>
          <input type="checkbox" checked={filterByMahalle} onChange={e => setFilterByMah(e.target.checked)} />
          <span>Sadece bu mahalle</span>
        </label>
      )}

      {/* ── Altlık ── */}
      <hr style={ss.hr} />
      <h4 style={ss.h4}>Altlık</h4>
      <button onClick={() => setBaseMap("osm")}  style={{ ...ss.btn, ...(baseMap==="osm"  ? ss.btnActive : {}) }}>🗺️ OSM</button>
      <button onClick={() => setBaseMap("uydu")} style={{ ...ss.btn, ...(baseMap==="uydu" ? ss.btnActive : {}) }}>🛰️ Uydu</button>

      {/* ── Katmanlar ── */}
      <hr style={ss.hr} />
      <h4 style={ss.h4}>Katmanlar</h4>
      {[
        ...LAYER_DEFS,
        { key:"poi",     label:"POI",            color:"#ffffff" },
        { key:"sikayet", label:"Şikayetler",     color:"#ef4444" },
        { key:"nobetci", label:"Nöbetçi Eczane", color:"#22c55e" },
        { key:"cizim",   label:"Çizimler",       color:"#ff6600" },
        { key:"import",  label:"İçe Aktarılan",  color:"#f59e0b" },
      ].map(({ key, label, color }) => (
        <label key={key} style={ss.layerRow}>
          <input type="checkbox" checked={layerVisibility[key]!==false}
            onChange={e => setLayerVis(st => ({ ...st, [key]:e.target.checked }))} />
          <span style={{ color }}>■</span>
          <span>{label}</span>
          {loading[key] && <span style={ss.loadingDot}>...</span>}
        </label>
      ))}

      {/* ── POI Kategorileri ── */}
      {layerVisibility.poi && (
        <>
          <hr style={ss.hr} />
          <h4 style={ss.h4}>POI Kategorileri</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
            {POI_CATEGORIES.map(cat => (
              <label key={cat.key}
                style={{ ...ss.layerRow, fontSize:11, padding:"3px 4px", background:activeCategories[cat.key]?"#3a3a3a":"transparent", borderRadius:3 }}>
                <input type="checkbox" checked={activeCategories[cat.key]}
                  onChange={() => setActiveCats(s => ({ ...s, [cat.key]:!s[cat.key] }))} />
                <span style={{ display:"inline-block", width:14, height:14, borderRadius:"50%", background:cat.color, color:"#fff", fontSize:9, textAlign:"center", lineHeight:"14px", fontWeight:"bold" }}>
                  {cat.symbol}
                </span>
                <span>{cat.label}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* ── Çizim Araçları ── */}
      {canEdit && (
        <>
          <hr style={ss.hr} />
          <h4 style={ss.h4}>Çizim Araçları</h4>

          <div style={{ display:"flex", gap:4, marginBottom:8 }}>
            <button onClick={() => { undoRedo.undo(); setTimeout(() => saveCizimler(katmanSrcRef, drawSrcRef), 50); }}
              style={{ flex:1, padding:"6px 4px", fontSize:11, borderRadius:6, cursor:"pointer", fontFamily:"inherit", border:"1px solid #555", background:"#444", color:"#ccc" }}>
              ↩ Geri Al
            </button>
            <button onClick={() => { undoRedo.redo(); setTimeout(() => saveCizimler(katmanSrcRef, drawSrcRef), 50); }}
              style={{ flex:1, padding:"6px 4px", fontSize:11, borderRadius:6, cursor:"pointer", fontFamily:"inherit", border:"1px solid #555", background:"#444", color:"#ccc" }}>
              ↪ İleri Al
            </button>
          </div>

          <div style={{ background:"#1a2535", border:"1px solid #facc1544", borderRadius:8, padding:"10px 10px", marginBottom:10 }}>
            <div style={{ fontSize:10, color:"#facc15", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:600 }}>
              ✏ Geometri Düzenle / Taşı
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {[
                { mod:"modify",    label:"✏ Düzenle" },
                { mod:"translate", label:"↔ Taşı"    },
              ].map(({ mod, label }) => (
                <button key={mod}
                  onClick={() => { setDrawTool(null); setSikayetMod(false); setRotaMod(false); geomDuzenle.aktifEt(mod); }}
                  style={{ padding:"8px 6px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                    border:geomDuzenle.mod===mod?"1px solid #facc15":"1px solid #334155",
                    background:geomDuzenle.mod===mod?"#facc1522":"#0f1729",
                    color:geomDuzenle.mod===mod?"#facc15":"#7a80a0",
                    display:"flex", alignItems:"center", gap:5, justifyContent:"center" }}>
                  {label}
                </button>
              ))}
            </div>
            {geomDuzenle.mod && (
              <div style={{ fontSize:10, color:"#fbbf24", marginTop:8, background:"#2a1f0a", padding:"5px 8px", borderRadius:6 }}>
                {geomDuzenle.mod==="modify" ? "🖱 Noktayı sürükleyerek geometriyi düzenle." : "✋ Objeye tıkla, sürükleyerek taşı."}
                <div style={{ marginTop:4 }}>
                  <button onClick={geomDuzenle.temizle}
                    style={{ fontSize:10, padding:"3px 8px", background:"#ef444422", border:"1px solid #ef4444", borderRadius:4, color:"#ef4444", cursor:"pointer", fontFamily:"inherit" }}>
                    ✕ Modu Kapat
                  </button>
                </div>
              </div>
            )}
            {geomDuzenle.secilenInfo && (
              <div style={{ fontSize:10, color:"#94a3b8", marginTop:6, background:"#0f1729", padding:"5px 8px", borderRadius:6 }}>
                <div style={{ color:"#facc15", marginBottom:3 }}>Seçilen:</div>
                {Object.entries(geomDuzenle.secilenInfo)
                  .filter(([k]) => !k.startsWith("__") && k!=="geometry")
                  .slice(0,3).map(([k,v]) => (
                    <div key={k}>{k}: <span style={{ color:"#e8eaf0" }}>{String(v).substring(0,20)}</span></div>
                  ))}
              </div>
            )}
          </div>

          <div style={{ fontSize:10, color:"#7a80a0", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>1. Katman Seç</div>
          <div style={{ marginBottom:10 }}>
            {LAYER_DEFS.map(def => (
              <button key={def.key} onClick={() => setCizimKatman(def.key)}
                style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"6px 8px", marginBottom:3, borderRadius:6, cursor:"pointer",
                  border:cizimKatman===def.key?`1px solid ${def.color}`:"1px solid #444",
                  background:cizimKatman===def.key?`${def.color}18`:"#383838",
                  color:cizimKatman===def.key?def.color:"#aaa", fontSize:12, fontFamily:"inherit", textAlign:"left" }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:def.color, flexShrink:0, display:"inline-block" }} />
                {def.label}
                {cizimKatman===def.key && <span style={{ marginLeft:"auto", fontSize:10 }}>✓</span>}
              </button>
            ))}
          </div>

          <div style={{ fontSize:10, color:"#7a80a0", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>2. Çizim Aracı Seç</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:8 }}>
            {DRAW_TOOLS.map(({ id, label }) => {
              const kat  = LAYER_DEFS.find(d => d.key === cizimKatman);
              const renk = kat?.color || "#1976d2";
              return (
                <button key={id} onClick={() => setDrawTool(drawTool===id ? null : id)}
                  style={{ padding:"6px 4px", fontSize:11, textAlign:"center", borderRadius:6, cursor:"pointer", fontFamily:"inherit",
                    border:drawTool===id?`1px solid ${renk}`:"1px solid #555",
                    background:drawTool===id?`${renk}22`:"#444",
                    color:drawTool===id?renk:"#ccc" }}>
                  {label}
                </button>
              );
            })}
          </div>

          {drawTool && drawTool!=="erase" && (() => {
            const kat = LAYER_DEFS.find(d => d.key===cizimKatman);
            return (
              <div style={{ fontSize:11, padding:"6px 8px", borderRadius:6, marginBottom:8,
                background:`${kat?.color||"#1976d2"}18`, border:`1px solid ${kat?.color||"#1976d2"}44`,
                color:kat?.color||"#4fc3f7" }}>
                <div style={{ fontWeight:600, marginBottom:2 }}>{kat?.label} katmanına çiziyorsun</div>
                <div style={{ fontSize:10, opacity:0.8 }}>
                  {drawTool==="Point"&&"Tıkla → öznitelik gir → kaydet"}
                  {drawTool==="LineString"&&"Tıkla çiz → çift tıkla bitir → öznitelik gir"}
                  {drawTool==="Polygon"&&"Tıkla çiz → ilk noktaya dön → öznitelik gir"}
                </div>
              </div>
            );
          })()}
          {drawTool==="erase" && (
            <div style={{ fontSize:11, color:"#ff6666", padding:"5px 8px", background:"#3a1a1a", borderRadius:6, marginBottom:8 }}>
              Silmek istediğin çizime tıkla
            </div>
          )}

          <div style={{ fontSize:11, color:"#555", marginBottom:8 }}>
            Toplam {drawCount} çizim · <span style={{ color:"#22c55e", fontSize:10 }}>💾 Otomatik kaydediliyor</span>
          </div>

          <button
            onClick={() => {
              Object.values(katmanSrcRef.current).forEach(src => src.clear());
              drawSrcRef.current?.clear();
              localStorage.removeItem(LS_KEYS.cizimler);
            }}
            style={{ ...ss.btn, color:"#ff6666", borderColor:"#ff6666" }}>
            🗑 Tüm Çizimleri Temizle
          </button>
          <button onClick={() => setShowModal(true)}      style={{ ...ss.btn, background:"#1976d2", borderColor:"#1976d2", color:"white" }}>📦 GeoJSON Import / Export</button>
          <button onClick={() => setShowLayerOrder(true)} style={{ ...ss.btn, background:"#374151", borderColor:"#555", color:"#ccc" }}>🗂 Katman Sıralama</button>
          <button onClick={() => setShowStats(true)}      style={{ ...ss.btn, background:"#1a2a1a", borderColor:"#22c55e88", color:"#22c55e" }}>📊 Çizim İstatistikleri</button>
        </>
      )}

      {!canEdit && (
        <div style={{ fontSize:11, color:"#666", marginTop:8, padding:6, background:"#333", borderRadius:4 }}>
          Çizim ve veri yönetimi için belediye hesabıyla giriş yapın.
        </div>
      )}
    </div>
  );
}