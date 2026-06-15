import { formatDate } from "utils";


type FormatedDateType = {
  timestamp: number;
};

export default function FormatedDate({ timestamp }: FormatedDateType) {
  return formatDate(timestamp);
}
