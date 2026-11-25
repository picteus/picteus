import { ReactElement } from "react";
import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "app/components";


type RepositoriesHeaderType = {
  repositoriesCount: number;
  onAddRepository: () => void;
};

export default function RepositoriesHeader({
  repositoriesCount,
  onAddRepository
}: RepositoriesHeaderType): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <ScreenHeader
      title={t("repositoryScreen.title")}
      countLabel={t("repositoryScreen.repositoriesCount", { count: repositoriesCount })}
      subtitle={t("repositoryScreen.subtitle")}
      actions={(
        <Button
          leftSection={<IconPlus size={20}/>}
          onClick={onAddRepository}
        >
          {t("repositoryScreen.addRepository")}
        </Button>
      )}
    />
  );
}
