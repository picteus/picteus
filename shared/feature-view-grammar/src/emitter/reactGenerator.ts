// noinspection JSXUnresolvedComponent,TypeScriptMissingConfigOption,JSUnresolvedReference,BadExpressionStatementJS

import { GrammarModel, GrammarProperty, GrammarSpec } from "./typespecModel.js";


const MANTINE_IMPORTS: readonly string[] = [
  "Accordion",
  "ActionIcon",
  "Anchor",
  "Badge",
  "Box",
  "Button",
  "Card",
  "Code",
  "ColorSwatch",
  "CopyButton",
  "Divider",
  "Flex",
  "Grid",
  "Image",
  "Progress",
  "Rating",
  "Table",
  "Text",
  "Tooltip"
];

const TABLER_ICON_IMPORTS: readonly string[] = [
  "IconCheck",
  "IconCopy",
  "IconExternalLink"
];

function computeTypeScriptImports(spec: GrammarSpec): string[]
{
  const importNames = new Set<string>();

  // We include polymorphic base types (e.g., UiElement, ActionElement)
  for (const polymorphicRoot of spec.polymorphicRoots)
  {
    importNames.add(polymorphicRoot.name);
  }

  // We include root model (e.g., FeatureBlock)
  if (spec.rootModel)
  {
    importNames.add(spec.rootModel.name);
  }

  // We include all grammar enums (e.g., ButtonVariant, DividerStyle, Emphasis, etc.)
  for (const grammarEnum of spec.enums)
  {
    importNames.add(grammarEnum.name);
  }

  // We include all concrete UI element models
  for (const elementModel of spec.uiElements)
  {
    importNames.add(elementModel.name);
  }

  // We include all concrete Action element models
  for (const actionModel of spec.actionElements)
  {
    importNames.add(actionModel.name);
  }

  return Array.from(importNames);
}

function findModelProperty(
  model: GrammarModel,
  predicate: (property: GrammarProperty) => boolean,
  fallbackName: string
): GrammarProperty | undefined
{
  return model.properties.find(predicate) ?? model.properties.find((property) => property.name === fallbackName);
}

function wrapWithCopyableModifier(nodeExpression: string, valueExpression: string = "element.value"): string
{
  return [
    `  const node = ${nodeExpression};`,
    ``,
    `  if (element.modifiers?.copyable)`,
    `  {`,
    `    return <CopyableWrapper value={${valueExpression}}>{node}</CopyableWrapper>;`,
    `  }`,
    `  return node;`
  ].join("\n");
}

function generateTypographyModifiers(): string
{
  return [
    `  const isStrong = element.modifiers?.emphasis === Emphasis.strong;`,
    `  const isMuted = element.modifiers?.emphasis === Emphasis.muted;`,
    `  const isMono = Boolean(element.modifiers?.monospace);`
  ].join("\n");
}

function generateComponentDefinition(
  componentName: string,
  propsTypeName: string,
  primaryPropName: string,
  primaryPropType: string,
  bodyContent: string
): string
{
  const propsTypeBlock = [
    `export type ${propsTypeName} =`,
    `{`,
    `  readonly ${primaryPropName}: ${primaryPropType};`,
    `  readonly onAction?: (action: ActionElement) => void;`,
    `  readonly className?: string;`,
    `  readonly style?: React.CSSProperties;`,
    `};`
  ].join("\n");

  const componentFunctionBlock = [
    `export function ${componentName}({ ${primaryPropName}, onAction, className, style }: ${propsTypeName}): ReactNode`,
    `{`,
    bodyContent,
    `}`
  ].join("\n");

  return `${propsTypeBlock}\n\n${componentFunctionBlock}`;
}

function generateCopyableWrapper(): string
{
  return [
    `type CopyableWrapperPropsType =`,
    `{`,
    `  readonly value: string;`,
    `  readonly children: ReactNode;`,
    `};`,
    ``,
    `function CopyableWrapper({ value, children }: CopyableWrapperPropsType): ReactNode`,
    `{`,
    `  return (`,
    `    <Flex align="center" gap={4} component="span" style={{ display: "inline-flex", verticalAlign: "middle" }}>`,
    `      {children}`,
    `      <CopyButton value={value} timeout={1500}>`,
    `        {({ copied, copy }) => (`,
    `          <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="right">`,
    `            <ActionIcon`,
    `              color={copied ? "teal" : "gray"}`,
    `              variant="subtle"`,
    `              size="xs"`,
    `              onClick={(event) =>`,
    `              {`,
    `                event.stopPropagation();`,
    `                copy();`,
    `              }}`,
    `            >`,
    `              {copied ? <IconCheck size={12}/> : <IconCopy size={12}/>}`,
    `            </ActionIcon>`,
    `          </Tooltip>`,
    `        )}`,
    `      </CopyButton>`,
    `    </Flex>`,
    `  );`,
    `}`
  ].join("\n");
}

