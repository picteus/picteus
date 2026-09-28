import { CodeWriter } from "./codeWriter.js";
import {
  computeBaseModelProperties,
  computePythonFactoryNames,
  convertToSnakeCase,
  partitionProperties
} from "./codegenModel.js";
import { GrammarSpec, ViewKitModel, ViewKitProperty, ViewKitType } from "./typespecModel.js";


/**
 * Set of Python built-in names that should not trigger linter warnings
 * (e.g. Ruff A002/A003, Pylint W0622 redefined-builtin, PyCharm shadowing-builtins) when emitted.
 */
const PROTECTED_PYTHON_NAMES: ReadonlySet<string> = new Set([
  "id",
  "format",
  "type",
  "input",
  "filter",
  "map",
  "range",
  "hash",
  "iter",
  "min",
  "max",
  "sum",
  "object",
  "list",
  "dict",
  "set",
  "all",
  "any",
  "bin",
  "chr",
  "dir",
  "hex",
  "len",
  "oct",
  "ord",
  "pow",
  "str",
  "zip",
  "json"
]);

function hasProtectedParameter(parameterNames: string[]): boolean
{
  return parameterNames.some((parameterName) => PROTECTED_PYTHON_NAMES.has(parameterName));
}

function computeFieldNoqa(fieldName: string): string
{
  return PROTECTED_PYTHON_NAMES.has(fieldName) ? "  # noqa: A003" : "";
}

function computeFunctionNoqa(parameterNames: string[]): string
{
  return hasProtectedParameter(parameterNames) ? "  # noqa: A002" : "";
}

function computeNoinspectionLines(indent: string = ""): string[]
{
  return [
    `${indent}# noinspection PyShadowingBuiltins`,
    `${indent}# noinspection shadowing-builtins`
  ];
}

function resolvePythonType(type: ViewKitType): string
{
  switch (type.kind)
  {
    case "string":
      return "str";
    case "number":
      return type.name === "int" ? "int" : "float";
    case "boolean":
      return "bool";
    case "literal":
      return `Literal[${type.name}]`;
    case "enum":
      return type.name;
    case "model":
      return type.name;
    case "array":
      return `List[${resolvePythonType(type.elementType ?? { kind: "unknown", name: "Any" })}]`;
    case "record":
      return "Dict[str, Any]";
    case "union":
      return `Union[${type.unionTypes?.map(resolvePythonType).join(", ") ?? "Any"}]`;
    default:
      return "Any";
  }
}

function resolvePythonRequiredDefault(property: ViewKitProperty): string
{
  switch (property.type.kind)
  {
    case "string":
      return "\"\"";
    case "number":
      return property.type.name === "int" ? "0" : "0.0";
    case "boolean":
      return "False";
    case "array":
      return "field(default_factory=list)";
    default:
      return "None";
  }
}

function generatePythonModelFactory(model: ViewKitModel, writer: CodeWriter): void
{
  const { primary, aliases } = computePythonFactoryNames(model);
  const { requiredProperties, optionalProperties } = partitionProperties(model.properties);

  const parameters: string[] = [];
  const rawParameterNames: string[] = [];

  for (const property of requiredProperties)
  {
    const pythonName = convertToSnakeCase(property.name);
    const pythonType = resolvePythonType(property.type);
    parameters.push(`${pythonName}: ${pythonType}`);
    rawParameterNames.push(pythonName);
  }

  for (const property of optionalProperties)
  {
    const pythonName = convertToSnakeCase(property.name);
    const baseType = resolvePythonType(property.type);
    const pythonType = property.optional ? `Optional[${baseType}]` : baseType;
    rawParameterNames.push(pythonName);

    if (property.defaultValue !== undefined)
    {
      let defaultValueString = String(property.defaultValue);
      if (typeof property.defaultValue === "string")
      {
        if (property.type.kind === "enum")
        {
          defaultValueString = `${property.type.name}.${convertToSnakeCase(property.defaultValue)}`;
        }
        else
        {
          defaultValueString = `"${property.defaultValue}"`;
        }
      }
      else if (typeof property.defaultValue === "boolean")
      {
        defaultValueString = property.defaultValue ? "True" : "False";
      }
      parameters.push(`${pythonName}: ${pythonType} = ${defaultValueString}`);
    }
    else
    {
      parameters.push(`${pythonName}: ${pythonType} = None`);
    }
  }

  const callArguments: string[] = [];
  for (const property of requiredProperties)
  {
    const pythonName = convertToSnakeCase(property.name);
    if (property.type.kind === "array")
    {
      callArguments.push(`${pythonName}=list(${pythonName})`);
    }
    else
    {
      callArguments.push(`${pythonName}=${pythonName}`);
    }
  }

  for (const property of optionalProperties)
  {
    const pythonName = convertToSnakeCase(property.name);
    if (property.type.kind === "array")
    {
      callArguments.push(`${pythonName}=list(${pythonName}) if ${pythonName} is not None else None`);
    }
    else
    {
      callArguments.push(`${pythonName}=${pythonName}`);
    }
  }

  const allNames = Array.from(new Set([ primary, ...aliases ]));
  const noqa = computeFunctionNoqa(rawParameterNames);
  const isShadowing = hasProtectedParameter(rawParameterNames);

  for (const functionName of allNames)
  {
    if (isShadowing)
    {
      writer.writeLines(computeNoinspectionLines());
    }
    writer.pythonBlock(`def ${functionName}(${parameters.join(", ")}) -> ${model.name}:${noqa}`, () =>
    {
      if (model.doc)
      {
        writer.writePythonDoc(model.doc);
      }
      writer.writeLine(`return ${model.name}(${callArguments.join(", ")})`);
    });
    writer.blankLine();
  }
}

