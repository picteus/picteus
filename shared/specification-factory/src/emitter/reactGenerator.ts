// noinspection TypeScriptMissingConfigOption

import { GrammarSpec, ViewKitModel, ViewKitProperty } from "./typespecModel.js";


const PROPS_TYPE_SUFFIX = "PropsType";
const VIEW_SUFFIX = "View";
const COPYABLE_WRAPPER_NAME = "CopyableWrapper";
const UI_ELEMENT_ROOT_NAME = "UiElement";
const ACTION_ELEMENT_ROOT_NAME = "UiAction";
const UI_ELEMENT_VIEW_NAME = `${UI_ELEMENT_ROOT_NAME}${VIEW_SUFFIX}`;
const ACTION_ELEMENT_VIEW_NAME = `${ACTION_ELEMENT_ROOT_NAME}${VIEW_SUFFIX}`;
const SHARED_CORE_PACKAGE = "@picteus/shared-core";
const RENDERERS_PROP_NAME = "renderers";
const ON_ANCHOR_CLICK_PROP_NAME = "onAnchorClick";
const ON_ACTION_PROP_NAME = "onAction";
const UI_ELEMENT_VIEW_RENDERERS_TYPE_NAME = "UiElementViewRenderers";
const UI_ELEMENT_VIEW_CONTEXT_TYPE_NAME = "UiElementViewContextType";
const UI_ELEMENT_VIEW_CONTEXT_NAME = "UiElementViewContext";
const USE_UI_ELEMENT_VIEW_CONTEXT_NAME = "useUiElementViewContext";
const UI_ELEMENT_VIEW_PROVIDER_PROPS_TYPE_NAME = "UiElementViewProviderPropsType";
const UI_ELEMENT_VIEW_PROVIDER_NAME = "UiElementViewProvider";
const ELEMENT_RENDERER_CONTEXT_TYPE_NAME = "ElementRendererContext";

