import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { releaseCapture } from 'react-native-view-shot';

export type PersonalQrImageOutcome = 'shared' | 'saved' | 'downloaded';

async function shareQrImage(imageUri: string, dialogTitle: string): Promise<PersonalQrImageOutcome> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('qr/sharing-unavailable');

  await Sharing.shareAsync(imageUri, {
    dialogTitle,
    mimeType: 'image/png',
    UTI: 'public.png',
  });
  return 'shared';
}

export function sharePersonalQrImage(imageUri: string): Promise<PersonalQrImageOutcome> {
  return shareQrImage(imageUri, 'Compartir mi QR de Propi');
}

export function shareGroupQrImage(imageUri: string, groupName: string): Promise<PersonalQrImageOutcome> {
  return shareQrImage(imageUri, `Compartir QR de ${groupName}`);
}

export async function savePersonalQrImage(imageUri: string): Promise<PersonalQrImageOutcome> {
  if (!(await MediaLibrary.isAvailableAsync())) throw new Error('qr/media-library-unavailable');

  const permission = await MediaLibrary.requestPermissionsAsync(true, []);
  if (!permission.granted) throw new Error('qr/permission-denied');

  await MediaLibrary.saveToLibraryAsync(imageUri);
  return 'saved';
}

export function releaseQrImage(imageUri: string) {
  try {
    releaseCapture(imageUri);
  } catch (error) {
    console.warn({
      errorCode: error instanceof Error ? error.name : 'unknown',
      event: 'qr_image_cleanup',
      status: 'failed',
    });
  }
}

export function releasePersonalQrImage(imageUri: string) {
  releaseQrImage(imageUri);
}
