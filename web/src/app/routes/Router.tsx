import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { HashRouter, useLocation, useNavigate } from "react-router-dom";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { computeExtensionSidebarRoute, ROUTES } from "utils";
import {
  ActivityScreen,
  ExtensionsScreen,
  GalleryScreen,
  RepositoriesScreen,
  SettingsScreen,
  SidebarAnchorScreen
} from "app/screens";
import { Layout } from "app/layout";
import { AdditionalUi } from "types";
import { useAdditionalUiContext } from "app/context";

export default function AppRouter() {
  return (
    <HashRouter>
      <RouterContent />
    </HashRouter>
  );
}

interface Route {
  key: string;
  path: string;
  layout: JSX.Element;
  alwaysRender: boolean;
}

function RouterContent() {
  const [additionalUi] = useAdditionalUiContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);

  const hasBeenRendered = useRef<{ [key: string]: boolean }>({});
  const scrollPositions = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    const handleScroll = () => {
      scrollPositions.current[location.pathname] = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    const savedScrollPosition = scrollPositions.current[location.pathname] || 0;
    const rootElement = document.documentElement;
    const originalScrollBehavior = rootElement.style.scrollBehavior;
    rootElement.style.scrollBehavior = "auto";
    window.scrollTo(0, savedScrollPosition);
    rootElement.style.scrollBehavior = originalScrollBehavior;
  }, [location.pathname]);

  useEffect(() => {
    hasBeenRendered.current[location.pathname] = true;
  }, [location.pathname]);

  function renderLayout(component: FunctionComponent, props?: object) {
    const Component: FunctionComponent = component;
    return <Component {...props} />;
  }

  const mainRoutes = useMemo<Route []>(()=> {
    return Object.entries(ROUTES).map(([key, path]) => {
      const ComponentMap: Record<string, FunctionComponent> = {
        home: GalleryScreen,
        repositories: RepositoriesScreen,
        extensions: ExtensionsScreen,
        activity: ActivityScreen,
        settings: SettingsScreen,
      };
      return {key, path, layout: renderLayout(ComponentMap[key]), alwaysRender: false};
    })
  }, [additionalUi, location.pathname]);

  const additionalRoutes = useMemo<Route []>(() => {
    return additionalUi.sidebar?.filter(element => element.anchor === UserInterfaceAnchor.Sidebar).map((element: AdditionalUi) => {
      const path = computeExtensionSidebarRoute(element.uuid);
      return { key: element.uuid, path, layout: renderLayout(SidebarAnchorScreen, { element }), alwaysRender: true};
    });
  }, [additionalUi, location.pathname]);

  useEffect(() => {
    const newRoutes = mainRoutes.concat(additionalRoutes);
    setRoutes(newRoutes);
    if (newRoutes.find(route => route.path === location.pathname) === undefined) {
      // In case the current navigation path does not match any route, we fall back to the "home" route
      navigate(ROUTES.home);
    }
  }, [location.pathname, mainRoutes, additionalRoutes]);

  return (
    <Layout>
      <>
        {routes.map((route) => {
          const isActive = location.pathname === route.path;
          return (<div
            key={route.key}
            style={{ display: isActive === true ? "block" : "none", height: "100%" }}
          >
            {(route.alwaysRender === true || isActive === true || hasBeenRendered.current[route.path]) ? route.layout : null}
          </div>);
        })}
      </>
    </Layout>
  );
}
