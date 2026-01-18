import { useEffect, useRef, useState } from "react";
import { withTheme } from "@rjsf/core";
import { Theme as MantineTheme } from "@aokiapp/rjsf-mantine-theme";
import validator from "@rjsf/validator-ajv8";
import { RJSFSchema, UiSchema } from "@rjsf/utils";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";

type RsfjFormType = {
  initialFormData?: object;
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  onChange: (formData: object) => void;
};

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

  // TODO keep this code for future use (overriding fields if needed)
  /*
  const StringField = useCallback((props: FieldProps) => {
    return (
      <TextInput
        mb="lg"
        withAsterisk
        label={props.schema.title}
        placeholder={props.schema.description}
        value={props.formData}
        onChange={({ target }) => props.onChange(target.value)}
      />
    );
  }, []);

  const BooleanField = useCallback((props: FieldProps) => {
    return (
      <Checkbox
        description={props.schema.description}
        label={props.schema.title}
      />
    );
  }, []);

  const FieldTemplate = useCallback((props: FieldTemplateProps) => {
    const {
      id,
      classNames,
      style,
      label,
      help,
      required,
      description,
      errors,
      children,
    } = props;
    if (props.schema.type === "string" || props.schema.type === "boolean") {
      return (
        <div className={classNames} style={style}>
          {children}
          {errors}
          {help}
        </div>
      );
    }
    return (
      <div className={classNames} style={style}>
        <label htmlFor={id}>
          {label}
          {required ? "*" : null}
        </label>
        {description}
        {children}
        {errors}
        {help}
      </div>
    );
  }, []);

  function TitleFieldTemplate(props: TitleFieldProps) {
    const { id, title } = props;
    return <h1 id={id}>{title}</h1>;
  }

  const fields: RegistryFieldsType = {
    StringField,
    BooleanField,
  };*/

  /*  useEffect(() => {
    if (formRef.current) {
      console.log(formRef.current);

    }
  }, [formRef]);*/

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
  return (
    <Form
      ref={formRef}
      schema={ensureSchemaDefaultValues(schema)}
      formData={formData}
      validator={validator}
      uiSchema={uiSchema}
      onChange={(event) => setFormData(event.formData)}
      /*templates={{
        FieldTemplate,
        TitleFieldTemplate,
      }}
      fields={fields}*/
    >
      <div></div>
    </Form>
  );
}
