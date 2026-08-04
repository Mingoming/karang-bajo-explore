"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryAdministratorEnglishVillageProfileTranslation } from "./data";
import {
  createEnglishVillageProfileTranslationActionState,
  validateEnglishVillageProfileTranslationForPublish,
  validateEnglishVillageProfileTranslationFormData,
  type EnglishVillageProfileTranslationActionState,
  type EnglishVillageProfileTranslationFormValues,
  type EnglishVillageProfileTranslationStatus,
} from "./model";

const VILLAGE_PROFILE_ADMIN_PATH = "/admin/profil-desa";
const ENGLISH_VILLAGE_PROFILE_PUBLIC_PATH = "/en/village-profile";

const TRANSLATION_INTENTS = [
  "save-draft",
  "publish",
  "archive",
  "restore",
] as const;

type TranslationIntent = (typeof TRANSLATION_INTENTS)[number];

type TranslationRpcRow = {
  id: string;
  status: EnglishVillageProfileTranslationStatus;
  source_updated_at_at_publish: string | null;
  published_at: string | null;
};

function readTranslationIntent(formData: FormData): TranslationIntent | null {
  const submittedValues = formData.getAll("intent");

  if (submittedValues.length !== 1 || typeof submittedValues[0] !== "string") {
    return null;
  }

  const intent = submittedValues[0];

  return TRANSLATION_INTENTS.some((candidate) => candidate === intent)
    ? (intent as TranslationIntent)
    : null;
}

function createDatabaseFailure(
  previousState: EnglishVillageProfileTranslationActionState,
  message = "Terjemahan profil desa belum dapat diproses. Silakan coba lagi.",
  values: EnglishVillageProfileTranslationFormValues = previousState.values,
): EnglishVillageProfileTranslationActionState {
  return {
    ...previousState,
    kind: "database-error",
    values,
    fieldErrors: {},
    formErrors: [],
    message,
    revision: previousState.revision + 1,
  };
}

function revalidateTranslationPaths() {
  revalidatePath(VILLAGE_PROFILE_ADMIN_PATH);
  revalidatePath(ENGLISH_VILLAGE_PROFILE_PUBLIC_PATH);
}

