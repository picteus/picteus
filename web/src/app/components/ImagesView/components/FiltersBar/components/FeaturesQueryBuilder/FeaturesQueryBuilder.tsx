import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Button,
  CheckIcon,
  Combobox,
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Group,
  Select,
  SelectProps,
  Stack,
  Text,
  TextInput
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  ExtensionImageFeatureName,
  ImageFeatureFormat,
  ImageFeatureNullValue,
  SearchFeatureComparisonOperator,
  SearchFeatureCondition,
  SearchFeatureConditionValue,
  SearchFeatureLogicalOperator,
  SearchFeatures
} from "@picteus/ws-client";

import { NotificationsService } from "utils";
import { FiltersService } from "app/services";
import { ExtensionIcon } from "app/components";


function computeExtensionImageFeatureNameValue(featureName: ExtensionImageFeatureName): string {
  return `${featureName.id}|${featureName.format}|${featureName.type}|${featureName.name}`;
}

function computeSearchFeatureConditionValue(searchFeatureCondition: SearchFeatureCondition): string {
  return `${searchFeatureCondition.extensionId || ""}|${searchFeatureCondition.format}|${searchFeatureCondition.type || ""}|${searchFeatureCondition.name || ""}`;
}

function computeOperatorLabel(operator: SearchFeatureComparisonOperator): string {
  switch (operator) {
    case SearchFeatureComparisonOperator.Equals:
      return "=";
    case SearchFeatureComparisonOperator.Different:
      return "<>";
    case SearchFeatureComparisonOperator.Contains:
      return "contains";
    case SearchFeatureComparisonOperator.GreaterThan:
      return ">";
    case SearchFeatureComparisonOperator.GreaterThanOrEqual:
      return ">=";
    case SearchFeatureComparisonOperator.LessThan:
      return "<";
    case SearchFeatureComparisonOperator.LessThanOrEqual:
      return "<=";
  }
}

function computeDefaultOperator(format: ImageFeatureFormat): SearchFeatureComparisonOperator {
  switch (format) {
    default:
    case ImageFeatureFormat.String:
    case ImageFeatureFormat.Json:
    case ImageFeatureFormat.Xml:
    case ImageFeatureFormat.Markdown:
    case ImageFeatureFormat.Html:
      return SearchFeatureComparisonOperator.Contains;
    case ImageFeatureFormat.Integer:
    case ImageFeatureFormat.Float:
    case ImageFeatureFormat.Boolean:
      return SearchFeatureComparisonOperator.Equals;
  }
}

function isValueCompatible(format: ImageFeatureFormat, operator: SearchFeatureComparisonOperator, value: SearchFeatureConditionValue): boolean {
  switch (format) {
    default:
    case ImageFeatureFormat.String:
    case ImageFeatureFormat.Json:
    case ImageFeatureFormat.Xml:
    case ImageFeatureFormat.Markdown:
    case ImageFeatureFormat.Html:
      return true;
    case ImageFeatureFormat.Integer:
    case ImageFeatureFormat.Float:
      return (operator === SearchFeatureComparisonOperator.Different && value === ImageFeatureNullValue.Empty) || typeof value === "number";
    case ImageFeatureFormat.Boolean:
      return (operator === SearchFeatureComparisonOperator.Different && value === ImageFeatureNullValue.Empty) || typeof value === "boolean";
  }
}

function computeCompatibleOperators(format: ImageFeatureFormat): SearchFeatureComparisonOperator[] {
  return Object.values(SearchFeatureComparisonOperator).filter(operator=> {
    if (format === ImageFeatureFormat.String || format === ImageFeatureFormat.Html || format === ImageFeatureFormat.Markdown || format === ImageFeatureFormat.Json || format === ImageFeatureFormat.Xml) {
      return operator === SearchFeatureComparisonOperator.Equals || operator === SearchFeatureComparisonOperator.Contains || operator === SearchFeatureComparisonOperator.Different;
    }
    else if (format === ImageFeatureFormat.Integer || format === ImageFeatureFormat.Float) {
      return operator !== SearchFeatureComparisonOperator.Contains;
    }
    else if (format === ImageFeatureFormat.Boolean) {
      return operator === SearchFeatureComparisonOperator.Equals || operator === SearchFeatureComparisonOperator.Different;
    }
    return true;
  });
}

