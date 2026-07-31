import sharp from "sharp";

export const MEDIA_MAX_OUTPUT_EDGE = 1920;
export const MEDIA_MAX_INPUT_PIXELS = 40_000_000;
export const MEDIA_WEBP_QUALITY = 82;

export const MEDIA_NORMALIZED_MIME = "image/webp";
export const MEDIA_NORMALIZED_EXTENSION = "webp";

export type NormalizedMediaImage = {
  file: File;
  extension: typeof MEDIA_NORMALIZED_EXTENSION;
  width: number;
  height: number;
  size: number;
};

export async function normalizeMediaImage(file: File) {
  try {
    const input = Buffer.from(await file.arrayBuffer());

    const { data, info } = await sharp(input, {
      failOn: "warning",
      limitInputPixels: MEDIA_MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        width: MEDIA_MAX_OUTPUT_EDGE,
        height: MEDIA_MAX_OUTPUT_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: MEDIA_WEBP_QUALITY,
        effort: 4,
      })
      .toBuffer({ resolveWithObject: true });

    if (!info.width || !info.height || data.byteLength === 0) {
      throw new Error("NORMALIZED_IMAGE_INVALID");
    }

    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;

    const normalizedFile = new File([arrayBuffer], "normalized.webp", {
      type: MEDIA_NORMALIZED_MIME,
    });

    return {
      success: true as const,
      image: {
        file: normalizedFile,
        extension: MEDIA_NORMALIZED_EXTENSION,
        width: info.width,
        height: info.height,
        size: normalizedFile.size,
      } satisfies NormalizedMediaImage,
    };
  } catch {
    return {
      success: false as const,
      error:
        "Gambar tidak dapat diproses. Pastikan berkas tidak rusak dan dimensinya wajar.",
    };
  }
}
