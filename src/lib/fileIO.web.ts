/**
 * Zapis i odczyt pliku sklepu — wersja przeglądarkowa.
 *
 * Na komputerze to zwykłe pobranie pliku i zwykły wybór z dysku. To jest ta
 * ścieżka, na której buduje się plany: mysz i duży ekran biją palec i telefon.
 */

export type SaveResult = { ok: boolean; message: string };
export type OpenResult =
  | { ok: true; text: string; name: string }
  | { ok: false; cancelled: boolean; message: string };

export async function saveTextFile(name: string, text: string): Promise<SaveResult> {
  try {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Zwolnienie po chwili — natychmiastowe potrafi ubić pobieranie w Safari.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true, message: `Pobrano ${name}.` };
  } catch (e) {
    return { ok: false, message: `Nie udało się pobrać pliku: ${String(e)}` };
  }
}

export async function openTextFile(): Promise<OpenResult> {
  return new Promise<OpenResult>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    let settled = false;
    const finish = (r: OpenResult) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(r);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return finish({ ok: false, cancelled: true, message: 'Anulowano.' });
      const reader = new FileReader();
      reader.onload = () =>
        finish({ ok: true, text: String(reader.result ?? ''), name: file.name });
      reader.onerror = () =>
        finish({ ok: false, cancelled: false, message: 'Nie udało się odczytać pliku.' });
      reader.readAsText(file, 'utf-8');
    };

    // Anulowanie okna wyboru nie zawsze odpala zdarzenie — pilnujemy tego osobno.
    window.addEventListener(
      'focus',
      () => setTimeout(() => finish({ ok: false, cancelled: true, message: 'Anulowano.' }), 800),
      { once: true }
    );

    document.body.appendChild(input);
    input.click();
  });
}