const MANTINE_IMPORTS: readonly string[] = [
  "Accordion",
  "ActionIcon",
  "Anchor",
  "Badge",
  "Box",
  "Button",
  "Card as MantineCard",
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

  // We include root models (e.g., UiContainer, UiCard)
  for (const rootModel of spec.rootModels)
  {
    importNames.add(rootModel.name);
  }

  // We include all ViewKit enums (e.g., ButtonVariant, DividerStyle, Emphasis, etc.)
  for (const viewKitEnum of spec.enums)
  {
    importNames.add(viewKitEnum.name);
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
  model: ViewKitModel,
  predicate: (property: ViewKitProperty) => boolean,
  fallbackName: string
): ViewKitProperty | undefined
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
    `  const fontWeight = element.modifiers?.weight === TextWeight.heavy ? 700 : (element.modifiers?.weight === TextWeight.thin ? 300 : 400);`,
    `  const textColor = element.modifiers?.intensity === TextIntensity.low ? "dimmed" : (element.modifiers?.intensity === TextIntensity.high ? "bright" : undefined);`,
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
    `  readonly onAction?: (action: ${ACTION_ELEMENT_ROOT_NAME}) => void;`,
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

function generateStyleConstants(): string
{
  return [
    `const CONSTRAINED_STYLE: React.CSSProperties =`,
    `{`,
    `  minWidth: 0,`,
    `  maxWidth: "100%"`,
    `};`,
    ``,
    `const FULL_WIDTH_CONSTRAINED_STYLE: React.CSSProperties =`,
    `{`,
    `  width: "100%",`,
    `  minWidth: 0,`,
    `  maxWidth: "100%"`,
    `};`,
    ``,
    `const ACCORDION_CONTAINED_STYLE: React.CSSProperties =`,
    `{`,
    `  minWidth: 0,`,
    `  maxWidth: "100%",`,
    `  overflow: "hidden"`,
    `};`,
    ``,
    `const TEXT_WRAP_STYLE: React.CSSProperties =`,
    `{`,
    `  overflowWrap: "anywhere",`,
    `  wordBreak: "break-word"`,
    `};`,
    ``,
    `const BREAK_ALL_STYLE: React.CSSProperties =`,
    `{`,
    `  overflowWrap: "anywhere",`,
    `  wordBreak: "break-all"`,
    `};`
  ].join("\n");
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
    `    <Flex align="center" gap={4} wrap="nowrap" component="span" style={{ display: "inline-flex", verticalAlign: "middle", ...CONSTRAINED_STYLE }}>`,
    `      <Box component="span" style={{ ...CONSTRAINED_STYLE, ...TEXT_WRAP_STYLE, flex: "0 1 auto" }}>`,
    `        {children}`,
    `      </Box>`,
    `      <CopyButton value={value} timeout={1500}>`,
    `        {({ copied, copy }) => (`,
    `          <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="right">`,
    `            <ActionIcon`,
    `              color={copied ? "teal" : "gray"}`,
    `              variant="subtle"`,
    `              size="xs"`,
    `              style={{ flexShrink: 0 }}`,
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

function generateRatioFormatterHelper(): string
{
  return [
    `export function formatRatio(value: number, maxDenominator: number = 1000): string`,
    `{`,
    `  if (typeof value !== "number" || Number.isFinite(value) === false || value <= 0)`,
    `  {`,
    `    return String(value ?? "");`,
    `  }`,
    ``,
    `  const tolerance = 1e-5;`,
    `  let previousNumerator = 0;`,
    `  let previousDenominator = 1;`,
    `  let currentNumerator = 1;`,
    `  let currentDenominator = 0;`,
    `  let remainder = value;`,
    ``,
    `  while (true)`,
    `  {`,
    `    const integerPart = Math.floor(remainder);`,
    `    const nextNumerator = integerPart * currentNumerator + previousNumerator;`,
    `    const nextDenominator = integerPart * currentDenominator + previousDenominator;`,
    ``,
    `    if (nextDenominator > maxDenominator)`,
    `    {`,
    `      break;`,
    `    }`,
    ``,
    `    previousNumerator = currentNumerator;`,
    `    previousDenominator = currentDenominator;`,
    `    currentNumerator = nextNumerator;`,
    `    currentDenominator = nextDenominator;`,
    ``,
    `    const fractionalPart = remainder - integerPart;`,
    `    if (fractionalPart < tolerance || Math.abs(value - currentNumerator / currentDenominator) < tolerance)`,
    `    {`,
    `      break;`,
    `    }`,
    ``,
    `    remainder = 1 / fractionalPart;`,
    `  }`,
    ``,
    `  if (currentDenominator === 0)`,
    `  {`,
    `    return \`\${value}:1\`;`,
    `  }`,
    ``,
    `  return \`\${currentNumerator}:\${currentDenominator}\`;`,
    `}`
  ].join("\n");
}

function generateTimestampFormatterHelper(): string
{
  return [
    `export function formatTimestamp(value: number, format?: TimestampFormat): string`,
    `{`,
    `  const numericValue = typeof value === "number" ? value : Number(value);`,
    `  const timestampInMilliseconds = Number.isNaN(numericValue) === false ? numericValue : Date.parse(String(value));`,
    `  const date = new Date(timestampInMilliseconds);`,
    ``,
    `  if (Number.isNaN(date.getTime()) === true)`,
    `  {`,
    `    return String(value ?? "");`,
    `  }`,
    ``,
    `  const offsetTotalMinutes = -date.getTimezoneOffset();`,
    `  const sign = offsetTotalMinutes >= 0 ? "+" : "-";`,
    `  const absoluteMinutes = Math.abs(offsetTotalMinutes);`,
    `  const offsetHours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");`,
    `  const offsetRemainingMinutes = String(absoluteMinutes % 60).padStart(2, "0");`,
    `  const offsetString = \`\${sign}\${offsetHours}:\${offsetRemainingMinutes}\`;`,
    ``,
    `  const year = date.getFullYear();`,
    `  const month = String(date.getMonth() + 1).padStart(2, "0");`,
    `  const day = String(date.getDate()).padStart(2, "0");`,
    `  const hours = String(date.getHours()).padStart(2, "0");`,
    `  const minutes = String(date.getMinutes()).padStart(2, "0");`,
    `  const seconds = String(date.getSeconds()).padStart(2, "0");`,
    ``,
    `  const datePart = \`\${year}-\${month}-\${day}\`;`,
    `  const timePart = \`\${hours}:\${minutes}:\${seconds}\`;`,
    ``,
    `  switch (format)`,
    `  {`,
    `    case TimestampFormat.date:`,
    `      return \`\${datePart}\`;`,
    `    case TimestampFormat.time:`,
    `      return \`\${timePart}\`;`,
    `    case TimestampFormat.relative:`,
    `    {`,
    `      const elapsedMilliseconds = Date.now() - date.getTime();`,
    `      const isFuture = elapsedMilliseconds < 0;`,
    `      const absoluteElapsedMilliseconds = Math.abs(elapsedMilliseconds);`,
    `      const elapsedSeconds = Math.floor(absoluteElapsedMilliseconds / 1000);`,
    `      const elapsedMinutes = Math.floor(elapsedSeconds / 60);`,
    `      const elapsedHours = Math.floor(elapsedMinutes / 60);`,
    `      const elapsedDays = Math.floor(elapsedHours / 24);`,
    ``,
    `      if (elapsedSeconds < 60)`,
    `      {`,
    `        return isFuture === true ? "in a few seconds" : "just now";`,
    `      }`,
    `      if (elapsedMinutes < 60)`,
    `      {`,
    `        return isFuture === true ? \`in \${elapsedMinutes}m\` : \`\${elapsedMinutes}m ago\`;`,
    `      }`,
    `      if (elapsedHours < 24)`,
    `      {`,
    `        return isFuture === true ? \`in \${elapsedHours}h\` : \`\${elapsedHours}h ago\`;`,
    `      }`,
    `      if (elapsedDays < 30)`,
    `      {`,
    `        return isFuture === true ? \`in \${elapsedDays}d\` : \`\${elapsedDays}d ago\`;`,
    `      }`,
    `      return \`\${datePart} \${timePart} \${offsetString}\`;`,
    `    }`,
    `    case TimestampFormat.datetime:`,
    `    default:`,
    `      return \`\${datePart} \${timePart}\`;`,
    `  }`,
    `}`
  ].join("\n");
}

function computeCustomRendererSlotName(model: ViewKitModel): string
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
    `export type ${ELEMENT_RENDERER_CONTEXT_TYPE_NAME} =`,
    `{`,
    `  readonly ${ON_ACTION_PROP_NAME}?: (action: ${ACTION_ELEMENT_ROOT_NAME}) => void;`,
    `  readonly ${ON_ANCHOR_CLICK_PROP_NAME}?: (event: React.MouseEvent<HTMLAnchorElement>, url: string) => void;`,
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
    rendererFields.push(`  readonly ${slotName}?: (element: ${model.name}, context: ${ELEMENT_RENDERER_CONTEXT_TYPE_NAME}) => ReactNode;`);
  }

  if (rendererFields.length === 0)
  {
    return [
      `export type ${UI_ELEMENT_VIEW_RENDERERS_TYPE_NAME} = Record<string, never>;`
    ].join("\n");
  }

  return [
    `export type ${UI_ELEMENT_VIEW_RENDERERS_TYPE_NAME} =`,
    `{`,
    rendererFields.join("\n"),
    `};`
  ].join("\n");
}

