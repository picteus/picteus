import i18n from "i18next";
import { bytesHasSignature } from "./File.ts";

function isNotEmpty(value) {
  if (!value || value.length === 0) {
    return i18n.t("fieldError.empty");
  }
}

async function isFileType(blob: Blob, signature: number[]): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onloadend = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const byteArray = new Uint8Array(arrayBuffer);

      const isMatch = bytesHasSignature(byteArray, signature);
      resolve(isMatch);
    };

    fileReader.onerror = () => {
      reject(new Error("Error reading Blob"));
    };

    // Read the first few bytes (length of the signature)
    fileReader.readAsArrayBuffer(blob.slice(0, signature.length));
  });
}
function isMimeType(file: File, validMimeTypes: string[]): boolean {
  return validMimeTypes.includes(file.type);
}
export default {
  isNotEmpty,
  isFileType,
  isMimeType,
};
