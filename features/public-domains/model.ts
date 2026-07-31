export type PublishedItineraryRelation = {
  destination_id: string;
  display_order: number;
  notes: string | null;
};

export type PublishedItineraryDestination = {
  id: string;
  name: string;
  slug: string;
};

export function buildPublishedItinerary(
  relations: readonly PublishedItineraryRelation[],
  destinations: readonly PublishedItineraryDestination[],
) {
  const publishedDestinations = new Map(
    destinations.map((destination) => [destination.id, destination]),
  );

  return [...relations]
    .sort(
      (left, right) =>
        left.display_order - right.display_order ||
        left.destination_id.localeCompare(right.destination_id),
    )
    .flatMap((relation) => {
      const destination = publishedDestinations.get(relation.destination_id);
      return destination
        ? [
            {
              id: destination.id,
              name: destination.name,
              slug: destination.slug,
              notes: relation.notes,
              displayOrder: relation.display_order,
            },
          ]
        : [];
    });
}

export function formatPublicEventSchedule(value: string, allDay: boolean) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    ...(allDay ? {} : { timeStyle: "short" as const }),
    timeZone: "Asia/Makassar",
  }).format(new Date(value));
}
