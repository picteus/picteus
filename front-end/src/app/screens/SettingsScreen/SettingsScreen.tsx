import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  Flex,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
  useMantineColorScheme
} from "@mantine/core";
import { IconActivity, IconDeviceLaptop, IconMoonStars, IconRotate, IconSun } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ToastService } from "utils";
import { StorageService } from "app/services";
import { Common, Container } from "app/components";


export default function SettingsScreen()
{
  const [t] = useTranslation();
  const [shouldConfirmRedirection, setShouldConfirmRedirection] = useState<boolean>(StorageService.getExtensionIntentShowShouldConfirm());
  const [autoReloadImagesViews, setAutoReloadImagesViews] = useState<boolean>(StorageService.getAutoReloadImagesViews);
  const [ skippedCommandsCount, setSkippedCommandsCount ] = useState<number>(StorageService.getCommandsDoNotAskAgainCount());
  const { colorScheme, setColorScheme } = useMantineColorScheme({ keepTransitions: true });

  useEffect(() =>
  {
    StorageService.setExtensionIntentShowShouldConfirm(shouldConfirmRedirection);
  }, [shouldConfirmRedirection]);

  useEffect(() =>
  {
    StorageService.setAutoReloadImagesViews(autoReloadImagesViews);
  }, [autoReloadImagesViews]);

  function handleOnChangeColorScheme({ target: { checked: value } }: { target: { checked: boolean } })
  {
    setColorScheme(value ? "dark" : "light");
  }

  function handleOnChangeAutoReloadImagesViews({ target: { checked: value } }: { target: { checked: boolean } })
  {
    setAutoReloadImagesViews(value);
  }

  function handleResetSkippedCommands(): void
  {
    StorageService.resetCommandsDoNotAskAgain();
    setSkippedCommandsCount(0);
    ToastService.success();
  }

  return (
    <Container>
      <Stack gap="lg">
        <Title>{t("settingsScreen.title")}</Title>
        <Tabs radius="sm" defaultValue="gallery">
          <Tabs.List>
            <Tabs.Tab
              value="gallery"
              leftSection={<IconDeviceLaptop size={16}/>}
            >
              {t("settingsScreen.tabs.display")}
            </Tabs.Tab>
            <Tabs.Tab
              value="extensions"
              leftSection={<IconActivity size={16}/>}
            >
              {t("settingsScreen.tabs.extensions")}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="gallery">
            <Stack mt="lg">
              <Flex align="center" gap={10}>
                <Switch
                  checked={colorScheme === "dark"}
                  size="md"
                  color="dark.4"
                  onChange={handleOnChangeColorScheme}
                  onLabel={
                    <IconSun
                      size={16}
                      stroke={2.5}
                      color="var(--mantine-color-yellow-4)"
                    />
                  }
                  offLabel={
                    <IconMoonStars
                      size={16}
                      stroke={2.5}
                      color="var(--mantine-color-blue-6)"
                    />
                  }
                />
                <Text size="sm">
                  {colorScheme === "dark"
                    ? t("settingsScreen.darkMode")
                    : t("settingsScreen.lightMode")}
                </Text>
              </Flex>
              <Flex align="center" gap={10}>
                <Switch
                  checked={autoReloadImagesViews}
                  size="md"
                  onChange={handleOnChangeAutoReloadImagesViews}
                />
                <Text size="sm">
                  {t("settingsScreen.autoReload")}
                </Text>
              </Flex>
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="extensions">
            <Stack mt="lg" gap="md">
              <Checkbox
                label={t("settingsScreen.extensions.shouldConfirmRedirection")}
                checked={shouldConfirmRedirection}
                onChange={({ target }) =>
                  setShouldConfirmRedirection(target.checked)
                }
              />
              <Divider my="xs"/>
              <Flex align="center" justify="space-between" gap="md">
                <Stack gap={2}>
                  <Text size="sm">
                    {t("settingsScreen.extensions.resetDoNotAskAgainCommands")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t("settingsScreen.extensions.resetDoNotAskAgainCommandsDescription", {
                      count: skippedCommandsCount
                    })}
                  </Text>
                </Stack>
                <Button
                  variant="default"
                  size="xs"
                  leftSection={<IconRotate size={Common.IconSmallSize}/>}
                  disabled={skippedCommandsCount === 0}
                  onClick={handleResetSkippedCommands}
                >
                  {t("settingsScreen.extensions.resetDoNotAskAgainCommandsButton")}
                </Button>
              </Flex>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
