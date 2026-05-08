import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ROUTES } from "utils";
import { useImagesTabsContext } from "app/context";
import { FiltersService, RepositoriesService, StorageService } from "app/services";
import { EmptyResults, ImagesView } from "app/components";

import style from "./ImagesScreen.module.scss";


export default function ImagesScreen() {
  const [t] = useTranslation();
  const navigate = useNavigate();
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
    <div className={style.mainContainer}>
      {state.activeTab === mainTabValue ?
        <ImagesView
          viewData={StorageService.getMainViewTabData(FiltersService.defaultFilter)}
          isDefault={true}
          onEmptyResults={computeEmptyResults}
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
          onEmptyResults={() => (<EmptyResults
            icon={<IconPhotoSearch size={140} stroke={1} />}
            description={t(`emptyImages.${("filter" in activeTab.data.filterOrCollectionId && activeTab.data.filterOrCollectionId.filter.origin) ? "descriptionNoData" : "description"}`)}
            title={t("emptyImages.title")}
          />)}
          displayDetailInContainer={true}
        />
      }
    </div>
  );
}
