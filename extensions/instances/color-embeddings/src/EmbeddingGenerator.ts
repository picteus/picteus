import { type RGBColor } from "./ColorExtractor";


const CHANNELS_PER_COLOR = 3;

export interface OklchColor
{
  l: number;
  c: number;
  h: number;
}

function srgbChannelToLinear(channel: number): number
{
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

// Conversion formulas from Björn Ottosson's OKLab reference implementation: https://bottosson.github.io/posts/oklab/
export function rgbToOklch(r: number, g: number, b: number): OklchColor
{
  const linearR = srgbChannelToLinear(r);
  const linearG = srgbChannelToLinear(g);
  const linearB = srgbChannelToLinear(b);

  const longWavelength = 0.4122214708 * linearR + 0.5363325363 * linearG + 0.0514459929 * linearB;
  const mediumWavelength = 0.2119034982 * linearR + 0.6806995451 * linearG + 0.1073969566 * linearB;
  const shortWavelength = 0.0883024619 * linearR + 0.2817188376 * linearG + 0.6299787005 * linearB;

  const cubeRootLong = Math.cbrt(longWavelength);
  const cubeRootMedium = Math.cbrt(mediumWavelength);
  const cubeRootShort = Math.cbrt(shortWavelength);

  const lightness = 0.2104542553 * cubeRootLong + 0.7936177850 * cubeRootMedium - 0.0040720468 * cubeRootShort;
  const aAxis = 1.9779984951 * cubeRootLong - 2.4285922050 * cubeRootMedium + 0.4505937099 * cubeRootShort;
  const bAxis = 0.0259040371 * cubeRootLong + 0.7827717662 * cubeRootMedium - 0.8086757660 * cubeRootShort;

  const chroma = Math.sqrt(aAxis * aAxis + bAxis * bAxis);
  let hue = Math.atan2(bAxis, aAxis) * (180 / Math.PI);
  if (hue < 0)
  {
    hue += 360;
  }

  return { l: lightness, c: chroma, h: hue };
}

// OKLCH chroma rarely exceeds ~0.37 for in-gamut sRGB colors, so this bound keeps the normalized value within [0, 1] in practice
const MAXIMUM_EXPECTED_CHROMA = 0.4;

export function normalizeOklch(color: OklchColor): [ number, number, number ]
{
  const normalizedLightness = Math.min(Math.max(color.l, 0), 1);
  const normalizedChroma = Math.min(Math.max(color.c / MAXIMUM_EXPECTED_CHROMA, 0), 1);
  const normalizedHue = color.h / 360;
  return [ normalizedLightness, normalizedChroma, normalizedHue ];
}

export function generateColorEmbedding(colors: RGBColor[], colorCount: number): number[]
{
  const values: number[] = [];
  for (let index = 0; index < colorCount; index++)
  {
    const color = colors[index];
    if (color === undefined)
    {
      values.push(0, 0, 0);
      continue;
    }
    values.push(...normalizeOklch(rgbToOklch(color.r, color.g, color.b)));
  }
  return values;
}

export function expectedEmbeddingDimensions(colorCount: number): number
{
  return colorCount * CHANNELS_PER_COLOR;
}