function generateUiElementComponent(model: GrammarModel): string
{
  return generateComponentDefinition(
    `${model.name}View`,
    `${model.name}ViewPropsType`,
    "element",
    model.name,
    generateModelRenderBody(model)
  );
}

function generateActionElementComponent(model: GrammarModel): string
{
  let body: string;
  if (model.discriminatorValue === "button")
  {
    body = [
      `  const variantMap =`,
      `    {`,
      `      [ButtonVariant.primary]: "filled",`,
      `      [ButtonVariant.secondary]: "light",`,
      `      [ButtonVariant.subtle]: "subtle",`,
      `      [ButtonVariant.danger]: "filled"`,
      `    } as const;`,
      ``,
      `  return (`,
      `    <Button`,
      `      size="xs"`,
      `      variant={variantMap[action.variant ?? ButtonVariant.secondary]}`,
      `      color={action.variant === ButtonVariant.danger ? "red" : undefined}`,
      `      disabled={action.disabled}`,
      `      onClick={() => onAction?.(action)}`,
      `      className={className}`,
      `      style={style}`,
      `    >`,
      `      {action.label}`,
      `    </Button>`,
      `  );`
    ].join("\n");
  }
  else
  {
    body = [
      `  return (`,
      `    <Button`,
      `      component="a"`,
      `      href={action.url}`,
      `      target="_blank"`,
      `      rel="noopener noreferrer"`,
      `      size="xs"`,
      `      variant="subtle"`,
      `      rightSection={<IconExternalLink size={12}/>}`,
      `      className={className}`,
      `      style={style}`,
      `    >`,
      `      {action.label}`,
      `    </Button>`,
      `  );`
    ].join("\n");
  }

  return generateComponentDefinition(
    `${model.name}View`,
    `${model.name}ViewPropsType`,
    "action",
    model.name,
    body
  );
}

function generateModelRenderBody(model: GrammarModel): string
{
  // We inspect layout strategies
  if (model.uiLayout === "row")
  {
    return generateRowLayoutBody(model);
  }
  if (model.uiLayout === "row-slots")
  {
    return generateRowSlotsLayoutBody();
  }
  if (model.uiLayout === "table")
  {
    return generateTableLayoutBody();
  }
  if (model.uiLayout === "accordion")
  {
    return generateAccordionLayoutBody();
  }
  if (model.uiLayout === "repeating-group")
  {
    return generateRepeatingGroupLayoutBody();
  }

  // We inspect widget strategies
  switch (model.uiWidget)
  {
    case "meter":
      return generateMeterWidgetBody(model);
    case "number-stars":
      return generateStarsWidgetBody(model);
    case "string-short":
      return generateStringShortWidgetBody();
    case "string-long":
      return generateStringLongWidgetBody();
    case "string-code":
      return generateStringCodeWidgetBody();
    case "string-url":
      return generateStringUrlWidgetBody();
    case "identifier":
      return generateIdentifierWidgetBody();
    case "ratio":
      return generateRatioWidgetBody();
    case "color-swatch":
      return generateColorSwatchWidgetBody();
    case "color-set":
      return generateColorSetWidgetBody();
    case "number-unbounded":
      return generateNumberUnboundedWidgetBody();
    case "boolean-plain":
      return generateBooleanPlainWidgetBody();
    case "boolean-badge":
      return generateBooleanBadgeWidgetBody();
    case "timestamp":
      return generateTimestampWidgetBody();
    case "image-ref":
      return generateImageReferenceWidgetBody();
    case "divider":
      return generateDividerWidgetBody();
    case "markdown":
      return generateMarkdownWidgetBody();
    case "html":
      return generateHtmlWidgetBody();
    default:
      return generateFallbackWidgetBody(model);
  }
}

