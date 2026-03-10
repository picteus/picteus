import React, { Fragment, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Flex } from "@mantine/core";

import { ImageItemMode, UiCommandType } from "types";
import { ImageMasonry, Markdown, RjsfForm } from "app/components";
import { useContainerDimensions, useEnterKey } from "app/hooks";
import { IconInfoCircle } from "@tabler/icons-react";

import { ImageSummary } from "@picteus/ws-client";

import style from "./CommandForm.module.scss";
import { extractSchemaAndUiSchema } from "../RjsfForm/RjsfForm.tsx";
import { ImageService } from "../../services";

type CommandFormType = {
  command: UiCommandType;
  extensionId: string;
  imageIds?: string[];
  onSend: (extensionId: string, commandId: string, parameters?: object) => void;
  onCancel: () => void;
};

export default function CommandForm({
  command,
  extensionId,
  imageIds,
  onSend,
  onCancel,
}: CommandFormType) {
  const [commandParameters, setCommandParameters] = useState<object>();
  const [images, setImages] = useState<ImageSummary[]>();
  const [t] = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerDimensions(containerRef);

  useEnterKey(() => onSend(extensionId, command.id, commandParameters));
  useEffect(() => {
    async function load() {
      if (imageIds !== undefined) {
        const result = await ImageService.searchSummaries({ filter: { origin: { kind: "images", ids: imageIds } } });
        setImages(result.items);
      }
    }
    void load();
  }, [imageIds]);

  const { schema, uiSchema } = extractSchemaAndUiSchema(command.parameters);
  return (
    <>
      {command.dialogContent && (<Flex mt={"md"} direction={"column"} gap={15}>
        <Alert icon={<IconInfoCircle />}>
          <Markdown content={command.dialogContent.description} />
        </Alert>
        {command.dialogContent.details && (
          <div className={style.details}><Markdown content={command.dialogContent.details} /></div>)}
      </Flex>)}
      <div ref={containerRef}>
        {/* TODO: find a way to limit the number of images displayed */}
        {images && containerRef?.current && <ImageMasonry
          containerWidth={containerWidth}
          imageSize={100}
          imageItemMode={ImageItemMode.PASSIVE}
          loadMore={() => {
          }}
          data={{
            images,
            currentPage: 1,
            total: images.length
          }}
        />}
      </div>
      <RjsfForm schema={schema} uiSchema={uiSchema} onChange={setCommandParameters} />
      <Flex mt={"md"} align="flex-end" justify="flex-end" gap={5}>
        {<Button variant="subtle" onClick={onCancel}>
          {t("button.cancel")}
        </Button>}
        <Button
          onClick={() => onSend(extensionId, command.id, commandParameters)}
        >
          {t("button.send")}
        </Button>
      </Flex>
    </>
  );
}
