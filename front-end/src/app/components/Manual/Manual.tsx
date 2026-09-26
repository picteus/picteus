import { type ReactElement } from "react";
import { Accordion, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import Markdown from "../Markdown/Markdown.tsx";


export type ManualType = {
  content?: string;
  isExpanded?: boolean;
};

export default function Manual({
  content,
  isExpanded = false
}: ManualType): ReactElement | null
{
  const [ t ] = useTranslation();

  return (
    <Accordion
      variant="contained"
      radius="sm"
      defaultValue={isExpanded ? "manual" : undefined}
    >
      <Accordion.Item value="manual">
        <Accordion.Control>
          <Text size="xs" fw={500}>
            {t("field.manual")}
          </Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Markdown content={content}/>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
