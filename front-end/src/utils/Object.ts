export function isPlainRecord(value: unknown): value is Record<string, unknown>
{
  return typeof value === "object" && value !== null && Array.isArray(value) === false;
}

function normalizeComparableValue(value: unknown): unknown
{
  if (value === undefined || value === "")
  {
    return undefined;
  }
  if (Array.isArray(value) === true)
  {
    return value.map(item => normalizeComparableValue(item));
  }
  if (isPlainRecord(value) === true)
  {
    const sortedKeys = Object.keys(value).sort();
    const normalized: Record<string, unknown> = {};
    for (const key of sortedKeys)
    {
      const normalizedChild = normalizeComparableValue(value[key]);
      if (normalizedChild !== undefined)
      {
        normalized[key] = normalizedChild;
      }
    }
    return normalized;
  }
  return value;
}

export function countObjectFieldChanges(
  initialValue: Record<string, unknown> | undefined,
  currentValue: Record<string, unknown> | undefined
): number
{
  const initialRecord = initialValue ?? {};
  const currentRecord = currentValue ?? {};
  const allKeys = new Set<string>([
    ...Object.keys(initialRecord),
    ...Object.keys(currentRecord)
  ]);

  let changes = 0;
  for (const key of allKeys)
  {
    const initialChild = initialRecord[key];
    const currentChild = currentRecord[key];
    const isInitialRecord = isPlainRecord(initialChild);
    const isCurrentRecord = isPlainRecord(currentChild);
    if (
      (isInitialRecord === true || initialChild === undefined)
      && (isCurrentRecord === true || currentChild === undefined)
      && (isInitialRecord === true || isCurrentRecord === true)
    )
    {
      changes += countObjectFieldChanges(
        isInitialRecord === true ? initialChild : {},
        isCurrentRecord === true ? currentChild : {}
      );
      continue;
    }
    const initialSerialized = JSON.stringify(normalizeComparableValue(initialChild));
    const currentSerialized = JSON.stringify(normalizeComparableValue(currentChild));
    if (initialSerialized !== currentSerialized)
    {
      changes += 1;
    }
  }
  return changes;
}
