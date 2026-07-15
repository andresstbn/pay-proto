import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nativeMocks = vi.hoisted(() => ({
  isMediaLibraryAvailable: vi.fn(),
  isSharingAvailable: vi.fn(),
  releaseCapture: vi.fn(),
  requestPermissions: vi.fn(),
  saveToLibrary: vi.fn(),
  share: vi.fn(),
}));

vi.mock('expo-media-library', () => ({
  isAvailableAsync: nativeMocks.isMediaLibraryAvailable,
  requestPermissionsAsync: nativeMocks.requestPermissions,
  saveToLibraryAsync: nativeMocks.saveToLibrary,
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: nativeMocks.isSharingAvailable,
  shareAsync: nativeMocks.share,
}));

vi.mock('react-native-view-shot', () => ({
  releaseCapture: nativeMocks.releaseCapture,
}));

import {
  releaseQrImage as releaseNativeQrImage,
  releasePersonalQrImage as releaseNativeImage,
  savePersonalQrImage as saveNativeImage,
  shareGroupQrImage as shareNativeGroupImage,
  sharePersonalQrImage as shareNativeImage,
} from './personal-qr-image.native';
import {
  savePersonalQrImage as saveWebImage,
  shareGroupQrImage as shareWebGroupImage,
  sharePersonalQrImage as shareWebImage,
} from './personal-qr-image';

beforeEach(() => {
  vi.clearAllMocks();
  nativeMocks.isMediaLibraryAvailable.mockResolvedValue(true);
  nativeMocks.isSharingAvailable.mockResolvedValue(true);
  nativeMocks.requestPermissions.mockResolvedValue({ granted: true });
  nativeMocks.saveToLibrary.mockResolvedValue(undefined);
  nativeMocks.share.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('personal QR image on native', () => {
  it('shares the captured PNG file instead of a text message', async () => {
    await expect(shareNativeImage('file:///tmp/propi-qr.png')).resolves.toBe('shared');

    expect(nativeMocks.share).toHaveBeenCalledWith('file:///tmp/propi-qr.png', {
      dialogTitle: 'Compartir mi QR de Propi',
      mimeType: 'image/png',
      UTI: 'public.png',
    });
  });

  it('shares a group QR as a PNG file with a group-specific title', async () => {
    await expect(shareNativeGroupImage('file:///tmp/ericpay-grupo.png', 'Viaje')).resolves.toBe('shared');

    expect(nativeMocks.share).toHaveBeenCalledWith('file:///tmp/ericpay-grupo.png', {
      dialogTitle: 'Compartir QR de Viaje',
      mimeType: 'image/png',
      UTI: 'public.png',
    });
  });

  it('requests write-only access before saving the PNG to the gallery', async () => {
    await expect(saveNativeImage('file:///tmp/propi-qr.png')).resolves.toBe('saved');

    expect(nativeMocks.requestPermissions).toHaveBeenCalledWith(true, []);
    expect(nativeMocks.saveToLibrary).toHaveBeenCalledWith('file:///tmp/propi-qr.png');
  });

  it('does not save when photo write permission is denied', async () => {
    nativeMocks.requestPermissions.mockResolvedValue({ granted: false });

    await expect(saveNativeImage('file:///tmp/propi-qr.png')).rejects.toThrow(
      'qr/permission-denied',
    );
    expect(nativeMocks.saveToLibrary).not.toHaveBeenCalled();
  });

  it('releases the temporary capture', () => {
    releaseNativeImage('file:///tmp/propi-qr.png');

    expect(nativeMocks.releaseCapture).toHaveBeenCalledWith('file:///tmp/propi-qr.png');
  });

  it('releases a temporary group QR capture', () => {
    releaseNativeQrImage('file:///tmp/ericpay-grupo.png');

    expect(nativeMocks.releaseCapture).toHaveBeenCalledWith('file:///tmp/ericpay-grupo.png');
  });
});

describe('personal QR image on web', () => {
  function stubDownload() {
    const link = {
      click: vi.fn(),
      download: '',
      href: '',
      rel: '',
      remove: vi.fn(),
    };
    const appendChild = vi.fn();
    vi.stubGlobal('document', {
      body: { appendChild },
      createElement: vi.fn(() => link),
    });
    return { appendChild, link };
  }

  it('downloads the PNG when the user presses Guardar', async () => {
    const { appendChild, link } = stubDownload();

    await expect(saveWebImage('data:image/png;base64,abc')).resolves.toBe('saved');

    expect(link.href).toBe('data:image/png;base64,abc');
    expect(link.download).toBe('propi-qr-personal.png');
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
  });

  it('downloads the PNG when file sharing is unavailable', async () => {
    const { link } = stubDownload();
    vi.stubGlobal('navigator', {});

    await expect(shareWebImage('data:image/png;base64,abc')).resolves.toBe('downloaded');

    expect(link.click).toHaveBeenCalledOnce();
  });

  it('downloads a group PNG instead of sharing text when file sharing is unavailable', async () => {
    const { link } = stubDownload();
    vi.stubGlobal('navigator', {});

    await expect(shareWebGroupImage('data:image/png;base64,group', 'Viaje')).resolves.toBe('downloaded');

    expect(link.href).toBe('data:image/png;base64,group');
    expect(link.download).toBe('propi-qr-grupo.png');
    expect(link.click).toHaveBeenCalledOnce();
  });
});
