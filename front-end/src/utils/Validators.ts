import i18n from "i18next";


function isNotEmpty(value)
{
  if (!value || value.length === 0)
  {
    return i18n.t("fieldError.empty");
  }
}

export default {
  isNotEmpty
};
