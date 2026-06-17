import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Code,
  Container,
  createTheme,
  localStorageColorSchemeManager,
  MantineProvider
} from "@mantine/core";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import "react-toastify/dist/ReactToastify.css";
import "@mantine/core/styles.css";

import { Configuration, DefaultConfig } from "@picteus/ws-client";

import { API_KEY, BASE_PATH } from "utils";
import { EventService, StorageService } from "./app/services";
import { BootstrapScreen } from "app/screens";
import "i18n/i18n.ts";
import Initializer from "./Initializer.tsx";
import "assets/style/style.scss";
import "assets/style/override.scss";


const theme = createTheme({
  fontFamily: "Roboto, sans-serif"
});

DefaultConfig.config = new Configuration({
  basePath: BASE_PATH,
  apiKey: API_KEY || ""
});

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void })
{
  const [t] = useTranslation();

  return (
    <Container fluid style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <Alert className="error-alert" color="red" title={t("errorBoundary.message")} variant="light"
             style={{ width: "90vw", maxHeight: "42vh" }}>
        <Code block mb="md" style={{maxWidth: "87vw", maxHeight: "30vh"}}>{error.stack || error.message}</Code>
        <Button color="red" onClick={resetErrorBoundary}>{t("errorBoundary.button")}</Button>
      </Alert>
    </Container>
  );
}

function App()
{
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [bootstrapLogs, setBootstrapLogs] = useState<string[]>([]);

  async function upgrade(previousVersion: string, currentVersion: string): Promise<void>
  {
    EventService.upgrade(previousVersion, currentVersion);
  }

  useEffect(() =>
  {
    const run = async () =>
    {
      const currentVersion = import.meta.env.PACKAGE_VERSION;
      const previousVersion = StorageService.getVersion();
      if (previousVersion !== currentVersion)
      {
        await upgrade(previousVersion ?? currentVersion, currentVersion);
        StorageService.setVersion(currentVersion);
      }
      const boostrapInterval = setInterval(() =>
      {
        fetch(BASE_PATH + "/bootstrap")
          .then(async (response) =>
          {
            if (!response.ok)
            {
              // The server indicates that it is now ready
              setBootstrapping(false);
              clearInterval(boostrapInterval);
              return;
            }
            const res = await response.json();
            setBootstrapLogs(res.logs);
          })
          .catch(() =>
          {
            // This happens as long as the server is not reachable
          });
      }, 250);
    };
    void run();
  }, []);

  const colorSchemeManager = localStorageColorSchemeManager({
    key: StorageService.COLOR_SCHEME
  });

  return (
    <MantineProvider colorSchemeManager={colorSchemeManager} theme={theme}>
      <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
        {bootstrapping ? (
          <BootstrapScreen logs={bootstrapLogs}/>
        ) : (
          <Initializer/>
        )}
      </ErrorBoundary>
    </MantineProvider>
  );
}

export default App;
