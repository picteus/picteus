export interface TsDocParam
{

  readonly name: string;
  readonly description?: string;

}

export interface TsDocOptions
{

  readonly summary?: string;
  readonly remarks?: string;
  readonly params?: TsDocParam[];
  readonly returns?: string;
  readonly defaultValue?: string;
  readonly example?: string;

}

export interface CodeWriterOptions
{

  readonly indentSize?: number;
  readonly indentString?: string;
  readonly newLine?: string;

}

export class CodeWriter
{

  private readonly indentString: string;

  private readonly newLine: string;

  private indentationLevel: number = 0;

  private isStartOfLine: boolean = true;

  private readonly buffer: string[] = [];

  constructor(options: CodeWriterOptions)
  {
    this.indentString = options.indentString ?? " ".repeat(options.indentSize ?? 2);
    this.newLine = options.newLine ?? "\n";
  }

  write(text: string): this
  {
    if (text.length === 0)
    {
      return this;
    }

    const lines = text.split(this.newLine);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++)
    {
      const currentLine = lines[lineIndex];
      if (lineIndex > 0)
      {
        this.buffer.push(this.newLine);
        this.isStartOfLine = true;
      }

      if (currentLine.length > 0)
      {
        if (this.isStartOfLine)
        {
          this.buffer.push(this.indentString.repeat(this.indentationLevel));
          this.isStartOfLine = false;
        }
        this.buffer.push(currentLine);
      }
    }

    return this;
  }

  writeLine(text?: string): this
  {
    if (text !== undefined && text.length > 0)
    {
      this.write(text);
    }
    this.buffer.push(this.newLine);
    this.isStartOfLine = true;
    return this;
  }

  writeLines(lines: string[]): this
  {
    for (const line of lines)
    {
      this.writeLine(line);
    }
    return this;
  }

  blankLine(): this
  {
    if (this.buffer.length === 0)
    {
      return this;
    }

    const lastChunk = this.buffer[this.buffer.length - 1];
    if (lastChunk === this.newLine)
    {
      if (this.buffer.length >= 2 && this.buffer[this.buffer.length - 2] === this.newLine)
      {
        return this;
      }
    }

    this.buffer.push(this.newLine);
    this.isStartOfLine = true;
    return this;
  }

  indent(callback: () => void): this
  {
    this.indentationLevel++;
    try
    {
      callback();
    }
    finally
    {
      this.indentationLevel = Math.max(0, this.indentationLevel - 1);
    }
    return this;
  }

  allmanBlock(header: string, callback: () => void, suffix: string = ""): this
  {
    this.writeLine(header);
    this.writeLine("{");
    this.indent(callback);
    this.writeLine(`}${suffix}`);
    return this;
  }

  classBlock(header: string, callback: () => void, suffix: string = ""): this
  {
    this.writeLine(header);
    this.writeLine("{");
    this.blankLine();
    this.indent(callback);
    this.blankLine();
    this.writeLine(`}${suffix}`);
    return this;
  }

  interfaceBlock(header: string, callback: () => void): this
  {
    this.writeLine(header);
    this.writeLine("{");
    this.blankLine();
    this.indent(callback);
    this.blankLine();
    this.writeLine("}");
    return this;
  }

  pythonBlock(header: string, callback: () => void): this
  {
    this.writeLine(header);
    this.indent(callback);
    return this;
  }

  writeTsDoc(options: TsDocOptions): this
  {
    const rawLines: string[] = [];

    if (options.summary)
    {
      const summaryLines = options.summary.trim().split("\n");
      rawLines.push(...summaryLines.map((line) => line.trim()));
    }

    if (options.remarks)
    {
      if (rawLines.length > 0)
      {
        rawLines.push("");
      }
      rawLines.push("@remarks");
      const remarkLines = options.remarks.trim().split("\n");
      rawLines.push(...remarkLines.map((line) => line.trim()));
    }

    if (options.defaultValue !== undefined)
    {
      if (rawLines.length > 0)
      {
        rawLines.push("");
      }
      rawLines.push(`@defaultValue ${options.defaultValue}`);
    }

    if (options.params && options.params.length > 0)
    {
      if (rawLines.length > 0)
      {
        rawLines.push("");
      }
      for (const parameter of options.params)
      {
        const description = parameter.description ? ` - ${parameter.description.trim()}` : "";
        rawLines.push(`@param ${parameter.name}${description}`);
      }
    }

    if (options.returns)
    {
      if (rawLines.length > 0 && (!options.params || options.params.length === 0))
      {
        rawLines.push("");
      }
      rawLines.push(`@returns ${options.returns}`);
    }

    if (options.example)
    {
      if (rawLines.length > 0)
      {
        rawLines.push("");
      }
      rawLines.push("@example", "```typescript", options.example.trim(), "```");
    }

    if (rawLines.length === 0)
    {
      return this;
    }

    if (rawLines.length === 1 && !rawLines[0].startsWith("@"))
    {
      this.writeLine(`/** ${rawLines[0]} */`);
      return this;
    }

    this.writeLine("/**");
    for (const line of rawLines)
    {
      this.writeLine(line === "" ? " *" : ` * ${line}`);
    }
    this.writeLine(" */");
    return this;
  }

  writePythonDoc(doc?: string): this
  {
    if (!doc)
    {
      return this;
    }
    const lines = doc.trim().split("\n");
    if (lines.length === 1)
    {
      this.writeLine(`"""${lines[0].trim()}"""`);
      return this;
    }
    this.writeLine(`"""`);
    for (const line of lines)
    {
      this.writeLine(line.trim());
    }
    this.writeLine(`"""`);
    return this;
  }

  toString(): string
  {
    return this.buffer.join("");
  }

}
