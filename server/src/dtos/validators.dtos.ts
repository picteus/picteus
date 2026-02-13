import {
  registerDecorator,
  validateSync,
  ValidationArguments,
  ValidationError,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from "class-validator";
import { plainToClass } from "class-transformer";


type ValidatorDecorator = (target: any, propertyKey: string) => void;

interface ValidationRuleSet
{
  string?: ValidatorDecorator[];
  number?: ValidatorDecorator[];
  boolean?: ValidatorDecorator[];
}

@ValidatorConstraint({ name: "typeBasedValidator", async: false })
class TypeBasedValidatorConstraint implements ValidatorConstraintInterface
{

  validate(value: any, args: ValidationArguments): boolean
  {
    const decorators = this.computeDecorators(value, args);
    if (decorators === undefined)
    {
      return false;
    }
    else if (decorators.length === 0)
    {
      return true;
    }
    const errors = this.computeErrors(value, decorators);
    return errors.length === 0;
  }

  defaultMessage(args: ValidationArguments): string
  {
    const value = args.value;
    const decorators = this.computeDecorators(value, args);
    if (decorators === undefined)
    {
      return `No validators defined for type ${this.getValueType(value)}`;
    }
    const errors = this.computeErrors(value, decorators);
    if (errors.length > 0 && errors[0].constraints !== undefined)
    {
      return Object.values(errors[0].constraints)[0];
    }
    return `${args.property} is invalid`;
  }

  private computeDecorators(value: any, args: ValidationArguments): ValidatorDecorator[] | undefined
  {
    const [ruleSet] = args.constraints as [ValidationRuleSet];
    const valueType = this.getValueType(value);
    return ruleSet[valueType];
  }

  private computeErrors(value: any, decorators: ValidatorDecorator[]): ValidationError[]
  {
    // We create a temporary class with the decorators applied
    class TempValidator
    {
      value: any;
    }

    // And we apply all decorators for this type to the temporary property
    decorators.forEach(decorator =>
    {
      decorator(TempValidator.prototype, "value");
    });

    const instance = plainToClass(TempValidator, { value });
    return validateSync(instance);
  }

  private getValueType(value: any): keyof ValidationRuleSet
  {
    return typeof value as keyof ValidationRuleSet;
  }

}

export function TypeBasedValidation(ruleSet: ValidationRuleSet, validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void
{
  return function(object: Object, propertyName: string)
  {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [ruleSet],
      validator: TypeBasedValidatorConstraint
    });
  };
}
