interface HeadingStackItem
{
  readonly title: string;
  readonly depth: number;
}

type ParsedAtxHeadingType =
  {
    readonly depth: number;
    readonly title: string;
  };

function isCodeFenceLine(line: string): boolean
{
  const trimmed = line.trim();
  return trimmed.startsWith("```") || trimmed.startsWith("~~~");
}

function parseAtxHeading(line: string): ParsedAtxHeadingType | undefined
{
  const match = line.match(/^(#{1,6})\s+(.*)$/);
  if (match === null)
  {
    return undefined;
  }

  return {
    depth: match[1].length,
    title: match[2].replace(/\s+#+$/, "").trim()
  };
}

function matchHeadingTitle(headingTitle: string, targetTitle: string): boolean
{
  const normalizedHeading = headingTitle.replace(/^`|`$/g, "").trim().toLowerCase();
  const normalizedTarget = targetTitle.replace(/^`|`$/g, "").trim().toLowerCase();
  return normalizedHeading === normalizedTarget;
}

export function extractMarkdownParagraph(
  markdown: string,
  sectionPath: readonly string[] | string,
  withSubSections = true
): string | undefined
{
  if (!markdown || markdown.trim().length === 0)
  {
    return undefined;
  }

  const pathSegments = (Array.isArray(sectionPath) ? sectionPath : [ sectionPath ])
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (pathSegments.length === 0)
  {
    return undefined;
  }

  const lines = markdown.split("\n");
  const headingStack: HeadingStackItem[] = [];
  let isInCodeBlock = false;
  let targetDepth = -1;
  let isCapturing = false;
  const resultLines: string[] = [];

  for (const line of lines)
  {
    if (isCodeFenceLine(line) === true)
    {
      isInCodeBlock = !isInCodeBlock;
    }

    if (isInCodeBlock === false)
    {
      const heading = parseAtxHeading(line);
      if (heading !== undefined)
      {
        if (isCapturing === true)
        {
          // We stop capturing when encountering a heading of the same or higher level,
          // or any sub-heading if sub-sections should be stripped.
          if (heading.depth <= targetDepth || withSubSections === false)
          {
            break;
          }
        }
        else
        {
          // We maintain the active heading hierarchy stack.
          while (
            headingStack.length > 0 &&
            headingStack[headingStack.length - 1].depth >= heading.depth
          )
          {
            headingStack.pop();
          }

          headingStack.push({
            title: heading.title,
            depth: heading.depth
          });

          // We check if the current heading hierarchy ends with the requested path segments.
          if (headingStack.length >= pathSegments.length)
          {
            let hasMatched = true;
            const startIndex = headingStack.length - pathSegments.length;

            for (let segmentIndex = 0; segmentIndex < pathSegments.length; segmentIndex += 1)
            {
              const stackItem = headingStack[startIndex + segmentIndex];
              const expectedTitle = pathSegments[segmentIndex];

              if (matchHeadingTitle(stackItem.title, expectedTitle) === false)
              {
                hasMatched = false;
                break;
              }
            }

            if (hasMatched === true)
            {
              targetDepth = heading.depth;
              isCapturing = true;
              continue;
            }
          }
        }
      }
    }

    if (isCapturing === true)
    {
      resultLines.push(line);
    }
  }

  return isCapturing === true ? resultLines.join("\n").trim() : undefined;
}

type ManualHeadingType =
  {
    readonly id: string;
    readonly title: string;
  };

export function slugifyMarkdownHeading(title: string): string
{
  const cleaned = title
    .replace(/^`|`$/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned : "section";
}

export function detectManualTocHeadingLevel(markdown: string): 1 | 2
{
  if (!markdown || markdown.trim().length === 0)
  {
    return 1;
  }

  const lines = markdown.split("\n");
  let isInCodeBlock = false;
  for (const line of lines)
  {
    if (isCodeFenceLine(line) === true)
    {
      isInCodeBlock = !isInCodeBlock;
      continue;
    }
    if (isInCodeBlock === false)
    {
      const heading = parseAtxHeading(line);
      if (heading !== undefined && heading.depth === 1 && heading.title.length > 0)
      {
        return 1;
      }
    }
  }

  return 2;
}

export function extractManualHeadings(markdown: string): ManualHeadingType[]
{
  if (!markdown || markdown.trim().length === 0)
  {
    return [];
  }

  const targetLevel = detectManualTocHeadingLevel(markdown);
  const lines = markdown.split("\n");
  const headings: ManualHeadingType[] = [];
  const usedIds = new Map<string, number>();
  let isInCodeBlock = false;

  for (const line of lines)
  {
    if (isCodeFenceLine(line) === true)
    {
      isInCodeBlock = !isInCodeBlock;
      continue;
    }

    if (isInCodeBlock === true)
    {
      continue;
    }

    const heading = parseAtxHeading(line);
    if (heading !== undefined && heading.depth === targetLevel && heading.title.length > 0)
    {
      const baseSlug = slugifyMarkdownHeading(heading.title);
      const count = usedIds.get(baseSlug) ?? 0;
      usedIds.set(baseSlug, count + 1);
      const id = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
      headings.push({ id, title: heading.title });
    }
  }

  return headings;
}

type MarkdownSectionSplitType =
  {
    readonly beforeAndSection: string;
    readonly after: string | undefined;
  };

export function splitMarkdownAfterSection(
  markdown: string,
  sectionTitle: string
): MarkdownSectionSplitType | undefined
{
  if (!markdown || markdown.trim().length === 0)
  {
    return undefined;
  }

  const normalizedTarget = sectionTitle.trim();
  if (normalizedTarget.length === 0)
  {
    return undefined;
  }

  const targetLevel = detectManualTocHeadingLevel(markdown);
  const lines = markdown.split("\n");
  let isInCodeBlock = false;
  let sectionStartLine = -1;
  let sectionEndLine = lines.length;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1)
  {
    const line = lines[lineIndex];
    if (isCodeFenceLine(line) === true)
    {
      isInCodeBlock = !isInCodeBlock;
      continue;
    }

    if (isInCodeBlock === true)
    {
      continue;
    }

    const heading = parseAtxHeading(line);
    if (heading === undefined)
    {
      continue;
    }

    if (sectionStartLine === -1)
    {
      if (heading.depth === targetLevel && matchHeadingTitle(heading.title, normalizedTarget) === true)
      {
        sectionStartLine = lineIndex;
      }
    }
    else if (heading.depth <= targetLevel)
    {
      sectionEndLine = lineIndex;
      break;
    }
  }

  if (sectionStartLine === -1)
  {
    return undefined;
  }

  const beforeAndSection = lines.slice(0, sectionEndLine).join("\n").trimEnd();
  const afterContent = lines.slice(sectionEndLine).join("\n").trim();

  return {
    beforeAndSection,
    after: afterContent.length > 0 ? afterContent : undefined
  };
}

export function stripEmptyMarkdownSections(markdown: string): string
{
  if (!markdown || markdown.trim().length === 0)
  {
    return "";
  }

  const targetLevel = detectManualTocHeadingLevel(markdown);
  const lines = markdown.split("\n");
  const sectionStarts: number[] = [];
  let isInCodeBlock = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1)
  {
    const line = lines[lineIndex];
    if (isCodeFenceLine(line) === true)
    {
      isInCodeBlock = !isInCodeBlock;
      continue;
    }

    if (isInCodeBlock === true)
    {
      continue;
    }

    const heading = parseAtxHeading(line);
    if (heading !== undefined && heading.depth <= targetLevel)
    {
      sectionStarts.push(lineIndex);
    }
  }

  if (sectionStarts.length === 0)
  {
    return markdown;
  }

  const keptLines: string[] = lines.slice(0, sectionStarts[0]);

  for (let sectionIndex = 0; sectionIndex < sectionStarts.length; sectionIndex += 1)
  {
    const startLine = sectionStarts[sectionIndex];
    const endLine = sectionIndex + 1 < sectionStarts.length ? sectionStarts[sectionIndex + 1] : lines.length;
    const hasBodyContent = lines
      .slice(startLine + 1, endLine)
      .some(sectionLine => sectionLine.trim().length > 0);

    if (hasBodyContent === true)
    {
      keptLines.push(...lines.slice(startLine, endLine));
    }
  }

  return keptLines.join("\n").trim();
}

export function stripMarkdownSection(
  markdown: string,
  sectionTitle: string
): string
{
  if (!markdown || markdown.trim().length === 0)
  {
    return "";
  }

  const normalizedTarget = sectionTitle.trim();
  if (normalizedTarget.length === 0)
  {
    return markdown;
  }

  const targetLevel = detectManualTocHeadingLevel(markdown);
  const lines = markdown.split("\n");
  const keptLines: string[] = [];
  let isInCodeBlock = false;
  let isSkippingSection = false;

  for (const line of lines)
  {
    if (isCodeFenceLine(line) === true)
    {
      isInCodeBlock = !isInCodeBlock;
      if (isSkippingSection === false)
      {
        keptLines.push(line);
      }
      continue;
    }

    if (isInCodeBlock === false)
    {
      const heading = parseAtxHeading(line);
      if (heading !== undefined)
      {
        if (isSkippingSection === true && heading.depth <= targetLevel)
        {
          isSkippingSection = false;
        }

        if (isSkippingSection === false && heading.depth === targetLevel && matchHeadingTitle(heading.title, normalizedTarget) === true)
        {
          isSkippingSection = true;
          continue;
        }
      }
    }

    if (isSkippingSection === false)
    {
      keptLines.push(line);
    }
  }

  return keptLines.join("\n").trim();
}
