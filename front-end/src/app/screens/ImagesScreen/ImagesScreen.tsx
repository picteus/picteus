import { ReactElement, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ROUTES } from "utils";
import { useRepositories } from "app/hooks";
import { FiltersService, StorageService } from "app/services";
import { EmptyResults, ImagesView, StackableScreen } from "app/components";

import style from "./ImagesScreen.module.scss";


export default function ImagesScreen(): ReactElement
{
  const [ t ] = useTranslation();
  const navigate = useNavigate();
  const { data: repositories = [] } = useRepositories();

  const computeEmptyResults = useCallback(() =>
  {
    const repositoriesExists = repositories.length > 0;
    return (
      <EmptyResults
        icon={IconPhotoSearch}
        description={t(repositoriesExists ? "emptyImages.description" : "emptyImages.descriptionNoRepository")}
        title={t("emptyImages.title")}
        buttonText={t("emptyImages.buttonTextNoRepository")}
        buttonAction={repositoriesExists ? undefined : () => navigate(ROUTES.repositories)}
      />
    );
  }, [ navigate, repositories.length, t ]);

  return (
    <StackableScreen className={style.mainContainer}>
      <ImagesView
        viewData={StorageService.getMainViewTabData(FiltersService.defaultFilter)}
        isDefault={true}
        onEmptyResults={computeEmptyResults}
      />
    </StackableScreen>
  );
}
