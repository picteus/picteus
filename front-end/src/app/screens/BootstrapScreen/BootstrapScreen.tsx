import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ReactTyped } from "react-typed";
import { Flex, Image, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Spinner } from "app/components";

import logoUrl from "assets/logo.svg";
import style from "./BootstrapScreen.module.scss";


interface BootstrapScreenPropsType
{
  readonly logs: string[];
}

export default function BootstrapScreen({ logs }: BootstrapScreenPropsType): ReactNode
{
  const [ t ] = useTranslation();
  const [ previousLogs, setPreviousLogs ] = useState<string[]>([]);

  const lastLog = useMemo(() => logs[logs.length - 1] || t("bootstrap.loading"), [ logs, t ]);

  useEffect(() =>
    {
      if (logs.length > 1)
      {
        setPreviousLogs(logs.slice(0, logs.length - 1).map((log) => "✓ " + log));
      }
    },
    [ logs ]
  );

  return (
    <Flex
      direction="column"
      w="100%"
      h="100%"
      p="lg"
    >
      <Flex
        direction="column"
        flex={1}
        align="center"
        justify="center"
        gap={40}
      >
        <Flex direction={"column"} align="center" gap="sm">
          <Image src={logoUrl} w={76} h={76} alt={t("bootstrap.applicationName")} className={style.logo}/>
          <Title
            order={1}
            fw={400}
            fz={60}
            c="light-dark(var(--mantine-color-gray-8), var(--mantine-color-dark-1))"
          >
            {t("bootstrap.applicationName")}
          </Title>
        </Flex>
        <Flex
          align={"flex-end"}
          pos="relative"
          w={900}
          h={100}
          ta="left"
          className={style.logs}
        >
          <div>
            {previousLogs.map((previousLog, index) => (
              <Text key={`previouslog-${index}`} c="dimmed">
                {previousLog}
              </Text>
            ))}
            <Flex gap={8} align="flex-start">
              <Spinner/>
              <Text size="md">
                <ReactTyped strings={[ lastLog ]} typeSpeed={2} backSpeed={10}/>
              </Text>
            </Flex>
          </div>
        </Flex>
      </Flex>
      <Text
        size="sm"
        c="dimmed"
        ta="right"
      >
        {t("bootstrap.firstStartNotice")}
      </Text>
    </Flex>
  );
}
