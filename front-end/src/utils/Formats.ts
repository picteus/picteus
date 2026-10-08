import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";


dayjs.extend(calendar);


export type FormatDateOptionsType =
  {
    readonly isRelative?: boolean;
    readonly withSeconds?: boolean;
  };

const coldDateFormat = "DD-MM-YYYY HH:mm";
const secondsSuffixFormat = ":ss";

const defaultCalendarFormats =
  {
    sameDay: "[Today,] HH:mm",
    nextDay: "[Tomorrow,] HH:mm",
    nextWeek: "dddd, HH:mm",
    lastDay: "[Yesterday,] HH:mm",
    lastWeek: "dddd, HH:mm",
    sameElse: coldDateFormat
  };

const defaultCalendarFormatsWithSeconds = new Map<string, string>([ ...Object.entries(defaultCalendarFormats) ].map(([ key, value ]) => [ key, value + secondsSuffixFormat ]));

export function formatAbsoluteDate(timestampInMilliseconds: number, withSeconds = true): string
{
  return dayjs(timestampInMilliseconds).format(coldDateFormat + (withSeconds ? secondsSuffixFormat : ""));
}

export function formatDate(timestampInMilliseconds: number, options?: FormatDateOptionsType): string
{
  const isRelative = options?.isRelative ?? true;
  const withSeconds = options?.withSeconds ?? false;

  if (isRelative === false)
  {
    return formatAbsoluteDate(timestampInMilliseconds, withSeconds);
  }

  const calendarFormats = withSeconds ? defaultCalendarFormatsWithSeconds : defaultCalendarFormats;
  return dayjs(timestampInMilliseconds).calendar(null, calendarFormats);
}
