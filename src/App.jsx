import React, { useState } from "react";
import LoginScreen from "./components/LoginScreen";
import MapApp      from "./components/MapApp";

export default function App() {
  const [kullanici, setKullanici] = useState(null);
  if (!kullanici) return <LoginScreen onLogin={setKullanici} />;
  return <MapApp kullanici={kullanici} onCikis={() => setKullanici(null)} />;
}