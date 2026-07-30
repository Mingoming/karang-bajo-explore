export const MEDIA_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const MEDIA_MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type SupportedMediaMime = keyof typeof MEDIA_MIME_EXTENSIONS;

function hasPrefix(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function signatureMatchesMime(
  bytes: Uint8Array,
  mime: SupportedMediaMime,
) {
  if (mime === "image/jpeg") return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
  if (mime === "image/png")
    return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return (
    hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    hasPrefix(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
  );
}

export function isSupportedMediaMime(
  value: string,
): value is SupportedMediaMime {
  return Object.hasOwn(MEDIA_MIME_EXTENSIONS, value);
}

export async function validateMediaFile(
  value: FormDataEntryValue | null,
  required: boolean,
) {
  if (!(value instanceof File) || (!value.name && value.size === 0)) {
    return required
      ? {
          success: false as const,
          error: "Pilih berkas gambar yang akan diunggah.",
        }
      : { success: true as const, file: null, extension: null };
  }
  if (value.size === 0)
    return {
      success: false as const,
      error: "Berkas gambar tidak boleh kosong.",
    };
  if (value.size > MEDIA_MAX_FILE_SIZE)
    return {
      success: false as const,
      error: "Ukuran gambar tidak boleh melebihi 5 MiB.",
    };
  if (!isSupportedMediaMime(value.type))
    return {
      success: false as const,
      error: "Format gambar harus JPEG, PNG, atau WebP.",
    };
  const bytes = new Uint8Array(await value.slice(0, 16).arrayBuffer());
  if (!signatureMatchesMime(bytes, value.type))
    return {
      success: false as const,
      error: "Isi berkas tidak sesuai dengan format gambar yang dipilih.",
    };
  return {
    success: true as const,
    file: value,
    extension: MEDIA_MIME_EXTENSIONS[value.type],
  };
}

export async function validateMediaFileField(
  formData: FormData,
  required: boolean,
) {
  const entries = formData.getAll("file");
  if (entries.length !== 1) {
    return {
      success: false as const,
      error: "Formulir harus memuat tepat satu kolom berkas gambar.",
    };
  }
  return validateMediaFile(entries[0], required);
}
