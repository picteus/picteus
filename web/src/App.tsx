import { useEffect, useState } from "react";
import {
  createTheme,
  localStorageColorSchemeManager,
  MantineProvider,
} from "@mantine/core";
import { Configuration, DefaultConfig } from "@picteus/ws-client";
import "@mantine/core/styles.css";
import "react-toastify/dist/ReactToastify.css";

import { API_KEY, BASE_PATH, ROUTES } from "utils";
import { BootstrapScreen } from "app/screens";
import Initializer from "./Initializer.tsx";
import "i18n/i18n.ts";
import "assets/style/style.scss";
import "assets/style/override.scss";
import { COLOR_SCHEME } from "./app/services/StorageService.ts";

const theme = createTheme({
  fontFamily: "Roboto, sans-serif",
});

DefaultConfig.config = new Configuration({
  basePath: BASE_PATH,
  apiKey: API_KEY || "",
});

function App() {
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [bootstrapLogs, setBootstrapLogs] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const boostrapInterval = setInterval(() => {
        fetch(BASE_PATH + ROUTES.bootstrap)
          .then(async (response) => {
            if (!response.ok) {
              // The server indicates that it is now ready
              setBootstrapping(false);
              clearInterval(boostrapInterval);
              return;
            }
            const res = await response.json();
            setBootstrapLogs(res.logs);
          })
          .catch((_error) => {
            // This happens as long as the server is not reachable
          });
      }, 250);
    })();
  }, []);

  const colorSchemeManager = localStorageColorSchemeManager({
    key: COLOR_SCHEME,
  });

  return (
    <MantineProvider colorSchemeManager={colorSchemeManager} theme={theme}>
      {bootstrapping ? (
        <BootstrapScreen logs={bootstrapLogs} />
      ) : (
        <Initializer />
      )}
    </MantineProvider>
  );
}

export default App;
