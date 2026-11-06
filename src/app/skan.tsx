/**
 * Skan sklepu spacerem — nagrywanie.
 *
 * Telefon na uchwycie na klatce piersiowej, aparat szerokokątny, zwykły spacer
 * po sklepie. Co sekundę (albo co pół) jedno małe zdjęcie, a obok licznik kroków i kurs
 * z kompasu. Na koniec wszystko leci jednym plikiem przez arkusz udostępniania;
 * szkic planu robi z niego narzędzie `tools/skan` (patrz src/lib/skan.ts).
 *
 * Prototyp tylko dla administratora: to narzędzie do mapowania, nie funkcja
 * dla klienta. Działa w Expo Go — kamera, krokomierz i kompas są tam dostępne.
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Accelerometer, Pedometer } from 'expo-sensors';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, FONT, H1, Input, Label, Screen } from '../components/ui';
import { mozeMapowac } from '../lib/admin';
import { useKonto } from '../lib/konto';
import { detektorKrokow, polaczCzujniki, SKAN_FORMAT, SKAN_VERSION, type SkanKlatka, type SkanSesja } from '../lib/skan';
import { useTheme } from '../lib/theme';

/** Co ile robimy zdjęcie: spokojny krok albo szybki marsz. */
const TEMPO = { spokojne: { ms: 1000, krok: '0.7' }, szybkie: { ms: 500, krok: '0.85' } } as const;
const KEEP_AWAKE = 'alejka-skan';

type Stan = 'gotowy' | 'nagrywa' | 'pakuje' | 'koniec';