function computeDefaultValue(format: ImageFeatureFormat): string {
  switch (format) {
    default:
    case ImageFeatureFormat.String:
    case ImageFeatureFormat.Json:
    case ImageFeatureFormat.Xml:
    case ImageFeatureFormat.Markdown:
    case ImageFeatureFormat.Html:
      return "";
    case ImageFeatureFormat.Integer:
    case ImageFeatureFormat.Float:
      return "0";
    case ImageFeatureFormat.Boolean:
      return "true";
  }
}

function convertValue(rawValue: string, format: ImageFeatureFormat, operator: SearchFeatureComparisonOperator): SearchFeatureConditionValue | undefined {
  switch (format) {
    case ImageFeatureFormat.String:
    case ImageFeatureFormat.Json:
    case ImageFeatureFormat.Markdown:
    case ImageFeatureFormat.Html:
    case ImageFeatureFormat.Xml:
      return rawValue;
    case ImageFeatureFormat.Integer: {
      if (operator === SearchFeatureComparisonOperator.Different && rawValue === ImageFeatureNullValue.Empty) {
        return ImageFeatureNullValue.Empty;
      }
      const number = Number.parseInt(rawValue);
      return Number.isNaN(number) === true ? 0 : number;
    }
    case ImageFeatureFormat.Float: {
      if (operator === SearchFeatureComparisonOperator.Different && rawValue === ImageFeatureNullValue.Empty) {
        return ImageFeatureNullValue.Empty;
      }
      const number = Number.parseFloat(rawValue);
      return Number.isNaN(number) === true ? 0 : number
    }
    case ImageFeatureFormat.Boolean:
      if (operator === SearchFeatureComparisonOperator.Different && rawValue === ImageFeatureNullValue.Empty) {
        return ImageFeatureNullValue.Empty;
      }
      return rawValue === "true" || rawValue === "1";
    case ImageFeatureFormat.Binary:
      return undefined;
    default:
      return rawValue;
  }
}

function computeFeatureNameLabel(featureName: ExtensionImageFeatureName): string {
  return `${featureName.type}: ${featureName.name}`;
}

const defaultLogicalOperator = SearchFeatureLogicalOperator.Or;

type FeaturesQueryBuilderType = {
  searchFeatures?: SearchFeatures;
  onChange: (features?: SearchFeatures) => void;
};

