/**
 * Formularz logowania i zakładania konta.
 *
 * Wyciągnięty z ekranu konta, bo służy teraz w dwóch miejscach: jako bramka
 * przed całą aplikacją i jako ekran konta dla kogoś, kto się wylogował.
 * Dwie kopie tego samego formularza rozjechałyby się przy pierwszej poprawce.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, FONT, H1, Input, Label } from './ui';
import { przypomnijHaslo, zaloguj, zarejestruj } from '../lib/konto';
import { radius, useTheme } from '../lib/theme';

type Tryb = 'logowanie' | 'rejestracja';

/**
 * Co pokazać po udanej próbie.
 *
 * Rejestracja KOŃCZY SIĘ WYJŚCIEM z aplikacji do skrzynki pocztowej, więc musi
 * mieć własny ekran — inaczej człowiek zostaje na formularzu i próbuje się
 * zalogować na konto, którego jeszcze nie potwierdził.
 *
 * Błędy zostają PRZY POLACH, a nie na osobnym ekranie. Złe hasło poprawia się
 * w tym samym miejscu, w którym się je wpisało; wyrzucenie człowieka na ekran
 * „nie udało się" kazałoby mu wracać i wpisywać wszystko od nowa.
 */
type Wynik = null | { rodzaj: 'zalogowano' } | { rodzaj: 'zarejestrowano'; email: string };

