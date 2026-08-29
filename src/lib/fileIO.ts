/**
 * Zapis i odczyt pliku sklepu — wersja natywna (iOS, Android).
 *
 * Na telefonie „zapisz plik" znaczy tyle co „podaj go dalej": piszemy do cache
 * i otwieramy systemowy arkusz udostępniania, skąd użytkownik wrzuca plik
 * do Plików, na maila albo AirDropem na komputer.
 *
 * Metro wybiera fileIO.web.ts na webie, a ten plik na telefonie.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export type SaveResult = { ok: boolean; message: string };
export type OpenResult =
  | { ok: true; text: string; name: string }
  | { ok: false; cancelled: boolean; message: string };

export async function saveTextFile(name: string, text: string): Promise<SaveResult> {
  try {
    const dir = FileSystem.cacheDirectory;
    if (!dir) return { ok: false, message: 'Brak dostępu do pamięci urządzenia.' };
    const uri = dir + name;
    await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: true, message: `Zapisano jako ${name}, ale udostępnianie jest niedostępne.` };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Zapisz plan sklepu',
      UTI: 'public.json',
    });
    return { ok: true, message: `Wyeksportowano ${name}.` };
  } catch (e) {
    return { ok: false, message: `Nie udało się zapisać pliku: ${String(e)}` };
  }
}

export async function openTextFile(): Promise<OpenResult> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'public.json', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return { ok: false, cancelled: true, message: 'Anulowano.' };
    const asset = res.assets?.[0];
    if (!asset) return { ok: false, cancelled: false, message: 'Nie wybrano pliku.' };
    const text = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return { ok: true, text, name: asset.name ?? 'plik' };
  } catch (e) {
    return { ok: false, cancelled: false, message: `Nie udało się otworzyć pliku: ${String(e)}` };
  }
}
