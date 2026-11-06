import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ReactTyped } from "react-typed";
import {
  ActionIcon,
  Badge,
  Box,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton
} from "@mantine/core";
import {
  IconArrowUpRight,
  IconBook2,
  IconBrandDiscord,
  IconBrandGithub,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCommand,
  IconCpu,
  IconPlugConnected,
  IconSparkles
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Spinner } from "app/components";

import style from "./SplashScreen.module.scss";


const GITHUB_URL = import.meta.env.PACKAGE_HOMEPAGE;
const APPLICATION_VERSION = import.meta.env.APPLICATION_VERSION || import.meta.env.PACKAGE_VERSION;
const DOCUMENTATION_URL = "https://picteus.github.io/picteus";
const DISCORD_SERVER_ID = "1549384585920385034";
const DISCORD_INVITE_URL = "https://discord.gg/ej35tuzsy";
const DISCORD_WIDGET_API_URL = `https://discord.com/api/guilds/${DISCORD_SERVER_ID}/widget.json`;

const VISIBLE_COMPLETED_LOGS_COUNT = 3;
const FEATURE_ROTATION_INTERVAL_MS = 6500;

interface SplashScreenPropsType
{
  readonly logs: string[];
}

interface CompletedLogEntry
{
  readonly id: number;
  readonly message: string;
}

interface FeatureTipItem
{
  readonly key: string;
  readonly icon: ReactNode;
  readonly color: string;
  readonly badge: string;
  readonly title: string;
  readonly description: string;
}

interface DiscordWidgetResponse
{
  readonly presence_count?: unknown;
}

