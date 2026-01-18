import { isMainThread } from "node:worker_threads";

import { ClassConstructor } from "class-transformer/types/interfaces";
import { plainToInstance } from "class-transformer";


export function plainToInstanceViaJSON<T>(aClass: ClassConstructor<T>, entity: object): T
{
  // Taken from https://medium.com/ayuth/proper-way-to-create-response-dto-in-nest-js-2d58b9e42bf9
  return plainToInstance(aClass, entity);
}

export function stringify(object: Record<string, any>): string
{
  return JSON.stringify(object, (_key, value) => value, 2);
}

export function checkIsMainThread(): void
{
  if (isMainThread === false)
  {
    throw new Error("Cannot access to the instance from the non-main thread!");
  }
}

export function checkIsWorkerThread(): void
{
  if (isMainThread === true)
  {
    throw new Error("Cannot access to the instance from the main thread!");
  }
}
