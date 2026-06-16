type ImageType = "png" | "jpeg" | "webp" | "unknown";

function detectImageType(bytes: Uint8Array): ImageType
{
  if (bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A)
  {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF)
  {
    return "jpeg";
  }
  if (bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // 'RIFF'
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
  { // 'WEBP'
    return "webp";
  }
  return "unknown";
}

function toUint8(x: ArrayBuffer | Uint8Array): Uint8Array
{
  return x instanceof Uint8Array ? new Uint8Array(x) : new Uint8Array(x);
}

function readU16BE(b: Uint8Array, o: number): number
{
  return (b[o] << 8) | b[o + 1];
}

function readU32BE(b: Uint8Array, o: number): number
{
  return (b[o] * 0x1000000) + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);
}

function readU32LE(b: Uint8Array, o: number): number
{
  return (b[o]) | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] * 0x1000000);
}

function writeU32LE(b: Uint8Array, o: number, v: number)
{
  b[o] = v & 0xFF;
  b[o + 1] = (v >>> 8) & 0xFF;
  b[o + 2] = (v >>> 16) & 0xFF;
  b[o + 3] = (v >>> 24) & 0xFF;
}

function readFourCC(b: Uint8Array, o: number): string
{
  return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
}

function writeFourCC(b: Uint8Array, o: number, s: string)
{
  b[o] = s.charCodeAt(0) & 0xFF;
  b[o + 1] = s.charCodeAt(1) & 0xFF;
  b[o + 2] = s.charCodeAt(2) & 0xFF;
  b[o + 3] = s.charCodeAt(3) & 0xFF;
}

function ascii(s: string): Uint8Array
{
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0x7F;
  return out;
}

function memeq(b: Uint8Array, offset: number, pat: Uint8Array): boolean
{
  if (offset + pat.length > b.length) return false;
  for (let i = 0; i < pat.length; i++) if (b[offset + i] !== pat[i]) return false;
  return true;
}

function appendRest(out: number[], src: Uint8Array, start: number)
{
  for (let i = start; i < src.length; i++) out.push(src[i]);
}

type StripingFunction = (input: Uint8Array) => Uint8Array;

