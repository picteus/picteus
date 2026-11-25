import { type ReactElement } from "react";
import { IconFolder, IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Alert, Box, Button, Flex, Input, Stack, Text, Textarea, TextInput, UnstyledButton } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useHover } from "@mantine/hooks";

import { Repository, RepositoryApiRepositoryCreateRequest, RepositoryMode } from "@picteus/ws-client";

import { FolderTypes } from "types";
import { computePathSeparator, removeFilePrefixFromUrl, ToastService, Validators } from "utils";
import { useModalContext } from "app/context";
import {
  useAddRepositoryMutation,
  useFolderPicker,
  useModalSubmit,
  useRepositories,
  useUpdateRepositoryMutation
} from "app/hooks";
import { Common, ModalActions, ModalError } from "app/components";
import RepositoryIdentity from "../RepositoryIdentity/RepositoryIdentity.tsx";


const initialValues: RepositoryApiRepositoryCreateRequest = {
  type: "file",
  url: "",
  name: "",
  comment: "",
  mode: RepositoryMode.Watching
};

function extractFolderName(directoryPath?: string): string
{
  if (directoryPath === undefined || directoryPath.trim() === "")
  {
    return "";
  }
  const normalizedPath = removeFilePrefixFromUrl(directoryPath) ?? directoryPath;
  return normalizedPath.split(computePathSeparator(normalizedPath)).filter((segment) => segment !== "").pop() ?? "";
}

function normalizeDirectoryPath(directoryPath: string): string
{
  const withoutProtocol = removeFilePrefixFromUrl(directoryPath) ?? directoryPath;
  const trimmedPath = withoutProtocol.trim();
  if (trimmedPath === "/" || /^[a-zA-Z]:[\\/]?$/.test(trimmedPath) === true)
  {
    return trimmedPath;
  }
  return trimmedPath.replace(/[\\/]+$/, "");
}

type AddOrUpdateRepositoryPropsType =
  {
    readonly repository?: Repository;
    readonly initialUrl?: string;
  };

