import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@mantine/core";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ROUTES } from "utils";
import { useImagesTabsContext } from "app/context";
import { useContainerDimensions, useReadyRef } from "app/hooks";
import { FiltersService, RepositoriesService, StorageService } from "app/services";
import { EmptyResults, ImagesView } from "app/components";

import style from "./ImagesScreen.module.scss";


export default function ImagesScreen() {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [containerRef,  containerReadyRef, containerIsReady ] = useReadyRef<HTMLDivElement>();
  const [viewportRef,  viewportReadyRef, viewportIsReady ] = useReadyRef<HTMLDivElement>();
  const { height } = useContainerDimensions(containerReadyRef);
  const { tabs, state, mainTabValue } = useImagesTabsContext();

  const computeEmptyResults = useCallback(() => {
    const repositoriesExists = RepositoriesService.list().length > 0;
    return (
      <EmptyResults
        icon={<IconPhotoSearch size={140} stroke={1} />}
        description={t(repositoriesExists ? "emptyImages.description" : "emptyImages.descriptionNoRepository")}
        title={t("emptyImages.title")}
        buttonText={t("emptyImages.buttonTextNoRepository")}
        buttonAction={repositoriesExists ? undefined : () => navigate(ROUTES.repositories)}
      />
    );
  }, [navigate]);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === state.activeTab), [tabs, state.activeTab]);

  return (
    <div ref={containerRef} className={style.mainContainer}>
      {containerIsReady && <ScrollArea h={height} viewportRef={viewportRef}>
        {viewportIsReady && (state.activeTab === mainTabValue ?
          <ImagesView
            viewData={StorageService.getMainViewTabData(FiltersService.defaultFilter)}
            isDefault={true}
            containerRef={containerReadyRef}
            stickyControlBar={true}
            onEmptyResults={computeEmptyResults}
            scrollRootRef={viewportReadyRef}
            displayDetailInContainer={true}
          />
          :
          <ImagesView
            viewData={{
              mode: activeTab.data.mode,
              pinnable: activeTab.data.pinnable,
              filterOrCollectionId: activeTab.data.filterOrCollectionId
            }}
            isDefault={false}
            containerRef={containerReadyRef}
            onEmptyResults={() => (<EmptyResults
              icon={<IconPhotoSearch size={140} stroke={1} />}
              description={t(`emptyImages.${("filter" in activeTab.data.filterOrCollectionId && activeTab.data.filterOrCollectionId.filter.origin) ? "descriptionNoData" : "description"}`)}
              title={t("emptyImages.title")}
            />)}
            stickyControlBar={true}
            scrollRootRef={viewportReadyRef}
            displayDetailInContainer={true}
          />)
        }
      </ScrollArea>}
    </div>
  );
}
