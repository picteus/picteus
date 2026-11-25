const BINARY_WEIGHT_UNITS = [ "B", "kB", "MB", "GB", "TB" ] as const;

type BinaryWeightUnitType = (typeof BINARY_WEIGHT_UNITS)[number];

type BinaryWeightType = {
  readonly value: number;
  readonly unit: BinaryWeightUnitType;
};

const BYTES_PER_KILOBYTE = 1_024;

export function computeBinaryWeight(byteCount: number): BinaryWeightType
{
  let value = byteCount;
  let unitIndex = 0;
  while (Math.abs(value) >= BYTES_PER_KILOBYTE && unitIndex < BINARY_WEIGHT_UNITS.length - 1)
  {
    value /= BYTES_PER_KILOBYTE;
    unitIndex += 1;
  }
  return {
    value,
    unit: BINARY_WEIGHT_UNITS[unitIndex]
  };
}

export function formatFileSize(byteCount: number): string
{
  const { value, unit } = computeBinaryWeight(byteCount);
  if (unit === "B")
  {
    return `${value} ${unit}`;
  }
  const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "");
  return `${formatted} ${unit}`;
}
