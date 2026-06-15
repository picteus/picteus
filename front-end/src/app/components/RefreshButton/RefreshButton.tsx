import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Button, Indicator, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconRefresh } from "@tabler/icons-react";

type RefreshButtonType = {
  alert?: boolean;
  onRefresh: () => void;
};

export default function RefreshButton({ alert, onRefresh }: RefreshButtonType) {
  const [t] = useTranslation();
  const [isFeedback, setIsFeedback] = useState(false);

  const handleClick = () => {
    setIsFeedback(true);
    onRefresh();

    setTimeout(() => {
      setIsFeedback(false);
    }, 800);
  };

  const commonIconProps = {
    stroke: 1.2,
    size: 20,
  };

  return alert ? (
    <Indicator color="green" processing>
      <Button
        onClick={handleClick}
        leftSection={<IconRefresh {...commonIconProps} />}
        variant="default"
      >
        <Text size="sm">Changes detected</Text>
      </Button>
    </Indicator>
  ) : (
    <Tooltip label={t("button.refresh")}>
      <ActionIcon
        size="lg"
        disabled={isFeedback}
        variant={"default"}
        onClick={handleClick}
      >
          {isFeedback ? (
            <IconCheck color={"green"} {...commonIconProps} />
          ) : (
            <IconRefresh {...commonIconProps} />
          )}
      </ActionIcon>
    </Tooltip>
  );
}