function generateRowLayoutBody(model: GrammarModel): string
{
  const labelProperty = findModelProperty(model, (property) => property.isUiLabel === true, "label");
  const valueProperty = findModelProperty(model, (property) => property.isUiValue === true, "value");
  const dividerProperty = findModelProperty(model, (property) => property.uiDivider !== undefined, "withDivider");

  const labelExpression = labelProperty ? `element.${labelProperty.name}` : `""`;
  const valueExpression = valueProperty ? `element.${valueProperty.name}` : `null`;
  const withDividerCondition = dividerProperty ? `element.${dividerProperty.name}` : `false`;

  return [
    `  return (`,
    `    <Box className={className} style={{ width: "100%", ...style }}>`,
    `      <Flex align="center" gap="xs" py={4}>`,
    `        <Text size="sm" fw={500} c="dimmed" style={{ flexShrink: 0, userSelect: "none" }}>`,
    `          {${labelExpression}}`,
    `        </Text>`,
    `        <Divider orientation="vertical" h={16}/>`,
    `        <Box style={{ flex: 1, minWidth: 0 }}>`,
    `          <UiElementView element={${valueExpression}} onAction={onAction}/>`,
    `        </Box>`,
    `      </Flex>`,
    `      {${withDividerCondition} && <Divider mt={4}/>}`,
    `    </Box>`,
    `  );`
  ].join("\n");
}

function generateRowSlotsLayoutBody(): string
{
  return [
    `  return (`,
    `    <Flex align="center" gap="xs" className={className} style={{ width: "100%", ...style }}>`,
    `      {element.slots.map((slot, slotIndex) => (`,
    `        <Box key={slotIndex} style={{ flex: slot.width ?? 1, minWidth: 0 }}>`,
    `          <UiElementView element={slot.content} onAction={onAction}/>`,
    `        </Box>`,
    `      ))}`,
    `    </Flex>`,
    `  );`
  ].join("\n");
}

function generateMeterWidgetBody(model: GrammarModel): string
{
  const minimumProperty = findModelProperty(model, (property) => property.uiMeterBound === "minimum", "minimum");
  const maximumProperty = findModelProperty(model, (property) => property.uiMeterBound === "maximum", "maximum");
  const labelProperty = findModelProperty(model, (property) => property.uiMeterBound === "label", "label");
  const unitProperty = findModelProperty(model, (property) => property.uiMeterBound === "unit", "unit");

  const minimumExpression = minimumProperty ? `element.${minimumProperty.name} ?? 0` : `0`;
  const maximumExpression = maximumProperty ? `element.${maximumProperty.name} ?? 100` : `100`;
  const labelExpression = labelProperty ? `element.${labelProperty.name}` : `undefined`;
  const unitExpression = unitProperty ? `element.${unitProperty.name}` : `undefined`;

  return [
    `  const minimumValue = ${minimumExpression};`,
    `  const maximumValue = ${maximumExpression};`,
    `  const label = ${labelExpression};`,
    `  const unit = ${unitExpression};`,
    `  const percentage = Math.min(100, Math.max(0, ((element.value - minimumValue) / (maximumValue - minimumValue)) * 100));`,
    ``,
    `  return (`,
    `    <Flex align="center" gap="xs" className={className} style={{ width: "100%", ...style }}>`,
    `      <Progress value={percentage} size="sm" radius="xl" style={{ flex: 1 }}/>`,
    `      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>`,
    `        {label ?? \`\${element.value}\${unit ? \` \${unit}\` : ""}\`}`,
    `      </Text>`,
    `    </Flex>`,
    `  );`
  ].join("\n");
}

function generateStarsWidgetBody(model: GrammarModel): string
{
  const maximumProperty = findModelProperty(model, (property) => property.uiMeterBound === "maximum", "maximum");
  const maximumExpression = maximumProperty ? `element.${maximumProperty.name} ?? 5` : `5`;

  return [
    `  return (`,
    `    <Rating value={element.value} count={${maximumExpression}} fractions={2} readOnly size="sm" className={className} style={style}/>`,
    `  );`
  ].join("\n");
}

function generateStringShortWidgetBody(): string
{
  const typographyLines = generateTypographyModifiers();
  const nodeExpression = [
    `(`,
    `    isChip ? (`,
    `      <Badge size="sm" variant="light" className={className} style={style}>{element.value}</Badge>`,
    `    ) : (`,
    `      <Text size="sm" fw={isStrong ? 700 : 400} c={isMuted ? "dimmed" : undefined} ff={isMono ? "monospace" : undefined} className={className} style={style}>`,
    `        {element.value}`,
    `      </Text>`,
    `    )`,
    `  )`
  ].join("\n");

  return [
    `  const isChip = element.representation === StringShortRepresentation.chip;`,
    typographyLines,
    ``,
    wrapWithCopyableModifier(nodeExpression)
  ].join("\n");
}

