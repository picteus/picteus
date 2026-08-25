import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { withTheme } from "@rjsf/core";
// TODO: upgrade to rjsf v6.8.0 and use the "@rjsf/mantine" module instead of "@aokiapp/rjsf-mantine-theme"
// import { Theme as MantineTheme } from "@rjsf/mantine";
import { Theme as MantineTheme } from "@aokiapp/rjsf-mantine-theme";
import { customizeValidator } from "@rjsf/validator-ajv8";
import { RegistryWidgetsType, RJSFSchema, UiSchema } from "@rjsf/utils";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";

import { JsonType } from "types";
import RepositoryWidget from "./widgets/RepositoryWidget";
import CollectionWidget from "./widgets/CollectionWidget";
import TagsWidget from "./widgets/TagsWidget";


type RsfjFormType = {
  initialFormData?: object;
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  onChange: (formData: object) => void;
  onValidationChange?: (isValid: boolean) => void;
};

type UIProperty = { property: string, ui: JsonType };
const uiPropertyName = "ui";

function stripAndExtractParametersUiProperties(parameters: JsonType): UIProperty[]
{
  const uis: UIProperty[] = [];
  const properties = parameters.properties;
  if (properties !== undefined)
  {
    for (const property in properties)
    {
      const childProperty = properties[property];
      const ui: JsonType = childProperty[uiPropertyName];
      delete childProperty[uiPropertyName];
      if (ui !== undefined)
      {
        uis.push({ property, ui });
      }
    }
  }
  return uis;
}

export function extractSchemaAndUiSchema(parameters: object): {
  schema: RJSFSchema,
  uiSchema: UiSchema
}
{
  const deepCopiedParameters: RJSFSchema = JSON.parse(JSON.stringify(parameters));
  const uiProperties = stripAndExtractParametersUiProperties(deepCopiedParameters);
  const uiSchema: UiSchema = {};
  uiProperties.forEach((uiProperty: UIProperty) =>
  {
    uiSchema[uiProperty.property] = { "ui:options": uiProperty.ui };
  });
  return { schema: deepCopiedParameters, uiSchema };
}

function ErrorFallback({ error })
{
  return (
    <div role="alert">
      Internal error: <span style={{ color: "red" }}>{error.message}</span>
    </div>
  );
}

const Form = withTheme(MantineTheme);

const customValidator = customizeValidator(
  {
    ajvOptionsOverrides:
      {
        // We use the "all" value to strip all properties not in schema, or true to respect the schema's `additionalProperties` setting
        removeAdditional: "all",
        useDefaults: true
      }
  }
);

export default function RjsfForm({
  initialFormData,
  schema,
  uiSchema,
  onChange,
  onValidationChange
}: RsfjFormType)
{
  const formRef = useRef(null);

  function ensureSchemaBooleanDefaultValues(schema: RJSFSchema): RJSFSchema
  {
    if (schema.type === "object" && schema.properties)
    {
      for (const key in schema.properties)
      {
        const property: JsonType = schema.properties[key] as JsonType;
        if (property.type === "boolean" && property.default === undefined)
        {
          property.default = false;
        }
        if (property.type === "object")
        {
          ensureSchemaBooleanDefaultValues(property);
        }
      }
    }
    return schema;
  }

  const withBooleanDefaultValueSchema = useMemo<RJSFSchema>(() =>
  {
    return ensureSchemaBooleanDefaultValues(schema);
  }, [ schema ]);

  const cleanedInitialFormData = useMemo<object | undefined>(() =>
  {
    if (initialFormData === undefined)
    {
      return undefined;
    }
    const dataCopy = JSON.parse(JSON.stringify(initialFormData));
    customValidator.rawValidation(withBooleanDefaultValueSchema, dataCopy);
    return dataCopy;
  }, [ initialFormData, withBooleanDefaultValueSchema ]);

  const [ formData, setFormData ] = useState(cleanedInitialFormData);

  useEffect(() =>
  {
    if (formData)
    {
      onChange(formData);
    }
    if (onValidationChange)
    {
      const validationResult = customValidator.rawValidation(withBooleanDefaultValueSchema, formData ?? {});
      onValidationChange(!validationResult.errors || validationResult.errors.length === 0);
    }
  }, [ formData ]);

  useEffect(() =>
  {
    const firstInput = formRef?.current?.formElement?.current?.querySelector(
      "input.mantine-TextInput-input, textarea"
    ) as HTMLElement | null;
    if (firstInput)
    {
      setTimeout(() =>
      {
        firstInput.focus();
      }, 100);
    }
  }, [ formRef ]);

  const widgets: RegistryWidgetsType =
    {
      repository: RepositoryWidget,
      collection: CollectionWidget,
      tags: TagsWidget
    };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Form
        ref={formRef}
        schema={withBooleanDefaultValueSchema}
        formData={formData}
        uiSchema={uiSchema}
        validator={customValidator}
        omitExtraData={true}
        liveOmit={true}
        onChange={(event) => setFormData(event.formData)}
        widgets={widgets}
      >
        {/* This prevents the default "Submit" button from being displayed */}
        <div></div>
      </Form>
    </ErrorBoundary>
  );
}
