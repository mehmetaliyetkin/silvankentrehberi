export const VARSAYILAN_KULLANICILAR = [
  { id: 1, ad: "Sistem Yöneticisi", email: "superadmin@cbs.gov.tr", sifre: "Admin2024!",  rol: "superadmin",     belediye: "Tümü" },
  { id: 2, ad: "Ahmet Yılmaz",      email: "admin@silvan.bel.tr",   sifre: "Silvan2024!", rol: "belediye_admin", belediye: "Silvan Belediyesi" },
  { id: 3, ad: "Fatma Demir",       email: "admin@batman.bel.tr",   sifre: "Batman2024!", rol: "belediye_admin", belediye: "Batman Belediyesi" },
];

export function kullanicilariYukle() {
  try {
    const saved = localStorage.getItem("yetkin_cbs_kullanicilar");
    return saved ? JSON.parse(saved) : VARSAYILAN_KULLANICILAR;
  } catch { return VARSAYILAN_KULLANICILAR; }
}

export function kullanicilariKaydet(liste) {
  try { localStorage.setItem("yetkin_cbs_kullanicilar", JSON.stringify(liste)); } catch {}
}

export async function loginRequest(email, sifre) {
  const users = kullanicilariYukle();
  const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.sifre === sifre);
  if (!user) throw new Error("Hatalı e-posta veya şifre");
  return user;
}