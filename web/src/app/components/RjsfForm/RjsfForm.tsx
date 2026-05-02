import { useEffect, useRef, useState } from "react";
import { withTheme } from "@rjsf/core";
import { Theme as MantineTheme } from "@aokiapp/rjsf-mantine-theme";
import validator from "@rjsf/validator-ajv8";
import { ErrorBoundary } from "react-error-boundary";
import { RegistryWidgetsType, RJSFSchema, UiSchema } from "@rjsf/utils";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";

import RepositoryWidget from "./widgets/RepositoryWidget";
import CollectionWidget from "./widgets/CollectionWidget";
import TagsWidget from "./widgets/TagsWidget";
import { JsonType } from "../../../types";


type RsfjFormType = {
  initialFormData?: object;
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  onChange: (formData: object) => void;
};

type UIProperty = { property: string, ui: JsonType };
const uiPropertyName = "ui";

function stripAndExtractParametersUiProperties(parameters: JsonType): UIProperty[] {
  const uis: UIProperty[] = [];
  const properties = parameters.properties;
  if (properties !== undefined) {
    for (const property in properties) {
      const childProperty = properties[property];
      const ui: JsonType = childProperty[uiPropertyName];
      delete childProperty[uiPropertyName];
      if (ui !== undefined) {
        uis.push({ property, ui });
      }
    }
  }
  return uis;
}

export function extractSchemaAndUiSchema(parameters: object): {
  schema: RJSFSchema,
  uiSchema: UiSchema
} {
  const deepCopiedParameters: RJSFSchema = JSON.parse(JSON.stringify(parameters));
  const uiProperties = stripAndExtractParametersUiProperties(deepCopiedParameters);
  const uiSchema: UiSchema = {};
  uiProperties.forEach((uiProperty: UIProperty) => {
    uiSchema[uiProperty.property] = { "ui:options": uiProperty.ui };
  });
  return { schema: deepCopiedParameters, uiSchema };
}

function ErrorFallback({ error }) {
  return (
    <div role="alert">
      Internal error: <span style={{ color: "red" }}>{error.message}</span>
    </div>
  )
}

const Form = withTheme(MantineTheme);

export default function RjsfForm({
  initialFormData,
  schema,
  uiSchema,
  onChange,
}: RsfjFormType) {
  const [formData, setFormData] = useState(initialFormData);
  const formRef = useRef(null);

  useEffect(() => {
    if (formData) {
      onChange(formData);
    }
  }, [formData]);

  useEffect(() => {
    const firstInput = formRef?.current?.formElement?.current?.querySelector(
      "input.mantine-TextInput-input, textarea",
    ) as HTMLElement | null;
    if (firstInput) {
      setTimeout(() => {
        firstInput.focus();
      }, 100);
    }
  }, [formRef]);

  function ensureSchemaDefaultValues(schema: RJSFSchema): RJSFSchema {
    if (schema.type === "object" && schema.properties) {
      for (const key in schema.properties) {
        const property: JsonType = schema.properties[key] as JsonType;
        if (property.type === "boolean" && property.default === undefined) {
          property.default = false;
        }
        if (property.type === "object") {
          ensureSchemaDefaultValues(property);
        }
      }
    }
    return schema;
  }

  const widgets: RegistryWidgetsType = {
    repository: RepositoryWidget,
    collection: CollectionWidget,
    tags: TagsWidget,
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Form
        ref={formRef}
        schema={ensureSchemaDefaultValues(schema)}
        formData={formData}
        validator={validator}
        uiSchema={uiSchema}
        onChange={(event) => setFormData(event.formData)}
        widgets={widgets}
      >
      </Form>
    </ErrorBoundary>
  );
}