function ICC(): StripingFunction
{

  /**
   * strip-icc.ts
   *
   * Remove embedded ICC profiles from PNG, JPEG/JFIF and WebP images without third‑party libraries.
   *
   * Supported removals:
   *  - PNG: removes the iCCP chunk (leaves sRGB/gAMA/chrm intact)
   *  - JPEG: removes all APP2 segments with identifier "ICC_PROFILE\0"
   *  - WebP: removes the RIFF chunk named "ICCP"
   *
   * Works in Node and browsers. Accepts ArrayBuffer/Uint8Array and returns a new Uint8Array.
   */


  /* ---------------- PNG (remove iCCP chunk) ---------------- */

  function stripICCPng(src: Uint8Array): Uint8Array
  {
    // PNG structure: 8-byte signature then repeating [length(4) type(4) data length bytes crc(4)]
    if (src.length < 8) return src.slice();
    const out: number[] = [];
    // copy signature
    for (let i = 0; i < 8; i++) out.push(src[i]);

    let p = 8;
    while (p + 12 <= src.length)
    {
      const len = readU32BE(src, p);
      const type = readFourCC(src, p + 4);
      const chunkTotal = 12 + len; // length + type + data + crc
      if (p + chunkTotal > src.length)
      {
        // Truncated; bail out with original to avoid corruption.
        return src.slice();
      }

      if (type === "iCCP")
      {
        // Skip this chunk entirely (length + type + data + crc)
        p += chunkTotal;
        continue;
      }

      // Copy this chunk verbatim
      for (let i = 0; i < chunkTotal; i++) out.push(src[p + i]);
      p += chunkTotal;

      if (type === "IEND") break; // end of PNG
    }

    return new Uint8Array(out);
  }

  /* ---------------- JPEG (remove APP2 ICC_PROFILE) ---------------- */

  const stripICCJpeg = (src: Uint8Array): Uint8Array =>
  {
    // Basic JPEG segment walker: copies everything except APP2 ICC segments before SOS.
    if (src.length < 4 || src[0] !== 0xFF || src[1] !== 0xD8) return src.slice(); // not a valid SOI

    const out: number[] = [];
    // copy SOI
    out.push(0xFF, 0xD8);

    let p = 2; // after SOI
    const iccHeader = ascii("ICC_PROFILE\0"); // 12 bytes

    while (p + 4 <= src.length)
    {
      if (src[p] !== 0xFF)
      {
        // Unexpected; abort cleanly by appending the rest.
        appendRest(out, src, p);
        return new Uint8Array(out);
      }
      let marker = src[p + 1];

      // Standalone markers we just copy and advance 2 bytes (e.g., 0xD0..0xD9 excluding 0xDA?)
      if (marker === 0xD9)
      { // EOI
        out.push(0xFF, 0xD9);
        return new Uint8Array(out);
      }

      if (marker === 0xDA)
      { // SOS — copy the rest (scan data) and finish
        // Copy SOS marker and the rest of the file verbatim
        out.push(0xFF, 0xDA);
        // length of SOS segment
        if (p + 4 > src.length) return src.slice();
        const len = readU16BE(src, p + 2);
        // copy length + payload
        for (let i = 0; i < 2 + len; i++) out.push(src[p + 2 + i]);
        // copy all remaining bytes (entropy-coded data until EOI)
        appendRest(out, src, p + 4 + len);
        return new Uint8Array(out);
      }

      // Segments with a 2-byte length field
      if (p + 4 > src.length) return src.slice();
      const segLen = readU16BE(src, p + 2);
      const segTotal = 2 + segLen; // includes the two length bytes
      if (p + segTotal > src.length) return src.slice(); // truncated

      const isAPP2 = marker === 0xE2;
      if (isAPP2)
      {
        const payloadStart = p + 4;
        const payloadLen = segLen - 2; // length excludes the 2-byte length field
        const headerOk = payloadLen >= iccHeader.length &&
          memeq(src, payloadStart, iccHeader);
        if (headerOk)
        {
          // Skip this ICC segment
          p += segTotal;
          continue;
        }
      }

      // Copy this segment
      for (let i = 0; i < segTotal; i++) out.push(src[p + i]);
      p += segTotal;
    }

    return new Uint8Array(out);
  };

  /* ---------------- WebP (remove ICCP chunk) ---------------- */

  function stripICCWebp(src: Uint8Array): Uint8Array
  {
    // WebP container: 'RIFF' size 'WEBP' [chunks...]
    if (src.length < 12) return src.slice();
    if (readFourCC(src, 0) !== "RIFF" || readFourCC(src, 8) !== "WEBP") return src.slice();

    const chunks: Uint8Array[] = [];
    let p = 12;
    while (p + 8 <= src.length)
    {
      const tag = readFourCC(src, p);
      const size = readU32LE(src, p + 4);
      const dataStart = p + 8;
      const dataEnd = dataStart + size;
      if (dataEnd > src.length)
      {
        // Truncated; bail out with original
        return src.slice();
      }

      const pad = size % 2 === 1 ? 1 : 0; // chunks are padded to even sizes

      if (tag !== "ICCP")
      {
        // Keep this chunk intact (including its header)
        const chunk = new Uint8Array(8 + size + pad);
        // Write header
        writeFourCC(chunk, 0, tag);
        writeU32LE(chunk, 4, size);
        // Copy data
        chunk.set(src.subarray(dataStart, dataEnd), 8);
        if (pad) chunk[8 + size] = 0; // preserve padding
        chunks.push(chunk);
      }

      p = dataEnd + pad;
    }

    // Rebuild RIFF with updated size
    const riffPayloadSize = 4 + chunks.reduce((sum, c) => sum + c.length, 0); // 'WEBP' + chunks
    const out = new Uint8Array(8 + riffPayloadSize);
    writeFourCC(out, 0, "RIFF");
    writeU32LE(out, 4, riffPayloadSize);
    writeFourCC(out, 8, "WEBP");
    let off = 12;
    for (const c of chunks)
    {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }

  // noinspection JSUnusedLocalSymbols
  function stripICC(input: ArrayBuffer | Uint8Array): Uint8Array
  {
    const bytes = toUint8(input);
    const kind = detectImageType(bytes);
    switch (kind)
    {
      case "png":
        return stripICCPng(bytes);
      case "jpeg":
        return stripICCJpeg(bytes);
      case "webp":
        return stripICCWebp(bytes);
      default:
        // Unknown type: return original bytes unchanged.
        return bytes.slice();
    }
  }

  return stripICCJpeg;
}

function IPTC(): StripingFunction
{
  /**
   * strip-iptc.ts
   *
   * Remove IPTC metadata from JPEG, PNG and WebP images.
   */

  // noinspection JSUnusedLocalSymbols
  function stripIPTC(input: ArrayBuffer | Uint8Array): Uint8Array
  {
    const bytes = toUint8(input);
    const kind = detectImageType(bytes);
    switch (kind)
    {
      case "jpeg":
        return stripIptcJpeg(bytes);
      case "png":
        return stripIptcPng(bytes);
      case "webp":
        return stripIptcWebp(bytes);
      default:
        return bytes.slice();
    }
  }

  /* ---------- JPEG: strip APP13 with IPTC ---------- */
  const stripIptcJpeg = (src: Uint8Array): Uint8Array =>
  {
    if (src.length < 4 || src[0] !== 0xFF || src[1] !== 0xD8) return src.slice();
    const out: number[] = [0xFF, 0xD8];
    let p = 2;

    const psHeader = ascii("Photoshop 3.0\0");

    while (p + 4 <= src.length)
    {
      if (src[p] !== 0xFF)
      {
        appendRest(out, src, p);
        break;
      }
      const marker = src[p + 1];

      if (marker === 0xDA)
      { // SOS
        out.push(0xFF, 0xDA);
        const len = readU16BE(src, p + 2);
        for (let i = 0; i < 2 + len; i++) out.push(src[p + 2 + i]);
        appendRest(out, src, p + 4 + len);
        break;
      }
      if (marker === 0xD9)
      {
        out.push(0xFF, 0xD9);
        break;
      }

      const segLen = readU16BE(src, p + 2);
      const segTotal = 2 + segLen;
      if (p + segTotal > src.length)
      {
        appendRest(out, src, p);
        break;
      }

      const isAPP13 = marker === 0xED;
      if (isAPP13)
      {
        const payloadStart = p + 4;
        const payloadLen = segLen - 2;
        if (payloadLen >= psHeader.length && memeq(src, payloadStart, psHeader))
        {
          // Skip whole APP13 segment
          p += segTotal;
          continue;
        }
      }
      for (let i = 0; i < segTotal; i++) out.push(src[p + i]);
      p += segTotal;
    }
    return new Uint8Array(out);
  };

  /* ---------- PNG: strip iTXt/zTXt/tEXt with IPTC keyword ---------- */
  function stripIptcPng(src: Uint8Array): Uint8Array
  {
    if (src.length < 8) return src.slice();
    const out: number[] = [];
    for (let i = 0; i < 8; i++) out.push(src[i]); // signature
    let p = 8;
    while (p + 12 <= src.length)
    {
      const len = readU32BE(src, p);
      const type = readFourCC(src, p + 4);
      const total = 12 + len;
      if (p + total > src.length) return src.slice();

      if (type === "iTXt" || type === "zTXt" || type === "tEXt")
      {
        const keywordBytes = src.subarray(p + 8, p + 8 + Math.min(len, 64));
        const keyword = new TextDecoder().decode(keywordBytes);
        if (keyword.includes("iptc"))
        {
          p += total; // drop chunk
          continue;
        }
      }
      for (let i = 0; i < total; i++) out.push(src[p + i]);
      p += total;
      if (type === "IEND") break;
    }
    return new Uint8Array(out);
  }

  /* ---------- WebP: strip IPTC chunk ---------- */
  function stripIptcWebp(src: Uint8Array): Uint8Array
  {
    if (src.length < 12) return src.slice();
    if (readFourCC(src, 0) !== "RIFF" || readFourCC(src, 8) !== "WEBP") return src.slice();

    const chunks: Uint8Array[] = [];
    let p = 12;
    while (p + 8 <= src.length)
    {
      const tag = readFourCC(src, p);
      const size = readU32LE(src, p + 4);
      const dataStart = p + 8;
      const dataEnd = dataStart + size;
      if (dataEnd > src.length) return src.slice();
      const pad = size % 2;

      if (tag !== "IPTC")
      {
        const chunk = new Uint8Array(8 + size + pad);
        writeFourCC(chunk, 0, tag);
        writeU32LE(chunk, 4, size);
        chunk.set(src.subarray(dataStart, dataEnd), 8);
        if (pad) chunk[8 + size] = 0;
        chunks.push(chunk);
      }
      p = dataEnd + pad;
    }
    const riffSize = 4 + chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(8 + riffSize);
    writeFourCC(out, 0, "RIFF");
    writeU32LE(out, 4, riffSize);
    writeFourCC(out, 8, "WEBP");
    let off = 12;
    for (const c of chunks)
    {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }


  return stripIptcJpeg;
}

function XMP(): StripingFunction
{
  /**
   * strip-xmp.ts
   *
   * Remove embedded XMP metadata from PNG, JPEG, and WebP images without third-party libraries.
   */

  // noinspection JSUnusedLocalSymbols
  function stripXMP(input: ArrayBuffer | Uint8Array): Uint8Array
  {
    const bytes = toUint8(input);
    const kind = detectImageType(bytes);
    switch (kind)
    {
      case "png":
        return stripXmpPng(bytes);
      case "jpeg":
        return stripXmpJpeg(bytes);
      case "webp":
        return stripXmpWebp(bytes);
      default:
        return bytes.slice();
    }
  }

  /* ---------- PNG: strip iTXt/zTXt chunk with XMP ---------- */
  function stripXmpPng(src: Uint8Array): Uint8Array
  {
    if (src.length < 8) return src.slice();
    const out: number[] = [];
    for (let i = 0; i < 8; i++) out.push(src[i]); // signature

    let p = 8;
    while (p + 12 <= src.length)
    {
      const len = readU32BE(src, p);
      const type = readFourCC(src, p + 4);
      const chunkTotal = 12 + len;
      if (p + chunkTotal > src.length) return src.slice(); // malformed

      if ((type === "iTXt" || type === "zTXt" || type === "tEXt"))
      {
        // keyword string is in chunk data
        const keywordBytes = src.subarray(p + 8, p + 8 + Math.min(len, 64)); // up to 64 chars
        const keyword = new TextDecoder().decode(keywordBytes);
        if (keyword.startsWith("XML:com.adobe.xmp"))
        {
          p += chunkTotal; // skip this chunk
          continue;
        }
      }
      // copy
      for (let i = 0; i < chunkTotal; i++) out.push(src[p + i]);
      p += chunkTotal;
      if (type === "IEND") break;
    }
    return new Uint8Array(out);
  }

  /* ---------- JPEG: strip APP1 with XMP namespace ---------- */
  const stripXmpJpeg = (src: Uint8Array): Uint8Array =>
  {
    if (src.length < 4 || src[0] !== 0xFF || src[1] !== 0xD8) return src.slice();
    const out: number[] = [0xFF, 0xD8];
    let p = 2;

    const xmpHeader = ascii("http://ns.adobe.com/xap/1.0/");

    while (p + 4 <= src.length)
    {
      if (src[p] !== 0xFF)
      {
        appendRest(out, src, p);
        break;
      }
      const marker = src[p + 1];

      if (marker === 0xDA)
      { // SOS: copy rest
        out.push(0xFF, 0xDA);
        const len = readU16BE(src, p + 2);
        for (let i = 0; i < 2 + len; i++) out.push(src[p + 2 + i]);
        appendRest(out, src, p + 4 + len);
        break;
      }
      if (marker === 0xD9)
      { // EOI
        out.push(0xFF, 0xD9);
        break;
      }

      const segLen = readU16BE(src, p + 2);
      const segTotal = 2 + segLen;
      if (p + segTotal > src.length)
      {
        appendRest(out, src, p);
        break;
      }

      const isAPP1 = marker === 0xE1;
      if (isAPP1)
      {
        const payloadStart = p + 4;
        const payloadLen = segLen - 2;
        if (payloadLen >= xmpHeader.length &&
          memeq(src, payloadStart, xmpHeader))
        {
          p += segTotal; // skip XMP
          continue;
        }
      }
      for (let i = 0; i < segTotal; i++) out.push(src[p + i]);
      p += segTotal;
    }
    return new Uint8Array(out);
  };

  /* ---------- WebP: strip XMP  chunk ---------- */
  function stripXmpWebp(src: Uint8Array): Uint8Array
  {
    if (src.length < 12) return src.slice();
    if (readFourCC(src, 0) !== "RIFF" || readFourCC(src, 8) !== "WEBP") return src.slice();

    const chunks: Uint8Array[] = [];
    let p = 12;
    while (p + 8 <= src.length)
    {
      const tag = readFourCC(src, p);
      const size = readU32LE(src, p + 4);
      const dataStart = p + 8;
      const dataEnd = dataStart + size;
      if (dataEnd > src.length) return src.slice();
      const pad = size % 2;

      if (tag !== "XMP ")
      {
        const chunk = new Uint8Array(8 + size + pad);
        writeFourCC(chunk, 0, tag);
        writeU32LE(chunk, 4, size);
        chunk.set(src.subarray(dataStart, dataEnd), 8);
        if (pad) chunk[8 + size] = 0;
        chunks.push(chunk);
      }
      p = dataEnd + pad;
    }

    const riffPayloadSize = 4 + chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(8 + riffPayloadSize);
    writeFourCC(out, 0, "RIFF");
    writeU32LE(out, 4, riffPayloadSize);
    writeFourCC(out, 8, "WEBP");
    let off = 12;
    for (const c of chunks)
    {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }

  return stripXmpJpeg;
}

function JFIF(): StripingFunction
{
  /**
   * strip-jfif.ts
   *
   * Removes the JFIF APP0 segment from a JPEG image.
   */

  const stripJFIF = (input: ArrayBuffer | Uint8Array): Uint8Array =>
  {
    const src = toUint8(input);

    // JPEG must start with SOI marker
    if (src.length < 4 || src[0] !== 0xFF || src[1] !== 0xD8)
    {
      return src.slice();
    }

    const out: number[] = [0xFF, 0xD8]; // write SOI

    let p = 2;
    while (p + 4 <= src.length)
    {
      if (src[p] !== 0xFF)
      {
        // malformed, just copy rest
        appendRest(out, src, p);
        break;
      }
      const marker = src[p + 1];

      if (marker === 0xDA || marker === 0xD9)
      {
        // Start of Scan or End of Image -> copy rest and stop
        appendRest(out, src, p);
        break;
      }

      if (p + 4 > src.length)
      {
        appendRest(out, src, p);
        break;
      }
      const segLen = readU16BE(src, p + 2);
      const segTotal = 2 + segLen;
      if (p + segTotal > src.length)
      {
        appendRest(out, src, p);
        break;
      }

      const isAPP0 = marker === 0xE0;
      if (isAPP0)
      {
        const id = ascii("JFIF\0");
        const payloadStart = p + 4;
        const payloadLen = segLen - 2;
        if (payloadLen >= id.length && memeq(src, payloadStart, id))
        {
          // Found JFIF APP0, skip this segment entirely
          p += segTotal;
          continue;
        }
      }

      // Copy this segment
      for (let i = 0; i < segTotal; i++) out.push(src[p + i]);
      p += segTotal;
    }

    return new Uint8Array(out);
  };

  return stripJFIF;
}

const icc = ICC();

export function stripIccMetadata(image: Buffer): Buffer
{
  const array = icc(image);
  return Buffer.from(array);
}

const iptc = IPTC();

export function stripIptcMetadata(image: Buffer): Buffer
{
  const array = iptc(image);
  return Buffer.from(array);
}

const xmp = XMP();

export function stripXmpMetadata(image: Buffer): Buffer
{
  const array = xmp(image);
  return Buffer.from(array);
}

const jfif = JFIF();

export function stripJpegJfifMetadata(image: Buffer): Buffer
{
  const array = jfif(image);
  return Buffer.from(array);
}