export default function AddOrUpdateRepository(
  { repository, initialUrl }: AddOrUpdateRepositoryPropsType
): ReactElement
{
  const [ t ] = useTranslation();
  const modalContext = useModalContext();
  const openFolderPicker = useFolderPicker();
  const { data: repositories = [] } = useRepositories();
  const updateRepositoryMutation = useUpdateRepositoryMutation();
  const addRepositoryMutation = useAddRepositoryMutation();

  const isEditMode = repository !== undefined;

  function findSameFolderRepository(directoryPath: string): Repository | undefined
  {
    const normalizedPath = normalizeDirectoryPath(directoryPath);
    if (normalizedPath === "")
    {
      return undefined;
    }
    return repositories.find((existingRepository) => normalizeDirectoryPath(existingRepository.url) === normalizedPath);
  }

  const form = useForm({
    initialValues: repository
      ? {
        type: "file" as const,
        url: repository.url,
        name: repository.name,
        comment: repository.comment ?? "",
        mode: repository.mode
      }
      : {
        ...initialValues,
        url: initialUrl ?? "",
        name: extractFolderName(initialUrl)
      },
    validate: {
      name: Validators.isNotEmpty,
      url: (value: string): string | undefined =>
      {
        const emptyError = Validators.isNotEmpty(value);
        if (emptyError !== undefined)
        {
          return emptyError;
        }
        if (!isEditMode)
        {
          const conflictingRepository = findSameFolderRepository(value);
          if (conflictingRepository !== undefined)
          {
            return t("addOrUpdateRepositoryModal.sameFolderConflict", { name: conflictingRepository.name });
          }
        }
        return undefined;
      }
    }
  });
  const {
    isSubmitting,
    submitError,
    clearSubmitError,
    handleSubmit
  } = useModalSubmit<[ RepositoryApiRepositoryCreateRequest ]>(async (values: RepositoryApiRepositoryCreateRequest): Promise<void> =>
    {
      if (repository)
      {
        await updateRepositoryMutation.mutateAsync({
          id: repository.id,
          name: values.name,
          comment: values.comment
        });
      }
      else
      {
        await addRepositoryMutation.mutateAsync({
          ...values,
          comment: values.comment === "" ? undefined : values.comment,
          url: `file://${values.url}`
        });
      }
      ToastService.success(
        t(
          `addOrUpdateRepositoryModal.${isEditMode ? "successUpdate" : "successAdd"}`
        )
      );
      modalContext?.closeModal(true);
    }
  );

  async function handleOnClickBrowseFolder(): Promise<void>
  {
    const directoryPath = await openFolderPicker(FolderTypes.REPOSITORY);
    if (directoryPath === undefined || directoryPath === "")
    {
      return;
    }
    clearSubmitError();
    const currentRepositoryName = form.getValues().name;
    if (!currentRepositoryName || currentRepositoryName.trim() === "")
    {
      form.setFieldValue("name", extractFolderName(directoryPath));
    }
    form.setFieldValue("url", directoryPath);
  }

  const isPending =
    isSubmitting ||
    updateRepositoryMutation.isPending ||
    addRepositoryMutation.isPending;

  const selectedUrl = form.getValues().url;
  const hasSelectedFolder = selectedUrl.trim() !== "";
  const folderName = extractFolderName(selectedUrl);
  const conflictingRepository = !isEditMode && hasSelectedFolder ? findSameFolderRepository(selectedUrl) : undefined;
  const folderError = conflictingRepository !== undefined ? t("addOrUpdateRepositoryModal.sameFolderConflict", { name: conflictingRepository.name }) : form.errors.url;
  const hasUrlError = Boolean(folderError);
  const { hovered: isFolderHovered, ref: folderHoverRef } = useHover<HTMLButtonElement>();
  const formId = "add-or-update-repository-form";

  return (
    <form id={formId} onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        {!isEditMode && (
          <Input.Wrapper
            withAsterisk
            label={t("field.folder")}
            description={t("addOrUpdateRepositoryModal.folderHint")}
            descriptionProps={{ mt: 6 }}
            error={folderError}
            inputWrapperOrder={[ "label", "input", "description", "error" ]}
          >
            <UnstyledButton
              ref={folderHoverRef}
              type="button"
              display="block"
              w="100%"
              px={12}
              py={10}
              bdrs={6}
              bd={hasUrlError ? "1px solid var(--mantine-color-error)" : "1px solid var(--mantine-color-default-border)"}
              bg={isFolderHovered ? "var(--mantine-color-default-hover)" : "var(--mantine-color-body)"}
              onClick={handleOnClickBrowseFolder}
            >
              {hasSelectedFolder ? (
                <RepositoryIdentity
                  name={folderName}
                  url={selectedUrl}
                  footer={
                    <Text size="sm" fw={600} c="blue" flex="0 0 auto">
                      {t("addOrUpdateRepositoryModal.changeFolder")}
                    </Text>
                  }
                />
              ) : (
                <Flex gap="sm" align="center" wrap="nowrap">
                  <Flex
                    w={40}
                    h={40}
                    align="center"
                    justify="center"
                    bg="gray.1"
                    bdrs="sm"
                    flex="0 0 auto"
                  >
                    <IconFolder size={Common.IconMediumSize} stroke={Common.IconStrokeSize}/>
                  </Flex>
                  <Box flex={1} miw={0}>
                    <Text size="sm" c="dimmed" truncate>
                      {t("addOrUpdateRepositoryModal.noFolderSelected")}
                    </Text>
                  </Box>
                  <Text size="sm" fw={600} c="blue" flex="0 0 auto">
                    {t("addOrUpdateRepositoryModal.chooseFolder")}
                  </Text>
                </Flex>
              )}
            </UnstyledButton>
          </Input.Wrapper>
        )}

        <TextInput
          withAsterisk
          data-autofocus={hasSelectedFolder || isEditMode ? true : undefined}
          label={t("field.name")}
          description={t(isEditMode ? "addOrUpdateRepositoryModal.nameEditHint" : "addOrUpdateRepositoryModal.nameAddHint")}
          descriptionProps={{ mt: 6 }}
          inputWrapperOrder={[ "label", "input", "description", "error" ]}
          placeholder={t("addOrUpdateRepositoryModal.namePlaceholder")}
          {...form.getInputProps("name")}
        />

        <Textarea
          label={t("field.comment")}
          autosize
          minRows={3}
          maxRows={6}
          placeholder={t("addOrUpdateRepositoryModal.commentPlaceholder")}
          {...form.getInputProps("comment")}
        />

        {!isEditMode && (
          <Alert
            color="blue"
            variant="light"
            radius={6}
            p="sm"
            icon={<IconInfoCircle size={16} stroke={Common.IconStrokeSize}/>}
          >
            <Text fz={13} lh={1.45} c="inherit">
              {t("addOrUpdateRepositoryModal.whatHappensNext")}
            </Text>
          </Alert>
        )}

      </Stack>

      <ModalError
        error={submitError}
        title={t(`addOrUpdateRepositoryModal.${isEditMode ? "errorUpdate" : "errorAdd"}`)}
        onClose={clearSubmitError}
      />

      <ModalActions isBusy={isPending}>
        <Button
          type="submit"
          form={formId}
          loading={isPending}
          disabled={isPending || conflictingRepository !== undefined}
        >
          {t(isEditMode ? "button.save" : "addOrUpdateRepositoryModal.addButton")}
        </Button>
      </ModalActions>
    </form>
  );
}
