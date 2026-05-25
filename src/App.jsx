import React, { useState } from "react";
import LoginScreen   from "./components/LoginScreen";
import MapApp        from "./components/MapApp";
import LoadingScreen from "./components/LoadingScreen";

export default function App() {
  const [yuklendi,  setYuklendi]  = useState(false);
  const [kullanici, setKullanici] = useState(null);

  if (!yuklendi) return <LoadingScreen onFinish={() => setYuklendi(true)} />;
  if (!kullanici) return <LoginScreen onLogin={setKullanici} />;
  return <MapApp kullanici={kullanici} onCikis={() => setKullanici(null)} />;
}