export default function Skan() {
  const { sesja } = useKonto();
  const t = useTheme();
  const [perm, prosOKamere] = useCameraPermissions();
  const kamera = useRef<CameraView>(null);

  const [stan, setStan] = useState<Stan>('gotowy');
  const [obiektyw, setObiektyw] = useState<string | undefined>();
  const [rozmiar, setRozmiar] = useState<string | undefined>();
  const [krok, setKrok] = useState('0.7');
  const [tempo, setTempo] = useState<keyof typeof TEMPO>('spokojne');
  const [licznik, setLicznik] = useState({ klatki: 0, kroki: 0, kurs: null as number | null, sek: 0 });
  const [info, setInfo] = useState<string | null>(null);

  // Dane nagrania trzymamy w refach — zmieniają się co chwilę i nie powinny przerysowywać ekranu.
  const start = useRef(0);
  const katalog = useRef('');
  const klatki = useRef<SkanKlatka[]>([]);
  const kursy = useRef<{ t: number; kurs: number }[]>([]);
  const kroki = useRef<{ t: number; kroki: number }[]>([]);
  // Drugi licznik kroków, z akcelerometru — krokomierz iPhone'a bywa milczący.
  const krokiAkc = useRef<{ t: number; kroki: number }[]>([]);
  // Gdzie leży zdjęcie każdej klatki (zostaje tam, gdzie zapisał je aparat).
  const sciezki = useRef<Record<string, string>>({});
  const bledyZRzedu = useRef(0);
  const [bladKlatki, setBladKlatki] = useState<string | null>(null);
  const ostatniKurs = useRef<number | null>(null);
  const zajety = useRef(false);
  const dziennik = useRef<{ t: number; co: string }[]>([]);
  const sprzataj = useRef<(() => void)[]>([]);

  useEffect(() => () => zatrzymajCzujniki(), []);

  if (!mozeMapowac(sesja)) {
    return (
      <Screen>
        <H1>Skan sklepu</H1>
        <Body muted>To narzędzie do mapowania sklepów, dostępne dla administratora.</Body>
        <Button title="Wróć" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <Screen>
        <H1>Skan sklepu</H1>
        <Body muted>Skan działa tylko na telefonie: potrzebuje aparatu, krokomierza i kompasu.</Body>
      </Screen>
    );
  }

  /** Najszerszy dostępny obiektyw i najmniejsze sensowne zdjęcie (ok. 1280 px). */
  async function przygotujKamere() {
    try {
      const lenses = (await kamera.current?.getAvailableLensesAsync()) ?? [];
      const szeroki = lenses.find((l) => /ultra/i.test(`${l.deviceType} ${l.localizedName}`));
      if (szeroki) setObiektyw(szeroki.deviceType);
      const sizes = (await kamera.current?.getAvailablePictureSizesAsync()) ?? [];
      // 1280×720: na 480 px półki widać, ale napisy na tablicach nad alejkami już ledwo.
      const maly = ['1280x720', 'High', '640x480', 'Medium'].find((s) => sizes.includes(s));
      if (maly) setRozmiar(maly);
    } catch {
      // Bez wyboru obiektywu też się da — po prostu węższy kadr.
    }
  }

  function zatrzymajCzujniki() {
    for (const f of sprzataj.current) f();
    sprzataj.current = [];
    deactivateKeepAwake(KEEP_AWAKE);
  }

  async function startuj() {
    setInfo(null);
    if (!perm?.granted && !(await prosOKamere()).granted) {
      setInfo('Bez dostępu do aparatu skan nie ruszy.');
      return;
    }
    const loc = await Location.requestForegroundPermissionsAsync();
    if (!loc.granted) {
      setInfo('Kompas w iPhonie wymaga zgody na lokalizację (używamy tylko kierunku, nie pozycji).');
      return;
    }
    const jestKrokomierz = await Pedometer.isAvailableAsync().catch(() => false);
    if (jestKrokomierz) await Pedometer.requestPermissionsAsync().catch(() => null);

    const dir = `${FileSystem.documentDirectory}skan-${Date.now()}/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    katalog.current = dir;
    klatki.current = [];
    kursy.current = [];
    kroki.current = [];
    krokiAkc.current = [];
    sciezki.current = {};
    dziennik.current = [];
    bledyZRzedu.current = 0;
    setBladKlatki(null);
    ostatniKurs.current = null;
    start.current = Date.now();
    const teraz = () => (Date.now() - start.current) / 1000;

    await activateKeepAwakeAsync(KEEP_AWAKE);

    const ped = jestKrokomierz
      ? Pedometer.watchStepCount((r) => {
          kroki.current.push({ t: teraz(), kroki: r.steps });
        })
      : null;
    const det = detektorKrokow();
    Accelerometer.setUpdateInterval(20);
    const akc = Accelerometer.addListener(({ x, y, z }) => {
      const tt = teraz();
      const n = det(tt, Math.sqrt(x * x + y * y + z * z));
      const ost = krokiAkc.current[krokiAkc.current.length - 1];
      if (!ost || ost.kroki !== n) krokiAkc.current.push({ t: tt, kroki: n });
    });
    const head = await Location.watchHeadingAsync((h) => {
      const kurs = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      ostatniKurs.current = kurs;
      kursy.current.push({ t: teraz(), kurs });
    });

    // Diagnoza przerw: czy aplikacja schodzi w tło, czy stoi zegar, czy aparat się wiesza.
    const loguj = (co: string) => dziennik.current.push({ t: Math.round(teraz() * 10) / 10, co });
    // iOS zatrzymuje aparat i czujniki aplikacji schowanej w tło — nic się wtedy nie nagrywa.
    const stanApki = AppState.addEventListener('change', (s) => {
      loguj(`app:${s}`);
      if (s === 'background') setBladKlatki('Aplikacja była zminimalizowana — w tym czasie nic się nie nagrało. Trzymaj ją na ekranie do końca skanu.');
    });
    let ostTyk = teraz();

    const timer = setInterval(async () => {
      const tyk = teraz();
      if (tyk - ostTyk > 2.5) loguj(`zegar stal ${(tyk - ostTyk).toFixed(1)} s`);
      ostTyk = tyk;
      const ostKroki = Math.max(
        kroki.current[kroki.current.length - 1]?.kroki ?? 0,
        krokiAkc.current[krokiAkc.current.length - 1]?.kroki ?? 0
      );
      setLicznik({ klatki: klatki.current.length, kroki: ostKroki, kurs: ostatniKurs.current, sek: Math.round(teraz()) });
      if (zajety.current || !kamera.current) return;
      zajety.current = true;
      try {
        const tt = teraz();
        const foto = await kamera.current.takePictureAsync({ quality: 0.4, shutterSound: false });
        if (teraz() - tt > 2) loguj(`zdjecie trwalo ${(teraz() - tt).toFixed(1)} s`);
        const plik = `f${String(klatki.current.length + 1).padStart(4, '0')}.jpg`;
        sciezki.current[plik] = foto.uri;
        klatki.current.push({ t: tt, plik });
        bledyZRzedu.current = 0;
      } catch (e) {
        // Pojedyncza nieudana klatka nie przerywa skanu. Seria błędów zwykle
        // znaczy, że aparat nie lubi wybranego rozmiaru albo obiektywu — wtedy
        // wracamy do ustawień domyślnych i pokazujemy błąd na ekranie.
        bledyZRzedu.current += 1;
        loguj(`blad aparatu: ${String(e).slice(0, 120)}`);
        setBladKlatki(String(e));
        if (bledyZRzedu.current === 3) setRozmiar(undefined);
        if (bledyZRzedu.current === 6) setObiektyw(undefined);
      } finally {
        zajety.current = false;
      }
    }, TEMPO[tempo].ms);

    sprzataj.current = [
      () => ped?.remove(),
      () => akc.remove(),
      () => head.remove(),
      () => stanApki.remove(),
      () => clearInterval(timer),
    ];
    setStan('nagrywa');
  }

  async function zakoncz() {
    zatrzymajCzujniki();
    setStan('pakuje');
    try {
      const dl = Number(krok.replace(',', '.'));
      const s: SkanSesja = {
        format: SKAN_FORMAT,
        version: SKAN_VERSION,
        start: new Date(start.current).toISOString(),
        dlugoscKroku: Number.isFinite(dl) && dl > 0.3 && dl < 1.5 ? dl : 0.7,
        // Krokomierz albo akcelerometr — który naliczył więcej. Krokomierz iPhone'a
        // przy krótkich odcinkach potrafi milczeć, a wtedy zaniża trasę.
        probki: polaczCzujniki(
          kursy.current,
          (kroki.current[kroki.current.length - 1]?.kroki ?? 0) >=
            0.8 * (krokiAkc.current[krokiAkc.current.length - 1]?.kroki ?? 0)
            ? kroki.current
            : krokiAkc.current
        ),
        klatki: klatki.current,
        dziennik: dziennik.current,
        surowe: { krokomierz: kroki.current, akcelerometr: krokiAkc.current },
      };
      // Jeden plik: sesja + zdjęcia w base64. Łatwiej go przesłać niż setki osobnych plików.
      const obrazy: Record<string, string> = {};
      for (const k of klatki.current) {
        obrazy[k.plik] = await FileSystem.readAsStringAsync(sciezki.current[k.plik], {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      const nazwa = `skan-${s.start.slice(0, 16).replace(/[:T]/g, '-')}.alejka-skan.json`;
      const uri = katalog.current + nazwa;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify({ ...s, obrazy }));
      const mb = ((await FileSystem.getInfoAsync(uri)) as { size?: number }).size ?? 0;
      setInfo(`Gotowe: ${klatki.current.length} klatek, ${(mb / 1e6).toFixed(1)} MB.`);
      setStan('koniec');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Wyślij skan' });
      }
    } catch (e) {
      setInfo(`Nie udało się spakować skanu: ${String(e)}`);
      setStan('koniec');
    }
  }

  const nagrywa = stan === 'nagrywa';

  return (
    <Screen>
      <H1>Skan sklepu</H1>
      {!nagrywa && (
        <Card>
          <Body>
            Telefon na uchwycie na klatce piersiowej albo na wózku, aparatem do przodu. Przejdź
            alejki wężykiem, każdą raz, środkiem. Nie minimalizuj aplikacji do końca skanu —
            w tle iPhone wyłącza aparat i czujniki.
          </Body>
        </Card>
      )}

      <View style={[st.podglad, { borderColor: t.colors.border }]}>
        <CameraView
          ref={kamera}
          style={StyleSheet.absoluteFill}
          facing="back"
          animateShutter={false}
          selectedLens={obiektyw}
          pictureSize={rozmiar}
          onCameraReady={przygotujKamere}
        />
      </View>

      {nagrywa ? (
        <View style={st.liczniki}>
          {[
            ['czas', `${licznik.sek} s`],
            ['klatki', String(licznik.klatki)],
            ['kroki', String(licznik.kroki)],
            ['kurs', licznik.kurs === null ? '—' : `${Math.round(licznik.kurs)}°`],
          ].map(([k, v]) => (
            <View key={k} style={st.licznik}>
              <Text style={[st.wartosc, { color: t.colors.foreground }]}>{v}</Text>
              <Text style={[st.etykieta, { color: t.colors.mutedForeground }]}>{k}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          <Button
            title={tempo === 'spokojne' ? 'Tempo: spokojne · 1 zdjęcie/s' : 'Tempo: szybki marsz · 2 zdjęcia/s'}
            variant="secondary"
            onPress={() => {
              const nowe = tempo === 'spokojne' ? 'szybkie' : 'spokojne';
              if (krok === TEMPO[tempo].krok) setKrok(TEMPO[nowe].krok);
              setTempo(nowe);
            }}
          />
          <Label>Długość kroku (m)</Label>
          <Input value={krok} onChangeText={setKrok} keyboardType="decimal-pad" />
          <Body muted>
            {obiektyw ? 'Obiektyw szerokokątny włączony.' : 'Obiektyw szerokokątny niedostępny, używam zwykłego.'}
          </Body>
        </View>
      )}

      {info && <Body muted>{info}</Body>}
      {nagrywa && bladKlatki && <Body muted>Błąd aparatu: {bladKlatki}</Body>}

      {stan === 'gotowy' || stan === 'koniec' ? (
        <Button title={stan === 'koniec' ? 'Nowy skan' : 'Zacznij skan'} onPress={startuj} />
      ) : nagrywa ? (
        <Button title="Zakończ i wyślij" variant="danger" onPress={zakoncz} />
      ) : (
        <Button title="Pakuję…" disabled onPress={() => {}} />
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  podglad: { height: 260, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  liczniki: { flexDirection: 'row', justifyContent: 'space-between' },
  licznik: { alignItems: 'center', flex: 1 },
  wartosc: { fontFamily: FONT.monoBold, fontSize: 20 },
  etykieta: { fontFamily: FONT.sans, fontSize: 12 },
});
