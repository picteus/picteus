import { ReactElement, useCallback, useMemo } from "react";
import { Box, Flex } from "@mantine/core";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { SearchOriginNature, SearchSortingProperty } from "@picteus/ws-client";

import { ViewTabDataType } from "types";
import { shortenPath } from "utils";
import { useRepository, useRepositorySummaries } from "app/hooks";
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
  const { data: summaries } = useRepositorySummaries(repositoryId, 1);

  const viewData = useMemo<ViewTabDataType>(() => ({
    mode: "masonry",
    filterOrCollectionId: {
      filter: {
        origin: { kind: SearchOriginNature.Repositories, ids: [ repositoryId ] },
        sorting: { property: SearchSortingProperty.UpdateDate, isAscending: false }
      }
    }
  }), [ repositoryId ]);

  const computeEmptyResults = useCallback((): ReactElement<typeof EmptyResults> =>
  {
    return (
      <EmptyResults
        icon={IconPhotoSearch}
        title={t("emptyImages.title")}
        description={t("emptyImages.description")}
      />
    );
  }, [ t ]);

  const subtitle = repository !== undefined
    ? t("repositoryScreen.imagesScreen.subtitle", { path: shortenPath(repository.url), number: summaries?.totalCount ?? 0 })
    : undefined;

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
        <ImagesView
          viewData={viewData}
          isDefault={false}
          lockedRepositoryId={repositoryId}
          withCollectionsBar={false}
          onEmptyResults={computeEmptyResults}
        />
      </Box>
    </Flex>
  );
}
