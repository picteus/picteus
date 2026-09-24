import { test } from "node:test";
import { strict as assert } from "node:assert/strict";

import { type RGBColor } from "./ColorExtractor";
import { expectedEmbeddingDimensions, generateColorEmbedding, rgbToOklab } from "./EmbeddingGenerator";


const DEFAULT_COLOR_COUNT = 8;

function computeCosineSimilarity(first: number[], second: number[]): number
{
  assert.equal(first.length, second.length);
  let dotProduct = 0;
  let firstMagnitudeSquared = 0;
  let secondMagnitudeSquared = 0;
  for (let index = 0; index < first.length; index++)
  {
    dotProduct += first[index] * second[index];
    firstMagnitudeSquared += first[index] * first[index];
    secondMagnitudeSquared += second[index] * second[index];
  }
  const denominator = Math.sqrt(firstMagnitudeSquared) * Math.sqrt(secondMagnitudeSquared);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function buildColor(r: number, g: number, b: number, population: number): RGBColor
{
  return { r, g, b, population };
}

// A red-dominated palette and a near-identical variant of it, jittered in both color and population and, crucially,
// returned in a different order. Two similar images should score close to 1 despite that reordering.
const RED_PALETTE: RGBColor[] =
  [
    buildColor(200, 30, 40, 5000),
    buildColor(20, 60, 180, 2000),
    buildColor(240, 230, 210, 800)
  ];

const RED_PALETTE_REORDERED_AND_JITTERED: RGBColor[] =
  [
    buildColor(238, 228, 212, 820),
    buildColor(205, 35, 38, 5200),
    buildColor(18, 62, 178, 1900)
  ];

// A green and yellow palette, perceptually far from the red palette.
const GREEN_PALETTE: RGBColor[] =
  [
    buildColor(40, 160, 60, 5000),
    buildColor(230, 220, 40, 2500),
    buildColor(120, 200, 90, 1000)
  ];


test("rgbToOklab keeps chromatic axes near zero for achromatic colors", () =>
{
  const midGrey = rgbToOklab(128, 128, 128);
  assert.ok(Math.abs(midGrey.a) < 0.001, `Expected the a axis of a grey to be ~0, got ${midGrey.a}`);
  assert.ok(Math.abs(midGrey.b) < 0.001, `Expected the b axis of a grey to be ~0, got ${midGrey.b}`);
  assert.ok(midGrey.l > 0 && midGrey.l < 1);
});

test("generateColorEmbedding produces a fixed-length, deterministic vector", () =>
{
  const embedding = generateColorEmbedding(RED_PALETTE, DEFAULT_COLOR_COUNT);
  assert.equal(embedding.length, expectedEmbeddingDimensions());
  assert.ok(embedding.length > 0);
  // We verify the vector is L2-normalized (unit length) so that stored magnitudes stay bounded
  const magnitude = Math.sqrt(embedding.reduce((accumulator, value) => accumulator + value * value, 0));
  assert.ok(Math.abs(magnitude - 1) < 1e-9, `Expected a unit-length vector, got a magnitude of ${magnitude}`);
  // We verify determinism: the same input yields the exact same output
  assert.deepEqual(generateColorEmbedding(RED_PALETTE, DEFAULT_COLOR_COUNT), embedding);
});

test("generateColorEmbedding is invariant to the ordering of the dominant colors", () =>
{
  const original = generateColorEmbedding(RED_PALETTE, DEFAULT_COLOR_COUNT);
  const reversed = generateColorEmbedding([ ...RED_PALETTE ].reverse(), DEFAULT_COLOR_COUNT);
  const similarity = computeCosineSimilarity(original, reversed);
  // Reordering the exact same colors must produce an identical embedding, hence a cosine similarity of exactly 1
  assert.ok(similarity > 0.999999, `Expected order invariance (~1.0), got a cosine similarity of ${similarity}`);
});

test("similar palettes score high even when reordered and jittered", () =>
{
  const firstEmbedding = generateColorEmbedding(RED_PALETTE, DEFAULT_COLOR_COUNT);
  const secondEmbedding = generateColorEmbedding(RED_PALETTE_REORDERED_AND_JITTERED, DEFAULT_COLOR_COUNT);
  const similarity = computeCosineSimilarity(firstEmbedding, secondEmbedding);
  assert.ok(similarity > 0.95, `Expected similar palettes to score above 0.95, got ${similarity}`);
});

test("dissimilar palettes score markedly lower than similar ones", () =>
{
  const redEmbedding = generateColorEmbedding(RED_PALETTE, DEFAULT_COLOR_COUNT);
  const jitteredRedEmbedding = generateColorEmbedding(RED_PALETTE_REORDERED_AND_JITTERED, DEFAULT_COLOR_COUNT);
  const greenEmbedding = generateColorEmbedding(GREEN_PALETTE, DEFAULT_COLOR_COUNT);

  const similarPairScore = computeCosineSimilarity(redEmbedding, jitteredRedEmbedding);
  const dissimilarPairScore = computeCosineSimilarity(redEmbedding, greenEmbedding);

  assert.ok(dissimilarPairScore < 0.6, `Expected dissimilar palettes to score below 0.6, got ${dissimilarPairScore}`);
  assert.ok(similarPairScore - dissimilarPairScore > 0.3, "Expected a clear separation between similar and dissimilar palettes");
});

test("hues straddling the achromatic origin are not driven artificially apart", () =>
{
  // Two near-identical greys with tiny opposite tints previously landed at opposite ends of the linear hue axis. With the OKLab encoding they should remain almost identical
  const firstGrey = generateColorEmbedding([ buildColor(128, 127, 129, 1000) ], DEFAULT_COLOR_COUNT);
  const secondGrey = generateColorEmbedding([ buildColor(130, 129, 128, 1000) ], DEFAULT_COLOR_COUNT);
  const similarity = computeCosineSimilarity(firstGrey, secondGrey);
  assert.ok(similarity > 0.99, `Expected near-identical greys to score above 0.99, got ${similarity}`);
});

test("dominant colors weigh more than minor ones through population", () =>
{
  // An image that is overwhelmingly red with a sliver of blue should sit closer to a pure-red image than to a pure-blue one, because population weighting lets the dominant red drive the embedding
  const mostlyRed = generateColorEmbedding(
    [ buildColor(200, 30, 40, 9500), buildColor(20, 60, 180, 500) ],
    DEFAULT_COLOR_COUNT
  );
  const pureRed = generateColorEmbedding([ buildColor(200, 30, 40, 10000) ], DEFAULT_COLOR_COUNT);
  const pureBlue = generateColorEmbedding([ buildColor(20, 60, 180, 10000) ], DEFAULT_COLOR_COUNT);

  const distanceToRed = computeCosineSimilarity(mostlyRed, pureRed);
  const distanceToBlue = computeCosineSimilarity(mostlyRed, pureBlue);
  assert.ok(distanceToRed > distanceToBlue, "Expected a mostly-red image to be closer to pure red than to pure blue");
});

test("generateColorEmbedding ignores dominant colors beyond the requested count", () =>
{
  const colors: RGBColor[] =
    [
      buildColor(200, 30, 40, 5000),
      buildColor(20, 60, 180, 2000),
      buildColor(40, 160, 60, 1000)
    ];
  const limitedToTwo = generateColorEmbedding(colors, 2);
  const firstTwoOnly = generateColorEmbedding(colors.slice(0, 2), 2);
  assert.deepEqual(limitedToTwo, firstTwoOnly);
});
