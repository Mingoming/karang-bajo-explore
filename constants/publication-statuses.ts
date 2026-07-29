export const PUBLICATION_STATUSES = ["draft", "published", "archived"] as const;

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
