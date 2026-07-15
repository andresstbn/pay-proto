export type PersonalQrImageOutcome = 'shared' | 'saved' | 'downloaded';

const QR_FILE_NAME = 'propi-qr-personal.png';
const GROUP_QR_FILE_NAME = 'propi-qr-grupo.png';

function downloadImage(dataUri: string, fileName: string) {
  if (typeof document === 'undefined') throw new Error('qr/download-unavailable');

  const link = document.createElement('a');
  link.href = dataUri;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function shareQrImage(
  dataUri: string,
  fileName: string,
  title: string,
): Promise<PersonalQrImageOutcome> {
  const fileShare = typeof navigator !== 'undefined' ? navigator : null;
  if (
    !fileShare ||
    typeof fileShare.share !== 'function' ||
    typeof fileShare.canShare !== 'function' ||
    typeof File === 'undefined'
  ) {
    downloadImage(dataUri, fileName);
    return 'downloaded';
  }

  const imageBlob = await (await fetch(dataUri)).blob();
  const imageFile = new File([imageBlob], fileName, { type: 'image/png' });
  const shareData: ShareData = { files: [imageFile], title };

  if (!fileShare.canShare(shareData)) {
    downloadImage(dataUri, fileName);
    return 'downloaded';
  }

  await fileShare.share(shareData);
  return 'shared';
}

export function sharePersonalQrImage(dataUri: string): Promise<PersonalQrImageOutcome> {
  return shareQrImage(dataUri, QR_FILE_NAME, 'Mi QR de Propi');
}

export function shareGroupQrImage(dataUri: string, groupName: string): Promise<PersonalQrImageOutcome> {
  return shareQrImage(dataUri, GROUP_QR_FILE_NAME, `QR de ${groupName}`);
}

export async function savePersonalQrImage(dataUri: string): Promise<PersonalQrImageOutcome> {
  downloadImage(dataUri, QR_FILE_NAME);
  return 'saved';
}

export function releaseQrImage(_: string) {
  // Web captures are data URIs and do not allocate a temporary file.
}

export function releasePersonalQrImage(imageUri: string) {
  releaseQrImage(imageUri);
}
