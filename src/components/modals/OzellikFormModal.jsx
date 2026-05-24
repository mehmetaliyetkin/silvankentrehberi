import React, { useState } from "react";

const sf = {
  label: { fontSize:11, color:"#7a80a0", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" },
  input: { width:"100%", padding:"8px 10px", background:"#0f1117", border:"1px solid #2a2f45", borderRadius:8, color:"#e8eaf0", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
};

const KATMAN_ALANLARI = {
  parsel:    [{ ad:"ada_no", label:"Ada No", tip:"text" },{ ad:"parsel_no", label:"Parsel No", tip:"text" },{ ad:"alan_m2", label:"Alan (m²)", tip:"number" },{ ad:"malik", label:"Malik", tip:"text" }],
  yapi:      [{ ad:"yapi_adi", label:"Yapı Adı", tip:"text" },{ ad:"kat_sayisi", label:"Kat Sayısı", tip:"number" },{ ad:"yapi_turu", label:"Yapı Türü", tip:"select", secenekler:["Konut","Ticari","Kamu","Dini","Sanayi","Diğer"] }],
  mahalle:   [{ ad:"AD", label:"Mahalle Adı", tip:"text" },{ ad:"nufus", label:"Nüfus", tip:"number" }],
  yol:       [{ ad:"yol_adi", label:"Yol Adı", tip:"text" },{ ad:"yol_tipi", label:"Yol Tipi", tip:"select", secenekler:["Bulvar","Cadde","Sokak","Ara Yol"] },{ ad:"uzunluk_m", label:"Uzunluk (m)", tip:"number" }],
  numarataj: [{ ad:"kapi_no", label:"Kapı No", tip:"text" },{ ad:"daire_no", label:"Daire No", tip:"text" },{ ad:"adres", label:"Adres", tip:"text" }],
};

export default function OzellikFormModal({ ozellikForm, katmanDefs, onKaydet, onIptal }) {
  const katman  = katmanDefs.find(d => d.key === ozellikForm.katmanKey) || katmanDefs[0];
  const alanlar = KATMAN_ALANLARI[ozellikForm.katmanKey] || [{ ad:"aciklama", label:"Açıklama", tip:"text" }];
  const [degerler, setDegerler] = useState(() => Object.fromEntries(alanlar.map(a => [a.ad, ""])));

  return (
    <div style={{ position:"fixed", inset:0, background:"#000b", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(4px)" }}>
      <div style={{ background:"#1e2030", border:`1px solid ${katman.color}44`, borderRadius:14, padding:24, width:"min(380px,92vw)", maxHeight:"85vh", overflowY:"auto", boxShadow:`0 0 32px ${katman.color}22` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
          <div style={{ width:12, height:12, borderRadius:"50%", background:katman.color, flexShrink:0 }} />
          <div style={{ fontSize:15, fontWeight:600, color:"#e8eaf0" }}>{katman.label} — Öznitelik Gir</div>
        </div>
        {alanlar.map(alan => (
          <div key={alan.ad} style={{ marginBottom:12 }}>
            <label style={{ ...sf.label, display:"block" }}>{alan.label}</label>
            {alan.tip === "select" ? (
              <select value={degerler[alan.ad]||""} onChange={e => setDegerler(d => ({ ...d, [alan.ad]:e.target.value }))} style={sf.input}>
                <option value="">Seçin...</option>
                {alan.secenekler.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input type={alan.tip} placeholder={`${alan.label} girin`} value={degerler[alan.ad]||""} onChange={e => setDegerler(d => ({ ...d, [alan.ad]:e.target.value }))} style={sf.input} />
            )}
          </div>
        ))}
        <div style={{ marginBottom:16 }}>
          <label style={{ ...sf.label, display:"block" }}>Not (opsiyonel)</label>
          <textarea placeholder="Ek açıklama..." value={degerler.not||""} onChange={e => setDegerler(d => ({ ...d, not:e.target.value }))} style={{ ...sf.input, height:60, resize:"vertical" }} />
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onIptal} style={{ padding:"8px 16px", background:"transparent", border:"1px solid #3a3f55", borderRadius:7, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>İptal</button>
          <button onClick={() => onKaydet(degerler)} style={{ padding:"8px 16px", background:katman.color, border:"none", borderRadius:7, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>✓ Kaydet</button>
        </div>
      </div>
    </div>
  );
}