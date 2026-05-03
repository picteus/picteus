import React, { useMemo } from "react";

import { ImageDimensions } from "@picteus/ws-client";


function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function approximateRatio(value: number): [number, number] {
  const maximumDenominator = 100;
  let bestNumerator = 1;
  let bestDenominator = 1;
  let minimumError = Math.abs(value - 1);

  for (let denominator = 1; denominator <= maximumDenominator; denominator++) {
    const numerator = Math.round(value * denominator);
    const error = Math.abs(value - numerator / denominator);
    if (error < minimumError) {
      bestNumerator = numerator;
      bestDenominator = denominator;
      minimumError = error;
    }
  }
  return [bestNumerator, bestDenominator];
}

type ImageRatioType = (
  | { dimensions: ImageDimensions; aspectRatio?: never }
  | { aspectRatio: number; dimensions?: never }
  );

export default function ImageRatio({ dimensions, aspectRatio }: ImageRatioType) {
  const [numerator, denominator] = useMemo(() => {
    if (dimensions !== undefined) {
      const theGreatestCommonDivisor = greatestCommonDivisor(dimensions.width, dimensions.height);
      return [dimensions.width / theGreatestCommonDivisor, dimensions.height / theGreatestCommonDivisor];
    }
    else if (aspectRatio !== undefined) {
      return approximateRatio(aspectRatio);
    }
    return [0, 0];
  }, [dimensions, aspectRatio]);

  if (numerator === 0 || denominator === 0) {
    return null;
  }
  return (
    <>
      {numerator}:{denominator}
    </>
  );
}