export function Logowanie({ naglowek, wstep }: { naglowek: string; wstep: string }) {
  const t = useTheme();
  const [wynik, setWynik] = useState<Wynik>(null);
  const [tryb, setTryb] = useState<Tryb>('logowanie');
  const [email, setEmail] = useState('');
  const [haslo, setHaslo] = useState('');
  const [blad, setBlad] = useState<string | null>(null);
  const [nota, setNota] = useState<string | null>(null);
  const [czeka, setCzeka] = useState(false);

  async function wyslij() {
    setBlad(null);
    setNota(null);
    if (!email.trim() || !haslo) {
      setBlad('Podaj adres i hasło.');
      return;
    }
    setCzeka(true);
    const wynik = tryb === 'logowanie' ? await zaloguj(email, haslo) : await zarejestruj(email, haslo);
    setCzeka(false);
    if (!wynik.ok) {
      setBlad(wynik.blad);
      return;
    }
    setHaslo('');
    setWynik(
      tryb === 'rejestracja'
        ? { rodzaj: 'zarejestrowano', email: email.trim() }
        : { rodzaj: 'zalogowano' }
    );
  }

  async function naPrzypomnienie() {
    setBlad(null);
    setNota(null);
    if (!email.trim()) {
      setBlad('Podaj adres, na który mam wysłać link.');
      return;
    }
    const wynik = await przypomnijHaslo(email);
    if (wynik.ok) setNota('Wysłane. Sprawdź skrzynkę.');
    else setBlad(wynik.blad);
  }

  if (wynik?.rodzaj === 'zarejestrowano') {
    return (
      <>
        <View style={{ gap: 4 }}>
          <H1>Sprawdź skrzynkę</H1>
          <Body muted>Wysłaliśmy link na {wynik.email}.</Body>
        </View>
        <Card>
          <Body>
            Kliknij w link z maila, żeby potwierdzić adres. Bez tego nie da się zalogować.
          </Body>
          <Body muted>
            Nie ma maila? Zajrzyj do spamu. Link jest ważny krótko — jeśli wygaśnie, załóż konto
            ponownie tym samym adresem.
          </Body>
        </Card>
        <Button
          title="Wróć do logowania"
          variant="secondary"
          onPress={() => {
            setWynik(null);
            setTryb('logowanie');
          }}
        />
      </>
    );
  }

  if (wynik?.rodzaj === 'zalogowano') {
    return (
      <>
        <View style={{ gap: 4 }}>
          <H1>Zalogowano</H1>
          <Body muted>Twoje listy i plany sklepów właśnie się pobierają.</Body>
        </View>
        <Card>
          <Body>Możesz zaczynać. W sklepie aplikacja działa też bez zasięgu.</Body>
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Znak i powitanie na środku — układ pionowy, bo to pierwszy ekran
          na telefonie i wszystko musi być w zasięgu kciuka. */}
      <View style={st.szczyt}>
        <View style={[st.znak, { backgroundColor: t.colors.muted }]}>
          <Text style={st.znakIkona}>🛒</Text>
        </View>
        <H1>{tryb === 'logowanie' ? 'Dobrze cię widzieć' : 'Zakładamy konto'}</H1>
        <Text style={[st.wstep, { color: t.colors.mutedForeground }]}>
          {tryb === 'logowanie' ? wstep : 'Konto trzyma twoje listy i pozwala wrócić do nich z innego telefonu.'}
        </Text>
      </View>

      <Card>
        <Label>Adres e-mail</Label>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="np. jan@przyklad.pl"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <Label>Hasło</Label>
        <Input
          value={haslo}
          onChangeText={setHaslo}
          placeholder={tryb === 'rejestracja' ? 'co najmniej 6 znaków' : ''}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType={tryb === 'rejestracja' ? 'newPassword' : 'password'}
          onSubmitEditing={wyslij}
        />

        {blad && (
          <View style={[st.komunikat, { backgroundColor: t.colors.muted, borderColor: t.colors.destructive }]}>
            <Text style={[st.komunikatText, { color: t.colors.foreground }]}>{blad}</Text>
          </View>
        )}
        {nota && (
          <View style={[st.komunikat, { backgroundColor: t.colors.muted, borderColor: t.colors.primary }]}>
            <Text style={[st.komunikatText, { color: t.colors.foreground }]}>{nota}</Text>
          </View>
        )}

        <Button
          title={czeka ? 'Chwileczkę…' : tryb === 'logowanie' ? 'Zaloguj' : 'Załóż konto'}
          onPress={wyslij}
          disabled={czeka}
        />

        {tryb === 'logowanie' && (
          <Button title="Nie pamiętam hasła" variant="ghost" onPress={naPrzypomnienie} />
        )}
      </Card>

      {/* Logowanie przez dostawców — przyciski stoją, ale jeszcze nie działają.
          Zostawiam je widoczne i WYŁĄCZONE zamiast udawać, że działają:
          przycisk, który nic nie robi po kliknięciu, jest gorszy niż przycisk,
          po którym widać, że go jeszcze nie ma. Włączenie wymaga skonfigurowania
          dostawcy w Supabase (Authentication → Sign In / Providers). */}
      <View style={st.rozdzielacz}>
        <View style={[st.kreska, { backgroundColor: t.colors.border }]} />
        <Text style={[st.rozdzielaczText, { color: t.colors.mutedForeground }]}>albo</Text>
        <View style={[st.kreska, { backgroundColor: t.colors.border }]} />
      </View>

      <View style={st.dostawcy}>
        {[
          { klucz: 'google', znak: 'G', nazwa: 'Google' },
          { klucz: 'apple', znak: '', nazwa: 'Apple' },
        ].map((d) => (
          <View
            key={d.klucz}
            style={[st.dostawca, { borderColor: t.colors.border, backgroundColor: t.colors.card }]}
          >
            <Text style={[st.dostawcaZnak, { color: t.colors.mutedForeground }]}>{d.znak}</Text>
            <Text style={[st.dostawcaText, { color: t.colors.mutedForeground }]}>{d.nazwa}</Text>
          </View>
        ))}
      </View>
      <Text style={[st.wkrotce, { color: t.colors.mutedForeground }]}>Wkrótce</Text>

      <Pressable
        onPress={() => {
          setTryb(tryb === 'logowanie' ? 'rejestracja' : 'logowanie');
          setBlad(null);
          setNota(null);
        }}
        hitSlop={8}
      >
        <Text style={[st.przelacznik, { color: t.colors.mutedForeground }]}>
          {tryb === 'logowanie' ? 'Nie masz konta? ' : 'Masz już konto? '}
          <Text style={{ color: t.colors.primary, fontWeight: '700' }}>
            {tryb === 'logowanie' ? 'Załóż je' : 'Zaloguj się'}
          </Text>
        </Text>
      </Pressable>
    </>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  szczyt: { alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 4 },
  znak: { width: 68, height: 68, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  znakIkona: { fontSize: 30, lineHeight: 36 },
  wstep: { fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  rozdzielacz: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kreska: { flex: 1, height: 1 },
  rozdzielaczText: { fontFamily: FONT.sans, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  dostawcy: { flexDirection: 'row', gap: 8 },
  dostawca: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: radius.md, paddingVertical: 12, opacity: 0.55,
  },
  dostawcaZnak: { fontFamily: FONT.sans, fontSize: 16, fontWeight: '700' },
  dostawcaText: { fontFamily: FONT.sans, fontSize: 14, fontWeight: '600' },
  wkrotce: { fontFamily: FONT.sans, fontSize: 11.5, textAlign: 'center', marginTop: -6 },
  przelacznik: { fontFamily: FONT.sans, fontSize: 13.5, textAlign: 'center', paddingVertical: 4 },
  komunikat: { borderWidth: 1, borderRadius: radius.md, padding: 10 },
  komunikatText: { fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 19 },
});
