-- 5) Sample practice set (original Deutli text, no audio yet)
-- So the Daily Practice page is not empty. Add audio in Admin -> Daily Practice,
-- or delete the set there. Runs only if there are no practice sets yet.

do $$
declare
  new_set uuid;
begin
  if exists (select 1 from public.practice_sets) then
    return;
  end if;

  insert into public.practice_sets (title, description, level, is_published, created_by)
  values ('Sample: Im Büro', 'Three short office dialogues to try the method.', 'B1', true, null)
  returning id into new_set;

  insert into public.practice_tracks (set_id, position, title, transcript) values
  (new_set, 1, 'Der erste Tag',
   E'Jana: Guten Morgen! Sie sind bestimmt Herr Malik, oder?\nHerr Malik: Ja, genau. Heute ist mein erster Tag.\nJana: Herzlich willkommen! Ich bin Jana aus dem Marketing. Ich zeige Ihnen kurz das Büro.\nHerr Malik: Das ist sehr nett, vielen Dank.\nJana: Hier vorne ist die Küche. Kaffee und Tee sind für alle kostenlos.\nHerr Malik: Wunderbar. Und wo ist mein Arbeitsplatz?\nJana: Gleich hier am Fenster. Der Computer ist schon eingerichtet.\nHerr Malik: Perfekt. Wann beginnt die Besprechung mit dem Team?\nJana: Um zehn Uhr im großen Raum. Ich hole Sie kurz vorher ab.'),
  (new_set, 2, 'Einen Termin verschieben',
   E'Frau Keller: Keller, guten Tag.\nHerr Aydin: Guten Tag, Frau Keller, hier spricht Aydin. Es geht um unseren Termin am Donnerstag.\nFrau Keller: Ja, um vierzehn Uhr, richtig?\nHerr Aydin: Genau. Leider muss ich den Termin verschieben, weil ich an dem Tag in Hamburg bin.\nFrau Keller: Das ist kein Problem. Wann passt es Ihnen besser?\nHerr Aydin: Hätten Sie am Freitagvormittag Zeit?\nFrau Keller: Am Freitag kann ich erst ab elf Uhr.\nHerr Aydin: Elf Uhr passt mir gut. Dann sehen wir uns am Freitag.\nFrau Keller: Sehr gern. Ich schicke Ihnen gleich eine neue Einladung.\nHerr Aydin: Vielen Dank und auf Wiederhören!'),
  (new_set, 3, 'Ein Problem mit dem Drucker',
   E'Tom: Sag mal, funktioniert der Drucker bei dir?\nSara: Nein, schon seit heute Morgen nicht mehr. Er zeigt immer einen Fehler an.\nTom: Hast du ihn schon aus- und wieder eingeschaltet?\nSara: Ja, zweimal. Das hat leider nichts gebracht.\nTom: Dann rufe ich die Technik an. Ich brauche den Vertrag bis zwölf Uhr auf Papier.\nSara: Du kannst auch den Drucker im zweiten Stock benutzen.\nTom: Gute Idee, daran habe ich gar nicht gedacht.\nSara: Ich komme mit, ich muss auch etwas ausdrucken.');
end $$;