function generateStringLongWidgetBody(): string
{
  const typographyLines = generateTypographyModifiers();
  const nodeExpression = [
    `(`,
    `    <Text size="sm" fw={isStrong ? 700 : 400} c={isMuted ? "dimmed" : undefined} ff={isMono ? "monospace" : undefined} style={{ whiteSpace: "pre-wrap", ...style }} className={className}>`,
    `      {element.value}`,
    `    </Text>`,
    `  )`
  ].join("\n");

  return [
    typographyLines,
    ``,
    wrapWithCopyableModifier(nodeExpression)
  ].join("\n");
}

function generateStringCodeWidgetBody(): string
{
  const nodeExpression = [
    `(`,
    `    <Code block className={className} style={{ width: "100%", ...style }}>`,
    `      {element.value}`,
    `    </Code>`,
    `  )`
  ].join("\n");

  return wrapWithCopyableModifier(nodeExpression);
}

function generateStringUrlWidgetBody(): string
{
  const nodeExpression = [
    `(`,
    `    <Anchor href={element.value} target="_blank" rel="noopener noreferrer" size="sm" className={className} style={{ display: "inline-flex", alignItems: "center", gap: 4, ...style }}>`,
    `      <span>{label}</span>`,
    `      <IconExternalLink size={12}/>`,
    `    </Anchor>`,
    `  )`
  ].join("\n");

  return [
    `  const label = element.label ?? element.value;`,
    wrapWithCopyableModifier(nodeExpression)
  ].join("\n");
}

function generateIdentifierWidgetBody(): string
{
  return wrapWithCopyableModifier(`<Code className={className} style={style}>{element.value}</Code>`);
}

function generateRatioWidgetBody(): string
{
  return [
    `  return <Badge variant="outline" size="sm" className={className} style={style}>{element.value}</Badge>;`
  ].join("\n");
}

function generateColorSwatchWidgetBody(): string
{
  const nodeExpression = [
    `(`,
    `    <Flex align="center" gap="xs" className={className} style={style}>`,
    `      <ColorSwatch color={element.value} size={16}/>`,
    `      <Text size="sm" ff="monospace">{element.value}</Text>`,
    `    </Flex>`,
    `  )`
  ].join("\n");

  return wrapWithCopyableModifier(nodeExpression);
}

function generateColorSetWidgetBody(): string
{
  return [
    `  return (`,
    `    <Flex align="center" gap={4} className={className} style={style}>`,
    `      {element.colors.map((color, colorIndex) => (`,
    `        <ColorSwatch key={colorIndex} color={color} size={18}/>`,
    `      ))}`,
    `    </Flex>`,
    `  );`
  ].join("\n");
}

function generateNumberUnboundedWidgetBody(): string
{
  return [
    `  const text = \`\${element.value}\${element.unit ? \` \${element.unit}\` : ""}\`;`,
    wrapWithCopyableModifier(`<Text size="sm" className={className} style={style}>{text}</Text>`, "text")
  ].join("\n");
}

function generateBooleanPlainWidgetBody(): string
{
  return [
    `  return <Text size="sm" className={className} style={style}>{String(element.value)}</Text>;`
  ].join("\n");
}

function generateBooleanBadgeWidgetBody(): string
{
  return [
    `  const label = element.value ? (element.trueLabel ?? "true") : (element.falseLabel ?? "false");`,
    `  const variantColor =`,
    `    {`,
    `      neutral: "gray",`,
    `      success: "teal",`,
    `      warning: "yellow",`,
    `      danger: "red"`,
    `    }[element.variant ?? "neutral"];`,
    ``,
    `  return <Badge color={variantColor} size="sm" variant="light" className={className} style={style}>{label}</Badge>;`
  ].join("\n");
}

function generateTimestampWidgetBody(): string
{
  return wrapWithCopyableModifier(`<Text size="sm" className={className} style={style}>{element.value}</Text>`);
}

