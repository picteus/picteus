// noinspection JSXUnresolvedComponent,TypeScriptMissingConfigOption,JSUnresolvedReference,BadExpressionStatementJS

import { GrammarModel, GrammarProperty, GrammarSpec } from "./typespecModel.js";


const PROPS_TYPE_SUFFIX = "PropsType";
const VIEW_SUFFIX = "View";
const COPYABLE_WRAPPER_NAME = "CopyableWrapper";
const UI_ELEMENT_ROOT_NAME = "UiElement";
const ACTION_ELEMENT_ROOT_NAME = "ActionElement";
const UI_ELEMENT_VIEW_NAME = `${UI_ELEMENT_ROOT_NAME}${VIEW_SUFFIX}`;
const ACTION_ELEMENT_VIEW_NAME = `${ACTION_ELEMENT_ROOT_NAME}${VIEW_SUFFIX}`;
const SHARED_CORE_PACKAGE = "@picteus/shared-core";

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

  // We include root models (e.g., Feature, FeatureBlock)
  const rootModels = spec.rootModels.length > 0 ? spec.rootModels : (spec.rootModel ? [ spec.rootModel ] : []);
  for (const rootModel of rootModels)
  {
    importNames.add(rootModel.name);
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
    `    return <${COPYABLE_WRAPPER_NAME} value={${valueExpression}}>{node}</${COPYABLE_WRAPPER_NAME}>;`,
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
  const propsTypeName = `${COPYABLE_WRAPPER_NAME}${PROPS_TYPE_SUFFIX}`;

  return [
    `type ${propsTypeName} =`,
    `{`,
    `  readonly value: string;`,
    `  readonly children: ReactNode;`,
    `};`,
    ``,
    `function ${COPYABLE_WRAPPER_NAME}({ value, children }: ${propsTypeName}): ReactNode`,
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

function computeCustomRendererSlotName(model: GrammarModel): string
{
  if (model.discriminatorValue)
  {
    return toLowerCamelCase(model.discriminatorValue.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase()));
  }

  let baseName = model.name;
  if (baseName.endsWith("Element"))
  {
    baseName = baseName.slice(0, -"Element".length);
  }
  return toLowerCamelCase(baseName);
}

function generateElementRendererContext(): string
{
  return [
    `export type ElementRendererContext =`,
    `{`,
    `  readonly onAction?: (action: ActionElement) => void;`,
    `  readonly className?: string;`,
    `  readonly style?: React.CSSProperties;`,
    `};`
  ].join("\n");
}

function generateUiElementViewRenderers(spec: GrammarSpec): string
{
  const customModels = spec.uiElements.filter((model) => model.isCustomRenderer);
  const rendererFields: string[] = [];

  for (const model of customModels)
  {
    const slotName = computeCustomRendererSlotName(model);
    rendererFields.push(`  readonly ${slotName}?: (element: ${model.name}, context: ElementRendererContext) => ReactNode;`);
  }

  if (rendererFields.length === 0)
  {
    return [
      `export type UiElementViewRenderers = Record<string, never>;`
    ].join("\n");
  }

  return [
    `export type UiElementViewRenderers =`,
    `{`,
    rendererFields.join("\n"),
    `};`
  ].join("\n");
}

function generateUiElementViewContextAndProvider(): string
{
  return [
    `export type UiElementViewContextType =`,
    `{`,
    `  readonly renderers?: UiElementViewRenderers;`,
    `};`,
    ``,
    `const UiElementViewContext = React.createContext<UiElementViewContextType>(`,
    `  {`,
    `    renderers: undefined`,
    `  }`,
    `);`,
    ``,
    `export function useUiElementViewContext(): UiElementViewContextType`,
    `{`,
    `  return React.useContext(UiElementViewContext);`,
    `}`,
    ``,
    `export type UiElementViewProviderPropsType =`,
    `{`,
    `  readonly renderers?: UiElementViewRenderers;`,
    `  readonly children: ReactNode;`,
    `};`,
    ``,
    `export function UiElementViewProvider({ renderers, children }: UiElementViewProviderPropsType): ReactNode`,
    `{`,
    `  return (`,
    `    <UiElementViewContext.Provider value={{ renderers }}>`,
    `      {children}`,
    `    </UiElementViewContext.Provider>`,
    `  );`,
    `}`
  ].join("\n");
}

function generateUiElementComponent(model: GrammarModel): string
{
  const componentName = `${model.name}${VIEW_SUFFIX}`;
  const propsTypeName = `${componentName}${PROPS_TYPE_SUFFIX}`;
  let renderBody = generateModelRenderBody(model);

  if (model.isCustomRenderer)
  {
    const slotName = computeCustomRendererSlotName(model);
    const delegationLines: string[] = [
      `  const { renderers } = useUiElementViewContext();`,
      ``,
      `  if (renderers?.${slotName})`,
      `  {`,
      `    return renderers.${slotName}(element, { onAction, className, style });`,
      `  }`
    ];

    if (model.name === "StringCodeElement")
    {
      delegationLines.push(
        `  if (element.language === CodeLanguage.xml && renderers?.xml)`,
        `  {`,
        `    return renderers.xml({ type: "xml", value: element.value, modifiers: element.modifiers }, { onAction, className, style });`,
        `  }`,
        `  if (element.language === CodeLanguage.json && renderers?.json)`,
        `  {`,
        `    return renderers.json({ type: "json", value: element.value, modifiers: element.modifiers }, { onAction, className, style });`,
        `  }`
      );
    }

    renderBody = [
      ...delegationLines,
      ``,
      renderBody
    ].join("\n");
  }

  return generateComponentDefinition(
    componentName,
    propsTypeName,
    "element",
    model.name,
    renderBody
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

  const componentName = `${model.name}${VIEW_SUFFIX}`;
  const propsTypeName = `${componentName}${PROPS_TYPE_SUFFIX}`;

  return generateComponentDefinition(
    componentName,
    propsTypeName,
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
    case "xml":
    case "json":
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
    `        <Divider orientation="vertical"/>`,
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
    `                {typeof cell === "string" ? cell : <${UI_ELEMENT_VIEW_NAME} element={cell} onAction={onAction}/>}`,
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
    `            {entry.value && (typeof entry.value === "string" ? <Text size="sm">{entry.value}</Text> : <${UI_ELEMENT_VIEW_NAME} element={entry.value} onAction={onAction}/>)}`,
    `            {entry.elements && entry.elements.map((childElement, childIndex) => (`,
    `              <${UI_ELEMENT_VIEW_NAME} key={childIndex} element={childElement} onAction={onAction}/>`,
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
    `              <${UI_ELEMENT_VIEW_NAME} key={childIndex} element={childElement} onAction={onAction}/>`,
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
  return wrapWithCopyableModifier(
    `<Text size="sm" style={{ whiteSpace: "pre-wrap", ...style }} className={className}>{element.content}</Text>`,
    "element.content"
  );
}

function generateHtmlWidgetBody(): string
{
  return wrapWithCopyableModifier(
    `<Box dangerouslySetInnerHTML={{ __html: element.content }} className={className} style={style}/>`,
    "element.content"
  );
}

function generateFallbackWidgetBody(_model: GrammarModel): string
{
  return [
    `  return <Box className={className} style={style}><Code>{JSON.stringify(element)}</Code></Box>;`
  ].join("\n");
}

function generatePolymorphicDispatcher(
  rootName: typeof UI_ELEMENT_ROOT_NAME | typeof ACTION_ELEMENT_ROOT_NAME,
  propName: "element" | "action",
  models: GrammarModel[]
): string
{
  const componentName = `${rootName}${VIEW_SUFFIX}`;
  const propsTypeName = `${componentName}${PROPS_TYPE_SUFFIX}`;

  const switchLines: string[] = [
    `  switch (${propName}.type)`,
    `  {`
  ];

  for (const model of models)
  {
    const modelViewName = `${model.name}${VIEW_SUFFIX}`;
    switchLines.push(`    case "${model.discriminatorValue}":`);
    switchLines.push(`      return <${modelViewName} ${propName}={${propName}} onAction={onAction} className={className} style={style}/>;`);
  }

  switchLines.push(`    default:`);
  switchLines.push(`      return null;`);
  switchLines.push(`  }`);

  return generateComponentDefinition(
    componentName,
    propsTypeName,
    propName,
    rootName,
    switchLines.join("\n")
  );
}

function toLowerCamelCase(value: string): string
{
  if (value.length === 0)
  {
    return "";
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}

function generateRootContainerComponent(rootModel: GrammarModel): string
{
  const layout = rootModel.uiLayout ?? "card";
  const componentName = `${rootModel.name}${VIEW_SUFFIX}`;
  const propsTypeName = `${componentName}${PROPS_TYPE_SUFFIX}`;
  const propName = layout === "card" ? "block" : toLowerCamelCase(rootModel.name);

  const propsTypeBlock = [
    `export type ${propsTypeName} =`,
    `{`,
    `  readonly ${propName}: ${rootModel.name};`,
    `  readonly renderers?: UiElementViewRenderers;`,
    `  readonly onAction?: (action: ActionElement) => void;`,
    `  readonly className?: string;`,
    `  readonly style?: React.CSSProperties;`,
    `};`
  ].join("\n");

  let bodyContent: string;

  if (layout === "repeating-group")
  {
    bodyContent = [
      `  const context = useUiElementViewContext();`,
      `  const effectiveRenderers = renderers ?? context.renderers;`,
      ``,
      `  const content = (`,
      `    <Box className={className} style={{ width: "100%", ...style }}>`,
      `      <Flex direction="column" gap="xs">`,
      `        {${propName}.elements.map((element, elementIndex) => (`,
      `          <${UI_ELEMENT_VIEW_NAME} key={elementIndex} element={element} onAction={onAction}/>`,
      `        ))}`,
      `      </Flex>`,
      ``,
      `      {${propName}.actions && ${propName}.actions.length > 0 && (`,
      `        <Flex gap="xs" justify="flex-end" mt="xs">`,
      `          {${propName}.actions.map((action, actionIndex) => (`,
      `            <${ACTION_ELEMENT_VIEW_NAME} key={actionIndex} action={action} onAction={onAction}/>`,
      `          ))}`,
      `        </Flex>`,
      `      )}`,
      `    </Box>`,
      `  );`,
      ``,
      `  if (renderers)`,
      `  {`,
      `    return (`,
      `      <UiElementViewProvider renderers={effectiveRenderers}>`,
      `        {content}`,
      `      </UiElementViewProvider>`,
      `    );`,
      `  }`,
      ``,
      `  return content;`
    ].join("\n");
  }
  else
  {
    const hasTitle = rootModel.properties.some((property) => property.name === "title");
    const hasDescription = rootModel.properties.some((property) => property.name === "description");

    const headerSection = hasTitle ? [
      `      <Card.Section inheritPadding py="xs">`,
      `        <Text fw={600} size="sm">{${propName}.title}</Text>`,
      hasDescription ? `        {${propName}.description && <Text size="xs" c="dimmed">{${propName}.description}</Text>}` : ``,
      `      </Card.Section>`,
      ``
    ].filter(Boolean) : [];

    bodyContent = [
      `  const context = useUiElementViewContext();`,
      `  const effectiveRenderers = renderers ?? context.renderers;`,
      ``,
      `  const content = (`,
      `    <Card shadow="xs" padding="sm" radius="md" withBorder className={className} style={style}>`,
      ...headerSection,
      `      <Flex direction="column" gap="xs" my="xs">`,
      `        {${propName}.elements.map((element, elementIndex) => (`,
      `          <${UI_ELEMENT_VIEW_NAME} key={elementIndex} element={element} onAction={onAction}/>`,
      `        ))}`,
      `      </Flex>`,
      ``,
      `      {${propName}.actions && ${propName}.actions.length > 0 && (`,
      `        <Card.Section inheritPadding py="xs">`,
      `          <Flex gap="xs" justify="flex-end">`,
      `            {${propName}.actions.map((action, actionIndex) => (`,
      `              <${ACTION_ELEMENT_VIEW_NAME} key={actionIndex} action={action} onAction={onAction}/>`,
      `            ))}`,
      `          </Flex>`,
      `        </Card.Section>`,
      `      )}`,
      `    </Card>`,
      `  );`,
      ``,
      `  if (renderers)`,
      `  {`,
      `    return (`,
      `      <UiElementViewProvider renderers={effectiveRenderers}>`,
      `        {content}`,
      `      </UiElementViewProvider>`,
      `    );`,
      `  }`,
      ``,
      `  return content;`
    ].join("\n");
  }

  const componentFunctionBlock = [
    `export function ${componentName}({ ${propName}, renderers, onAction, className, style }: ${propsTypeName}): ReactNode`,
    `{`,
    bodyContent,
    `}`
  ].join("\n");

  return `${propsTypeBlock}\n\n${componentFunctionBlock}`;
}

export function generateReactCode(spec: GrammarSpec): string
{
  const componentBlocks: string[] = [];

  // We generate ElementRendererContext and UiElementViewRenderers
  componentBlocks.push(generateElementRendererContext());
  componentBlocks.push(generateUiElementViewRenderers(spec));

  // We generate UiElementViewContext, useUiElementViewContext, and UiElementViewProvider
  componentBlocks.push(generateUiElementViewContextAndProvider());

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
      ACTION_ELEMENT_ROOT_NAME,
      "action",
      spec.actionElements
    )
  );

  // We generate universal UiElement dispatcher
  componentBlocks.push(
    generatePolymorphicDispatcher(
      UI_ELEMENT_ROOT_NAME,
      "element",
      spec.uiElements
    )
  );

  // We generate root components (e.g. FeatureView, FeatureBlockView)
  const rootModels = spec.rootModels.length > 0 ? spec.rootModels : (spec.rootModel ? [ spec.rootModel ] : []);
  for (const rootModel of rootModels)
  {
    componentBlocks.push(generateRootContainerComponent(rootModel));
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
    `} from "${SHARED_CORE_PACKAGE}";`
  ];

  return [
    headerLines.join("\n"),
    "",
    componentBlocks.join("\n\n"),
    ""
  ].join("\n");
}
