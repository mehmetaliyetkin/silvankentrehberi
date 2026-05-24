import React, { useState } from "react";
import { kullanicilariYukle, kullanicilariKaydet } from "../../lib/auth";

const ROL_RENK  = { superadmin:"#a855f7", belediye_admin:"#3b82f6", vatandas:"#22c55e" };
const ROL_LABEL = { superadmin:"Süper Admin", belediye_admin:"Belediye Admin", vatandas:"Vatandaş" };

export default function KullaniciYonetimModal({ onKapat }) {
  const [users,     setUsers]     = useState(kullanicilariYukle());
  const [editId,    setEditId]    = useState(null);
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniAd,    setYeniAd]    = useState("");
  const [basari,    setBasari]    = useState("");
  const [hata,      setHata]      = useState("");

  const handleEdit   = (u) => { setEditId(u.id); setYeniSifre(""); setYeniAd(u.ad); setBasari(""); setHata(""); };
  const handleKaydet = (u) => {
    if (!yeniAd.trim())            { setHata("Ad boş olamaz."); return; }
    if (yeniSifre && yeniSifre.length < 6) { setHata("Şifre en az 6 karakter olmalı."); return; }
    const updated = users.map(x => x.id===u.id ? { ...x, ad:yeniAd, ...(yeniSifre?{sifre:yeniSifre}:{}) } : x);
    kullanicilariKaydet(updated); setUsers(updated);
    setEditId(null); setBasari(`${yeniAd} güncellendi.`); setHata("");
  };

  const inp = { width:"100%", padding:"7px 10px", background:"#1a1d27", border:"1px solid #2a2f45", borderRadius:6, color:"#e8eaf0", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, backdropFilter:"blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onKapat()}>
      <div style={{ background:"#1a1d27", border:"1px solid #a855f744", borderRadius:16, padding:28, width:"min(480px,92vw)", maxHeight:"80vh", overflowY:"auto" }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#e8eaf0", marginBottom:4 }}>⚡ Kullanıcı Yönetimi</div>
        <div style={{ fontSize:12, color:"#7a80a0", marginBottom:20 }}>Şifre değiştirme ve kullanıcı bilgilerini düzenleme</div>
        {basari && <div style={{ background:"#0f2a1a", border:"1px solid #22c55e44", borderRadius:8, padding:"8px 12px", color:"#22c55e", fontSize:12, marginBottom:12 }}>✅ {basari}</div>}
        {hata   && <div style={{ background:"#2a0f0f", border:"1px solid #ef444444", borderRadius:8, padding:"8px 12px", color:"#ef4444", fontSize:12, marginBottom:12 }}>⚠ {hata}</div>}
        {users.map(u => (
          <div key={u.id} style={{ background:"#0f1117", border:`1px solid ${ROL_RENK[u.rol]}33`, borderRadius:10, padding:14, marginBottom:10 }}>
            {editId === u.id ? (
              <>
                <div style={{ fontSize:11, color:ROL_RENK[u.rol], marginBottom:10, fontWeight:600 }}>✏ {ROL_LABEL[u.rol]} — {u.email}</div>
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:11, color:"#7a80a0", marginBottom:4 }}>Ad Soyad</div>
                  <input value={yeniAd} onChange={e => setYeniAd(e.target.value)} style={inp} />
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, color:"#7a80a0", marginBottom:4 }}>Yeni Şifre <span style={{color:"#4a5070"}}>(boş bırakırsan değişmez)</span></div>
                  <input type="password" value={yeniSifre} onChange={e => setYeniSifre(e.target.value)} placeholder="En az 6 karakter" style={inp} />
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => { setEditId(null); setHata(""); }} style={{ padding:"6px 12px", background:"transparent", border:"1px solid #2a2f45", borderRadius:6, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>İptal</button>
                  <button onClick={() => handleKaydet(u)} style={{ padding:"6px 12px", background:ROL_RENK[u.rol], border:"none", borderRadius:6, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:600 }}>💾 Kaydet</button>
                </div>
              </>
            ) : (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e8eaf0" }}>{u.ad}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{u.email}</div>
                  <div style={{ fontSize:10, color:ROL_RENK[u.rol], marginTop:2 }}>{ROL_LABEL[u.rol]} · {u.belediye}</div>
                </div>
                <button onClick={() => handleEdit(u)} style={{ padding:"6px 12px", background:"#21253a", border:`1px solid ${ROL_RENK[u.rol]}55`, borderRadius:6, color:ROL_RENK[u.rol], cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>✏ Düzenle</button>
              </div>
            )}
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
          <button onClick={onKapat} style={{ padding:"9px 16px", background:"transparent", border:"1px solid #2a2f45", borderRadius:8, color:"#7a80a0", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>Kapat</button>
        </div>
      </div>
    </div>
  );
}