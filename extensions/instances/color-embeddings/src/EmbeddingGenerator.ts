import { type RGBColor } from "./ColorExtractor";


export interface OklabColor
{
  l: number;
  a: number;
  b: number;
}

function srgbChannelToLinear(channel: number): number
{
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

// Conversion formulas from Björn Ottosson's OKLab reference implementation: https://bottosson.github.io/posts/oklab/
// We keep the Cartesian OKLab representation (l, a, b) rather than the polar OKLCH form (l, c, h). The hue of OKLCH is a
// circular quantity: 0° and 360° denote the same red, so encoding it as a linear scalar makes two near-identical reds
// land at opposite ends of the axis and breaks any distance comparison. The (a, b) axes are continuous across that seam
// and collapse to ~0 for achromatic colors, which removes the unstable hue noise that grey, white and black would inject.
export function rgbToOklab(r: number, g: number, b: number): OklabColor
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

  return { l: lightness, a: aAxis, b: bAxis };
}

// The embedding is a "soft color histogram": rather than concatenating the dominant colors slot by slot — which depends
// on the order in which the extractor returns them and misaligns two otherwise similar palettes — every dominant color
// deposits its weight into a fixed set of reference anchor colors that tile the OKLab space. The resulting vector is a
// distribution over those anchors, so it is invariant to the ordering of the input colors and robust to a color being
// present in one image but absent from another. Cosine similarity over these histograms therefore reflects how much
// color mass two images share, regardless of extraction order.

// We place anchors on a neutral lightness ramp plus a set of chromatic rings sampled around the OKLab hue circle.
const GREY_LIGHTNESS_LEVELS = [ 0.15, 0.35, 0.55, 0.75, 0.95 ] as const;
const ANCHOR_HUE_COUNT = 12;
const CHROMATIC_RINGS = [
  { l: 0.45, c: 0.10 },
  { l: 0.62, c: 0.16 },
  { l: 0.80, c: 0.09 }
] as const;

// The soft-assignment bandwidth in OKLab units. It is wide enough that each color spreads across a few neighbouring
// anchors (which keeps the embedding stable when a color drifts slightly) yet narrow enough to stay discriminative.
const ASSIGNMENT_SIGMA = 0.12;

function buildAnchorColors(): OklabColor[]
{
  const anchors: OklabColor[] = [];
  for (const lightness of GREY_LIGHTNESS_LEVELS)
  {
    anchors.push({ l: lightness, a: 0, b: 0 });
  }
  for (let hueIndex = 0; hueIndex < ANCHOR_HUE_COUNT; hueIndex++)
  {
    const hueRadians = (hueIndex / ANCHOR_HUE_COUNT) * 2 * Math.PI;
    for (const ring of CHROMATIC_RINGS)
    {
      anchors.push({ l: ring.l, a: ring.c * Math.cos(hueRadians), b: ring.c * Math.sin(hueRadians) });
    }
  }
  return anchors;
}

const ANCHOR_COLORS = buildAnchorColors();

function computeSquaredOklabDistance(first: OklabColor, second: OklabColor): number
{
  const deltaLightness = first.l - second.l;
  const deltaA = first.a - second.a;
  const deltaB = first.b - second.b;
  return deltaLightness * deltaLightness + deltaA * deltaA + deltaB * deltaB;
}

function normalizeVectorInPlace(values: number[]): void
{
  let sumOfSquares = 0;
  for (const value of values)
  {
    sumOfSquares += value * value;
  }
  if (sumOfSquares <= 0)
  {
    return;
  }
  const magnitude = Math.sqrt(sumOfSquares);
  for (let index = 0; index < values.length; index++)
  {
    values[index] = values[index] / magnitude;
  }
}

export function generateColorEmbedding(colors: RGBColor[], colorCount: number): number[]
{
  const histogram = new Array<number>(ANCHOR_COLORS.length).fill(0);
  const bandwidthDenominator = 2 * ASSIGNMENT_SIGMA * ASSIGNMENT_SIGMA;
  const usableColors = colors.slice(0, colorCount);
  for (const color of usableColors)
  {
    if (color === undefined)
    {
      continue;
    }
    // We weight each color by its population so that a color covering most of the image dominates the histogram.
    // When the population is unavailable we fall back to an equal weight, which still yields an order-invariant result.
    const colorWeight = color.population !== undefined && color.population > 0 ? color.population : 1;
    const oklabColor = rgbToOklab(color.r, color.g, color.b);
    for (let anchorIndex = 0; anchorIndex < ANCHOR_COLORS.length; anchorIndex++)
    {
      const squaredDistance = computeSquaredOklabDistance(oklabColor, ANCHOR_COLORS[anchorIndex]);
      histogram[anchorIndex] += colorWeight * Math.exp(-squaredDistance / bandwidthDenominator);
    }
  }
  normalizeVectorInPlace(histogram);
  return histogram;
}

export function expectedEmbeddingDimensions(): number
{
  return ANCHOR_COLORS.length;
}
