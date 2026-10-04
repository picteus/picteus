import { DecoratorContext, Model, Program } from "@typespec/compiler";

import { PICTEUS_NAMESPACE } from "../common.js";


export const namespace = `${PICTEUS_NAMESPACE}.Intents`;

export type IntentAudience = "frontEnd" | "backEnd";

const intentAudiences = new WeakMap<Model, IntentAudience>();
const intentModels = new WeakSet<Model>();

export function $intent(context: DecoratorContext, target: Model): void
{
  intentModels.add(target);
}

export function $frontEndIntent(context: DecoratorContext, target: Model): void
{
  intentAudiences.set(target, "frontEnd");
  intentModels.add(target);
}

export function $backEndIntent(context: DecoratorContext, target: Model): void
{
  intentAudiences.set(target, "backEnd");
  intentModels.add(target);
}

export function isIntent(program: Program, target: Model): boolean
{
  return intentModels.has(target) || intentAudiences.has(target);
}

export function getIntentAudience(program: Program, target: Model): IntentAudience | undefined
{
  return intentAudiences.get(target);
}

