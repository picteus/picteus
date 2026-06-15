export const mimeTypes = {
  zip: "application/zip",
  tarGz: "application/gzip",
  gzip: "application/gzip",
  // Add more MIME types as needed
};

export const fileSignatures = {
  zip: [0x50, 0x4b], // "PK" in ASCII for ZIP files
  tarGz: [0x1f, 0x8b], // GZIP files start with 0x1F 0x8B
};

export async function fileToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // As File is a subtype of Blob, we can directly resolve it as a Blob
      resolve(new Blob([file], { type: file.type }));
    } catch (error) {
      reject(new Error("Failed to convert file to Blob"));
    }
  });
}

export function bytesHasSignature(
  bytes: Uint8Array,
  signature: number[],
): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}