function formatElapsedTime(totalSeconds: number): string
{
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function AnimatedViewfinderLogo({ label }: { readonly label: string }): ReactNode
{
  return (
    <Flex
      pos="relative"
      w={84}
      h={84}
      bdrs={22}
      align="center"
      justify="center"
      bg="light-dark(rgba(255, 255, 255, 0.86), rgba(36, 36, 41, 0.82))"
      bd="1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))"
      className={style.logoFrame}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox="-6 -6 88 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={style.logoSvg}
      >
        <path
          className={style.quadrantTopRight}
          d="M40 0H60C68.8366 0 76 7.16344 76 16V36H60C48.9543 36 40 27.0457 40 16V0Z"
          fill="currentColor"
        />
        <path
          className={style.quadrantTopLeft}
          d="M36 0H16C7.16345 0 3.14722e-06 7.16344 3.14722e-06 16V36H16C27.0457 36 36 27.0457 36 16V0Z"
          fill="currentColor"
        />
        <path
          className={style.quadrantBottomLeft}
          d="M36 76H16C7.16345 76 2.52097e-06 68.8366 1.74846e-06 60L0 40L16 40C27.0457 40 36 48.9543 36 60L36 76Z"
          fill="currentColor"
        />
        <path
          className={style.quadrantBottomRight}
          d="M40 76H60C68.8366 76 76 68.8365 76 60V40L60 40C48.9543 40 40 48.9543 40 60L40 76Z"
          fill="currentColor"
        />
        <circle cx="38" cy="38" r="2.75" className={style.focalCore}/>
      </svg>
    </Flex>
  );
}

export default function SplashScreen({ logs }: SplashScreenPropsType): ReactNode
{
  const [ t ] = useTranslation();
  const [ elapsedSeconds, setElapsedSeconds ] = useState(0);
  const [ activeFeatureIndex, setActiveFeatureIndex ] = useState(0);
  const [ isFeatureHovered, setIsFeatureHovered ] = useState(false);
  const [ discordOnlineCount, setDiscordOnlineCount ] = useState<number | null>(null);

  const logsSignature = useMemo(
    () => `${logs.length}:${logs[logs.length - 1] ?? ""}`,
    [ logs ]
  );

  const completedLogs = useMemo<CompletedLogEntry[]>(() =>
  {
    if (logs.length <= 1)
    {
      return [];
    }
    const allCompleted = logs.slice(0, logs.length - 1);
    const startIndex = Math.max(0, allCompleted.length - VISIBLE_COMPLETED_LOGS_COUNT);
    return allCompleted.slice(startIndex).map((message, offset) => ({
      id: startIndex + offset,
      message
    }));
  }, [ logsSignature ]);

  const lastLog = useMemo(
    () => logs[logs.length - 1] || t("splashscreen.loading"),
    [ logsSignature, t ]
  );

  const completedCount = Math.max(0, logs.length - 1);

  const features = useMemo<FeatureTipItem[]>(() => [
    {
      key: "spotlight",
      icon: <IconCommand size={18} stroke={1.75}/>,
      color: "blue",
      badge: t("splashscreen.features.spotlight.badge"),
      title: t("splashscreen.features.spotlight.title"),
      description: t("splashscreen.features.spotlight.description")
    },
    {
      key: "localFirst",
      icon: <IconSparkles size={18} stroke={1.75}/>,
      color: "teal",
      badge: t("splashscreen.features.localFirst.badge"),
      title: t("splashscreen.features.localFirst.title"),
      description: t("splashscreen.features.localFirst.description")
    },
    {
      key: "integrations",
      icon: <IconCpu size={18} stroke={1.75}/>,
      color: "violet",
      badge: t("splashscreen.features.integrations.badge"),
      title: t("splashscreen.features.integrations.title"),
      description: t("splashscreen.features.integrations.description")
    },
    {
      key: "extensions",
      icon: <IconPlugConnected size={18} stroke={1.75}/>,
      color: "indigo",
      badge: t("splashscreen.features.extensions.badge"),
      title: t("splashscreen.features.extensions.title"),
      description: t("splashscreen.features.extensions.description")
    }
  ], [ t ]);

  useEffect(() =>
  {
    const timer = setInterval(() =>
    {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() =>
  {
    if (isFeatureHovered === true || features.length <= 1)
    {
      return;
    }
    const rotationTimer = setInterval(() =>
    {
      setActiveFeatureIndex((previous) => (previous + 1) % features.length);
    }, FEATURE_ROTATION_INTERVAL_MS);
    return () => clearInterval(rotationTimer);
  }, [ isFeatureHovered, features.length ]);

  useEffect(() =>
  {
    const controller = new AbortController();
    fetch(DISCORD_WIDGET_API_URL, { signal: controller.signal })
      .then(async (response) =>
      {
        if (response.ok === false)
        {
          return;
        }
        const payload = (await response.json()) as DiscordWidgetResponse;
        if (typeof payload.presence_count === "number")
        {
          setDiscordOnlineCount(payload.presence_count);
        }
      })
      .catch(() =>
      {
        // Silent fallback when offline, blocked by CSP, or Discord widget is disabled
      });

    return () => controller.abort();
  }, []);

  const currentFeature = features[activeFeatureIndex] ?? features[0];

  function handlePreviousFeature(): void
  {
    setActiveFeatureIndex((previous) => (previous - 1 + features.length) % features.length);
  }

  function handleNextFeature(): void
  {
    setActiveFeatureIndex((previous) => (previous + 1) % features.length);
  }

  return (
    <Box
      pos="relative"
      w="100%"
      h="100%"
      bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))"
      className={style.root}
    >
      <Box pos="fixed" inset={0} className={style.dotGrid} aria-hidden="true"/>
      <Box
        pos="fixed"
        w={480}
        h={360}
        top="8%"
        left="calc(50% - 340px)"
        bdrs={999}
        className={style.ambientGlowPrimary}
        aria-hidden="true"
      />
      <Box
        pos="fixed"
        w={440}
        h={340}
        bottom="8%"
        right="calc(50% - 340px)"
        bdrs={999}
        className={style.ambientGlowSecondary}
        aria-hidden="true"
      />

      <Flex
        direction="column"
        justify="space-between"
        align="center"
        mih="100%"
        w="100%"
        maw={780}
        mx="auto"
        pt={28}
        px="lg"
        pb="lg"
        gap={22}
        className={style.hubContainer}
      >
        {/* Brand Identity & Animated Viewfinder Logo */}
        <Stack align="center" gap={10} mt="xs">
          <AnimatedViewfinderLogo label={t("splashscreen.applicationName")}/>
          <Group gap={10} align="baseline" justify="center" mt={4}>
            <Title
              order={1}
              fw={500}
              fz={46}
              lh={1.05}
              c="light-dark(var(--mantine-color-gray-9), var(--mantine-color-gray-0))"
            >
              {t("splashscreen.applicationName")}
            </Title>
            {APPLICATION_VERSION ? (
              <Badge variant="light" color="gray" size="sm" radius="sm" tt="lowercase">
                v{APPLICATION_VERSION}
              </Badge>
            ) : null}
          </Group>
          <Text c="dimmed" fz={11} fw={600} tt="uppercase" lts="0.16em">
            {t("splashscreen.tagline")}
          </Text>
        </Stack>

        {/* Center Stack: Animated Terminal Log Card + Rotating Feature Card */}
        <Stack w="100%" gap="md">
          <Paper
            withBorder
            radius="md"
            pos="relative"
            w="100%"
            bg="light-dark(rgba(255, 255, 255, 0.88), rgba(26, 27, 30, 0.86))"
            className={style.terminalCard}
          >
            <Box
              pos="relative"
              w="100%"
              h={2}
              bg="light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))"
              className={style.shimmerTrack}
              aria-hidden="true"
            >
              <Box pos="absolute" top={0} left={0} w="42%" h="100%" className={style.shimmerBar}/>
            </Box>
            <Group
              justify="space-between"
              wrap="nowrap"
              py={10}
              px="md"
              bg="light-dark(rgba(248, 249, 250, 0.75), rgba(37, 38, 43, 0.55))"
              className={style.terminalHeader}
            >
              <Group gap={10} wrap="nowrap">
                <Box
                  component="span"
                  w={8}
                  h={8}
                  bdrs="50%"
                  bg="var(--mantine-color-blue-5)"
                  flex="0 0 auto"
                  className={style.statusDot}
                  aria-hidden="true"
                />
                <Text size="xs" fw={600} tt="uppercase" c="dimmed" lts="0.06em">
                  {t("splashscreen.statusInitializing")}
                </Text>
              </Group>
              <Group gap={8} wrap="nowrap">
                {completedCount > 0 ? (
                  <Badge variant="light" color="teal" size="xs" radius="sm">
                    {t("splashscreen.stepsCompleted", { count: completedCount })}
                  </Badge>
                ) : null}
                <Badge
                  variant="default"
                  size="xs"
                  radius="sm"
                  ff="monospace"
                  leftSection={<IconClock size={11} stroke={1.8}/>}
                >
                  {formatElapsedTime(elapsedSeconds)}
                </Badge>
              </Group>
            </Group>

            <Flex
              direction="column"
              justify="flex-end"
              h={118}
              py="xs"
              px="md"
              gap={5}
              ff="monospace"
              className={style.logsViewport}
              role="log"
              aria-live="polite"
            >
              {completedLogs.map((entry) => (
                <Flex
                  key={`completed-log-${entry.id}`}
                  align="flex-start"
                  gap={8}
                  className={style.completedLogLine}
                >
                  <IconCheck size={15} stroke={2.2} className={style.checkIcon}/>
                  <Text size="xs" c="dimmed" lineClamp={1} flex={1} miw={0}>
                    {entry.message}
                  </Text>
                </Flex>
              ))}
              <Flex
                key={`active-log-${logs.length}-${lastLog}`}
                align="flex-start"
                gap={8}
                className={style.activeLogLine}
              >
                <Box component="span" flex="0 0 auto" c="var(--mantine-color-blue-5)" lh={1.45}>
                  <Spinner/>
                </Box>
                <Text
                  size="sm"
                  fw={500}
                  lineClamp={1}
                  c="light-dark(var(--mantine-color-gray-8), var(--mantine-color-gray-1))"
                  flex={1}
                  miw={0}
                >
                  <ReactTyped
                    key={lastLog}
                    strings={[ lastLog ]}
                    typeSpeed={6}
                    showCursor={false}
                  />
                </Text>
              </Flex>
            </Flex>
          </Paper>

          {/* Rotating Feature / Tip Showcase */}
          <Paper
            withBorder
            radius="md"
            p="md"
            w="100%"
            bg="light-dark(rgba(255, 255, 255, 0.76), rgba(26, 27, 30, 0.72))"
            className={style.featureCard}
            onMouseEnter={() => setIsFeatureHovered(true)}
            onMouseLeave={() => setIsFeatureHovered(false)}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
              <Group
                key={currentFeature.key}
                align="flex-start"
                wrap="nowrap"
                gap="sm"
                flex={1}
                miw={0}
                className={style.featureBody}
              >
                <ThemeIcon
                  variant="light"
                  color={currentFeature.color}
                  size={36}
                  radius="md"
                  mt={2}
                  flex="0 0 auto"
                >
                  {currentFeature.icon}
                </ThemeIcon>
                <Stack gap={3} flex={1} miw={0}>
                  <Group gap={8} align="center">
                    <Badge variant="light" color={currentFeature.color} size="xs" radius="sm">
                      {currentFeature.badge}
                    </Badge>
                    <Text size="sm" fw={600} lineClamp={1}>
                      {currentFeature.title}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed" lh={1.45}>
                    {currentFeature.description}
                  </Text>
                </Stack>
              </Group>

              <Group gap={4} wrap="nowrap" align="center" flex="0 0 auto">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={handlePreviousFeature}
                  aria-label={t("splashscreen.previousTip")}
                >
                  <IconChevronLeft size={15}/>
                </ActionIcon>
                <Group gap={5} wrap="nowrap" mx={2}>
                  {features.map((feature, index) => (
                    <UnstyledButton
                      key={feature.key}
                      h={6}
                      w={index === activeFeatureIndex ? 18 : 6}
                      bdrs={999}
                      bg={
                        index === activeFeatureIndex
                          ? "var(--mantine-color-blue-5)"
                          : "light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3))"
                      }
                      aria-label={feature.badge}
                      onClick={() => setActiveFeatureIndex(index)}
                      className={style.dotIndicator}
                    />
                  ))}
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={handleNextFeature}
                  aria-label={t("splashscreen.nextTip")}
                >
                  <IconChevronRight size={15}/>
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        </Stack>

        {/* Bottom Resource Dock + First Start Notice */}
        <Stack w="100%" gap="sm">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Paper
              component="a"
              href={DOCUMENTATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              withBorder
              radius="md"
              py={13}
              px={15}
              td="none"
              c="inherit"
              bg="light-dark(rgba(255, 255, 255, 0.82), rgba(26, 27, 30, 0.78))"
              className={style.linkCard}
            >
              <Stack justify="space-between" gap={8}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={8} wrap="nowrap">
                    <ThemeIcon variant="light" color="blue" size={28} radius="sm">
                      <IconBook2 size={16} stroke={1.75}/>
                    </ThemeIcon>
                    <Text size="sm" fw={600}>
                      {t("splashscreen.links.documentation.title")}
                    </Text>
                  </Group>
                  <IconArrowUpRight size={16} className={style.linkArrow}/>
                </Group>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {t("splashscreen.links.documentation.description")}
                </Text>
              </Stack>
            </Paper>

            <Paper
              component="a"
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              withBorder
              radius="md"
              py={13}
              px={15}
              td="none"
              c="inherit"
              bg="light-dark(rgba(255, 255, 255, 0.82), rgba(26, 27, 30, 0.78))"
              className={style.linkCard}
            >
              <Stack justify="space-between" gap={8}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={8} wrap="nowrap">
                    <ThemeIcon variant="light" color="gray" size={28} radius="sm">
                      <IconBrandGithub size={16} stroke={1.75}/>
                    </ThemeIcon>
                    <Text size="sm" fw={600}>
                      {t("splashscreen.links.github.title")}
                    </Text>
                  </Group>
                  <IconArrowUpRight size={16} className={style.linkArrow}/>
                </Group>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {t("splashscreen.links.github.description")}
                </Text>
              </Stack>
            </Paper>

            <Paper
              component="a"
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-discord-guild-id={DISCORD_SERVER_ID}
              withBorder
              radius="md"
              py={13}
              px={15}
              td="none"
              c="inherit"
              bg="light-dark(rgba(255, 255, 255, 0.82), rgba(26, 27, 30, 0.78))"
              className={style.linkCard}
            >
              <Stack justify="space-between" gap={8}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={8} wrap="nowrap">
                    <ThemeIcon variant="light" color="indigo" size={28} radius="sm">
                      <IconBrandDiscord size={16} stroke={1.75}/>
                    </ThemeIcon>
                    <Text size="sm" fw={600}>
                      {t("splashscreen.links.discord.title")}
                    </Text>
                    {discordOnlineCount !== null ? (
                      <Badge
                        variant="light"
                        color="teal"
                        size="xs"
                        radius="xl"
                        leftSection={
                          <Box
                            component="span"
                            display="inline-block"
                            w={6}
                            h={6}
                            bdrs="50%"
                            bg="var(--mantine-color-teal-5)"
                          />
                        }
                      >
                        {t("splashscreen.links.discord.onlineCount", { count: discordOnlineCount })}
                      </Badge>
                    ) : null}
                  </Group>
                  <IconArrowUpRight size={16} className={style.linkArrow}/>
                </Group>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {t("splashscreen.links.discord.description")}
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>

          <Flex justify="center" align="center" pt={2}>
            <Text size="xs" c="dimmed" ta="center">
              {t("splashscreen.firstStartNotice")}
            </Text>
          </Flex>
        </Stack>
      </Flex>
    </Box>
  );
}
