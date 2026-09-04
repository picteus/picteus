import { DecoratorContext, Model, ModelProperty, Program } from "@typespec/compiler";


export const namespace = "Picteus.ViewKit";

export type DslAliasName =
  | "multiSlot"
  | "labelValue"
  | "colorSwatch"
  | "numberStars"
  | "numberMeter"
  | "imageRef"
  | "dominantColors"
  | "markdown"
  | "html"
  | "xml"
  | "json";

export type UiLayoutKind =
  | "card"
  | "row"
  | "row-slots"
  | "table"
  | "repeating-group"
  | "accordion";

export type UiWidgetKind =
  | "string-short"
  | "string-long"
  | "string-code"
  | "string-url"
  | "identifier"
  | "ratio"
  | "color-swatch"
  | "color-set"
  | "number-unbounded"
  | "number-stars"
  | "meter"
  | "boolean-plain"
  | "boolean-badge"
  | "timestamp"
  | "image-ref"
  | "divider"
  | "markdown"
  | "html"
  | "xml"
  | "json"
  | "button-action"
  | "link-action";

export type UiDividerOrientation = "horizontal" | "vertical";

export interface UiDividerOptions
{

  readonly orientation?: UiDividerOrientation;

}

export type UiMeterBoundKind = "minimum" | "maximum" | "label" | "unit";

const dslRoots = new WeakSet<Model>();
const modelAliases = new WeakMap<Model, DslAliasName[]>();
const dslIgnoredModels = new WeakSet<Model>();

const uiLayouts = new WeakMap<Model, UiLayoutKind>();
const uiWidgets = new WeakMap<Model, UiWidgetKind>();
const uiLabels = new WeakSet<ModelProperty>();
const uiValues = new WeakSet<ModelProperty>();
const uiDividers = new WeakMap<ModelProperty, UiDividerOptions>();
const uiMeterBounds = new WeakMap<ModelProperty, UiMeterBoundKind>();
const uiModifiersProps = new WeakSet<ModelProperty>();
const customRendererModels = new WeakSet<Model>();

export function $dslRoot(context: DecoratorContext, target: Model): void
{
  dslRoots.add(target);
}

export function $dslAlias(context: DecoratorContext, target: Model, name: DslAliasName): void
{
  const list = modelAliases.get(target) ?? [];
  list.push(name);
  modelAliases.set(target, list);
}

export function $dslIgnore(context: DecoratorContext, target: Model): void
{
  dslIgnoredModels.add(target);
}

export function $uiLayout(context: DecoratorContext, target: Model, layout: UiLayoutKind): void
{
  uiLayouts.set(target, layout);
}

export function $uiWidget(context: DecoratorContext, target: Model, widget: UiWidgetKind): void
{
  uiWidgets.set(target, widget);
}

export function $uiLabel(context: DecoratorContext, target: ModelProperty): void
{
  uiLabels.add(target);
}

export function $uiValue(context: DecoratorContext, target: ModelProperty): void
{
  uiValues.add(target);
}

export function $uiDivider(context: DecoratorContext, target: ModelProperty, orientation?: UiDividerOrientation): void
{
  uiDividers.set(target, { orientation: orientation ?? "horizontal" });
}

export function $uiMeterBound(context: DecoratorContext, target: ModelProperty, bound: UiMeterBoundKind): void
{
  uiMeterBounds.set(target, bound);
}

export function $uiModifiers(context: DecoratorContext, target: ModelProperty): void
{
  uiModifiersProps.add(target);
}

export function $customRenderer(context: DecoratorContext, target: Model): void
{
  customRendererModels.add(target);
}

export function isDslRoot(program: Program, target: Model): boolean
{
  return dslRoots.has(target);
}

export function getModelAliases(program: Program, target: Model): DslAliasName[]
{
  return modelAliases.get(target) ?? [];
}

export function isDslIgnored(program: Program, target: Model): boolean
{
  return dslIgnoredModels.has(target);
}

export function getUiLayout(program: Program, target: Model): UiLayoutKind | undefined
{
  return uiLayouts.get(target);
}

export function getUiWidget(program: Program, target: Model): UiWidgetKind | undefined
{
  return uiWidgets.get(target);
}

export function isUiLabel(program: Program, target: ModelProperty): boolean
{
  return uiLabels.has(target);
}

export function isUiValue(program: Program, target: ModelProperty): boolean
{
  return uiValues.has(target);
}

export function getUiDivider(program: Program, target: ModelProperty): UiDividerOptions | undefined
{
  return uiDividers.get(target);
}

export function isUiDivider(program: Program, target: ModelProperty): boolean
{
  return uiDividers.has(target);
}

export function getUiMeterBound(program: Program, target: ModelProperty): UiMeterBoundKind | undefined
{
  return uiMeterBounds.get(target);
}

export function isUiModifiers(program: Program, target: ModelProperty): boolean
{
  return uiModifiersProps.has(target);
}

export function isCustomRenderer(program: Program, target: Model): boolean
{
  return customRendererModels.has(target);
}
