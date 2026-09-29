import QRCode from 'qrcode'

// Keep the matrix small enough for a phone screen with a four-module quiet zone.
// Larger payloads can still use a link/file rather than a dense, unreliable QR.
export const maximumQrVersion = 20
export async function makeQrImage(link: string): Promise<string | null> {
  if (link.length > 4000) return null
  try {
    const options = {
      errorCorrectionLevel: 'M' as const,
      margin: 4,
      width: 512,
    }
    if (QRCode.create(link, options).version > maximumQrVersion) return null
    return await QRCode.toDataURL(link, options)
  } catch {
    return null
  }
}