function generateImageReferenceWidgetBody(): string
{
  return [
    `  return (`,
    `    <Image`,
    `      src={element.src}`,
    `      alt={element.alt}`,
    `      fallbackSrc={element.placeholder}`,
    `      radius="sm"`,
    `      className={className}`,
    `      style={{ aspectRatio: element.aspectRatio ?? "1/1", maxHeight: 180, objectFit: "cover", ...style }}`,
    `    />`,
    `  );`
  ].join("\n");
}

function generateTableLayoutBody(): string
{
  return [
    `  return (`,
    `    <Table striped highlightOnHover className={className} style={style}>`,
    `      {element.hasHeader !== false && element.columns && (`,
    `        <Table.Thead>`,
    `          <Table.Tr>`,
    `            {element.columns.map((column, columnIndex) => (`,
    `              <Table.Th key={columnIndex} style={{ textAlign: column.align ?? "left", width: column.width }}>`,
    `                {column.header ?? ""}`,
    `              </Table.Th>`,
    `            ))}`,
    `          </Table.Tr>`,
    `        </Table.Thead>`,
    `      )}`,
    `      <Table.Tbody>`,
    `        {element.rows.map((row, rowIndex) => (`,
    `          <Table.Tr key={rowIndex}>`,
    `            {row.cells.map((cell, cellIndex) => (`,
    `              <Table.Td key={cellIndex}>`,
    `                {typeof cell === "string" ? cell : <UiElementView element={cell} onAction={onAction}/>}`,
    `              </Table.Td>`,
    `            ))}`,
    `          </Table.Tr>`,
    `        ))}`,
    `      </Table.Tbody>`,
    `    </Table>`,
    `  );`
  ].join("\n");
}

function generateRepeatingGroupLayoutBody(): string
{
  return [
    `  return (`,
    `    <Box className={className} style={{ width: "100%", ...style }}>`,
    `      {element.title && <Text fw={600} size="sm" mb="xs">{element.title}</Text>}`,
    `      <Flex direction="column" gap="xs">`,
    `        {element.entries.map((entry, entryIndex) => (`,
    `          <Box key={entryIndex} p="xs" style={{ border: "1px solid var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-sm)" }}>`,
    `            <Text fw={500} size="sm" c="dimmed">{entry.label}</Text>`,
    `            {entry.value && (typeof entry.value === "string" ? <Text size="sm">{entry.value}</Text> : <UiElementView element={entry.value} onAction={onAction}/>)}`,
    `            {entry.elements && entry.elements.map((childElement, childIndex) => (`,
    `              <UiElementView key={childIndex} element={childElement} onAction={onAction}/>`,
    `            ))}`,
    `          </Box>`,
    `        ))}`,
    `      </Flex>`,
    `    </Box>`,
    `  );`
  ].join("\n");
}

function generateAccordionLayoutBody(): string
{
  return [
    `  return (`,
    `    <Accordion defaultValue={element.defaultExpanded ? "group" : undefined} variant="separated" className={className} style={style}>`,
    `      <Accordion.Item value="group">`,
    `        <Accordion.Control>`,
    `          <Flex align="center" justify="space-between" pr="sm">`,
    `            <Text size="sm" fw={500}>{element.title}</Text>`,
    `            {element.summary && <Badge size="xs" variant="light" color="gray">{element.summary}</Badge>}`,
    `          </Flex>`,
    `        </Accordion.Control>`,
    `        <Accordion.Panel>`,
    `          <Flex direction="column" gap="xs">`,
    `            {element.elements.map((childElement, childIndex) => (`,
    `              <UiElementView key={childIndex} element={childElement} onAction={onAction}/>`,
    `            ))}`,
    `          </Flex>`,
    `        </Accordion.Panel>`,
    `      </Accordion.Item>`,
    `    </Accordion>`,
    `  );`
  ].join("\n");
}

function generateDividerWidgetBody(): string
{
  return [
    `  const isDashed = element.style === DividerStyle.dashed;`,
    `  return <Divider variant={isDashed ? "dashed" : "solid"} className={className} style={style}/>;`
  ].join("\n");
}

function generateMarkdownWidgetBody(): string
{
  return [
    `  return <Text size="sm" style={{ whiteSpace: "pre-wrap", ...style }} className={className}>{element.content}</Text>;`
  ].join("\n");
}

function generateHtmlWidgetBody(): string
{
  return [
    `  return <Box dangerouslySetInnerHTML={{ __html: element.content }} className={className} style={style}/>;`
  ].join("\n");
}

