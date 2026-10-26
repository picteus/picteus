import * as React from "react";
import { FunctionComponent, ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { HashRouter, useLocation, useNavigate } from "react-router-dom";
import { Bounce, ToastContainer } from "react-toastify";
import { Box } from "@mantine/core";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { AdditionalUi } from "types";
import { computeExtensionSidebarRoute, ROUTES } from "utils";
import Providers, { useAdditionalUiContext } from "app/context";
import {
  ActivityScreen,
  CollectionsScreen,
  DeskScreen,
  ExplorerScreen,
  ExtensionsScreen,
  RepositoriesScreen,
  SettingsScreen,
  SidebarAnchorScreen,
  TestsScreen
} from "app/screens";
import { Layout } from "app/layout";

import style from "./Router.module.scss";


interface Route
{
  key: string;
  path: string;
  layout: ReactElement;
  alwaysRender: boolean;
}

interface RouterContentType
{
}

function RouterContent({}: RouterContentType): ReactElement
{
  const [ additionalUi ] = useAdditionalUiContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [ routes, setRoutes ] = useState<Route[]>([]);

  const hasBeenRendered = useRef<{ [key: string]: boolean }>({});


  useEffect(() =>
  {
    hasBeenRendered.current[location.pathname] = true;
  }, [ location.pathname ]);

  function renderLayout(component: FunctionComponent, props?: object)
  {
    const Component: FunctionComponent = component;
    return <Component {...props} />;
  }

  const mainRoutes = useMemo<Route[]>(() =>
  {
    return Object.entries(ROUTES).map(([ key, path ]) =>
    {
      const ComponentMap: Record<string, FunctionComponent> = {
        home: ExplorerScreen,
        desk: DeskScreen,
        collections: CollectionsScreen,
        repositories: RepositoriesScreen,
        extensions: ExtensionsScreen,
        activity: ActivityScreen,
        settings: SettingsScreen,
        test: TestsScreen
      };
      return { key, path, layout: renderLayout(ComponentMap[key]), alwaysRender: false };
    });
  }, [ additionalUi ]);

  const additionalRoutes = useMemo<Route[]>(() =>
  {
    return additionalUi.sidebar?.filter(element => element.integration.anchor === UserInterfaceAnchor.Sidebar && element.integration.isExternal === false).map((element: AdditionalUi) =>
    {
      const path = computeExtensionSidebarRoute(element.uuid);
      return { key: element.uuid, path, layout: renderLayout(SidebarAnchorScreen, { element }), alwaysRender: true };
    });
  }, [ additionalUi ]);

  useEffect(() =>
  {
    const newRoutes = mainRoutes.concat(additionalRoutes);
    setRoutes(newRoutes);
    if (newRoutes.find(route => route.path === location.pathname) === undefined)
    {
      // In case the current navigation path does not match any route, we fall back to the "home" route
      navigate(ROUTES.home);
    }
  }, [ location.pathname, mainRoutes, additionalRoutes ]);

  return (
    <Layout>
      <>
        {routes.map(route =>
        {
          const isActive = location.pathname === route.path;
          return (
            <Box
              key={route.key}
              pos="absolute"
              inset={0}
              w="100%"
              h="100%"
              className={isActive ? undefined : style.routeHidden}
            >
              {(route.alwaysRender === true || isActive === true || hasBeenRendered.current[route.path]) ? route.layout : null}
            </Box>
          );
        })}
      </>
    </Layout>
  );
}

interface AppRouterType
{
}

export default function AppRouter({}: AppRouterType): ReactElement
{
  return (
    <HashRouter>
      <Providers>
        <ToastContainer
          autoClose={3000}
          newestOnTop
          hideProgressBar
          rtl={false}
          draggable
          pauseOnHover
          theme="light"
          transition={Bounce}
        />
        <RouterContent/>
      </Providers>
    </HashRouter>
  );
}
