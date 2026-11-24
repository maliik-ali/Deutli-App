export type Theme = "light" | "dark";
export const THEME_KEY = "deutli-theme";

/** Runs in <head> before the page paints, so a light-theme user never sees a dark flash. Dark is the default. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"){document.documentElement.dataset.theme="light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#f4f6fc")}}catch(e){}`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Switch the theme now and remember it on this device. */
export function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#f4f6fc" : "#081028");
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* Private mode: the choice just lasts until the page is closed. */
  }
}

/** Lets React follow the theme attribute on <html>. */
export function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
