export class ThrottlerGuard {}

export class ThrottlerModule
{
  static forRoot()
  {
    return {
      module: ThrottlerModule,
      providers: []
    };
  }
}

export const Throttle = (_options?: any) => (_target: any, _propertyKey?: any, _descriptor?: any) => {};
export const SkipThrottle = (_options?: any) => (_target: any, _propertyKey?: any, _descriptor?: any) => {};
export const InjectThrottlerOptions = () => () => {};
export const InjectThrottlerStorage = () => () => {};
