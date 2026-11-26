/** What the page looks like now. */
export type Theme = "light" | "dark";
/** What the person picked. "system" follows the device and changes with it. */
export type ThemeChoice = Theme | "system";
export const THEME_KEY = "deutli-theme";
const CHOICE_EVENT = "deutli-theme-choice";

/**
 * Runs in <head> before the page paints, so a light-theme user never sees a dark flash. Dark is the default.
 * With "system" it also follows the device while the page is open.
 */
export const THEME_SCRIPT = `try{var k="${THEME_KEY}",d=document.documentElement,q=window.matchMedia("(prefers-color-scheme: light)"),s=function(){var t=localStorage.getItem(k);var l=t==="light"||(t==="system"&&q.matches);d.dataset.theme=l?"light":"dark";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",l?"#f4f6fc":"#081028")};s();q.addEventListener("change",function(){if(localStorage.getItem(k)==="system")s()})}catch(e){}`;

/** What is showing now. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** What the person picked on this device (dark if nothing was picked yet). */
export function currentChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "system" ? t : "dark";
  } catch {
    return currentTheme();
  }
}

const systemTheme = (): Theme => (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

/** Switch the theme now and remember the choice on this device. */
export function applyTheme(choice: ThemeChoice) {
  const next = choice === "system" ? systemTheme() : choice;
  document.documentElement.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#f4f6fc" : "#081028");
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* Private mode: the choice just lasts until the page is closed. */
  }
  window.dispatchEvent(new Event(CHOICE_EVENT));
}

/** Lets React follow the picked choice (and the theme on <html>, which "system" changes by itself). */
export function subscribeChoice(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener(CHOICE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener(CHOICE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
