import { FunctionComponent, useEffect, useMemo, useRef } from "react";
import { HashRouter, useLocation } from "react-router-dom";

import { ROUTES } from "utils";
import {
  ActivityScreen,
  ExtensionsScreen,
  GalleryScreen,
  RepositoriesScreen,
  SettingsScreen,
  SidebarAnchorScreen,
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

function RouterContent() {
  const [additionalUi] = useAdditionalUiContext();
  const location = useLocation();

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

  const additionalRoutes = useMemo(() => {
    return additionalUi.sidebar?.map((element: AdditionalUi) => {
      const isActive =
        location.pathname ===
        ROUTES.extension_sidebar_suffix + element.extensionId;
      const wasRendered =
        hasBeenRendered.current[
          ROUTES.extension_sidebar_suffix + element.extensionId
        ];
      return (
        <div
          key={"route-" + element.title}
          style={{
            display: isActive ? "block" : wasRendered ? "none" : "none",
            height: "100%",
          }}
        >
          {renderLayout(SidebarAnchorScreen, { element })}
        </div>
      );
    });
  }, [additionalUi, location.pathname]);

  return (
    <Layout>
      <>
        {Object.entries(ROUTES).map(([key, path]) => {
          const isActive = location.pathname === path;
          const wasRendered = hasBeenRendered.current[path];

          const ComponentMap: Record<string, FunctionComponent> = {
            home: GalleryScreen,
            repositories: RepositoriesScreen,
            extensions: ExtensionsScreen,
            activity: ActivityScreen,
            settings: SettingsScreen,
          };

          const Component = ComponentMap[key];

          return (
            <div
              key={path}
              style={{
                display: isActive ? "block" : "none",
              }}
            >
              {isActive || wasRendered ? renderLayout(Component) : null}
            </div>
          );
        })}
        {additionalRoutes}
      </>
    </Layout>
  );
}
