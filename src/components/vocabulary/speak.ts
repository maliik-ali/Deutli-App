"use client";

/** Says German text aloud with the browser's built-in voice (free, works offline on most devices). */
export function speakGerman(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const say = new SpeechSynthesisUtterance(text);
  say.lang = "de-DE";
  say.rate = 0.9;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("de"));
  if (voice) say.voice = voice;
  synth.speak(say);
  return true;
}