function generateUiElementViewContextAndProvider(): string
{
  return [
    `export type ${UI_ELEMENT_VIEW_CONTEXT_TYPE_NAME} =`,
    `{`,
    `  readonly ${RENDERERS_PROP_NAME}?: ${UI_ELEMENT_VIEW_RENDERERS_TYPE_NAME};`,
    `  readonly ${ON_ANCHOR_CLICK_PROP_NAME}?: (event: React.MouseEvent<HTMLAnchorElement>, url: string) => void;`,
    `};`,
    ``,
    `const ${UI_ELEMENT_VIEW_CONTEXT_NAME} = React.createContext<${UI_ELEMENT_VIEW_CONTEXT_TYPE_NAME}>(`,
    `  {`,
    `    ${RENDERERS_PROP_NAME}: undefined,`,
    `    ${ON_ANCHOR_CLICK_PROP_NAME}: undefined`,
    `  }`,
    `);`,
    ``,
    `export function ${USE_UI_ELEMENT_VIEW_CONTEXT_NAME}(): ${UI_ELEMENT_VIEW_CONTEXT_TYPE_NAME}`,
    `{`,
    `  return React.useContext(${UI_ELEMENT_VIEW_CONTEXT_NAME});`,
    `}`,
    ``,
    `export type ${UI_ELEMENT_VIEW_PROVIDER_PROPS_TYPE_NAME} =`,
    `{`,
    `  readonly ${RENDERERS_PROP_NAME}?: ${UI_ELEMENT_VIEW_RENDERERS_TYPE_NAME};`,
    `  readonly ${ON_ANCHOR_CLICK_PROP_NAME}?: (event: React.MouseEvent<HTMLAnchorElement>, url: string) => void;`,
    `  readonly children: ReactNode;`,
    `};`,
    ``,
    `export function ${UI_ELEMENT_VIEW_PROVIDER_NAME}({ ${RENDERERS_PROP_NAME}, ${ON_ANCHOR_CLICK_PROP_NAME}, children }: ${UI_ELEMENT_VIEW_PROVIDER_PROPS_TYPE_NAME}): ReactNode`,
    `{`,
    `  return (`,
    `    <${UI_ELEMENT_VIEW_CONTEXT_NAME}.Provider value={{ ${RENDERERS_PROP_NAME}, ${ON_ANCHOR_CLICK_PROP_NAME} }}>`,
    `      {children}`,
    `    </${UI_ELEMENT_VIEW_CONTEXT_NAME}.Provider>`,
    `  );`,
    `}`
  ].join("\n");
}

