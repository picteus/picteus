import React, { ReactElement, useMemo } from "react";
import { ActionIcon, Text, Tooltip } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  createUiContainer,
  flowing,
  identifier,
  string,
  stringUrl,
  table,
  tableColumn,
  TableColumnAlign,
  TableColumnWidthMode,
  tableRow,
  TableRow,
  TextIntensity,
  TextWeight,
  timestamp
} from "@picteus/shared-core";
import { Image } from "@picteus/ws-client";

import { ViewMode } from "types";
import { useRepository } from "app/hooks";
import { useActionModalContext } from "app/context";
import { freeForm, ImageItemWrapper, UiContainerView } from "app/components";
import ImageDataCard from "../ImageDataCard/ImageDataCard.tsx";
import { RepositoryDetail, RepositoryTop } from "../../../../../../screens/RepositoriesScreen/components";


export type ImageInformationCardPropsType =
  {
    readonly image: Image;
    readonly viewMode: ViewMode;
    readonly isOpened: boolean;
    readonly onToggle: () => void;
    readonly onHide: () => void;
  };

export default function ImageInformationCard({
  image,
  viewMode,
  isOpened,
  onToggle,
  onHide
}: ImageInformationCardPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const [ , addModal ] = useActionModalContext();
  const { data: repository } = useRepository(image.repositoryId);

  const uiContainer = useMemo(() =>
    {
      const rows: TableRow[] = [];
      const labelOptions = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };

      if (image.parentId)
      {
        rows.push(tableRow([
            string(t("field.parent"), labelOptions),
            freeForm(<ImageItemWrapper imageId={image.parentId} viewMode={viewMode}/>)
          ])
        );
      }

      if (repository)
      {
        rows.push(
          tableRow([
            string(t("field.repository"), labelOptions),
            flowing([
              string(repository.name),
              freeForm(<Tooltip
                label={t("button.open")}
                position="right"
              >
                <ActionIcon
                  variant="default"
                  onClick={() =>
                  {
                    addModal({
                      title: <RepositoryTop repository={repository} onDeleted={() =>
                      {
                      }}/>,
                      size: "m",
                      component: <RepositoryDetail repository={repository}/>
                    });
                  }}
                >
                  <IconEye/>
                </ActionIcon>
              </Tooltip>)
            ])
          ])
        );
      }
      else if (image.repositoryId)
      {
        rows.push(
          tableRow([
            string(t("field.repository"), labelOptions),
            identifier(image.repositoryId, { modifiers: { monospace: true, copyable: true } })
          ])
        );
      }

      rows.push(tableRow([
          string(t("field.createdOn"), labelOptions),
          timestamp(image.fileDates.creationDate)
        ])
      );
      rows.push(tableRow([
          string(t("field.modifiedOn"), labelOptions),
          timestamp(image.fileDates.modificationDate)
        ])
      );
      rows.push(tableRow([
          string(t("field.importedOn"), labelOptions),
          timestamp(image.creationDate)
        ])
      );

      if (image.sourceUrl)
      {
        rows.push(
          tableRow([
            string(t("field.sourceUrl"), labelOptions),
            stringUrl(image.sourceUrl, { modifiers: { copyable: true } })
          ])
        );
      }

      return createUiContainer({
        elements: [
          table(rows, {
            columns: [
              tableColumn({ align: TableColumnAlign.left, width: 25, widthMode: TableColumnWidthMode.maximum }),
              tableColumn({ align: TableColumnAlign.left })
            ]
          })
        ]
      });
    },
    [ image, repository, viewMode, t, addModal ]
  );

  return (
    <ImageDataCard
      header={(
        <Text fw={600} size="sm">
          {t("imageDetail.information")}
        </Text>
      )}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
    >
      <UiContainerView uiContainer={uiContainer}/>
    </ImageDataCard>
  );
}
