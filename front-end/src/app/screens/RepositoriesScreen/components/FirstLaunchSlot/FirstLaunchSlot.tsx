import { ReactElement, useState } from "react";
import { Button, Flex, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { APPLICATION_MANUAL_URL } from "utils";
import { useOpenBrowser } from "app/hooks";


const REPOSITORIES_ONBOARDING_VIDEO_URL = "https://youtu.be/_wuDYBDr3Zs";
const REPOSITORIES_ONBOARDING_VIDEO_DIMENSIONS = { width: 400, height: 225 } as const;

type FirstLaunchSlotType = {
  onChooseFolder: () => void;
};

function computeYouTubeEmbedUrl(videoUrl: string): string
{
  const withoutQuery = videoUrl.split("?")[0];
  const videoId = withoutQuery.split("/").filter((segment) => segment !== "").pop() ?? "";
  return `https://www.youtube.com/embed/${videoId}`;
}

export default function FirstLaunchSlot({ onChooseFolder }: FirstLaunchSlotType): ReactElement
{
  const [ t ] = useTranslation();
  const openBrowser = useOpenBrowser();
  const [ hasVideoError, setHasVideoError ] = useState<boolean>(false);

  const videoWidth = REPOSITORIES_ONBOARDING_VIDEO_DIMENSIONS.width;
  const videoHeight = REPOSITORIES_ONBOARDING_VIDEO_DIMENSIONS.height;

  return (
    <Flex
      bd="1px solid var(--mantine-color-gray-2)"
      bg="white"
      p="lg"
      gap="lg"
      align="center"
      wrap="wrap"
      bdrs="md"
    >
      {hasVideoError === true ? (
        <Flex
          w={videoWidth}
          h={videoHeight}
          direction="column"
          align="center"
          justify="center"
          gap="md"
          bg="gray.1"
          flex="0 0 auto"
          bdrs="sm"
        >
          <Button variant="default" onClick={() => void openBrowser(REPOSITORIES_ONBOARDING_VIDEO_URL)}>
            {t("repositoryScreen.firstLaunch.watchOnYoutube")}
          </Button>
        </Flex>
      ) : (
        <iframe
          style={{
            width: videoWidth,
            height: videoHeight,
            border: 0,
            borderRadius: "var(--mantine-radius-sm)",
            background: "var(--mantine-color-black)",
            flex: "0 0 auto"
          }}
          src={computeYouTubeEmbedUrl(REPOSITORIES_ONBOARDING_VIDEO_URL)}
          title={t("repositoryScreen.firstLaunch.title")}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => setHasVideoError(true)}
        />
      )}
      <Stack gap="sm" flex={1} miw={280}>
        <Text size="xs" fw={700} tt="uppercase" c="blue" lts="0.05em">
          {t("repositoryScreen.firstLaunch.caption")}
        </Text>
        <Text size="lg" fw={600}>{t("repositoryScreen.firstLaunch.title")}</Text>
        <Text size="sm" c="dimmed" maw={560}>
          {t("repositoryScreen.firstLaunch.description")}
        </Text>
        <Flex gap="sm" mt="xs">
          <Button variant="default" onClick={onChooseFolder}>
            {t("repositoryScreen.firstLaunch.chooseFolder")}
          </Button>
          <Button variant="subtle" color="gray" onClick={() => void openBrowser(APPLICATION_MANUAL_URL)}>
            {t("repositoryScreen.firstLaunch.readManual")}
          </Button>
        </Flex>
      </Stack>
    </Flex>
  );
}
