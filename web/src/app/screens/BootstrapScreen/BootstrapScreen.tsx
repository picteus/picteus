import { useEffect, useMemo, useState } from "react";
import { ReactTyped } from "react-typed";
import {
  Flex,
  Text,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";

import { Spinner } from "app/components";
import style from "./BootstrapScreen.module.scss";
import { useTranslation } from "react-i18next";
import { hexToRgb } from "utils";

export default function BootstrapScreen({ logs }: { logs: string[] }) {
  const [t] = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const [previousLogs, setPreviousLogs] = useState<string[]>([]);

  const lastLog = useMemo(() => {
    return logs?.[logs.length - 1] || t("bootstrap.loading");
  }, [logs]);

  useEffect(() => {
    if (logs.length > 1) {
      setPreviousLogs(logs.slice(0, logs.length - 1).map((log) => "✓ " + log));
    }
  }, [logs]);

  const bodyColor = colorScheme === "dark" ? theme.colors.dark[7] : "#FFFFFF";

  return (
    <Flex
      direction={"column"}
      style={{ height: "100%" }}
      align="center"
      justify="center"
      gap={50}
    >
      <Title order={1} className={style.title}>Picteus</Title>
      <Flex
        align={"flex-end"}
        className={style.logsContainer}
        style={{
          "--mantine-color-body": hexToRgb(bodyColor),
        }}
      >
        <div className={style.blurGradient}></div>
        <div>
          {previousLogs.map((previousLog, index) => (
            <Text key={"previouslog-" + index} c="dimmed">
              {previousLog}
            </Text>
          ))}
          <Flex gap={8} align={"flex-start"}>
            <Spinner />
            <Text size="md">
              <ReactTyped strings={[lastLog]} typeSpeed={2} backSpeed={10} />
            </Text>
          </Flex>
        </div>
      </Flex>
    </Flex>
  );
}
