interface HeadingStackItem
{

  readonly title: string;
  readonly depth: number;

}

function matchHeadingTitle(headingTitle: string, targetTitle: string): boolean
{
  return headingTitle === targetTitle || headingTitle.replace(/^`|`$/g, "") === targetTitle;
}

export function extractMarkdownParagraph(
  markdown: string,
  sectionPath: readonly string[] | string
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
    if (line.trim().startsWith("```") || line.trim().startsWith("~~~"))
    {
      isInCodeBlock = !isInCodeBlock;
    }

    if (!isInCodeBlock)
    {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match)
      {
        const depth = match[1].length;
        const currentTitle = match[2].replace(/\s+#+$/, "").trim();

        if (isCapturing)
        {
          // We stop capturing when encountering a heading of the same or higher level.
          if (depth <= targetDepth)
          {
            break;
          }
        }
        else
        {
          // We maintain the active heading hierarchy stack.
          while (
            headingStack.length > 0 &&
            headingStack[headingStack.length - 1].depth >= depth
          )
          {
            headingStack.pop();
          }

          headingStack.push({
            title: currentTitle,
            depth: depth
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

              if (!matchHeadingTitle(stackItem.title, expectedTitle))
              {
                hasMatched = false;
                break;
              }
            }

            if (hasMatched)
            {
              targetDepth = depth;
              isCapturing = true;
              continue;
            }
          }
        }
      }
    }

    if (isCapturing)
    {
      resultLines.push(line);
    }
  }

  return isCapturing ? resultLines.join("\n").trim() : undefined;
}