function generateFallbackWidgetBody(_model: GrammarModel): string
{
  return [
    `  return <Box className={className} style={style}><Code>{JSON.stringify(element)}</Code></Box>;`
  ].join("\n");
}

function generatePolymorphicDispatcher(
  componentName: string,
  propsTypeName: string,
  propName: "element" | "action",
  propType: "UiElement" | "ActionElement",
  models: GrammarModel[]
): string
{
  const switchLines: string[] = [
    `  switch (${propName}.type)`,
    `  {`
  ];

  for (const model of models)
  {
    switchLines.push(`    case "${model.discriminatorValue}":`);
    switchLines.push(`      return <${model.name}View ${propName}={${propName}} onAction={onAction} className={className} style={style}/>;`);
  }

  switchLines.push(`    default:`);
  switchLines.push(`      return null;`);
  switchLines.push(`  }`);

  return generateComponentDefinition(
    componentName,
    propsTypeName,
    propName,
    propType,
    switchLines.join("\n")
  );
}

function generateFeatureBlockComponent(rootModel: GrammarModel): string
{
  const body = [
    `  return (`,
    `    <Card shadow="xs" padding="sm" radius="md" withBorder className={className} style={style}>`,
    `      <Card.Section inheritPadding py="xs">`,
    `        <Text fw={600} size="sm">{block.title}</Text>`,
    `        {block.description && <Text size="xs" c="dimmed">{block.description}</Text>}`,
    `      </Card.Section>`,
    ``,
    `      <Flex direction="column" gap="xs" my="xs">`,
    `        {block.elements.map((element, elementIndex) => (`,
    `          <UiElementView key={elementIndex} element={element} onAction={onAction}/>`,
    `        ))}`,
    `      </Flex>`,
    ``,
    `      {block.actions && block.actions.length > 0 && (`,
    `        <Card.Section inheritPadding py="xs">`,
    `          <Flex gap="xs" justify="flex-end">`,
    `            {block.actions.map((action, actionIndex) => (`,
    `              <ActionElementView key={actionIndex} action={action} onAction={onAction}/>`,
    `            ))}`,
    `          </Flex>`,
    `        </Card.Section>`,
    `      )}`,
    `    </Card>`,
    `  );`
  ].join("\n");

  return generateComponentDefinition(
    `${rootModel.name}View`,
    `${rootModel.name}ViewPropsType`,
    "block",
    rootModel.name,
    body
  );
}

export function generateReactCode(spec: GrammarSpec): string
{
  const componentBlocks: string[] = [];

  // We generate generic CopyableWrapper
  componentBlocks.push(generateCopyableWrapper());

  // We generate component views for all UiElement models
  for (const elementModel of spec.uiElements)
  {
    componentBlocks.push(generateUiElementComponent(elementModel));
  }

  // We generate component views for all ActionElement models
  for (const actionModel of spec.actionElements)
  {
    componentBlocks.push(generateActionElementComponent(actionModel));
  }

  // We generate universal ActionElement dispatcher
  componentBlocks.push(
    generatePolymorphicDispatcher(
      "ActionElementView",
      "ActionElementViewPropsType",
      "action",
      "ActionElement",
      spec.actionElements
    )
  );

  // We generate universal UiElement dispatcher
  componentBlocks.push(
    generatePolymorphicDispatcher(
      "UiElementView",
      "UiElementViewPropsType",
      "element",
      "UiElement",
      spec.uiElements
    )
  );

  // We generate root FeatureBlockView component
  if (spec.rootModel)
  {
    componentBlocks.push(generateFeatureBlockComponent(spec.rootModel));
  }

  // We assemble file header with exact imports
  const typeImports = computeTypeScriptImports(spec);

  const headerLines: string[] = [
    `import React, { ReactNode } from "react";`,
    `import {`,
    MANTINE_IMPORTS.map((importName) => `  ${importName}`).join(",\n"),
    `} from "@mantine/core";`,
    `import {`,
    TABLER_ICON_IMPORTS.map((iconName) => `  ${iconName}`).join(",\n"),
    `} from "@tabler/icons-react";`,
    ``,
    `import {`,
    typeImports.map((typeName) => `  ${typeName}`).join(",\n"),
    `} from "@picteus/shared-core";`
  ];

  return [
    headerLines.join("\n"),
    "",
    componentBlocks.join("\n\n"),
    ""
  ].join("\n");
}
