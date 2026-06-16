import "reflect-metadata";
import { ArgumentMetadata, ValidationPipe } from "@nestjs/common";
import { TestingModule } from "@nestjs/testing";
import { ValidationPipeOptions } from "@nestjs/common/pipes/validation.pipe";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";


export class ControllerProxy
{

  private readonly validationPipe: ValidationPipe;

  constructor(protected readonly testingModule: TestingModule, validationOptions?: ValidationPipeOptions)
  {
    this.validationPipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      ...validationOptions
    });
  }

  createProxy<T extends object>(controllerClass: new (...args: any[]) => T): T
  {
    const controller = this.testingModule.get(controllerClass);
    return new Proxy(controller, {
      get: (target, property: string | symbol) =>
      {
        const originalMethod = (target as any)[property];

        if (typeof originalMethod !== "function")
        {
          return originalMethod;
        }

        return async (...args: any[]) =>
        {
          const paramTypes = Reflect.getMetadata(PARAMTYPES_METADATA, target, property) || [];
          const routeArgumentsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, property) || {};
          // We extract the pipes from NestJS's metadata
          const parameterPipes = this.extractAllPipes(routeArgumentsMetadata);
          const validatedArgs = await Promise.all(
            args.map(async (arg, index) =>
            {
              const pipes = parameterPipes.get(index) || [];
              return await this.applyPipes(arg, pipes, paramTypes[index], routeArgumentsMetadata[index]);
            })
          );
          return await originalMethod.apply(target, validatedArgs);
        };
      }
    });
  }

  private extractAllPipes(routeArgumentsMetadata: any): Map<number, any[]>
  {
    const pipesMap = new Map<number, any[]>();
    for (const key in routeArgumentsMetadata)
    {
      const metadata = routeArgumentsMetadata[key];
      const index = metadata.index;
      const pipes = metadata.pipes || [];
      if (pipes.length > 0)
      {
        pipesMap.set(index, pipes);
      }
    }
    return pipesMap;
  }

  private async applyPipes(value: any, pipes: any[], metatype: any, routeMetadata: any): Promise<any>
  {
    let result = value;
    // We first apply the custom pipes
    for (const pipe of pipes)
    {
      const pipeInstance = typeof pipe === "function" ? new pipe() : pipe;
      const metadata: ArgumentMetadata = { type: "body", metatype, data: routeMetadata?.data };
      result = await pipeInstance.transform(result, metadata);
    }
    // If there is no pipe but that we should validate, apply default validation
    if (pipes.length === 0 && this.shouldValidate(metatype) === true)
    {
      const metadata: ArgumentMetadata = { type: "body", metatype, data: "" };
      result = await this.validationPipe.transform(result, metadata);
    }
    return result;
  }

  private shouldValidate(metatype: any): boolean
  {
    if (metatype === false)
    {
      return false;
    }
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return types.includes(metatype) === false;
  }

}
