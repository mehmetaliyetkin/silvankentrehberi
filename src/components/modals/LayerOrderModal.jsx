import React, { useState, useRef } from "react";
import { LAYER_DEFS } from "../../config";

const ms = {
  primary: { padding:"9px 16px", background:"#3b82f6", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13 },
  ghost:   { padding:"9px 16px", background:"transparent", color:"#7a80a0", border:"1px solid #2a2f45", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13 },
};

const ALL_LAYER_META = [
  ...LAYER_DEFS,
  { key:"poi",     label:"POI",           color:"#ffffff" },
  { key:"cizim",   label:"Çizimler",      color:"#ff6600" },
  { key:"import",  label:"İçe Aktarılan", color:"#f59e0b" },
  { key:"sikayet", label:"Şikayetler",    color:"#ef4444" },
];

export default function LayerOrderModal({ layerOrder, setLayerOrder, onClose }) {
  const [order, setOrder] = useState([...layerOrder]);
  const dragIdx = useRef(null);
  const getMeta = key => ALL_LAYER_META.find(l => l.key === key) || { key, label:key, color:"#888" };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:250, backdropFilter:"blur(4px)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#1a1d27", border:"1px solid #2a2f45", borderRadius:16, padding:24, width:"min(360px,92vw)" }}>
        <div style={{ fontSize:16, fontWeight:600, color:"#e8eaf0", marginBottom:6 }}>🗂 Katman Sıralaması</div>
        <div style={{ fontSize:12, color:"#7a80a0", marginBottom:16 }}>Sürükle-bırak ile sırayı değiştir. Üstteki = önde.</div>
        {order.map((key, idx) => {
          const meta = getMeta(key);
          return (
            <div key={key} draggable
              onDragStart={() => { dragIdx.current = idx; }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragIdx.current === null || dragIdx.current === idx) return;
                const next = [...order]; const [moved] = next.splice(dragIdx.current, 1);
                next.splice(idx, 0, moved); setOrder(next); dragIdx.current = null;
              }}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:6,
                background:"#0f1117", border:"1px solid #2a2f45", borderRadius:8, cursor:"grab", userSelect:"none" }}>
              <span style={{ color:"#3a3f55", fontSize:16 }}>⠿</span>
              <span style={{ width:12, height:12, borderRadius:2, background:meta.color, flexShrink:0 }} />
              <span style={{ fontSize:13, color:"#e8eaf0", flex:1 }}>{meta.label}</span>
              <span style={{ fontSize:11, color:"#3a3f55" }}>#{idx+1}</span>
            </div>
          );
        })}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <button style={ms.ghost} onClick={onClose}>İptal</button>
          <button style={ms.primary} onClick={() => { setLayerOrder(order); onClose(); }}>✓ Uygula</button>
        </div>
      </div>
    </div>
  );
}