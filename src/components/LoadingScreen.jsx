import React, { useEffect, useState } from "react";

const ADIMLAR = [
  { icon:"🗺", text:"Harita yükleniyor..."      },
  { icon:"📍", text:"Katmanlar hazırlanıyor..."  },
  { icon:"🏙", text:"Veriler işleniyor..."       },
  { icon:"✅", text:"Hazır!"                     },
];

export default function LoadingScreen({ onFinish }) {
  const [adim,  setAdim]  = useState(0);
  const [cikis, setCikis] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setAdim(0),    800),
      setTimeout(() => setAdim(1),   1400),
      setTimeout(() => setAdim(2),   2000),
      setTimeout(() => setAdim(3),   2600),
      setTimeout(() => setCikis(true), 3200),
      setTimeout(() => onFinish(),     3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"#0a1628",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Segoe UI', Arial, sans-serif",
      opacity: cikis ? 0 : 1,
      transition:"opacity 0.6s ease",
    }}>
      {/* Grid arka plan */}
      <div style={{
        position:"absolute", inset:0, opacity:0.04,
        backgroundImage:"linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)",
        backgroundSize:"40px 40px",
      }} />

      {/* Şehir silueti */}
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
        <rect x="410" y="100" width="35"  height="80"  fill="#3b82f6"/>
        <rect x="455" y="60"  width="45"  height="120" fill="#3b82f6"/>
        <rect x="510" y="40"  width="55"  height="140" fill="#3b82f6"/>
        <rect x="575" y="80"  width="40"  height="100" fill="#3b82f6"/>
        <rect x="625" y="55"  width="50"  height="125" fill="#3b82f6"/>
        <rect x="685" y="70"  width="45"  height="110" fill="#3b82f6"/>
        <rect x="740" y="45"  width="60"  height="135" fill="#3b82f6"/>
        <line x1="0" y1="180" x2="800" y2="180" stroke="#3b82f6" strokeWidth="2"/>
      </svg>

      {/* İçerik */}
      <div style={{ position:"relative", zIndex:2, textAlign:"center" }}>

        {/* Logo */}
        <div style={{
          width:72, height:72, borderRadius:18, background:"#3b82f6",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:24, fontWeight:700, color:"#fff", fontFamily:"monospace",
          margin:"0 auto 16px",
          boxShadow:"0 0 40px #3b82f644",
          animation:"pulse 2s ease-in-out infinite",
        }}>CBS</div>

        <div style={{ fontSize:26, fontWeight:600, color:"#e8eaf0", marginBottom:6 }}>YetkinGIS</div>
        <div style={{ fontSize:13, color:"#3b6fa5", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:40 }}>
          Kent Bilgi Sistemi
        </div>

        {/* Adımlar */}
        <div style={{ marginBottom:28 }}>
          {ADIMLAR.map((a, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"8px 16px", marginBottom:6,
              borderRadius:8, width:260,
              background: i === adim ? "rgba(59,130,246,0.15)" : "transparent",
              border: i === adim ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
              opacity: i > adim ? 0.25 : 1,
              transition:"all 0.3s ease",
            }}>
              <span style={{ fontSize:18 }}>{a.icon}</span>
              <span style={{ fontSize:13, color: i === adim ? "#e8eaf0" : "#4a6fa5" }}>{a.text}</span>
              {i < adim && (
                <span style={{ marginLeft:"auto", color:"#22c55e", fontSize:14 }}>✓</span>
              )}
              {i === adim && (
                <span style={{ marginLeft:"auto" }}>
                  <span style={{
                    display:"inline-block", width:6, height:6,
                    borderRadius:"50%", background:"#3b82f6",
                    animation:"blink 0.8s ease-in-out infinite",
                  }} />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ width:260, height:3, background:"rgba(255,255,255,0.08)", borderRadius:4, overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:4,
            background:"linear-gradient(90deg, #3b82f6, #22c55e)",
            width:`${((adim + 1) / ADIMLAR.length) * 100}%`,
            transition:"width 0.5s ease",
          }} />
        </div>
        <div style={{ fontSize:11, color:"#3b6fa5", marginTop:8 }}>
          {Math.round(((adim + 1) / ADIMLAR.length) * 100)}%
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 40px #3b82f644; }
          50%       { box-shadow: 0 0 60px #3b82f688; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}