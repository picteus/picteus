import { type ReactElement, useEffect, useMemo, useState } from "react";
import { Alert, Box, Flex, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  ExtensionAndManual,
  ImageSummary,
  ManifestExtensionCommandSpecification,
  SearchFilter
} from "@picteus/ws-client";

import { ManualSection } from "types";
import { extractMarkdownParagraph, ToastService } from "utils";
import { useExtension } from "app/hooks";
import { ImageService } from "app/services";
import { ImagesCollection, ImageThumbnail, Manual, Markdown } from "app/components";


type InstructionsType = { summary?: string, details?: string };

function extractCommandInstructions(
  commandId: string,
  extensionAndManual?: ExtensionAndManual
): InstructionsType | undefined
{
  return extensionAndManual === undefined ? undefined : {
    summary: extractMarkdownParagraph(extensionAndManual.manual?.instructions, [
      ManualSection.Commands,
      commandId
    ], false),
    details: extractMarkdownParagraph(extensionAndManual.manual?.instructions, [
      ManualSection.Commands,
      commandId, "Details"
    ])
  };
}

function findCommandSpecification(
  extensionAndManual: ExtensionAndManual,
  commandId: string,
  language: string
): ManifestExtensionCommandSpecification
{
  const manifestCommands = extensionAndManual.manifest.instructions.flatMap(
    (instructionGroup) => instructionGroup.commands || []
  );
  const manifestCommand = manifestCommands.find(
    (candidateCommand) => candidateCommand.id === commandId
  );
  if (!manifestCommand)
  {
    return undefined;
  }
  const locale = language.split("-")[0];
  return (
    manifestCommand.specifications.find(
      (candidateSpecification) => candidateSpecification.locale === locale
    ) ||
    manifestCommand.specifications.find(
      (candidateSpecification) => candidateSpecification.locale === "en"
    ) ||
    manifestCommand.specifications[0]
  );
}

type CommandOverviewImagesResultType = {
  images: ImageSummary[];
  totalCount?: number;
};

function useCommandOverviewImages(searchFilter?: SearchFilter): CommandOverviewImagesResultType
{
  const [ images, setImages ] = useState<ImageSummary[]>([]);
  const [ totalCount, setTotalCount ] = useState<number>();

  useEffect(() =>
  {
    if (!searchFilter)
    {
      setImages([]);
      setTotalCount(undefined);
      return;
    }

    let isMounted = true;

    async function loadImages(): Promise<void>
    {
      try
      {
        const result = await ImageService.searchSummaries({
          filter: searchFilter,
          range: { take: 20 }
        });
        if (isMounted === true)
        {
          setImages(result.items);
          setTotalCount(result.totalCount);
        }
      }
      catch (error)
      {
        if (isMounted === true)
        {
          ToastService.apiCallError(error, "An error occurred while retrieving the images");
        }
      }
    }

    void loadImages();

    return () =>
    {
      isMounted = false;
    };
  }, [ searchFilter ]);

  return {
    images,
    totalCount
  };
}

type CommandHeaderPropsType = {
  specification: ManifestExtensionCommandSpecification;
  instructions?: InstructionsType;
};

function CommandHeader({ specification, instructions }: CommandHeaderPropsType): ReactElement
{
  return (
    <>
      {specification.name && <Text fw={600} size="sm">{specification.name}</Text>}
      {(instructions.summary === undefined && specification) &&
        <Text size="sm" c="dimmed">{specification.description}</Text>}
      {instructions.summary && <Markdown content={instructions.summary}/>}
    </>);
}

type SingleImageOverviewPropsType = {
  specification: ManifestExtensionCommandSpecification;
  instructions?: InstructionsType;
  image: ImageSummary;
};

function SingleImageOverview({
  specification,
  instructions,
  image
}: SingleImageOverviewPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const edge = 100;
  return (
    <Stack gap="md" my="sm">
      <Flex align="start" justify="space-between" gap="md">
        <Alert variant="default" color="transparent" p="sm">
          <Stack gap="sm">
            <CommandHeader specification={specification} instructions={instructions}/>
          </Stack>
        </Alert>
        <Box style={{ flexShrink: 0 }}>
          <ImageThumbnail imageOrUrl={image} width={edge} height={edge}/>
        </Box>
      </Flex>
      {instructions?.details && <Manual content={instructions.details} title={t("commands.about")}/>}
    </Stack>
  );
}

type MultiImageOverviewPropsType = {
  specification: ManifestExtensionCommandSpecification;
  instructions?: InstructionsType;
  images: ImageSummary[];
  totalCount: number;
};

function MultiImageOverview({
  specification,
  instructions,
  images,
  totalCount
}: MultiImageOverviewPropsType): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <>
      <ImagesCollection
        images={images}
        totalCount={totalCount}
      />
      <Alert variant="default" color="transparent" my="sm" p="sm">
        <Stack gap="sm">
          <CommandHeader specification={specification} instructions={instructions}/>
          {instructions?.details && <Manual content={instructions.details} title={t("commands.about")}/>}
        </Stack>
      </Alert>
    </>
  );
}

type CommandOverviewPropsType = {
  commandId: string;
  extensionId: string;
  searchFilter?: SearchFilter;
};

export default function CommandOverview({
  commandId,
  extensionId,
  searchFilter
}: CommandOverviewPropsType): ReactElement
{
  const { i18n } = useTranslation();
  const { data: extensionAndManual } = useExtension(extensionId);
  const { images, totalCount } = useCommandOverviewImages(searchFilter);

  const instructions = useMemo((): InstructionsType => extractCommandInstructions(commandId, extensionAndManual),
    [ commandId, extensionAndManual ]
  );

  const specification = useMemo((): ManifestExtensionCommandSpecification =>
      extensionAndManual === undefined ? undefined : findCommandSpecification(extensionAndManual, commandId, i18n.language),
    [ commandId, extensionAndManual, i18n.language ]
  );

  if (specification === undefined)
  {
    return null;
  }

  const hasSingleImage = totalCount === 1 && images.length === 1;
  const singleImage = hasSingleImage === true ? images[0] : undefined;

  if (hasSingleImage === true && singleImage !== undefined)
  {
    return (
      <SingleImageOverview
        specification={specification}
        instructions={instructions}
        image={singleImage}
      />
    );
  }

  return (
    <MultiImageOverview
      specification={specification}
      instructions={instructions}
      images={images}
      totalCount={totalCount}
    />
  );
}
