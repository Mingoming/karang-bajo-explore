export const DESTINATION_CATEGORIES = ["Alam", "Budaya", "Religi"] as const;

export type DestinationCategory = (typeof DESTINATION_CATEGORIES)[number];
