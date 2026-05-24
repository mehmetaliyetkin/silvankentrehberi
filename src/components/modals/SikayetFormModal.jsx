import React, { useState } from "react";
import { SIKAYET_KATEGORILERI } from "../../config";

const sf = {
  label: { fontSize:11, color:"#7a80a0", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" },
  input: { width:"100%", padding:"8px 10px", background:"#0f1117", border:"1px solid #2a2f45", borderRadius:8, color:"#e8eaf0", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
};

export default function SikayetFormModal({ konum, onKaydet, onIptal }) {
  const [kategori, setKategori] = useState("yol_bozuk");
  const [baslik,   setBaslik]   = useState("");
  const [aciklama, setAciklama] = useState("");
  const [adSoyad,  setAdSoyad]  = useState("");
  const [telefon,  setTelefon]  = useState("");
  const secilenKat = SIKAYET_KATEGORILERI.find(k => k.key === kategori);

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400, backdropFilter:"blur(4px)" }}>
      <div style={{ background:"#1e2030", border:`1px solid ${secilenKat?.color}44`, borderRadius:16, padding:24, width:"min(420px,92vw)", maxHeight:"85vh", overflowY:"auto", boxShadow:`0 0 40px ${secilenKat?.color}22` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <span style={{ fontSize:24 }}>{secilenKat?.icon}</span>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#e8eaf0" }}>Şikayet / Talep Bildir</div>
            <div style={{ fontSize:11, color:"#7a80a0" }}>📍 {konum ? `${konum[1].toFixed(5)}, ${konum[0].toFixed(5)}` : "Konum seçilmedi"}</div>
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={sf.label}>Kategori</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            {SIKAYET_KATEGORILERI.map(k => (
              <button key={k.key} onClick={() => setKategori(k.key)}
                style={{ padding:"8px 6px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                  border: kategori===k.key?`1px solid ${k.color}`:"1px solid #2a2f45",
                  background: kategori===k.key?`${k.color}22`:"#0f1117",
                  color: kategori===k.key?k.color:"#7a80a0", fontSize:11,
                  display:"flex", alignItems:"center", gap:5 }}>
                <span>{k.icon}</span><span>{k.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={sf.label}>Başlık *</div>
          <input style={sf.input} placeholder="Kısa bir başlık girin" value={baslik} onChange={e => setBaslik(e.target.value)} />
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={sf.label}>Açıklama</div>
          <textarea style={{ ...sf.input, height:80, resize:"vertical" }} placeholder="Sorunu detaylıca açıklayın..." value={aciklama} onChange={e => setAciklama(e.target.value)} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          <div>
            <div style={sf.label}>Ad Soyad</div>
            <input style={sf.input} placeholder="İsteğe bağlı" value={adSoyad} onChange={e => setAdSoyad(e.target.value)} />
          </div>
          <div>
            <div style={sf.label}>Telefon</div>
            <input style={sf.input} placeholder="İsteğe bağlı" value={telefon} onChange={e => setTelefon(e.target.value)} />
          </div>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onIptal} style={{ padding:"9px 16px", background:"transparent", border:"1px solid #3a3f55", borderRadius:8, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>İptal</button>
          <button onClick={() => {
              if (!baslik.trim()) { alert("Başlık zorunludur."); return; }
              onKaydet({ kategori, baslik, aciklama, adSoyad, telefon, durum:"beklemede", tarih:new Date().toLocaleString("tr-TR") });
            }}
            style={{ padding:"9px 16px", background:secilenKat?.color||"#3b82f6", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>
            📤 Gönder
          </button>
        </div>
      </div>
    </div>
  );
}