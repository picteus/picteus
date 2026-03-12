import { useEffect, useRef, useState } from "react";
import { withTheme } from "@rjsf/core";
import { Theme as MantineTheme } from "@aokiapp/rjsf-mantine-theme";
import validator from "@rjsf/validator-ajv8";
import { RegistryWidgetsType, RJSFSchema, UiSchema } from "@rjsf/utils";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";

import RepositoryWidget from "./widgets/RepositoryWidget";
import CollectionWidget from "./widgets/CollectionWidget";
import TagsWidget from "./widgets/TagsWidget";


type RsfjFormType = {
  initialFormData?: object;
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  onChange: (formData: object) => void;
};

type UIProperty = { property: string, ui: Record<string, any> };
const uiPropertyName = "ui";

function stripAndExtractParametersUiProperties(parameters: Record<string, any>): UIProperty[] {
  const uis: UIProperty[] = [];
  const properties = parameters.properties;
  if (properties !== undefined) {
    for (const property in properties) {
      const childProperty = properties[property];
      const ui: Record<string, any> = childProperty[uiPropertyName];
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
        const property: any = schema.properties[key];
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
    // TODO: handle the case when the "widgets" property is not compatible with the type, like when the "ui.widget" property is to "updown" while the type is a "boolean".
    <Form
      ref={formRef}
      schema={ensureSchemaDefaultValues(schema)}
      formData={formData}
      validator={validator}
      uiSchema={uiSchema}
      onChange={(event) => setFormData(event.formData)}
      widgets={widgets}
    >
      <div></div>
    </Form>
  );
}
