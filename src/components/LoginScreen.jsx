import React, { useState } from "react";
import { loginRequest } from "../lib/auth";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata,  setHata]  = useState("");
  const [yuk,   setYuk]   = useState(false);
  const isMobileLogin = window.innerWidth < 640;

  async function handleLogin() {
    if (!email.trim()) { setHata("E-posta giriniz"); return; }
    setYuk(true); setHata("");
    try { const user = await loginRequest(email.trim(), sifre); onLogin(user); }
    catch (e) { setHata(e.message); }
    finally { setYuk(false); }
  }

  const vatandasGiris = () => onLogin({ id:0, ad:"Vatandaş", email:"", sifre:"", rol:"vatandas", belediye:"Silvan" });

  if (isMobileLogin) return <MobileLogin email={email} setEmail={setEmail} sifre={sifre} setSifre={setSifre} hata={hata} yuk={yuk} handleLogin={handleLogin} vatandasGiris={vatandasGiris} />;
  return <DesktopLogin email={email} setEmail={setEmail} sifre={sifre} setSifre={setSifre} hata={hata} yuk={yuk} handleLogin={handleLogin} vatandasGiris={vatandasGiris} />;
}

// ── Ortak arka plan elemanları ─────────────────────────────────────────────
function GridBg({ size = 40 }) {
  return (
    <div style={{
      position:"absolute", inset:0, opacity:0.04,
      backgroundImage:"linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)",
      backgroundSize:`${size}px ${size}px`,
    }} />
  );
}

function SilhouetteMobile() {
  return (
    <svg style={{ position:"absolute", bottom:0, left:0, right:0, opacity:0.07 }}
      viewBox="0 0 400 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
      <rect x="0"   y="50"  width="35" height="90"  fill="#3b82f6"/>
      <rect x="8"   y="34"  width="19" height="16"  fill="#3b82f6"/>
      <rect x="45"  y="70"  width="28" height="70"  fill="#3b82f6"/>
      <rect x="83"  y="30"  width="42" height="110" fill="#3b82f6"/>
      <rect x="92"  y="14"  width="24" height="16"  fill="#3b82f6"/>
      <rect x="135" y="55"  width="32" height="85"  fill="#3b82f6"/>
      <rect x="177" y="20"  width="40" height="120" fill="#3b82f6"/>
      <rect x="186" y="4"   width="22" height="16"  fill="#3b82f6"/>
      <rect x="227" y="62"  width="30" height="78"  fill="#3b82f6"/>
      <rect x="267" y="38"  width="36" height="102" fill="#3b82f6"/>
      <rect x="276" y="22"  width="18" height="16"  fill="#3b82f6"/>
      <rect x="313" y="75"  width="28" height="65"  fill="#3b82f6"/>
      <rect x="351" y="44"  width="38" height="96"  fill="#3b82f6"/>
      <line x1="0" y1="140" x2="400" y2="140" stroke="#3b82f6" strokeWidth="2"/>
    </svg>
  );
}

function SilhouetteDesktop() {
  return (
    <svg style={{ position:"absolute", bottom:0, left:0, right:0, opacity:0.08 }}
      viewBox="0 0 800 180" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
      <rect x="0"   y="60"  width="50"  height="120" fill="#3b82f6"/>
      <rect x="10"  y="40"  width="30"  height="20"  fill="#3b82f6"/>
      <rect x="60"  y="90"  width="40"  height="90"  fill="#3b82f6"/>
      <rect x="110" y="40"  width="60"  height="140" fill="#3b82f6"/>
      <rect x="120" y="20"  width="40"  height="20"  fill="#3b82f6"/>
      <rect x="180" y="70"  width="45"  height="110" fill="#3b82f6"/>
      <rect x="235" y="30"  width="55"  height="150" fill="#3b82f6"/>
      <rect x="245" y="10"  width="35"  height="20"  fill="#3b82f6"/>
      <rect x="300" y="80"  width="40"  height="100" fill="#3b82f6"/>
      <rect x="350" y="50"  width="50"  height="130" fill="#3b82f6"/>
      <rect x="360" y="30"  width="30"  height="20"  fill="#3b82f6"/>
      <rect x="410" y="100" width="35"  height="80"  fill="#3b82f6"/>
      <rect x="455" y="60"  width="45"  height="120" fill="#3b82f6"/>
      <rect x="510" y="40"  width="55"  height="140" fill="#3b82f6"/>
      <rect x="520" y="20"  width="35"  height="20"  fill="#3b82f6"/>
      <rect x="575" y="80"  width="40"  height="100" fill="#3b82f6"/>
      <rect x="625" y="55"  width="50"  height="125" fill="#3b82f6"/>
      <rect x="685" y="70"  width="45"  height="110" fill="#3b82f6"/>
      <rect x="740" y="45"  width="60"  height="135" fill="#3b82f6"/>
      <line x1="0" y1="180" x2="800" y2="180" stroke="#3b82f6" strokeWidth="2"/>
    </svg>
  );
}

function EmailSifreInputs({ email, setEmail, sifre, setSifre, handleLogin, fontSize = 13, padding = "9px 12px" }) {
  const inp = {
    width:"100%", padding, background:"rgba(255,255,255,0.06)",
    border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:8,
    color:"#e8eaf0", fontSize, outline:"none", boxSizing:"border-box", fontFamily:"inherit",
  };
  return (
    <>
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:"#4a6fa5", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>E-posta</div>
        <input type="email" placeholder="admin@belediye.bel.tr" value={email}
          onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} style={inp} />
      </div>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:"#4a6fa5", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Şifre</div>
        <input type="password" placeholder="••••••••" value={sifre}
          onChange={e => setSifre(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} style={inp} />
      </div>
    </>
  );
}

