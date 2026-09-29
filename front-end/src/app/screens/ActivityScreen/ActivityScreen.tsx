import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Flex, Stack, Table, Text, Title } from "@mantine/core";
import { IconActivity, IconTrash } from "@tabler/icons-react";

import { Image } from "@picteus/ws-client";

import { LogType, SocketEventType } from "types";
import { ToastService } from "utils";
import { useActionModalContext, useEventSocket } from "app/context";
import { useConfirmAction } from "app/hooks";
import { EventService, ImageService, StorageService } from "app/services";
import {
  Common,
  Container,
  EmptyResults,
  EntityVisual,
  ExtensionIcon,
  FormatedDate,
  ImageDetail,
  StandardTable
} from "app/components";


export default function ActivityScreen(): ReactElement
{
  const [ t ] = useTranslation();
  const { eventStore } = useEventSocket();
  const [ , addModal, removeModal ] = useActionModalContext();
  const confirmAction = useConfirmAction();
  type TableRowDisplayType = { log: LogType; };
  const [ rows, setRows ] = useState<TableRowDisplayType[]>([]);
  const [ imageIllustrationUrls, setImageIllustrationUrls ] = useState<Record<string, string>>({});
  const [ isDeleting, setIsDeleting ] = useState<boolean>(false);
  const imageIllustrationUrlPromises = useRef<Map<string, Promise<string | undefined>>>(new Map());
  const [ pagination, setPagination ] = useState({ currentPage: 1, take: StorageService.getActivityLogsBatchSize() });
  const startIndex = (pagination.currentPage - 1) * pagination.take;
  const endIndex = startIndex + pagination.take;
  const paginatedRows = useMemo(() => rows.slice(startIndex, endIndex), [ endIndex, rows, startIndex ]);

  const load = useCallback(async (): Promise<void> =>
  {
    const events: SocketEventType[] = await EventService.getSocketEvents();
    setRows(events.map((event) => ({ log: EventService.computeLog(event) })));
  }, []);

  useEffect(() =>
  {
    let isCurrentPage = true;

    async function loadImageIllustrationUrls(): Promise<void>
    {
      const illustrationUrlEntries = await Promise.all(rows.slice(startIndex, endIndex).flatMap((row) =>
      {
        if (row.log.entity?.type !== "image")
        {
          return [];
        }

        const imageId = String(row.log.entity.id);
        let imageIllustrationUrlPromise = imageIllustrationUrlPromises.current.get(imageId);
        if (imageIllustrationUrlPromise === undefined)
        {
          imageIllustrationUrlPromise = ImageService.get({ id: imageId })
            .then((image) => ImageService.getImageSrc(image.url, Common.ToastIconEdge, Common.ToastIconEdge))
            .catch((error: unknown) =>
            {
              console.warn(`Failed to load the thumbnail for the image with id '${imageId}'`, error);
              return undefined;
            });
          imageIllustrationUrlPromises.current.set(imageId, imageIllustrationUrlPromise);
        }

        return [ imageIllustrationUrlPromise.then((illustrationUrl) => ({ imageId, illustrationUrl })) ];
      }));

      if (isCurrentPage === true)
      {
        setImageIllustrationUrls((previousIllustrationUrls) =>
        {
          const nextIllustrationUrls = { ...previousIllustrationUrls };
          for (const illustrationUrlEntry of illustrationUrlEntries)
          {
            if (illustrationUrlEntry.illustrationUrl !== undefined)
            {
              nextIllustrationUrls[illustrationUrlEntry.imageId] = illustrationUrlEntry.illustrationUrl;
            }
          }
          return nextIllustrationUrls;
        });
      }
    }

    void loadImageIllustrationUrls();
    return () =>
    {
      isCurrentPage = false;
    };
  }, [ endIndex, rows, startIndex ]);

  useEffect(() =>
  {
    void load();

    return eventStore.subscribeToSocketEvents(() =>
    {
      void load();
    });
  }, [ eventStore, load ]);

  async function handleDeleteAllSocketEvents(): Promise<void>
  {
    setIsDeleting(true);
    try
    {
      await EventService.deleteAllSocketEvents();
      setPagination((previousPagination) =>
      {
        return { ...previousPagination, currentPage: 1 };
      });
      await load();
      ToastService.success(t("activityScreen.successDelete"));
    }
    catch (error)
    {
      ToastService.failure(t("activityScreen.errorDelete"));
    }
    finally
    {
      setIsDeleting(false);
    }
  }

  function handleOnDeleteAllClick(): void
  {
    confirmAction({
      options: {
        title: t("activityScreen.confirmDeleteTitle"),
        message: t("activityScreen.confirmDeleteMessage")
      },
      onConfirm: () =>
      {
        void handleDeleteAllSocketEvents();
      }
    });
  }

  function handleOnPaginationChange(newPage: number): void
  {
    setPagination((previousPagination) =>
    {
      return { ...previousPagination, currentPage: newPage };
    });
  }

  function handleOnTakeChange(newTake: number): void
  {
    StorageService.setActivityLogsBatchSize(newTake);
  }

  const handleEntityVisualClick = useCallback(async (imageId: string): Promise<void> =>
  {
    let image: Image;
    try
    {
      image = await ImageService.get({ id: imageId });
    }
    catch (error)
    {
      return ToastService.apiCallError(error);
    }

    const modalId = addModal({
      component: (
        <ImageDetail
          image={image}
          images={[ image ]}
          viewMode="masonry"
          onClose={() =>
          {
            removeModal(modalId);
          }}
        />),
      withCloseButton: false,
      fullScreen: true
    });
  }, [ addModal, removeModal ]);

  const renderedRows = useMemo(() => paginatedRows?.map((row) =>
  {
    const entity = row.log.entity;
    const imageId = entity?.type === "image" ? String(entity.id) : undefined;
    const illustrationUrl = imageId === undefined ? undefined : imageIllustrationUrls[imageId];
    return (<Table.Tr key={row.log.id}>
      <Table.Td w={160}>
        <Text size="sm"><FormatedDate timestamp={row.log.milliseconds}/></Text>
      </Table.Td>
      <Table.Td w={60}>
        {row.log.extensionId ?
          <ExtensionIcon idOrExtension={row.log.extensionId} size="sm" withTooltip={true}/>
          :
          (<Text size="md">
            {row.log.extensionId ?? t("field.noValue")}
          </Text>)}
      </Table.Td>
      <Table.Td w={80}>
        <Badge
          style={{ flexShrink: 0 }}
          size="sm"
          color={EventService.computeLogLevelColor(row.log.level)}
        >
          {row.log.level}
        </Badge>
      </Table.Td>
      <Table.Td w={Common.ToastIconEdge}>
        {imageId !== undefined && illustrationUrl !== undefined &&
          <EntityVisual
            illustrationUri={illustrationUrl}
            isCompact={true}
            onClick={() =>
            {
              void handleEntityVisualClick(imageId);
            }}
          />}
      </Table.Td>
      <Table.Td>
        <Text size="md">{row.log.text}</Text>
      </Table.Td>
    </Table.Tr>);
  }), [ handleEntityVisualClick, imageIllustrationUrls, paginatedRows ]);

  function renderTable(): ReactElement
  {
    return <StandardTable
      head={[ "field.date", "field.extension", "field.logLevel", "", "field.message" ]}
      withPagination={{
        value: pagination,
        setValue: setPagination,
        totalCount: rows.length,
        onPaginationChange: handleOnPaginationChange,
        onTake: handleOnTakeChange
      }}
      emptyResults={<EmptyResults
        icon={IconActivity}
        description={t("activityScreen.emptyActivity.description")}
        title={t("activityScreen.emptyActivity.title")}
      />}>
      {renderedRows}
    </StandardTable>;
  }

  return (
    <Container>
      <Stack gap="lg" h="100%">
        <Flex justify="space-between" align="center">
          <Title>{t("activityScreen.title")}</Title>
          <Button
            leftSection={<IconTrash size={20}/>}
            color="red"
            variant="light"
            disabled={rows.length === 0}
            loading={isDeleting}
            onClick={handleOnDeleteAllClick}
          >
            {t("button.clearAll")}
          </Button>
        </Flex>
        {renderTable()}
      </Stack>
    </Container>
  );
}
