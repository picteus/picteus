import { DecoratorContext, Model, Program } from "@typespec/compiler";


export const namespace = "Picteus.FeatureViewGrammar";

const dslRoots = new WeakSet<Model>();
const modelAliases = new WeakMap<Model, string[]>();
const dslIgnoredModels = new WeakSet<Model>();

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