export default function FeaturesQueryBuilder({ searchFeatures, onChange }: FeaturesQueryBuilderType) {
  const [t] = useTranslation();
  const operatorData = [
    { value: SearchFeatureLogicalOperator.And, label: "AND" },
    { value: SearchFeatureLogicalOperator.Or, label: "OR" },
    { value: SearchFeatureLogicalOperator.Not, label: "NOT" }
  ];
  const [featureNames, setFeatureNames] = useState<ExtensionImageFeatureName[]>([]);
  const [perFeatureNamesDataValueFeaturesNamesOptionMap, setPerFeatureNamesDataValueFeaturesNamesOptionMap] = useState<Map<string, ExtensionImageFeatureName>>(new Map());
  const featureNamesData = useMemo(() => (featureNames.filter(imageFeatureName => imageFeatureName.format !== ImageFeatureFormat.Binary).map((imageFeatureName, index) => ({
    value: computeExtensionImageFeatureNameValue(imageFeatureName),
    label: computeFeatureNameLabel(imageFeatureName),
    index,
    reference: imageFeatureName
  }))), [featureNames]);

  useEffect(() => {
    setPerFeatureNamesDataValueFeaturesNamesOptionMap(featureNamesData.reduce<Map<string, ExtensionImageFeatureName>>((map, imageFeatureName) => {
      map.set(imageFeatureName.value, imageFeatureName.reference);
      return map;
    }, new Map<string, ExtensionImageFeatureName>()));
  }, [featureNamesData]);

  useEffect(() => {
    FiltersService.computeFeaturesNamesOptions().then(setFeatureNames).catch(NotificationsService.apiCallError);
  }, []);

  const handleOperatorChange = (value: string) => {
    onChange({
      ...searchFeatures,
      operator: value as SearchFeatureLogicalOperator,
      conditions: searchFeatures?.conditions || [],
    });
  };

  const handleAddCondition = () => {
    const imageFeatureName = featureNames[0];
    const newCondition: SearchFeatureCondition = {
      extensionId: imageFeatureName.id,
      format: imageFeatureName.format,
      type: imageFeatureName.type,
      name: imageFeatureName.name,
      operator: computeDefaultOperator(imageFeatureName.format),
      value: computeDefaultValue(imageFeatureName.format),
    };
    onChange({
      operator: searchFeatures?.operator || defaultLogicalOperator,
      conditions: [...(searchFeatures?.conditions || []), newCondition],
      features: searchFeatures?.features,
    });
  };

  const handleUpdateCondition = (index: number, updatedCondition: Partial<SearchFeatureCondition>) => {
    const newConditions = [...(searchFeatures?.conditions || [])];
    newConditions[index] = { ...newConditions[index], ...updatedCondition };
    const newCondition = newConditions[index];
    const compatibleOperators = computeCompatibleOperators(newCondition.format);
    if (compatibleOperators.indexOf(newCondition.operator) === -1) {
      newCondition.operator = computeDefaultOperator(newCondition.format);
    }
    if (isValueCompatible(newCondition.format, newCondition.operator, newCondition.value) === false) {
      newCondition.value = convertValue(computeDefaultValue(newCondition.format), newCondition.format, newCondition.operator);
    }
    const updatedFeatures = {
      ...searchFeatures,
      operator: searchFeatures?.operator || defaultLogicalOperator,
      conditions: newConditions
    };
    onChange(updatedFeatures);
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = [...(searchFeatures?.conditions || [])];
    newConditions.splice(index, 1);
    if (newConditions.length === 0 && !searchFeatures?.features) {
      onChange(undefined);
    } else {
      onChange({
        ...searchFeatures,
        operator: searchFeatures?.operator || defaultLogicalOperator,
        conditions: newConditions
      });
    }
  };

  const renderFeatureNameSelectOption: SelectProps["renderOption"] = (item: ComboboxLikeRenderOptionInput<ComboboxItem>) => {
    const featureName = perFeatureNamesDataValueFeaturesNamesOptionMap.get(item.option.value);
    return (
      <Group gap={8}>
        {item.checked && <CheckIcon className={Combobox.classes.optionsDropdownCheckIcon}/>}
        {featureName.id && <ExtensionIcon idOrExtension={featureName.id} size="sm" />}
        <Text size="sm">{computeFeatureNameLabel(featureName)}</Text>
      </Group>
    );
  };

  return (
    <Stack gap="sm">
      <Group>
        <Select
          data={operatorData}
          value={searchFeatures?.operator || defaultLogicalOperator}
          onChange={handleOperatorChange}
          w={100}
        />
        <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={handleAddCondition}>
          {t("filters.addCondition")}
        </Button>
      </Group>
      <Stack gap="xs" pl="sm" style={{ borderLeft: "2px solid #eee" }}>
        {searchFeatures?.conditions?.map((condition, index) => {
          const comparisonData = computeCompatibleOperators(condition.format).map((operator) => ({ value: operator as string, label: computeOperatorLabel(operator) }));

          const handleOnChangeFeatureName = (value: string): void => {
            const featureName = perFeatureNamesDataValueFeaturesNamesOptionMap.get(value);
            handleUpdateCondition(index, { extensionId: featureName.id, type: featureName.type, format: featureName.format, name: featureName.name, value: convertValue(computeDefaultValue(featureName.format), featureName.format, condition.operator) });
          };

          const handleOnChangeOperator = (value: string): void => {
            handleUpdateCondition(index, { operator: value as SearchFeatureComparisonOperator });
          };

          const handleOnChangeFeatureValue = (event: ChangeEvent<HTMLInputElement>): void => {
            const value = convertValue(event.target.value, condition.format, condition.operator);
            return handleUpdateCondition(index, { value });
          };

          return (
            <Group key={index} wrap="nowrap">
              <Select
                searchable
                nothingFoundMessage={t("filters.noMatching")}
                w={180}
                maxDropdownHeight={300}
                data={featureNamesData}
                value={computeSearchFeatureConditionValue(condition)}
                leftSection={condition.extensionId && <ExtensionIcon idOrExtension={condition.extensionId} size="sm" />}
                renderOption={renderFeatureNameSelectOption}
                comboboxProps={{ width: 220, position: "bottom-start" }}
                onChange={handleOnChangeFeatureName}
              />
              <Select
                data={comparisonData}
                w={120}
                value={condition.operator}
                onChange={handleOnChangeOperator}
              />
              <TextInput
                placeholder={t("field.value")}
                flex={1}
                value={String(condition.value)}
                onChange={handleOnChangeFeatureValue}
              />
              <ActionIcon color="red" variant="subtle" onClick={() => handleRemoveCondition(index)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          );
        })}
        {(!searchFeatures?.conditions || searchFeatures.conditions.length === 0) && (
          <Button variant="subtle" size="xs" color="gray" onClick={handleAddCondition}>
            {t("filters.noConditions")}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
