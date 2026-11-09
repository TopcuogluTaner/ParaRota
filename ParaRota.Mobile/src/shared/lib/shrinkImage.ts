import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/** Upload edilecek görsel — httpClient'ın beklediği {uri,name,type} üçlüsü. */
export interface UploadImage {
  uri: string;
  name: string;
  type: string;
}

const MAX_WIDTH = 1600;
const COMPRESS = 0.7;

/**
 * Fiş/görsel yüklemeden önce küçültür: en fazla 1600px genişlik + %70 JPEG.
 * Modern telefon fotoğrafları 10-15MB olabiliyor; nginx/istek limitlerine
 * takılmamak ve OCR için gereksiz bant genişliği harcamamak için şart
 * (OCR'a 1600px fazlasıyla yeter). Küçültme başarısız olursa orijinali döner —
 * kullanıcı akışı asla bloklanmaz.
 */
export async function shrinkImage(asset: {
  uri: string;
  width?: number;
  fileName?: string | null;
  mimeType?: string | null;
}): Promise<UploadImage> {
  const fallback: UploadImage = {
    uri: asset.uri,
    name: asset.fileName ?? 'receipt.jpg',
    type: asset.mimeType ?? 'image/jpeg',
  };
  try {
    // Küçük görseli BÜYÜTME — sadece genişliği aşanları daralt.
    const actions =
      asset.width && asset.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];
    const out = await manipulateAsync(asset.uri, actions, {
      compress: COMPRESS,
      format: SaveFormat.JPEG,
    });
    return { uri: out.uri, name: 'receipt.jpg', type: 'image/jpeg' };
  } catch {
    return fallback;
  }
}
