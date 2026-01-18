import { ClassConstructor, plainToInstance, TransformFnParams } from "class-transformer";


export const forceArray: (transformFnParams: TransformFnParams) => any = (transformFnParams: TransformFnParams): any =>
{
  const { value } = transformFnParams;
  if (value === undefined)
  {
    return undefined;
  }
  else if (Array.isArray(value) === true)
  {
    return value;
  }
  else if (typeof value === "string")
  {
    try
    {
      return JSON.parse(value as string);
    }
    catch (error)
    {
      // This is expected when the array contains a single value
      return [value];
    }
  }
  else if (typeof value === "object")
  {
    const keys = Object.keys(value);
    if (keys.filter(key =>
    {
      return Number.parseInt(key).toString() !== key;
    }).length === 0)
    {
      // All the keys are numerical indexes
      return Object.values(value);
    }
    return value;
  }
  return Array(value);
};

export const transformBoolean: (transformFnParams: TransformFnParams) => any = (transformFnParams: TransformFnParams): any =>
{
  return transformFnParams.value === true || transformFnParams.value === "true";
};

export const transformStringifyJson: (transformFnParams: TransformFnParams) => any = (transformFnParams: TransformFnParams): any =>
{
  return JSON.stringify(transformFnParams.value);
};

export const jsonTransform: (transformFnParams: TransformFnParams) => any = (transformFnParams: TransformFnParams): any =>
{
  // This is a hack, which enables the JSON object to be fully exported
  transformFnParams.options.strategy = "exposeAll";
  return transformFnParams.value;
};

// This is necessary to work around an issue with SwaggerUI which stringifies the query parameters with a "style" set to "deepObject" and an "explode" set to true, see https://github.com/OAI/OpenAPI-Specification/issues/1502 and https://github.com/OAI/OpenAPI-Specification/issues/1706
export const deepObjectTransform = <T>(classConstructor: ClassConstructor<T>) =>
{
  return (transformFnParams: TransformFnParams): any =>
  {
    if (typeof transformFnParams.value === "string")
    {
      const object = JSON.parse(transformFnParams.value);
      return plainToInstance<T, any>(classConstructor, object, {});
    }
    return transformFnParams.value;
  };
};