export function generatePythonCode(spec: GrammarSpec): string
{
  const writer = new CodeWriter({ indentSize: 4 });
  const polymorphicRootNames = new Set(spec.polymorphicRoots.map((root) => root.name));

  writer.writeLine("# ---------------------------------------------------------------------------");
  writer.writeLine("# Auto-generated by @picteus/specification-factory emitter. Do not edit directly.");
  writer.writeLine("# ---------------------------------------------------------------------------");
  writer.writeLine("# ruff: noqa: A002, A003");
  writer.writeLine("# pylint: disable=redefined-builtin,invalid-name");
  writer.blankLine();
  writer.writeLine("from __future__ import annotations");
  writer.blankLine();
  writer.writeLine("import json as _json");
  writer.writeLine("from dataclasses import MISSING, dataclass, field");
  writer.writeLine("from enum import Enum");
  writer.writeLine("from typing import Any, Dict, List, Literal, Optional, Protocol, Tuple, Union, runtime_checkable");
  writer.blankLine();

  // We define base serialization dataclass
  writer.writeLine("@dataclass");
  writer.pythonBlock("class ViewKitBase:", () =>
  {
    writer.writePythonDoc("Base dataclass providing recursive dictionary, validation, and JSON serialization.");
    writer.blankLine();

    writer.pythonBlock("def to_dict(self) -> Dict[str, Any]:", () =>
    {
      writer.pythonBlock("def _clean(val: Any) -> Any:", () =>
      {
        writer.writeLine("if isinstance(val, Enum):");
        writer.writeLine("    return val.value");
        writer.writeLine("if isinstance(val, ViewKitBase):");
        writer.writeLine("    return val.to_dict()");
        writer.writeLine("if isinstance(val, list):");
        writer.writeLine("    return [_clean(item) for item in val if item is not None]");
        writer.writeLine("if isinstance(val, dict):");
        writer.writeLine("    return {k: _clean(v) for k, v in val.items() if v is not None}");
        writer.writeLine("return val");
      });
      writer.blankLine();
      writer.writeLine("result: Dict[str, Any] = {}");
      writer.pythonBlock("for field_name, field_val in self.__dict__.items():", () =>
      {
        writer.pythonBlock("if field_val is not None:", () =>
        {
          writer.writeLine("parts = field_name.split('_')");
          writer.writeLine("camel_key = parts[0] + ''.join(p.capitalize() for p in parts[1:]) if len(parts) > 1 else field_name");
          writer.writeLine("result[camel_key] = _clean(field_val)");
        });
      });
      writer.writeLine("return result");
    });
    writer.blankLine();

    writer.pythonBlock("def to_json(self) -> str:", () =>
    {
      writer.writeLine("return _json.dumps(self.to_dict(), separators=(',', ':'))");
    });
    writer.blankLine();

    writer.pythonBlock("def to_string(self) -> str:", () =>
    {
      writer.writeLine("return self.to_json()");
    });
    writer.blankLine();

    writer.pythonBlock("def __str__(self) -> str:", () =>
    {
      writer.writeLine("return self.to_json()");
    });
    writer.blankLine();

    writer.pythonBlock("def validate(self, with_deep_validation: bool = True) -> bool:", () =>
    {
      writer.writePythonDoc("Validates all required fields and recursively validates nested elements.");
      writer.writeLine("cls_name = self.__class__.__name__");
      writer.pythonBlock("if cls_name in _REQUIRED_FIELDS:", () =>
      {
        writer.pythonBlock("for req_field in _REQUIRED_FIELDS[cls_name]:", () =>
        {
          writer.writeLine("field_val = getattr(self, req_field, None)");
          writer.pythonBlock("if field_val is None or field_val == \"\":", () =>
          {
            writer.writeLine("raise ValueError(f\"Missing required field '{req_field}' on {cls_name}\")");
          });
        });
      });
      writer.blankLine();
      writer.pythonBlock("if with_deep_validation:", () =>
      {
        writer.pythonBlock("for field_name in getattr(self, \"__dataclass_fields__\", {}):", () =>
        {
          writer.writeLine("field_val = getattr(self, field_name, None)");
          writer.pythonBlock("if field_val is not None:", () =>
          {
            writer.pythonBlock("if isinstance(field_val, ViewKitBase):", () =>
            {
              writer.writeLine("field_val.validate(with_deep_validation=True)");
            });
            writer.pythonBlock("elif isinstance(field_val, list):", () =>
            {
              writer.pythonBlock("for item in field_val:", () =>
              {
                writer.pythonBlock("if isinstance(item, ViewKitBase):", () =>
                {
                  writer.writeLine("item.validate(with_deep_validation=True)");
                });
              });
            });
          });
        });
      });
      writer.writeLine("return True");
    });
    writer.blankLine();

    writer.writeLine("@classmethod");
    writer.pythonBlock("def _from_dict(cls: Any, data: Dict[str, Any]) -> Any:", () =>
    {
      writer.pythonBlock("if not isinstance(data, dict):", () =>
      {
        writer.writeLine("return data");
      });
      writer.writeLine("kwargs: Dict[str, Any] = {}");
      writer.pythonBlock("for field_name, field_def in getattr(cls, \"__dataclass_fields__\", {}).items():", () =>
      {
        writer.writeLine("parts = field_name.split(\"_\")");
        writer.writeLine("camel_name = parts[0] + \"\".join(p.capitalize() for p in parts[1:]) if len(parts) > 1 else field_name");
        writer.pythonBlock("if camel_name in data:", () =>
        {
          writer.writeLine("raw_val = data[camel_name]");
        });
        writer.pythonBlock("elif field_name in data:", () =>
        {
          writer.writeLine("raw_val = data[field_name]");
        });
        writer.pythonBlock("else:", () =>
        {
          writer.pythonBlock("if field_name in _REQUIRED_FIELDS.get(cls.__name__, []) or (field_def.default is MISSING and getattr(field_def, \"default_factory\", None) is MISSING):", () =>
          {
            writer.writeLine("kwargs[field_name] = None");
          });
          writer.writeLine("continue");
        });
        writer.blankLine();
        writer.pythonBlock("if raw_val is None:", () =>
        {
          writer.writeLine("kwargs[field_name] = None");
        });
        writer.pythonBlock("elif (cls.__name__, field_name) in _NESTED_MODEL_MAP:", () =>
        {
          writer.writeLine("nested_cls, is_list = _NESTED_MODEL_MAP[(cls.__name__, field_name)]");
          writer.pythonBlock("if is_list and isinstance(raw_val, list):", () =>
          {
            writer.writeLine("kwargs[field_name] = [nested_cls._from_dict(item) if isinstance(item, dict) else item for item in raw_val]");
          });
          writer.pythonBlock("elif isinstance(raw_val, dict):", () =>
          {
            writer.writeLine("kwargs[field_name] = nested_cls._from_dict(raw_val)");
          });
          writer.pythonBlock("else:", () =>
          {
            writer.writeLine("kwargs[field_name] = raw_val");
          });
        });
        writer.pythonBlock("elif isinstance(raw_val, list):", () =>
        {
          writer.writeLine("kwargs[field_name] = [_deserialize_element(item) if isinstance(item, dict) else item for item in raw_val]");
        });
        writer.pythonBlock("elif isinstance(raw_val, dict) and \"type\" in raw_val:", () =>
        {
          writer.writeLine("kwargs[field_name] = _deserialize_element(raw_val)");
        });
        writer.pythonBlock("else:", () =>
        {
          writer.writeLine("kwargs[field_name] = raw_val");
        });
      });
      writer.writeLine("return cls(**kwargs)");
    });
    writer.blankLine();

    writer.writeLine("@classmethod");
    writer.pythonBlock("def parse(cls: Any, json_input: Union[str, Dict[str, Any]], with_deep_validation: bool = True) -> Any:", () =>
    {
      writer.writeLine("data = _json.loads(json_input) if isinstance(json_input, str) else json_input");
      writer.writeLine("instance = cls._from_dict(data)");
      writer.pythonBlock("if with_deep_validation:", () =>
      {
        writer.writeLine("instance.validate(with_deep_validation=True)");
      });
      writer.writeLine("return instance");
    });
    writer.blankLine();

    writer.writeLine("@classmethod");
    writer.pythonBlock("def from_dict(cls: Any, data: Dict[str, Any], with_deep_validation: bool = True) -> Any:", () =>
    {
      writer.writeLine("return cls.parse(data, with_deep_validation=with_deep_validation)");
    });
    writer.blankLine();

    writer.writeLine("@classmethod");
    writer.pythonBlock("def from_json(cls: Any, json_str: str, with_deep_validation: bool = True) -> Any:", () =>
    {
      writer.writeLine("return cls.parse(json_str, with_deep_validation=with_deep_validation)");
    });
  });
  writer.blankLine();

  writer.writeLine("_ELEMENT_MAP: Dict[str, Any] = {}");
  writer.writeLine("_REQUIRED_FIELDS: Dict[str, List[str]] = {}");
  writer.writeLine("_NESTED_MODEL_MAP: Dict[Tuple[str, str], Tuple[Any, bool]] = {}");
  writer.blankLine();

  writer.pythonBlock("def _deserialize_element(data: Any) -> Any:", () =>
  {
    writer.pythonBlock("if not isinstance(data, dict):", () =>
    {
      writer.writeLine("return data");
    });
    writer.writeLine("elem_type = data.get(\"type\")");
    writer.pythonBlock("if elem_type and elem_type in _ELEMENT_MAP:", () =>
    {
      writer.writeLine("return _ELEMENT_MAP[elem_type]._from_dict(data)");
    });
    writer.writeLine("return data");
  });
  writer.blankLine();

  // 1. We generate Enums from AST
  for (const viewKitEnum of spec.enums)
  {
    writer.pythonBlock(`class ${viewKitEnum.name}(str, Enum):`, () =>
    {
      if (viewKitEnum.doc)
      {
        writer.writePythonDoc(viewKitEnum.doc);
      }
      for (const member of viewKitEnum.members)
      {
        writer.writeLine(`${convertToSnakeCase(member.name)} = "${member.value}"`);
      }
    });
    writer.blankLine();
  }

  // 2. We generate Protocols (Structural Interfaces via typing.Protocol PEP 544)
  writer.writeLine("# --- Protocols (Structural Typing Contracts via PEP 544) ---");
  writer.blankLine();

  for (const root of spec.polymorphicRoots)
  {
    const rootModel = spec.models.find((model) => model.name === root.name);
    writer.writeLine("@runtime_checkable");
    writer.pythonBlock(`class ${root.name}Protocol(Protocol):`, () =>
    {
      writer.writePythonDoc(root.doc ?? `Structural interface protocol for ${root.name}.`);
      writer.writeLine("@property");
      const rootDiscriminatorName = convertToSnakeCase(root.discriminatorProperty);
      if (PROTECTED_PYTHON_NAMES.has(rootDiscriminatorName))
      {
        writer.writeLines(computeNoinspectionLines());
      }
      writer.writeLine(`def ${rootDiscriminatorName}(self) -> str: ...${computeFieldNoqa(rootDiscriminatorName)}`);

      if (rootModel)
      {
        for (const property of rootModel.properties)
        {
          if (property.name !== root.discriminatorProperty)
          {
            const pythonName = convertToSnakeCase(property.name);
            const pythonType = resolvePythonType(property.type);
            writer.writeLine("@property");
            if (PROTECTED_PYTHON_NAMES.has(pythonName))
            {
              writer.writeLines(computeNoinspectionLines());
            }
            writer.writeLine(`def ${pythonName}(self) -> ${pythonType}: ...${computeFieldNoqa(pythonName)}`);
          }
        }
      }
    });
    writer.blankLine();

    for (const derived of root.derivedModels)
    {
      if (derived.isDslIgnored)
      {
        continue;
      }
      const baseProperties = computeBaseModelProperties(derived, spec);
      writer.writeLine("@runtime_checkable");
      writer.pythonBlock(`class ${derived.name}Protocol(${root.name}Protocol, Protocol):`, () =>
      {
        writer.writePythonDoc(derived.doc ?? `Protocol contract for ${derived.name}.`);
        for (const property of derived.properties)
        {
          if (property.name !== root.discriminatorProperty && !baseProperties.has(property.name))
          {
            const pythonName = convertToSnakeCase(property.name);
            const baseType = resolvePythonType(property.type);
            const pythonType = property.optional ? `Optional[${baseType}]` : baseType;
            writer.writeLine("@property");
            if (PROTECTED_PYTHON_NAMES.has(pythonName))
            {
              writer.writeLines(computeNoinspectionLines());
            }
            writer.writeLine(`def ${pythonName}(self) -> ${pythonType}: ...${computeFieldNoqa(pythonName)}`);
          }
        }
      });
      writer.blankLine();
    }
  }

  // 3. We generate Base Dataclasses for Polymorphic Roots
  for (const root of spec.polymorphicRoots)
  {
    writer.writeLine("@dataclass");
    writer.pythonBlock(`class ${root.name}Base(ViewKitBase):`, () =>
    {
      writer.writePythonDoc(`Base dataclass for all ${root.name} models.`);
      writer.writeLine("pass");
    });
    writer.blankLine();
  }

  // 4. We generate Supporting Models (non-polymorphic derived, non-root) from AST
  const supportingModels = spec.models.filter(
    (model) =>
    {
      return (
        !polymorphicRootNames.has(model.name) &&
        (!model.baseModelName || !polymorphicRootNames.has(model.baseModelName)) &&
        !model.isDslRoot &&
        !spec.rootModels.includes(model) &&
        !model.isDslIgnored
      );
    }
  );

  for (const model of supportingModels)
  {
    const baseClassName = (model.baseModelName && !polymorphicRootNames.has(model.baseModelName))
      ? model.baseModelName
      : "ViewKitBase";
    const baseProperties = computeBaseModelProperties(model, spec);
    const isDerivedModel = model.baseModelName !== undefined && !polymorphicRootNames.has(model.baseModelName);

    writer.writeLine("@dataclass");
    writer.pythonBlock(`class ${model.name}(${baseClassName}):`, () =>
    {
      if (model.doc)
      {
        writer.writePythonDoc(model.doc);
      }

      const declaredProperties = model.properties.filter((property) => !baseProperties.has(property.name));
      const { requiredProperties, optionalProperties } = partitionProperties(declaredProperties);

      if (requiredProperties.length === 0 && optionalProperties.length === 0)
      {
        writer.writeLine("pass");
      }

      for (const property of requiredProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const pythonType = resolvePythonType(property.type);
        if (PROTECTED_PYTHON_NAMES.has(pythonName))
        {
          writer.writeLines(computeNoinspectionLines());
        }
        if (isDerivedModel)
        {
          const defaultValue = resolvePythonRequiredDefault(property);
          writer.writeLine(`${pythonName}: ${pythonType} = ${defaultValue}${computeFieldNoqa(pythonName)}`);
        }
        else
        {
          writer.writeLine(`${pythonName}: ${pythonType}${computeFieldNoqa(pythonName)}`);
        }
      }

      for (const property of optionalProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const baseType = resolvePythonType(property.type);
        const pythonType = property.optional ? `Optional[${baseType}]` : baseType;

        if (PROTECTED_PYTHON_NAMES.has(pythonName))
        {
          writer.writeLines(computeNoinspectionLines());
        }

        if (property.defaultValue !== undefined)
        {
          let defaultValueString = String(property.defaultValue);
          if (typeof property.defaultValue === "string")
          {
            if (property.type.kind === "enum")
            {
              defaultValueString = `${property.type.name}.${convertToSnakeCase(property.defaultValue)}`;
            }
            else
            {
              defaultValueString = `"${property.defaultValue}"`;
            }
          }
          else if (typeof property.defaultValue === "boolean")
          {
            defaultValueString = property.defaultValue ? "True" : "False";
          }
          writer.writeLine(`${pythonName}: ${pythonType} = ${defaultValueString}${computeFieldNoqa(pythonName)}`);
        }
        else
        {
          writer.writeLine(`${pythonName}: ${pythonType} = None${computeFieldNoqa(pythonName)}`);
        }
      }
    });
    writer.blankLine();
  }

  // 5. We generate Concrete Derived Dataclasses from polymorphic roots
  for (const root of spec.polymorphicRoots)
  {
    const baseClassName = `${root.name}Base`;
    for (const model of root.derivedModels)
    {
      if (model.isDslIgnored)
      {
        continue;
      }
      writer.writeLine("@dataclass");
      writer.pythonBlock(`class ${model.name}(${baseClassName}):`, () =>
      {
        if (model.doc)
        {
          writer.writePythonDoc(model.doc);
        }

        const { requiredProperties, optionalProperties } = partitionProperties(model.properties);

        for (const property of requiredProperties)
        {
          const pythonName = convertToSnakeCase(property.name);
          const pythonType = resolvePythonType(property.type);
          if (PROTECTED_PYTHON_NAMES.has(pythonName))
          {
            writer.writeLines(computeNoinspectionLines());
          }
          writer.writeLine(`${pythonName}: ${pythonType}${computeFieldNoqa(pythonName)}`);
        }

        const discriminatorValue = model.discriminatorValue ?? "element";
        writer.writeLines(computeNoinspectionLines());
        writer.writeLine(`type: str = "${discriminatorValue}"${computeFieldNoqa("type")}`);

        for (const property of optionalProperties)
        {
          const pythonName = convertToSnakeCase(property.name);
          const baseType = resolvePythonType(property.type);
          const pythonType = property.optional ? `Optional[${baseType}]` : baseType;

          if (PROTECTED_PYTHON_NAMES.has(pythonName))
          {
            writer.writeLines(computeNoinspectionLines());
          }

          if (property.defaultValue !== undefined)
          {
            let defaultValueString = String(property.defaultValue);
            if (typeof property.defaultValue === "string")
            {
              if (property.type.kind === "enum")
              {
                defaultValueString = `${property.type.name}.${convertToSnakeCase(property.defaultValue)}`;
              }
              else
              {
                defaultValueString = `"${property.defaultValue}"`;
              }
            }
            else if (typeof property.defaultValue === "boolean")
            {
              defaultValueString = property.defaultValue ? "True" : "False";
            }
            writer.writeLine(`${pythonName}: ${pythonType} = ${defaultValueString}${computeFieldNoqa(pythonName)}`);
          }
          else
          {
            writer.writeLine(`${pythonName}: ${pythonType} = None${computeFieldNoqa(pythonName)}`);
          }
        }
      });
      writer.blankLine();
    }

    // We generate polymorphic union type
    const derivedUnionType = root.derivedModels.map((model) => model.name).join(", ");
    writer.writeLine(`${root.name} = Union[${derivedUnionType}]`);
    writer.blankLine();
  }

  // 6. We generate Root Models and Builders
  for (const root of spec.rootModels)
  {
    const baseClassName = root.baseModelName ?? "ViewKitBase";
    const baseProperties = computeBaseModelProperties(root, spec);
    const isDerivedModel = root.baseModelName !== undefined;

    writer.writeLine("@dataclass");
    writer.pythonBlock(`class ${root.name}(${baseClassName}):`, () =>
    {
      if (root.doc)
      {
        writer.writePythonDoc(root.doc);
      }

      const declaredProperties = root.properties.filter((property) => !baseProperties.has(property.name));
      const declaredHasSchemaVersion = declaredProperties.some((property) => property.name === "schemaVersion");
      const {
        scalarRequiredProperties: declaredRequiredProperties,
        scalarOptionalProperties: declaredOptionalProperties,
        arrayProperties: declaredArrayProperties
      } = partitionProperties(declaredProperties, { excludeSchemaVersion: true });

      for (const property of declaredRequiredProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const baseType = resolvePythonType(property.type);
        if (PROTECTED_PYTHON_NAMES.has(pythonName))
        {
          writer.writeLines(computeNoinspectionLines());
        }
        if (isDerivedModel)
        {
          const defaultValue = resolvePythonRequiredDefault(property);
          writer.writeLine(`${pythonName}: ${baseType} = ${defaultValue}${computeFieldNoqa(pythonName)}`);
        }
        else
        {
          writer.writeLine(`${pythonName}: ${baseType}${computeFieldNoqa(pythonName)}`);
        }
      }

      if (declaredHasSchemaVersion)
      {
        writer.writeLine(`schema_version: str = "1.0"${computeFieldNoqa("schema_version")}`);
      }

      for (const property of declaredOptionalProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const baseType = resolvePythonType(property.type);
        if (PROTECTED_PYTHON_NAMES.has(pythonName))
        {
          writer.writeLines(computeNoinspectionLines());
        }
        if (property.defaultValue !== undefined)
        {
          writer.writeLine(`${pythonName}: ${baseType} = "${property.defaultValue}"${computeFieldNoqa(pythonName)}`);
        }
        else
        {
          writer.writeLine(`${pythonName}: Optional[${baseType}] = None${computeFieldNoqa(pythonName)}`);
        }
      }

      for (const property of declaredArrayProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const baseType = resolvePythonType(property.type);
        if (PROTECTED_PYTHON_NAMES.has(pythonName))
        {
          writer.writeLines(computeNoinspectionLines());
        }
        if (!property.optional)
        {
          writer.writeLine(`${pythonName}: ${baseType} = field(default_factory=list)${computeFieldNoqa(pythonName)}`);
        }
        else
        {
          writer.writeLine(`${pythonName}: Optional[${baseType}] = None${computeFieldNoqa(pythonName)}`);
        }
      }

      if (declaredProperties.length === 0)
      {
        writer.writeLine("pass");
      }
    });
    writer.blankLine();

    // 7. We generate Root Builder
    const builderClassName = `${root.name}Builder`;
    const {
      nonTypeProperties: rootNonTypeProperties,
      scalarRequiredProperties: allRequiredProperties,
      scalarOptionalProperties: allOptionalProperties,
      arrayProperties: allArrayProperties
    } = partitionProperties(root.properties, { excludeSchemaVersion: true });

    writer.pythonBlock(`class ${builderClassName}:`, () =>
    {
      writer.writePythonDoc(`Fluent builder for constructing ${root.name} instances.`);

      const constructorParameters: string[] = [];
      const constructorParameterNames: string[] = [];
      for (const property of allRequiredProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        constructorParameters.push(`${pythonName}: ${resolvePythonType(property.type)}`);
        constructorParameterNames.push(pythonName);
      }
      const constructorNoqa = computeFunctionNoqa(constructorParameterNames);

      if (hasProtectedParameter(constructorParameterNames))
      {
        writer.writeLines(computeNoinspectionLines());
      }
      const constructorParameterString = constructorParameters.length > 0 ? `, ${constructorParameters.join(", ")}` : "";
      writer.pythonBlock(`def __init__(self${constructorParameterString}):${constructorNoqa}`, () =>
      {
        for (const property of allRequiredProperties)
        {
          const pythonName = convertToSnakeCase(property.name);
          writer.writeLine(`self._${pythonName} = ${pythonName}`);
        }
        for (const property of allOptionalProperties)
        {
          const pythonName = convertToSnakeCase(property.name);
          if (property.defaultValue !== undefined)
          {
            const defaultValue = typeof property.defaultValue === "string" ? `"${property.defaultValue}"` : (property.defaultValue ? "True" : "False");
            writer.writeLine(`self._${pythonName}: ${resolvePythonType(property.type)} = ${defaultValue}`);
          }
          else
          {
            writer.writeLine(`self._${pythonName}: Optional[${resolvePythonType(property.type)}] = None`);
          }
        }
        for (const property of allArrayProperties)
        {
          const pythonName = convertToSnakeCase(property.name);
          writer.writeLine(`self._${pythonName}: List[Any] = []`);
        }
        if (allRequiredProperties.length === 0 && allOptionalProperties.length === 0 && allArrayProperties.length === 0)
        {
          writer.writeLine("pass");
        }
      });
      writer.blankLine();

      // We generate setters for scalar optional properties
      for (const property of allOptionalProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const pythonType = resolvePythonType(property.type);

        if (property.name === "description")
        {
          writer.pythonBlock(`def description(self, description: str) -> ${builderClassName}:`, () =>
          {
            writer.writeLine("self._description = description");
            writer.writeLine("return self");
          });
          writer.blankLine();
        }
        else if (property.name === "attribution")
        {
          writer.writeLines(computeNoinspectionLines());
          writer.pythonBlock(`def attribution(self, extension_id: Optional[str] = None, format: str = "json", attribution: Optional[FeatureAttribution] = None) -> ${builderClassName}:  # noqa: A002`, () =>
          {
            writer.pythonBlock("if attribution is not None:", () =>
            {
              writer.writeLine("self._attribution = attribution");
            });
            writer.pythonBlock("elif extension_id is not None:", () =>
            {
              writer.writeLine("self._attribution = FeatureAttribution(extension_id=extension_id, format=format)");
            });
            writer.writeLine("return self");
          });
          writer.blankLine();
        }
        else
        {
          const isProtectedSetter = PROTECTED_PYTHON_NAMES.has(pythonName);
          if (isProtectedSetter)
          {
            writer.writeLines(computeNoinspectionLines());
          }
          const setterNoqa = computeFunctionNoqa([ pythonName ]);
          writer.pythonBlock(`def ${pythonName}(self, ${pythonName}: ${pythonType}) -> ${builderClassName}:${setterNoqa}`, () =>
          {
            writer.writeLine(`self._${pythonName} = ${pythonName}`);
            writer.writeLine("return self");
          });
          writer.blankLine();
        }
      }

      // We generate generic collection adders
      for (const property of allArrayProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const elementType = resolvePythonType(property.type.elementType ?? { kind: "unknown", name: "Any" });
        const singularName = property.name.endsWith("s") ? property.name.slice(0, -1) : property.name;
        const pythonSingular = convertToSnakeCase(singularName);

        if (property.name === "elements")
        {
          writer.pythonBlock(`def add(self, element: ${elementType}) -> ${builderClassName}:`, () =>
          {
            writer.writeLine(`self._${pythonName}.append(element)`);
            writer.writeLine("return self");
          });
          writer.blankLine();
        }

        writer.pythonBlock(`def add_${pythonName}(self, *items: ${elementType}) -> ${builderClassName}:`, () =>
        {
          writer.writeLine(`self._${pythonName}.extend(items)`);
          writer.writeLine("return self");
        });
        writer.blankLine();

        if (property.name !== "elements")
        {
          writer.pythonBlock(`def add_${pythonSingular}(self, item: ${elementType}) -> ${builderClassName}:`, () =>
          {
            writer.writeLine(`self._${pythonName}.append(item)`);
            writer.writeLine("return self");
          });
          writer.blankLine();
        }
      }

      // We generate dynamic builder methods for all visual UI elements
      for (const uiModel of spec.uiElements)
      {
        if (uiModel.isDslIgnored)
        {
          continue;
        }
        const { primary, aliases } = computePythonFactoryNames(uiModel);
        const allNames = Array.from(new Set([ primary, ...aliases ]));
        const {
          requiredProperties: uiRequiredProperties,
          optionalProperties: uiOptionalProperties
        } = partitionProperties(uiModel.properties);

        const parameters: string[] = [];
        const callArguments: string[] = [];
        const rawMethodParameterNames: string[] = [];

        for (const property of uiRequiredProperties)
        {
          const pythonName = convertToSnakeCase(property.name);
          const pythonType = resolvePythonType(property.type);
          parameters.push(`${pythonName}: ${pythonType}`);
          callArguments.push(`${pythonName}=${pythonName}`);
          rawMethodParameterNames.push(pythonName);
        }

        for (const property of uiOptionalProperties)
        {
          const pythonName = convertToSnakeCase(property.name);
          const baseType = resolvePythonType(property.type);
          const pythonType = property.optional ? `Optional[${baseType}]` : baseType;
          rawMethodParameterNames.push(pythonName);

          if (property.defaultValue !== undefined)
          {
            let defaultValueString = String(property.defaultValue);
            if (typeof property.defaultValue === "string")
            {
              defaultValueString = property.type.kind === "enum" ? `${property.type.name}.${convertToSnakeCase(property.defaultValue)}` : `"${property.defaultValue}"`;
            }
            else if (typeof property.defaultValue === "boolean")
            {
              defaultValueString = property.defaultValue ? "True" : "False";
            }
            parameters.push(`${pythonName}: ${pythonType} = ${defaultValueString}`);
          }
          else
          {
            parameters.push(`${pythonName}: ${pythonType} = None`);
          }
          callArguments.push(`${pythonName}=${pythonName}`);
        }

        const methodNoqa = computeFunctionNoqa(rawMethodParameterNames);
        const hasShadowing = hasProtectedParameter(rawMethodParameterNames);

        for (const functionName of allNames)
        {
          const methodName = `add_${functionName}`;
          if (hasShadowing)
          {
            writer.writeLines(computeNoinspectionLines());
          }
          writer.pythonBlock(`def ${methodName}(self, ${parameters.join(", ")}) -> ${builderClassName}:${methodNoqa}`, () =>
          {
            writer.writeLine(`return self.add(${functionName}(${callArguments.join(", ")}))`);
          });
          writer.blankLine();
        }
      }

      writer.pythonBlock(`def build(self) -> ${root.name}:`, () =>
      {
        writer.writeLine(`return ${root.name}(`);
        writer.indent(() =>
        {
          const buildArgs: string[] = [];
          if (root.properties.some((property) => property.name === "schemaVersion"))
          {
            buildArgs.push("schema_version=\"1.0\"");
          }
          for (const property of allRequiredProperties)
          {
            const pythonName = convertToSnakeCase(property.name);
            buildArgs.push(`${pythonName}=self._${pythonName}`);
          }
          for (const property of allOptionalProperties)
          {
            const pythonName = convertToSnakeCase(property.name);
            buildArgs.push(`${pythonName}=self._${pythonName}`);
          }
          for (const property of allArrayProperties)
          {
            const pythonName = convertToSnakeCase(property.name);
            if (property.optional)
            {
              buildArgs.push(`${pythonName}=list(self._${pythonName}) if len(self._${pythonName}) > 0 else None`);
            }
            else
            {
              buildArgs.push(`${pythonName}=list(self._${pythonName})`);
            }
          }
          for (let index = 0; index < buildArgs.length; index++)
          {
            writer.writeLine(index < buildArgs.length - 1 ? `${buildArgs[index]},` : buildArgs[index]);
          }
        });
        writer.writeLine(")");
      });
      writer.blankLine();

      writer.pythonBlock("def to_dict(self) -> Dict[str, Any]:", () =>
      {
        writer.writeLine("return self.build().to_dict()");
      });
      writer.blankLine();

      writer.pythonBlock("def to_json(self) -> str:", () =>
      {
        writer.writeLine("return self.build().to_json()");
      });
      writer.blankLine();

      writer.pythonBlock("def to_string(self) -> str:", () =>
      {
        writer.writeLine("return self.build().to_string()");
      });
      writer.blankLine();

      writer.pythonBlock("def __str__(self) -> str:", () =>
      {
        writer.writeLine("return self.build().to_string()");
      });
    });
    writer.blankLine();

    // 8. We generate Functional Root Factory
    const createFunctionName = `create_${convertToSnakeCase(root.name)}`;
    const rootCreateArguments: string[] = [];
    const rootCreateParameterNames: string[] = [];

    for (const property of allRequiredProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      rootCreateArguments.push(`${pythonName}: ${resolvePythonType(property.type)}`);
      rootCreateParameterNames.push(pythonName);
    }
    for (const property of rootNonTypeProperties.filter((property) => !allRequiredProperties.includes(property)))
    {
      const pythonName = convertToSnakeCase(property.name);
      const baseType = resolvePythonType(property.type);
      rootCreateParameterNames.push(pythonName);
      if (property.defaultValue !== undefined)
      {
        const defaultValue = typeof property.defaultValue === "string" ? `"${property.defaultValue}"` : (property.defaultValue ? "True" : "False");
        rootCreateArguments.push(`${pythonName}: ${baseType} = ${defaultValue}`);
      }
      else
      {
        rootCreateArguments.push(`${pythonName}: Optional[${baseType}] = None`);
      }
    }

    const rootCreateNoqa = computeFunctionNoqa(rootCreateParameterNames);
    if (hasProtectedParameter(rootCreateParameterNames))
    {
      writer.writeLines(computeNoinspectionLines());
    }
    writer.pythonBlock(`def ${createFunctionName}(${rootCreateArguments.join(", ")}) -> ${root.name}:${rootCreateNoqa}`, () =>
    {
      writer.writeLine(`return ${root.name}(`);
      writer.indent(() =>
      {
        const createArgs: string[] = [];
        if (root.properties.some((property) => property.name === "schemaVersion"))
        {
          createArgs.push("schema_version=\"1.0\"");
        }
        for (const property of allRequiredProperties)
        {
          const pythonName = convertToSnakeCase(property.name);
          createArgs.push(`${pythonName}=${pythonName}`);
        }
        for (const property of rootNonTypeProperties.filter((property) => !allRequiredProperties.includes(property)))
        {
          const pythonName = convertToSnakeCase(property.name);
          if (property.type.kind === "array" && !property.optional)
          {
            createArgs.push(`${pythonName}=list(${pythonName}) if ${pythonName} is not None else []`);
          }
          else if (property.type.kind === "array" && property.optional)
          {
            createArgs.push(`${pythonName}=list(${pythonName}) if ${pythonName} is not None else None`);
          }
          else
          {
            createArgs.push(`${pythonName}=${pythonName}`);
          }
        }
        for (let index = 0; index < createArgs.length; index++)
        {
          writer.writeLine(index < createArgs.length - 1 ? `${createArgs[index]},` : createArgs[index]);
        }
      });
      writer.writeLine(")");
    });
    writer.blankLine();

    const parseFunctionName = `parse_${convertToSnakeCase(root.name)}`;
    writer.pythonBlock(`def ${parseFunctionName}(json_input: Union[str, Dict[str, Any]], with_deep_validation: bool = True) -> ${root.name}:`, () =>
    {
      writer.writeLine(`return ${root.name}.parse(json_input, with_deep_validation=with_deep_validation)`);
    });
    writer.blankLine();
  }

  // 9. We generate Functional DSL Factory Helpers for all models from AST
  writer.writeLine("# --- Functional DSL Factory Helpers ---");
  writer.blankLine();

  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model.isDslRoot || spec.rootModels.includes(model) || model.isDslIgnored)
    {
      continue;
    }
    generatePythonModelFactory(model, writer);
  }

  // 10. We populate element deserialization mapping, required fields, and nested model mapping
  writer.writeLine("# --- Deserializer Mappings & Validation Rules ---");
  writer.blankLine();
  for (const model of spec.models)
  {
    if (model.discriminatorValue)
    {
      writer.writeLine(`_ELEMENT_MAP["${model.discriminatorValue}"] = ${model.name}`);
    }
    const { requiredProperties } = partitionProperties(model.properties, { excludeSchemaVersion: true });
    if (requiredProperties.length > 0)
    {
      const propNames = requiredProperties.map((property) => `"${convertToSnakeCase(property.name)}"`).join(", ");
      writer.writeLine(`_REQUIRED_FIELDS["${model.name}"] = [${propNames}]`);
    }

    for (const property of model.properties)
    {
      if (property.type.kind === "model")
      {
        const targetModel = spec.models.find((target) => target.name === property.type.name);
        if (targetModel && !targetModel.isDslIgnored && !targetModel.discriminatorValue && !polymorphicRootNames.has(targetModel.name))
        {
          writer.writeLine(`_NESTED_MODEL_MAP[("${model.name}", "${convertToSnakeCase(property.name)}")] = (${targetModel.name}, False)`);
        }
      }
      else if (property.type.kind === "array" && property.type.elementType?.kind === "model")
      {
        const targetModel = spec.models.find((target) => target.name === property.type.elementType?.name);
        if (targetModel && !targetModel.isDslIgnored && !targetModel.discriminatorValue && !polymorphicRootNames.has(targetModel.name))
        {
          writer.writeLine(`_NESTED_MODEL_MAP[("${model.name}", "${convertToSnakeCase(property.name)}")] = (${targetModel.name}, True)`);
        }
      }
    }
  }
  writer.blankLine();

  return writer.toString();
}