export async function manageEnglishVillageProfileTranslation(
  previousState: EnglishVillageProfileTranslationActionState,
  formData: FormData,
): Promise<EnglishVillageProfileTranslationActionState> {
  await requireAdministrator();

  const intent = readTranslationIntent(formData);

  if (!intent) {
    return {
      ...previousState,
      kind: "validation-error",
      fieldErrors: {},
      formErrors: ["Tindakan formulir tidak valid."],
      message: "Permintaan tidak dapat diproses.",
      revision: previousState.revision + 1,
    };
  }

  const supabase = await createClient();
  const current =
    await queryAdministratorEnglishVillageProfileTranslation(supabase);

  if (!current.success) {
    return createDatabaseFailure(previousState);
  }

  const source = current.source;
  const translation = current.translation;

  if (!source) {
    return createEnglishVillageProfileTranslationActionState(null, null, {
      kind: "validation-error",
      values: previousState.values,
      formErrors: [
        "Profil desa Indonesia harus dibuat sebelum terjemahan Inggris dapat dikelola.",
      ],
      message: "Sumber profil desa belum tersedia.",
      revision: previousState.revision + 1,
    });
  }

  let successMessage: string;

  if (intent === "save-draft" || intent === "publish") {
    const validation =
      validateEnglishVillageProfileTranslationFormData(formData);

    if (!validation.success) {
      return createEnglishVillageProfileTranslationActionState(
        source,
        translation,
        {
          kind: "validation-error",
          values: validation.values,
          fieldErrors: validation.fieldErrors,
          formErrors: validation.formErrors,
          message: "Periksa kembali data yang ditandai.",
          revision: previousState.revision + 1,
        },
      );
    }

    if (translation && translation.status !== "draft") {
      return createEnglishVillageProfileTranslationActionState(
        source,
        translation,
        {
          kind: "validation-error",
          values: validation.values,
          formErrors: [
            "Terjemahan harus diarsipkan dan dipulihkan menjadi draf sebelum dapat diedit.",
          ],
          message: "Status terjemahan tidak mengizinkan penyuntingan.",
          revision: previousState.revision + 1,
        },
      );
    }

    if (intent === "publish") {
      const publishValidation =
        validateEnglishVillageProfileTranslationForPublish(
          source,
          validation.data,
        );

      if (!publishValidation.success) {
        return createEnglishVillageProfileTranslationActionState(
          source,
          translation,
          {
            kind: "validation-error",
            values: validation.values,
            fieldErrors: publishValidation.fieldErrors,
            formErrors: publishValidation.formErrors,
            message: "Lengkapi terjemahan yang diwajibkan sebelum publikasi.",
            revision: previousState.revision + 1,
          },
        );
      }
    }

    const { data: savedRow, error: saveError } = await supabase
      .rpc("village_profile_translation_save_draft", {
        p_village_profile_id: source.id,
        p_name: validation.data.name,
        p_summary: validation.data.summary,
        p_description: validation.data.description,
        p_history: validation.data.history,
        p_vision: validation.data.vision,
        p_mission: validation.data.mission,
        p_address: validation.data.address,
      })
      .single()
      .overrideTypes<TranslationRpcRow, { merge: false }>();

    const saveFailureCode =
      saveError?.code ?? (savedRow === null ? "unexpected-row-count" : null);

    if (saveFailureCode || savedRow === null) {
      console.error("Penyimpanan draf terjemahan profil desa gagal.", {
        code: saveFailureCode,
      });

      return createDatabaseFailure(
        previousState,
        saveFailureCode === "55000"
          ? "Status terjemahan telah berubah. Muat ulang halaman sebelum mencoba kembali."
          : undefined,
        validation.values,
      );
    }

    if (intent === "publish") {
      const translationId = savedRow.id;

      const { data: publishedRow, error: publishError } = await supabase
        .rpc("village_profile_translation_publish", {
          p_translation_id: translationId,
        })
        .single()
        .overrideTypes<TranslationRpcRow, { merge: false }>();

      const publishFailureCode =
        publishError?.code ??
        (publishedRow === null ? "unexpected-row-count" : null);

      if (publishFailureCode) {
        console.error("Publikasi terjemahan profil desa gagal.", {
          code: publishFailureCode,
        });

        revalidateTranslationPaths();

        const refreshed =
          await queryAdministratorEnglishVillageProfileTranslation(supabase);

        if (refreshed.success) {
          return createEnglishVillageProfileTranslationActionState(
            refreshed.source,
            refreshed.translation,
            {
              kind: "database-error",
              message:
                "Draf telah disimpan, tetapi belum dapat diterbitkan. Periksa status profil Indonesia lalu coba kembali.",
              revision: previousState.revision + 1,
            },
          );
        }

        return createDatabaseFailure(
          previousState,
          "Draf telah disimpan, tetapi status publikasinya belum dapat dimuat.",
          validation.values,
        );
      }

      successMessage = "Terjemahan Inggris berhasil diterbitkan.";
    } else {
      successMessage = "Draf terjemahan Inggris berhasil disimpan.";
    }
  } else {
    if (!translation) {
      return createEnglishVillageProfileTranslationActionState(source, null, {
        kind: "validation-error",
        values: previousState.values,
        formErrors: ["Terjemahan Inggris belum tersedia."],
        message: "Tindakan lifecycle tidak dapat dijalankan.",
        revision: previousState.revision + 1,
      });
    }

    if (intent === "archive") {
      if (translation.status !== "published") {
        return createEnglishVillageProfileTranslationActionState(
          source,
          translation,
          {
            kind: "validation-error",
            formErrors: [
              "Hanya terjemahan yang sedang diterbitkan yang dapat diarsipkan dari antarmuka ini.",
            ],
            message: "Status terjemahan tidak sesuai.",
            revision: previousState.revision + 1,
          },
        );
      }

      const { data, error } = await supabase
        .rpc("village_profile_translation_archive", {
          p_translation_id: translation.id,
        })
        .single()
        .overrideTypes<TranslationRpcRow, { merge: false }>();

      const failureCode =
        error?.code ?? (data === null ? "unexpected-row-count" : null);

      if (failureCode) {
        console.error("Pengarsipan terjemahan profil desa gagal.", {
          code: failureCode,
        });

        return createDatabaseFailure(
          previousState,
          failureCode === "55000"
            ? "Status terjemahan telah berubah. Muat ulang halaman sebelum mencoba kembali."
            : undefined,
        );
      }

      successMessage = "Terjemahan Inggris berhasil diarsipkan.";
    } else {
      if (translation.status !== "archived") {
        return createEnglishVillageProfileTranslationActionState(
          source,
          translation,
          {
            kind: "validation-error",
            formErrors: [
              "Hanya terjemahan yang diarsipkan yang dapat dipulihkan menjadi draf.",
            ],
            message: "Status terjemahan tidak sesuai.",
            revision: previousState.revision + 1,
          },
        );
      }

      const { data, error } = await supabase
        .rpc("village_profile_translation_restore", {
          p_translation_id: translation.id,
        })
        .single()
        .overrideTypes<TranslationRpcRow, { merge: false }>();

      const failureCode =
        error?.code ?? (data === null ? "unexpected-row-count" : null);

      if (failureCode) {
        console.error("Pemulihan terjemahan profil desa gagal.", {
          code: failureCode,
        });

        return createDatabaseFailure(
          previousState,
          failureCode === "55000"
            ? "Status terjemahan telah berubah. Muat ulang halaman sebelum mencoba kembali."
            : undefined,
        );
      }

      successMessage =
        "Terjemahan Inggris dipulihkan menjadi draf dan dapat diedit kembali.";
    }
  }

  revalidateTranslationPaths();

  const refreshed =
    await queryAdministratorEnglishVillageProfileTranslation(supabase);

  if (!refreshed.success) {
    return createDatabaseFailure(
      previousState,
      "Perubahan tersimpan, tetapi status terbaru belum dapat dimuat. Muat ulang halaman.",
    );
  }

  return createEnglishVillageProfileTranslationActionState(
    refreshed.source,
    refreshed.translation,
    {
      kind: "success",
      message: successMessage,
      revision: previousState.revision + 1,
    },
  );
}
