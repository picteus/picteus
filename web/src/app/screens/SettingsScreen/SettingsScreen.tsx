import React, { useEffect, useState } from "react";
import {
  Checkbox,
  Flex,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Container } from "app/components";
import {
  IconActivity,
  IconDeviceLaptop,
  IconMoonStars,
  IconSun,
} from "@tabler/icons-react";
import { StorageService } from "app/services";

export default function SettingsScreen() {
  const [t] = useTranslation();
  const [shouldConfirmRedirection, setShouldConfirmRedirection] = useState(
    StorageService.getExtensionIntentShowShouldConfirm(),
  );
  const { colorScheme, setColorScheme } = useMantineColorScheme({
    keepTransitions: true,
  });

  function handleOnChangeColorScheme({ target: { checked: value } }: any) {
    setColorScheme(value ? "dark" : "light");
  }

  useEffect(() => {
    StorageService.setExtensionIntentShowShouldConfirm(
      shouldConfirmRedirection,
    );
  }, [shouldConfirmRedirection]);

  return (
    <Container>
      <Stack gap="lg">
        <Title>{t("settingsScreen.title")}</Title>
        <Tabs radius="sm" defaultValue="gallery">
          <Tabs.List>
            <Tabs.Tab
              value="gallery"
              leftSection={<IconDeviceLaptop size={16} />}
            >
              {t("settingsScreen.tabs.display")}
            </Tabs.Tab>
            <Tabs.Tab
              value="extensions"
              leftSection={<IconActivity size={16} />}
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
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="extensions">
            <Stack mt="lg">
              <Checkbox
                label={t("settingsScreen.extensions.shouldConfirmRedirection")}
                checked={shouldConfirmRedirection}
                onChange={({ target }) =>
                  setShouldConfirmRedirection(target.checked)
                }
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
