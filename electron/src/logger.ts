import { app } from "electron";
import { Logger } from "winston";

import { createLogger } from "@picteus/shared-back-end";


export const logger: Logger = createLogger({ directoryPath: app.getPath("logs"), name: "electron" });
