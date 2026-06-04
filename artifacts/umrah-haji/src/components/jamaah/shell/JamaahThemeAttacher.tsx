import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Auto-attach `data-portal="jamaah"` ke <body> saat user berada di rute
 * `/jamaah/*` atau `/store/*`. Token CSS Islami akan otomatis aktif di
 * seluruh subtree tanpa harus membungkus tiap halaman.
 */
export function JamaahThemeAttacher() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isJamaah =
      pathname.startsWith("/jamaah") ||
      pathname.startsWith("/store") ||
      pathname === "/install";
    if (isJamaah) {
      document.body.setAttribute("data-portal", "jamaah");
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      meta?.setAttribute("content", "#0F2E1F");
    } else {
      document.body.removeAttribute("data-portal");
    }
  }, [pathname]);
  return null;
}