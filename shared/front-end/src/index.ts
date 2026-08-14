export function detectImageMimeType(data: ArrayBuffer | Uint8Array): string
{
  const uintArray = data instanceof Uint8Array ? data : new Uint8Array(data);

  if (uintArray.length < 12)
  {
    throw new Error("ArrayBuffer is too small to identify.");
  }

  // 1. Check for SVG (text-based, check first few hundred bytes safely)
  const headerSnippet = new TextDecoder().decode(uintArray.slice(0, 256)).trim();
  if (headerSnippet.startsWith("<svg") || headerSnippet.startsWith("<?xml") || headerSnippet.includes("<svg"))
  {
    return "image/svg+xml";
  }

  // 2. Check JPEG: FF D8 FF
  if (uintArray[0] === 0xFF && uintArray[1] === 0xD8 && uintArray[2] === 0xFF)
  {
    return "image/jpeg";
  }

  // 3. Check PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    uintArray[0] === 0x89 && uintArray[1] === 0x50 && uintArray[2] === 0x4E && uintArray[3] === 0x47 &&
    uintArray[4] === 0x0D && uintArray[5] === 0x0A && uintArray[6] === 0x1A && uintArray[7] === 0x0A
  )
  {
    return "image/png";
  }

  // 4. Check GIF: 'GIF87a' or 'GIF89a'
  if (uintArray[0] === 0x47 && uintArray[1] === 0x49 && uintArray[2] === 0x46 && uintArray[3] === 0x38)
  {
    return "image/gif";
  }

  // 5. Check WebP: RIFFxxxxWEBP
  if (
    uintArray[0] === 0x52 && uintArray[1] === 0x49 && uintArray[2] === 0x46 && uintArray[3] === 0x46 && // 'RIFF'
    uintArray[8] === 0x57 && uintArray[9] === 0x45 && uintArray[10] === 0x42 && uintArray[11] === 0x50     // 'WEBP'
  )
  {
    return "image/webp";
  }

  // 6. Check AVIF / HEIC (ISOBMFF container format signature 'ftyp')
  const subBox = String.fromCharCode(uintArray[4], uintArray[5], uintArray[6], uintArray[7]);
  if (subBox === "ftyp")
  {
    const brand = String.fromCharCode(uintArray[8], uintArray[9], uintArray[10], uintArray[11]);
    if (brand.startsWith("avif") || brand.startsWith("avis"))
    {
      return "image/avif";
    }
    if (brand.startsWith("heic") || brand.startsWith("heix") || brand.startsWith("mif1"))
    {
      return "image/heic";
    }
  }

  throw new Error("Unsupported or unrecognized image format.");
}