function generateUiElementComponent(model: ViewKitModel): string
{
  const componentName = `${model.name}${VIEW_SUFFIX}`;
  const propsTypeName = `${componentName}${PROPS_TYPE_SUFFIX}`;
  let renderBody = generateModelRenderBody(model);

  if (model.isCustomRenderer)
  {
    const slotName = computeCustomRendererSlotName(model);
    const delegationLines: string[] = [
      `  const { ${RENDERERS_PROP_NAME}, ${ON_ANCHOR_CLICK_PROP_NAME} } = ${USE_UI_ELEMENT_VIEW_CONTEXT_NAME}();`,
      ``,
      `  if (${RENDERERS_PROP_NAME}?.${slotName})`,
      `  {`,
      `    return ${RENDERERS_PROP_NAME}.${slotName}(element, { ${ON_ACTION_PROP_NAME}, ${ON_ANCHOR_CLICK_PROP_NAME}, className, style });`,
      `  }`
    ];

    if (model.name === "StringCodeElement")
    {
      delegationLines.push(
        `  if (element.language === CodeLanguage.xml && ${RENDERERS_PROP_NAME}?.xml)`,
        `  {`,
        `    return ${RENDERERS_PROP_NAME}.xml({ type: "xml", value: element.value, modifiers: element.modifiers }, { ${ON_ACTION_PROP_NAME}, ${ON_ANCHOR_CLICK_PROP_NAME}, className, style });`,
        `  }`,
        `  if (element.language === CodeLanguage.json && ${RENDERERS_PROP_NAME}?.json)`,
        `  {`,
        `    return ${RENDERERS_PROP_NAME}.json({ type: "json", value: element.value, modifiers: element.modifiers }, { ${ON_ACTION_PROP_NAME}, ${ON_ANCHOR_CLICK_PROP_NAME}, className, style });`,
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

function generateFreeFormElementComponent(): string
{
  const freeFormTypeAndHelper = [
    `export type FreeFormElement =`,
    `{`,
    `  readonly type: "free-form";`,
    `  readonly element: ReactNode;`,
    `  readonly className?: string;`,
    `  readonly style?: React.CSSProperties;`,
    `};`,
    ``,
    `export function freeForm(`,
    `  element: ReactNode,`,
    `  options?: { className?: string; style?: React.CSSProperties }`,
    `): FreeFormElement & UiElement`,
    `{`,
    `  return {`,
    `    type: "free-form",`,
    `    element,`,
    `    className: options?.className,`,
    `    style: options?.style`,
    `  } as unknown as FreeFormElement & UiElement;`,
    `}`
  ].join("\n");

  const componentDefinition = generateComponentDefinition(
    "FreeFormElementView",
    "FreeFormElementViewPropsType",
    "element",
    "ReactNode",
    [
      `  if (className || style)`,
      `  {`,
      `    return (`,
      `      <Box className={className} style={style}>`,
      `        {element}`,
      `      </Box>`,
      `    );`,
      `  }`,
      ``,
      `  return element;`
    ].join("\n")
  );

  return `${freeFormTypeAndHelper}\n\n${componentDefinition}`;
}

function generateActionElementComponent(model: ViewKitModel): string
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
      `      onClick={() => ${ON_ACTION_PROP_NAME}?.(action)}`,
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
      `  const { ${ON_ANCHOR_CLICK_PROP_NAME} } = ${USE_UI_ELEMENT_VIEW_CONTEXT_NAME}();`,
      ``,
      `  return (`,
      `    <Button`,
      `      component="a"`,
      `      href={action.url}`,
      `      target="_blank"`,
      `      rel="noopener noreferrer"`,
      `      size="xs"`,
      `      variant="subtle"`,
      `      rightSection={<IconExternalLink size={12}/>}`,
      `      onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>`,
      `      {`,
      `        ${ON_ACTION_PROP_NAME}?.(action);`,
      `        ${ON_ANCHOR_CLICK_PROP_NAME}?.(event, action.url);`,
      `      }}`,
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

function generateModelRenderBody(model: ViewKitModel): string
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
  if (model.uiLayout === "flowing")
  {
    return generateFlowingLayoutBody();
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
    case "color":
      return generateColorWidgetBody();
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

function generateRowLayoutBody(model: ViewKitModel): string
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
    `        <Box style={{ flex: 1, ...CONSTRAINED_STYLE }}>`,
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
    `        <Box key={slotIndex} style={{ flex: slot.width ?? 1, ...CONSTRAINED_STYLE }}>`,
    `          <UiElementView element={slot.content} onAction={onAction}/>`,
    `        </Box>`,
    `      ))}`,
    `    </Flex>`,
    `  );`
  ].join("\n");
}

function generateFlowingLayoutBody(): string
{
  return [
    `  return (`,
    `    <Flex wrap="wrap" align="center" gap="xs" className={className} style={{ width: "100%", ...style }}>`,
    `      {element.elements.map((childElement, childIndex) => (`,
    `        <UiElementView key={childIndex} element={childElement} onAction={onAction}/>`,
    `      ))}`,
    `    </Flex>`,
    `  );`
  ].join("\n");
}

function generateMeterWidgetBody(model: ViewKitModel): string
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

function generateStarsWidgetBody(model: ViewKitModel): string
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
    `      <Text size="sm" fw={fontWeight} c={textColor} ff={isMono ? "monospace" : undefined} className={className} style={{ ...TEXT_WRAP_STYLE, ...style }}>`,
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
    `    <Text size="sm" fw={fontWeight} c={textColor} ff={isMono ? "monospace" : undefined} style={{ whiteSpace: "pre-wrap", ...TEXT_WRAP_STYLE, ...style }} className={className}>`,
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
    `    <Code block className={className} style={{ ...FULL_WIDTH_CONSTRAINED_STYLE, whiteSpace: "pre-wrap", ...BREAK_ALL_STYLE, ...style }}>`,
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
    `    <Anchor`,
    `      href={element.value}`,
    `      target="_blank"`,
    `      rel="noopener noreferrer"`,
    `      size="sm"`,
    `      className={className}`,
    `      style={{ ...CONSTRAINED_STYLE, ...BREAK_ALL_STYLE, ...style }}`,
    `      onClick={${ON_ANCHOR_CLICK_PROP_NAME} ? (event) => ${ON_ANCHOR_CLICK_PROP_NAME}(event, element.value) : undefined}`,
    `    >`,
    `      <span style={{ ...BREAK_ALL_STYLE, minWidth: 0 }}>{label}</span>`,
    `      <IconExternalLink size={12} style={{ display: "inline-block", verticalAlign: "-1px", marginLeft: 4, flexShrink: 0 }}/>`,
    `    </Anchor>`,
    `  )`
  ].join("\n");

  return [
    `  const { ${ON_ANCHOR_CLICK_PROP_NAME} } = ${USE_UI_ELEMENT_VIEW_CONTEXT_NAME}();`,
    `  const label = element.label ?? element.value;`,
    wrapWithCopyableModifier(nodeExpression)
  ].join("\n");
}

function generateIdentifierWidgetBody(): string
{
  return wrapWithCopyableModifier(`<Code className={className} style={{ ...CONSTRAINED_STYLE, ...BREAK_ALL_STYLE, ...style }}>{element.value}</Code>`);
}

function generateRatioWidgetBody(): string
{
  const nodeExpression = `<Badge variant="outline" size="sm" className={className} style={style}>{formattedRatio}</Badge>`;
  return [
    `  const formattedRatio = formatRatio(element.value);`,
    wrapWithCopyableModifier(nodeExpression, "formattedRatio")
  ].join("\n");
}

function generateColorWidgetBody(): string
{
  const nodeExpression = [
    `showText ? (`,
    `      <Flex align="center" gap="xs" className={className} style={style}>`,
    `        {swatchNode}`,
    `        <Text size="sm" ff="monospace">{textContent}</Text>`,
    `      </Flex>`,
    `    ) : (`,
    `      <Box className={className} style={{ display: "inline-flex", ...style }}>`,
    `        {swatchNode}`,
    `      </Box>`,
    `    )`
  ].join("\n");

  return [
    `  const swatchSize =`,
    `    {`,
    `      [Size.small]: 16,`,
    `      [Size.medium]: 22,`,
    `      [Size.large]: 32`,
    `    }[element.size ?? Size.medium];`,
    `  const swatchRadius = element.shape === Shape.square ? "xs" : "xl";`,
    `  const textContent = element.label ?? element.value;`,
    `  const showText = element.showText ?? true;`,
    `  const swatchNode = <ColorSwatch color={element.value} size={swatchSize} radius={swatchRadius}/>;`,
    ``,
    wrapWithCopyableModifier(nodeExpression)
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
  const label = "element.value ? (element.trueLabel ?? \"true\") : (element.falseLabel ?? \"false\")";
  return [
    `  const label = ${label};`,
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
  const nodeExpression = `<Text size="sm" className={className} style={style}>{formattedTimestamp}</Text>`;
  return [
    `  const formattedTimestamp = formatTimestamp(element.value, element.format);`,
    wrapWithCopyableModifier(nodeExpression, "formattedTimestamp")
  ].join("\n");
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
    `  const columnCount = element.columns?.length ?? element.rows?.[0]?.cells?.length ?? 0;`,
    `  const columnsList = element.columns ?? Array.from({ length: columnCount }, () => ({ width: undefined, align: undefined, header: undefined }));`,
    ``,
    `  return (`,
    `    <Table striped={element.isStriped} highlightOnHover withColumnBorders={element.withColumnSeparators} withRowBorders={element.withRowSeparators} className={className} style={{ ...FULL_WIDTH_CONSTRAINED_STYLE, ...style }}>`,
    `      <colgroup>`,
    `        {columnsList.map((column, columnIndex) => (`,
    `          <col key={columnIndex} style={{ width: column.width ?? (columnIndex === 0 && columnCount > 1 ? "1%" : undefined) }}/>`,
    `        ))}`,
    `      </colgroup>`,
    `      {element.hasHeader !== false && element.columns && (`,
    `        <Table.Thead>`,
    `          <Table.Tr>`,
    `            {element.columns.map((column, columnIndex) => (`,
    `              <Table.Th key={columnIndex} style={{ textAlign: column.align ?? "left", width: column.width ?? (columnIndex === 0 && columnCount > 1 ? "1%" : undefined), minWidth: 0, ...TEXT_WRAP_STYLE, whiteSpace: column.width === undefined && columnIndex === 0 ? "nowrap" : undefined }}>`,
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
    `              <Table.Td key={cellIndex} style={{ textAlign: columnsList[cellIndex]?.align ?? "left", width: columnsList[cellIndex]?.width ?? (cellIndex === 0 && columnCount > 1 ? "1%" : undefined), minWidth: 0, ...TEXT_WRAP_STYLE, whiteSpace: columnsList[cellIndex]?.width === undefined && cellIndex === 0 ? "nowrap" : undefined }}>`,
    `                <${UI_ELEMENT_VIEW_NAME} element={cell} onAction={onAction}/>`,
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
    `    <Box className={className} style={{ ...FULL_WIDTH_CONSTRAINED_STYLE, ...style }}>`,
    `      {element.title && <Text fw={600} size="sm" mb="xs">{element.title}</Text>}`,
    `      <Flex direction="column" gap="xs" style={FULL_WIDTH_CONSTRAINED_STYLE}>`,
    `        {element.entries.map((entry, entryIndex) => (`,
    `          <Box key={entryIndex} p="xs" style={{ border: "1px solid var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-sm)", ...CONSTRAINED_STYLE, ...TEXT_WRAP_STYLE }}>`,
    `            <Text fw={500} size="sm" c="dimmed">{entry.label}</Text>`,
    `            {entry.value && <${UI_ELEMENT_VIEW_NAME} element={entry.value} onAction={onAction}/>}`,
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
    `    <Accordion`,
    `      defaultValue={element.defaultExpanded ? "group" : undefined}`,
    `      variant="separated"`,
    `      className={className}`,
    `      style={{ ...FULL_WIDTH_CONSTRAINED_STYLE, ...style }}`,
    `      styles={{`,
    `        item: ACCORDION_CONTAINED_STYLE,`,
    `        content: ACCORDION_CONTAINED_STYLE,`,
    `        panel: ACCORDION_CONTAINED_STYLE`,
    `      }}`,
    `    >`,
    `      <Accordion.Item value="group">`,
    `        <Accordion.Control>`,
    `          <Flex align="center" justify="space-between" pr="sm" style={{ width: "100%", minWidth: 0 }}>`,
    `            <Text size="sm" fw={500}>{element.title}</Text>`,
    `            {element.summary && <Badge size="xs" variant="light" color="gray" style={{ flexShrink: 0 }}>{element.summary}</Badge>}`,
    `          </Flex>`,
    `        </Accordion.Control>`,
    `        <Accordion.Panel>`,
    `          <Flex direction="column" gap="xs" style={FULL_WIDTH_CONSTRAINED_STYLE}>`,
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

function generateFallbackWidgetBody(_model: ViewKitModel): string
{
  return [
    `  return <Box className={className} style={style}><Code>{JSON.stringify(element)}</Code></Box>;`
  ].join("\n");
}

function generatePolymorphicDispatcher(
  rootName: typeof UI_ELEMENT_ROOT_NAME | typeof ACTION_ELEMENT_ROOT_NAME,
  propName: "element" | "action",
  models: ViewKitModel[]
): string
{
  const componentName = `${rootName}${VIEW_SUFFIX}`;
  const propsTypeName = `${componentName}${PROPS_TYPE_SUFFIX}`;

  const switchExpression = rootName === UI_ELEMENT_ROOT_NAME
    ? `(${propName} as { type: string }).type`
    : `${propName}.type`;

  const switchLines: string[] = [
    `  switch (${switchExpression})`,
    `  {`
  ];

  if (rootName === UI_ELEMENT_ROOT_NAME)
  {
    switchLines.push(`    case "free-form":`);
    switchLines.push(`      return <FreeFormElementView element={(${propName} as any).element} onAction={onAction} className={className ?? (${propName} as any).className} style={style ?? (${propName} as any).style}/>;`);
  }

  for (const model of models)
  {
    const modelViewName = `${model.name}${VIEW_SUFFIX}`;
    switchLines.push(`    case "${model.discriminatorValue}":`);
    switchLines.push(`      return <${modelViewName} ${propName}={${propName} as ${model.name}} onAction={onAction} className={className} style={style}/>;`);
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

function generateRootContainerComponent(rootModel: ViewKitModel): string
{
  const layout = rootModel.uiLayout ?? "card";
  const componentName = `${rootModel.name}${VIEW_SUFFIX}`;
  const propsTypeName = `${componentName}${PROPS_TYPE_SUFFIX}`;
  const propName = toLowerCamelCase(rootModel.name);
  const hasActions = rootModel.properties.some((property) => property.name === "actions");

  const propsTypeBlock = [
    `export type ${propsTypeName} =`,
    `{`,
    `  readonly ${propName}: ${rootModel.name};`,
    `  readonly ${RENDERERS_PROP_NAME}?: ${UI_ELEMENT_VIEW_RENDERERS_TYPE_NAME};`,
    `  readonly ${ON_ANCHOR_CLICK_PROP_NAME}?: (event: React.MouseEvent<HTMLAnchorElement>, url: string) => void;`,
    `  readonly ${ON_ACTION_PROP_NAME}?: (action: ${ACTION_ELEMENT_ROOT_NAME}) => void;`,
    `  readonly className?: string;`,
    `  readonly style?: React.CSSProperties;`,
    `};`
  ].join("\n");

  let bodyContent: string;

  if (layout === "repeating-group")
  {
    const actionsSection = hasActions ? [
      ``,
      `      {${propName}.actions && ${propName}.actions.length > 0 && (`,
      `        <Flex gap="xs" justify="flex-end" mt="xs">`,
      `          {${propName}.actions.map((action, actionIndex) => (`,
      `            <${ACTION_ELEMENT_VIEW_NAME} key={actionIndex} action={action} ${ON_ACTION_PROP_NAME}={${ON_ACTION_PROP_NAME}}/>`,
      `          ))}`,
      `        </Flex>`,
      `      )}`
    ] : [];

    bodyContent = [
      `  const context = ${USE_UI_ELEMENT_VIEW_CONTEXT_NAME}();`,
      `  const effectiveRenderers = ${RENDERERS_PROP_NAME} ?? context.${RENDERERS_PROP_NAME};`,
      `  const effectiveOnAnchorClick = ${ON_ANCHOR_CLICK_PROP_NAME} ?? context.${ON_ANCHOR_CLICK_PROP_NAME};`,
      ``,
      `  const content = (`,
      `    <Box className={className} style={{ width: "100%", ...style }}>`,
      `      <Flex direction="column" gap="xs">`,
      `        {${propName}.elements.map((element, elementIndex) => (`,
      `          <${UI_ELEMENT_VIEW_NAME} key={elementIndex} element={element} ${ON_ACTION_PROP_NAME}={${ON_ACTION_PROP_NAME}}/>`,
      `        ))}`,
      `      </Flex>`,
      ...actionsSection,
      `    </Box>`,
      `  );`,
      ``,
      `  if (${RENDERERS_PROP_NAME} || ${ON_ANCHOR_CLICK_PROP_NAME})`,
      `  {`,
      `    return (`,
      `      <${UI_ELEMENT_VIEW_PROVIDER_NAME} ${RENDERERS_PROP_NAME}={effectiveRenderers} ${ON_ANCHOR_CLICK_PROP_NAME}={effectiveOnAnchorClick}>`,
      `        {content}`,
      `      </${UI_ELEMENT_VIEW_PROVIDER_NAME}>`,
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
      `      <MantineCard.Section inheritPadding py="xs">`,
      `        <Text fw={600} size="sm">{${propName}.title}</Text>`,
      hasDescription ? `        {${propName}.description && <Text size="xs" c="dimmed">{${propName}.description}</Text>}` : ``,
      `      </MantineCard.Section>`,
      ``
    ].filter(Boolean) : [];

    const actionsSection = hasActions ? [
      ``,
      `      {${propName}.actions && ${propName}.actions.length > 0 && (`,
      `        <MantineCard.Section inheritPadding py="xs">`,
      `          <Flex gap="xs" justify="flex-end">`,
      `            {${propName}.actions.map((action, actionIndex) => (`,
      `              <${ACTION_ELEMENT_VIEW_NAME} key={actionIndex} action={action} ${ON_ACTION_PROP_NAME}={${ON_ACTION_PROP_NAME}}/>`,
      `            ))}`,
      `          </Flex>`,
      `        </MantineCard.Section>`,
      `      )}`
    ] : [];

    bodyContent = [
      `  const context = ${USE_UI_ELEMENT_VIEW_CONTEXT_NAME}();`,
      `  const effectiveRenderers = ${RENDERERS_PROP_NAME} ?? context.${RENDERERS_PROP_NAME};`,
      `  const effectiveOnAnchorClick = ${ON_ANCHOR_CLICK_PROP_NAME} ?? context.${ON_ANCHOR_CLICK_PROP_NAME};`,
      ``,
      `  const content = (`,
      `    <MantineCard shadow="xs" padding="sm" radius="md" withBorder className={className} style={style}>`,
      ...headerSection,
      `      <Flex direction="column" gap="xs" my="xs">`,
      `        {${propName}.elements.map((element, elementIndex) => (`,
      `          <${UI_ELEMENT_VIEW_NAME} key={elementIndex} element={element} ${ON_ACTION_PROP_NAME}={${ON_ACTION_PROP_NAME}}/>`,
      `        ))}`,
      `      </Flex>`,
      ...actionsSection,
      `    </MantineCard>`,
      `  );`,
      ``,
      `  if (${RENDERERS_PROP_NAME} || ${ON_ANCHOR_CLICK_PROP_NAME})`,
      `  {`,
      `    return (`,
      `      <${UI_ELEMENT_VIEW_PROVIDER_NAME} ${RENDERERS_PROP_NAME}={effectiveRenderers} ${ON_ANCHOR_CLICK_PROP_NAME}={effectiveOnAnchorClick}>`,
      `        {content}`,
      `      </${UI_ELEMENT_VIEW_PROVIDER_NAME}>`,
      `    );`,
      `  }`,
      ``,
      `  return content;`
    ].join("\n");
  }

  const componentFunctionBlock = [
    `export function ${componentName}({ ${propName}, ${RENDERERS_PROP_NAME}, ${ON_ANCHOR_CLICK_PROP_NAME}, ${ON_ACTION_PROP_NAME}, className, style }: ${propsTypeName}): ReactNode`,
    `{`,
    bodyContent,
    `}`
  ].join("\n");

  return `${propsTypeBlock}\n\n${componentFunctionBlock}`;
}

export function generateReactCode(spec: GrammarSpec): string
{
  const componentBlocks: string[] = [];

  // We generate common style constants
  componentBlocks.push(generateStyleConstants());

  // We generate ElementRendererContext and UiElementViewRenderers
  componentBlocks.push(generateElementRendererContext());
  componentBlocks.push(generateUiElementViewRenderers(spec));

  // We generate UiElementViewContext, useUiElementViewContext, and UiElementViewProvider
  componentBlocks.push(generateUiElementViewContextAndProvider());

  // We generate generic CopyableWrapper
  componentBlocks.push(generateCopyableWrapper());

  // We generate formatRatio and formatTimestamp helper functions
  componentBlocks.push(generateRatioFormatterHelper());
  componentBlocks.push(generateTimestampFormatterHelper());

  // We generate component views for all UiElement models
  for (const elementModel of spec.uiElements)
  {
    componentBlocks.push(generateUiElementComponent(elementModel));
  }

  // We generate FreeFormElementView component and freeForm DSL helper
  componentBlocks.push(generateFreeFormElementComponent());

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

  // We generate root components (e.g. UiContainerView, UiCardView)
  for (const rootModel of spec.rootModels)
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