// ── Mobil layout ───────────────────────────────────────────────────────────
function MobileLogin({ email, setEmail, sifre, setSifre, hata, yuk, handleLogin, vatandasGiris }) {
  return (
    <div style={{ width:"100vw", height:"100vh", background:"#0a1628", display:"flex", flexDirection:"column",
      fontFamily:"'Segoe UI', Arial, sans-serif", color:"white", overflow:"hidden", position:"relative" }}>
      <GridBg size={32} />
      <SilhouetteMobile />
      <div style={{ position:"relative", zIndex:2, padding:"36px 28px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:"#3b82f6", display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", fontFamily:"monospace", letterSpacing:"-1px" }}>CBS</div>
          <div>
            <div style={{ fontSize:17, fontWeight:600, color:"#e8eaf0" }}>YetkinGIS</div>
            <div style={{ fontSize:10, color:"#3b6fa5", textTransform:"uppercase", letterSpacing:"0.08em" }}>Kent Bilgi Sistemi</div>
          </div>
        </div>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:22, fontWeight:500, color:"#e8eaf0", marginBottom:6 }}>Şehrinizi Keşfedin</div>
          <div style={{ fontSize:13, color:"#4a6fa5" }}>Harita ve kent hizmetlerine kolayca erişin</div>
        </div>
        <button onClick={vatandasGiris} style={{ width:"100%", padding:"14px 16px", background:"#3b82f6", color:"#fff",
          border:"none", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:10 }}>
          🗺 Haritayı Aç — Giriş Gerekmez
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"14px 0", color:"#2a4060", fontSize:12 }}>
          <div style={{ flex:1, height:"0.5px", background:"#1a2f4a" }} />yetkili girişi<div style={{ flex:1, height:"0.5px", background:"#1a2f4a" }} />
        </div>
        {hata && <div style={{ background:"#2a0f0f", border:"1px solid #ef444444", borderRadius:8, padding:"10px 12px", color:"#ef4444", fontSize:12, marginBottom:12 }}>⚠ {hata}</div>}
        <EmailSifreInputs email={email} setEmail={setEmail} sifre={sifre} setSifre={setSifre} handleLogin={handleLogin} fontSize={14} padding="11px 12px" />
        <button onClick={handleLogin} disabled={yuk} style={{ width:"100%", padding:"11px 16px",
          background:"rgba(59,130,246,0.15)", color:"#60a5fa", border:"0.5px solid rgba(59,130,246,0.3)",
          borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:yuk?0.6:1 }}>
          🔐 {yuk ? "Giriş yapılıyor..." : "Yetkili Girişi"}
        </button>
      </div>
    </div>
  );
}

// ── Masaüstü layout ────────────────────────────────────────────────────────
function DesktopLogin({ email, setEmail, sifre, setSifre, hata, yuk, handleLogin, vatandasGiris }) {
  return (
    <div style={{ width:"100vw", height:"100vh", background:"#0a1628", display:"flex", alignItems:"center",
      justifyContent:"center", fontFamily:"'Segoe UI', Arial, sans-serif", color:"white", overflow:"hidden", position:"relative" }}>
      <GridBg size={40} />
      <SilhouetteDesktop />
      <div style={{ position:"relative", zIndex:2, width:"min(760px, 92vw)" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:32 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"#3b82f6", display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:15, fontWeight:700, color:"#fff", fontFamily:"monospace", letterSpacing:"-1px" }}>CBS</div>
          <div>
            <div style={{ fontSize:18, fontWeight:500, color:"#e8eaf0" }}>YetkinGIS</div>
            <div style={{ fontSize:11, color:"#3b6fa5", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:1 }}>Kent Bilgi Sistemi</div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16, alignItems:"start" }}>
          {/* Sol — Vatandaş */}
          <div style={{ background:"#fff", borderRadius:16, padding:28, border:"0.5px solid rgba(59,130,246,0.3)" }}>
            <div style={{ fontSize:11, fontWeight:500, color:"#3b82f6", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>👥 Vatandaş Girişi</div>
            <div style={{ fontSize:18, fontWeight:500, color:"#0f1729", marginBottom:20 }}>Hesap gerektirmez</div>
            <button onClick={vatandasGiris} style={{ width:"100%", padding:"12px 16px", background:"#3b82f6", color:"#fff",
              border:"none", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:16 }}>
              🗺 Haritayı Aç
            </button>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {["Parsel ve mahalle sorgulama","Şikayet ve talep bildirme","Nöbetçi eczane bulma","Rota hesaplama"].map(item => (
                <div key={item} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#374151" }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#3b82f6", flexShrink:0 }} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Sağ — Yetkili */}
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:16, padding:24, border:"0.5px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize:11, fontWeight:500, color:"#4a6fa5", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>🔒 Yetkili Girişi</div>
            <div style={{ fontSize:15, fontWeight:500, color:"#9eb4cc", marginBottom:18 }}>Belediye / Admin</div>
            {hata && <div style={{ background:"#2a0f0f", border:"1px solid #ef444444", borderRadius:8, padding:"8px 10px", color:"#ef4444", fontSize:11, marginBottom:12 }}>⚠ {hata}</div>}
            <EmailSifreInputs email={email} setEmail={setEmail} sifre={sifre} setSifre={setSifre} handleLogin={handleLogin} />
            <button onClick={handleLogin} disabled={yuk} style={{ width:"100%", padding:"10px 14px",
              background:"rgba(59,130,246,0.15)", color:"#60a5fa", border:"0.5px solid rgba(59,130,246,0.3)",
              borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", justifyContent:"center", gap:7, opacity:yuk?0.6:1 }}>
              🔐 {yuk ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}