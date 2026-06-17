import React, { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ActionModalValue } from "types";
import { ROUTES } from "utils";
import { ActionModalProvider, useActionModalContext, useImagesTabsContext } from "app/context";
import { FiltersService, RepositoriesService, StorageService } from "app/services";
import { EmptyResults, ImagesView, StackNavigator, useStackNavigator } from "app/components";

import style from "./ImagesScreen.module.scss";


type ImagesScreenWrappedType = {
  parentAddModal: (value: ActionModalValue) => string;
  parentRemoveModal: (id: string) => void;
}

function ImagesScreenWrapped({ parentAddModal, parentRemoveModal }: ImagesScreenWrappedType)
{
  const [t] = useTranslation();
  const { tabs, state, mainTabValue } = useImagesTabsContext();
  const [, , removeModal, subscribeToModals] = useActionModalContext();
  const { push, pop, popToRoot, subscribe } = useStackNavigator();
  const navigate = useNavigate();

  useEffect(() =>
  {
    return subscribeToModals((value: ActionModalValue, isAdded: boolean) =>
    {
      if (value.isStackable !== true)
      {
        if (isAdded === true)
        {
          parentAddModal(value);
        }
        else
        {
          parentRemoveModal(value.id);
        }
        return;
      }
      if (isAdded === true)
      {
        push(value);
      }
      else
      {
        pop();
      }
    });
  }, [parentAddModal, parentRemoveModal, subscribeToModals, push, pop]);

  useEffect(() =>
  {
    return subscribe((stackedComponent, isPopped: boolean) =>
    {
      if (isPopped === true)
      {
        removeModal(stackedComponent.id);
      }
    });
  }, [subscribe, removeModal]);

  useEffect(() =>
  {
    popToRoot();
  }, [state.activeTab, popToRoot]);

  const computeEmptyResults = useCallback(() =>
  {
    const repositoriesExists = RepositoriesService.list().length > 0;
    return (
      <EmptyResults
        icon={IconPhotoSearch}
        description={t(repositoriesExists ? "emptyImages.description" : "emptyImages.descriptionNoRepository")}
        title={t("emptyImages.title")}
        buttonText={t("emptyImages.buttonTextNoRepository")}
        buttonAction={repositoriesExists ? undefined : () => navigate(ROUTES.repositories)}
      />
    );
  }, [navigate]);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === state.activeTab), [tabs, state.activeTab]);

  const mainRendered = useMemo(() => (<ImagesView
    viewData={StorageService.getMainViewTabData(FiltersService.defaultFilter)}
    isDefault={true}
    onEmptyResults={computeEmptyResults}
  />), [computeEmptyResults]);

  const otherRendered = useMemo(() => (state.activeTab !== mainTabValue && <ImagesView
    viewData={{
      mode: activeTab.data.mode,
      pinnable: activeTab.data.pinnable,
      filterOrCollectionId: activeTab.data.filterOrCollectionId
    }}
    isDefault={false}
    onEmptyResults={() => (<EmptyResults
      icon={IconPhotoSearch}
      description={t(`emptyImages.${("filter" in activeTab.data.filterOrCollectionId && activeTab.data.filterOrCollectionId.filter.origin) ? "descriptionNoData" : "description"}`)}
      title={t("emptyImages.title")}
    />)}
  />), [activeTab]);

  return (
    <div className={style.mainContainer}>
      {state.activeTab === mainTabValue ? mainRendered : otherRendered}
    </div>
  );
}

export default function ImagesScreen()
{
  const [, addModal, removeModal] = useActionModalContext();
  return (
    <ActionModalProvider>
      <StackNavigator>
        <ImagesScreenWrapped parentAddModal={addModal} parentRemoveModal={removeModal}/>
      </StackNavigator>
    </ActionModalProvider>
  );
}
