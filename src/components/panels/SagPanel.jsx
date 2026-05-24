import React from "react";
import { SIKAYET_KATEGORILERI } from "../../config";
import { kullanicilariYukle } from "../../lib/auth";
import { saveSikayetler } from "../../lib/persistence";

export default function SagPanel({
  kullanici, canEdit, isSuperAdmin,
  selectedFeature, setSelectedFeature,
  sikayetSrcRef, hlSrcRef, mapInstanceRef,
}) {
  return (
    <div style={{ width:300, background:"#1e1e1e", color:"white", padding:15, overflowY:"auto", flexShrink:0 }}>
      <h3 style={{ margin:0, fontSize:14 }}>📍 Bilgi Paneli</h3>
      <hr style={{ borderColor:"#444", margin:"10px 0" }} />

      {selectedFeature ? (
        <div>
          {Object.entries(selectedFeature)
            .filter(([k]) => k!=="geometry" && !k.startsWith("__"))
            .map(([key, value]) => (
              <div key={key} style={{ margin:"8px 0", padding:8, background:"#2a2a2a", borderRadius:4, borderLeft:"3px solid #1976d2" }}>
                <span style={{ color:"#888", fontSize:11, textTransform:"uppercase" }}>{key}</span>
                <div style={{ fontSize:13, marginTop:2, wordBreak:"break-word" }}>{String(value??"")}</div>
              </div>
            ))}

          {canEdit && selectedFeature.__type==="sikayet" && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:11, color:"#7a80a0", marginBottom:6 }}>Durum Güncelle</div>
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
                  style={{ marginRight:4, marginBottom:4, padding:"4px 10px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                    background:selectedFeature.durum===d?"#3b82f6":"#2a2f45", border:"none",
                    color:selectedFeature.durum===d?"#fff":"#7a80a0" }}>
                  {d==="beklemede"?"🔴 Beklemede":d==="incelemede"?"🟡 İnceleniyor":"🟢 Çözüldü"}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p style={{ color:"gray", textAlign:"center", marginTop:20, fontSize:13 }}>Haritada bir obje seçin</p>
      )}

      {/* Bağlı belediyeler (sadece superadmin) */}
      {isSuperAdmin && (
        <>
          <hr style={{ borderColor:"#444", margin:"16px 0 10px" }} />
          <h4 style={{ fontSize:11, color:"#a855f7", margin:"8px 0 4px 0", textTransform:"uppercase" }}>⚡ Bağlı Belediyeler</h4>
          {kullanicilariYukle().filter(u => u.rol==="belediye_admin").map(u => (
            <div key={u.id} style={{ background:"#2a2a2a", borderRadius:6, padding:"6px 8px", marginBottom:4, fontSize:12 }}>
              <div style={{ color:"#3b82f6", fontWeight:500 }}>{u.belediye}</div>
              <div style={{ color:"#666" }}>{u.ad} · {u.email}</div>
            </div>
          ))}
        </>
      )}

      {/* Son şikayetler (admin) */}
      {canEdit && (
        <>
          <hr style={{ borderColor:"#444", margin:"16px 0 10px" }} />
          <h4 style={{ fontSize:11, color:"#ef4444", margin:"8px 0 4px 0", textTransform:"uppercase" }}>🚨 Son Şikayetler</h4>
          {(sikayetSrcRef.current?.getFeatures()?.length ?? 0) === 0 ? (
            <div style={{ color:"#555", fontSize:12 }}>Henüz şikayet yok.</div>
          ) : (
            sikayetSrcRef.current?.getFeatures().slice(-5).reverse().map((f, i) => {
              const kat = SIKAYET_KATEGORILERI.find(k => k.key===f.get("kategori")) || SIKAYET_KATEGORILERI.at(-1);
              return (
                <div key={i}
                  style={{ background:"#2a2a2a", borderRadius:6, padding:"6px 8px", marginBottom:4, borderLeft:`3px solid ${kat.color}`, cursor:"pointer" }}
                  onClick={() => {
                    const coord = f.getGeometry().getCoordinates();
                    mapInstanceRef.current?.getView().animate({ center:coord, zoom:18, duration:600 });
                    hlSrcRef.current?.clear();
                    hlSrcRef.current?.addFeature(f);
                    setSelectedFeature(f.getProperties());
                  }}>
                  <div style={{ fontSize:12, fontWeight:500, color:"#e8eaf0" }}>{kat.icon} {f.get("baslik")}</div>
                  <div style={{ fontSize:10, color:"#666" }}>{f.get("tarih")} · {f.get("durum")||"beklemede"}</div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}