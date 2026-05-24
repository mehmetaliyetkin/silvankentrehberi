import { useState, useRef, useEffect, useCallback } from "react";
import Select    from "ol/interaction/Select";
import Modify    from "ol/interaction/Modify";
import Translate from "ol/interaction/Translate";
import VectorLayer from "ol/layer/Vector";
import { click } from "ol/events/condition";
import { selectedEditStyle } from "../lib/styles";

export function useGeometriDuzenle({ mapInstanceRef, onSave }) {
  const [mod,         setMod]         = useState(null);
  const [secilenInfo, setSecilenInfo] = useState(null);
  const [sonKayit,    setSonKayit]    = useState(null);
  const modRef    = useRef(null);
  const interRef  = useRef({ select: null, modify: null, translate: null });
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const temizle = useCallback(() => {
    const map = mapInstanceRef.current; if (!map) return;
    Object.values(interRef.current).forEach(inter => { if (inter) { try { map.removeInteraction(inter); } catch {} } });
    interRef.current = { select: null, modify: null, translate: null };
    setMod(null); setSecilenInfo(null); setSonKayit(null); modRef.current = null;
    map.getTargetElement().style.cursor = "";
  }, [mapInstanceRef]);

  const aktifEt = useCallback((yeniMod) => {
    const map = mapInstanceRef.current; if (!map) return;
    Object.values(interRef.current).forEach(inter => { if (inter) { try { map.removeInteraction(inter); } catch {} } });
    interRef.current = { select: null, modify: null, translate: null };

    if (yeniMod === modRef.current) {
      modRef.current = null; setMod(null);
      map.getTargetElement().style.cursor = ""; return;
    }

    const select = new Select({
      condition: click, style: selectedEditStyle,
      layers: layer => layer instanceof VectorLayer && !layer.get("__isHL"),
    });
    select.on("select", e => {
      if (e.selected.length > 0) {
        const props = { ...e.selected[0].getProperties() }; delete props.geometry;
        setSecilenInfo(props);
      } else { setSecilenInfo(null); }
    });
    map.addInteraction(select);
    interRef.current.select = select;

    const kaydet = (ne) => {
      try {
        onSaveRef.current?.();
        const saat = new Date().toLocaleTimeString("tr-TR");
        setSonKayit(`${ne} kaydedildi · ${saat}`);
        setTimeout(() => setSonKayit(null), 3000);
      } catch (e) { console.warn("Geometri kaydetme hatası:", e); }
    };

    if (yeniMod === "modify") {
      const modify = new Modify({ features: select.getFeatures() });
      modify.on("modifyend", () => kaydet("Geometri düzenleme"));
      map.addInteraction(modify); interRef.current.modify = modify;
      map.getTargetElement().style.cursor = "crosshair";
    } else if (yeniMod === "translate") {
      const translate = new Translate({ features: select.getFeatures() });
      translate.on("translateend", () => kaydet("Taşıma"));
      map.addInteraction(translate); interRef.current.translate = translate;
      map.getTargetElement().style.cursor = "move";
    }

    modRef.current = yeniMod; setMod(yeniMod);
  }, [mapInstanceRef]);

  return { mod, aktifEt, temizle, secilenInfo, sonKayit };
}