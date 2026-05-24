import React, { useState } from "react";
import { kullanicilariYukle, kullanicilariKaydet } from "../../lib/auth";

export default function SifreDegistirModal({ kullanici, onKapat }) {
  const [eskiSifre, setEskiSifre] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [tekrar,    setTekrar]    = useState("");
  const [hata,      setHata]      = useState("");
  const [basari,    setBasari]    = useState(false);

  function handleKaydet() {
    setHata("");
    const users = kullanicilariYukle();
    const user  = users.find(u => u.id === kullanici.id);
    if (!user)                    { setHata("Kullanıcı bulunamadı."); return; }
    if (user.sifre !== eskiSifre) { setHata("Mevcut şifre yanlış."); return; }
    if (yeniSifre.length < 6)     { setHata("Yeni şifre en az 6 karakter olmalı."); return; }
    if (yeniSifre !== tekrar)     { setHata("Şifreler eşleşmiyor."); return; }
    user.sifre = yeniSifre;
    kullanicilariKaydet(users);
    setBasari(true);
    setTimeout(onKapat, 1500);
  }

  const inp = { width:"100%", padding:"9px 12px", background:"#0f1117", border:"1px solid #2a2f45", borderRadius:8, color:"#e8eaf0", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, backdropFilter:"blur(4px)" }}>
      <div style={{ background:"#1e2030", border:"1px solid #2a2f45", borderRadius:16, padding:28, width:"min(360px,90vw)" }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#e8eaf0", marginBottom:4 }}>🔑 Şifre Değiştir</div>
        <div style={{ fontSize:12, color:"#7a80a0", marginBottom:20 }}>{kullanici.ad} · {kullanici.email}</div>
        {basari && <div style={{ background:"#0f2a1a", border:"1px solid #22c55e44", borderRadius:8, padding:"10px 12px", color:"#22c55e", fontSize:13, marginBottom:14 }}>✅ Şifre başarıyla değiştirildi!</div>}
        {hata   && <div style={{ background:"#2a0f0f", border:"1px solid #ef444444", borderRadius:8, padding:"10px 12px", color:"#ef4444", fontSize:13, marginBottom:14 }}>⚠ {hata}</div>}
        {[
          { label:"Mevcut Şifre", val:eskiSifre, set:setEskiSifre },
          { label:"Yeni Şifre",   val:yeniSifre, set:setYeniSifre },
          { label:"Tekrar Gir",   val:tekrar,    set:setTekrar    },
        ].map(({ label, val, set }) => (
          <div key={label} style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#7a80a0", marginBottom:5 }}>{label}</div>
            <input type="password" value={val} onChange={e => set(e.target.value)} style={inp} />
          </div>
        ))}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
          <button onClick={onKapat} style={{ padding:"9px 16px", background:"transparent", border:"1px solid #2a2f45", borderRadius:8, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>İptal</button>
          <button onClick={handleKaydet} style={{ padding:"9px 16px", background:"#3b82f6", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>💾 Kaydet</button>
        </div>
      </div>
    </div>
  );
}