import { ReactElement, useCallback, useMemo } from "react";
import { Box, Flex } from "@mantine/core";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { RepositoryMode, SearchOriginNature, SearchSortingProperty } from "@picteus/ws-client";

import { ViewTabDataType } from "types";
import { shortenPath, ToastService } from "utils";
import { useRepository, useRepositorySummaries, useSetRepositoryModeMutation } from "app/hooks";
import { EmptyResults, ImagesView, LoadingView } from "app/components";
import { RepositoryIdentity } from "../RepositoriesScreen/components";

import variables from "assets/style/variablesExport.module.scss";


type RepositoryImagesScreenType = {
  repositoryId: string;
};

export default function RepositoryImagesScreen({ repositoryId }: RepositoryImagesScreenType): ReactElement
{
  const [ t ] = useTranslation();
  const { data: repository, isLoading } = useRepository(repositoryId);
  const isDisabled = repository?.mode === RepositoryMode.Disabled;
  const { data: summaries } = useRepositorySummaries(repositoryId, 1, !isDisabled);
  const setRepositoryModeMutation = useSetRepositoryModeMutation();

  const viewData = useMemo<ViewTabDataType>(() => ({
    mode: "masonry",
    filterOrCollectionId: {
      filter: {
        origin: { kind: SearchOriginNature.Repositories, ids: [ repositoryId ] },
        sorting: { property: SearchSortingProperty.UpdateDate, isAscending: false }
      }
    }
  }), [ repositoryId ]);

  const handleEnableRepository = useCallback(async (): Promise<void> =>
  {
    try
    {
      await setRepositoryModeMutation.mutateAsync({ id: repositoryId, mode: RepositoryMode.Enabled });
      ToastService.success(t("repositoryScreen.successEnable"));
    }
    catch (error)
    {
      ToastService.apiCallI18nError(error, "repositoryScreen.errorMode");
    }
  }, [ repositoryId, setRepositoryModeMutation, t ]);

  const computeEmptyResults = useCallback((): ReactElement<typeof EmptyResults> =>
  {
    if (isDisabled)
    {
      return (
        <EmptyResults
          icon={IconPhotoSearch}
          title={t("emptyImages.titleRepositoryDisabled")}
          description={t("emptyImages.descriptionRepositoryDisabled")}
          buttonText={t("emptyImages.buttonTextEnableRepository")}
          buttonAction={() => void handleEnableRepository()}
        />
      );
    }

    return (
      <EmptyResults
        icon={IconPhotoSearch}
        title={t("emptyImages.title")}
        description={t("emptyImages.description")}
      />
    );
  }, [ handleEnableRepository, isDisabled, t ]);

  const subtitle = repository !== undefined ? t("repositoryScreen.imagesScreen.subtitle", {
    path: shortenPath(repository.url),
    number: isDisabled ? 0 : (summaries?.totalCount ?? 0)
  }) : undefined;

  return (
    <Flex direction="column" h="100%">
      <Box px={variables.contentPaddingHorizontal} pt="lg" pb="md">
        <LoadingView visible={isLoading}>
          {repository !== undefined && subtitle !== undefined && (
            <RepositoryIdentity repository={repository} subtitle={subtitle}/>
          )}
        </LoadingView>
      </Box>
      <Box flex={1} mih={0}>
        {isDisabled ? (
          computeEmptyResults()
        ) : (
          <ImagesView
            viewData={viewData}
            isDefault={false}
            lockedRepositoryId={repositoryId}
            withCollectionsBar={false}
            onEmptyResults={computeEmptyResults}
          />
        )}
      </Box>
    </Flex>
  );
}
