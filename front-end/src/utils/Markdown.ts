export function extractMarkdownParagraph(markdown: string, paragraphTitle: string): string | null
{
  const lines = markdown.split("\n");
  let inCodeBlock = false;
  let targetDepth = -1;
  let capturing = false;
  const resultLines: string[] = [];

  for (const line of lines)
  {
    if (line.trim().startsWith("```"))
    {
      inCodeBlock = !inCodeBlock;
    }

    if (!inCodeBlock)
    {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match)
      {
        const depth = match[1].length;
        const currentTitle = match[2].trim();

        if (capturing)
        {
          // If we are already capturing and encounter a heading of the same or higher level,
          // it means the target paragraph has ended.
          if (depth <= targetDepth)
          {
            break;
          }
        }
        else if (currentTitle === paragraphTitle)
        {
          // Found the target paragraph title
          targetDepth = depth;
          capturing = true;
          continue; // Skip adding the title line itself
        }
      }
    }

    if (capturing)
    {
      resultLines.push(line);
    }
  }

  return capturing ? resultLines.join("\n").trim() : null;
}
