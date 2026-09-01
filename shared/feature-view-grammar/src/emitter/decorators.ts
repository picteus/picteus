import { DecoratorContext, Model, ModelProperty, Program } from "@typespec/compiler";


export const namespace = "Picteus.FeatureViewGrammar";

const dslRoots = new WeakSet<Model>();
const modelAliases = new WeakMap<Model, string[]>();
const dslIgnoredModels = new WeakSet<Model>();

const uiLayouts = new WeakMap<Model, string>();
const uiWidgets = new WeakMap<Model, string>();
const uiLabels = new WeakSet<ModelProperty>();
const uiValues = new WeakSet<ModelProperty>();
const uiDividers = new WeakMap<ModelProperty, { orientation?: string }>();
const uiMeterBounds = new WeakMap<ModelProperty, string>();
const uiModifiersProps = new WeakSet<ModelProperty>();

export function $dslRoot(context: DecoratorContext, target: Model): void
{
  dslRoots.add(target);
}

export function $dslAlias(context: DecoratorContext, target: Model, name: string): void
{
  const list = modelAliases.get(target) ?? [];
  list.push(name);
  modelAliases.set(target, list);
}

export function $dslIgnore(context: DecoratorContext, target: Model): void
{
  dslIgnoredModels.add(target);
}

export function $uiLayout(context: DecoratorContext, target: Model, layout: string): void
{
  uiLayouts.set(target, layout);
}

export function $uiWidget(context: DecoratorContext, target: Model, widget: string): void
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

export function $uiDivider(context: DecoratorContext, target: ModelProperty, orientation?: string): void
{
  uiDividers.set(target, { orientation: orientation ?? "horizontal" });
}

export function $uiMeterBound(context: DecoratorContext, target: ModelProperty, bound: string): void
{
  uiMeterBounds.set(target, bound);
}

export function $uiModifiers(context: DecoratorContext, target: ModelProperty): void
{
  uiModifiersProps.add(target);
}

export function isDslRoot(program: Program, target: Model): boolean
{
  return dslRoots.has(target);
}

export function getModelAliases(program: Program, target: Model): string[]
{
  return modelAliases.get(target) ?? [];
}

export function isDslIgnored(program: Program, target: Model): boolean
{
  return dslIgnoredModels.has(target);
}

export function getUiLayout(program: Program, target: Model): string | undefined
{
  return uiLayouts.get(target);
}

export function getUiWidget(program: Program, target: Model): string | undefined
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

export function getUiDivider(program: Program, target: ModelProperty): { orientation?: string } | undefined
{
  return uiDividers.get(target);
}

export function isUiDivider(program: Program, target: ModelProperty): boolean
{
  return uiDividers.has(target);
}

export function getUiMeterBound(program: Program, target: ModelProperty): string | undefined
{
  return uiMeterBounds.get(target);
}

export function isUiModifiers(program: Program, target: ModelProperty): boolean
{
  return uiModifiersProps.has(target);
}
