export type PublicMapCopy = Readonly<{
  loading: string;
  filterEyebrow: string;
  title: string;
  description: string;
  categoryFilterLabel: string;
  allCategories: string;
  emptyTitle: string;
  emptyDescription: string;
  listEyebrow: string;
  listTitle: string;
  countLabel: (count: number) => string;
  noListItems: string;
  detailsAction: string;
  mapsAction: string;
  mapAriaLabel: string;
  multipleLocationsLabel: (count: number) => string;
  baseMapFailure: string;
  baseMapFallback: string;
  entityLabels: Readonly<{
    destination: string;
    traditionalHouse: string;
    homestay: string;
    umkm: string;
    culturalEvent: string;
  }>;
}>;

export const PUBLIC_MAP_COPY_ID: PublicMapCopy = {
  loading: "Memuat peta wisata…",
  filterEyebrow: "Filter lokasi",
  title: "Peta wisata Karang Bajo",
  description:
    "Pilih kategori untuk menampilkan destinasi Alam, Budaya, atau Religi. Pilih Semua untuk melihat seluruh jenis lokasi.",
  categoryFilterLabel: "Filter kategori pada peta wisata",
  allCategories: "Semua",
  emptyTitle: "Tidak ada lokasi pada kategori ini",
  emptyDescription: "Pilih kategori lain atau tampilkan seluruh lokasi.",
  listEyebrow: "Alternatif peta",
  listTitle: "Daftar lokasi",
  countLabel: (count) => `${count} lokasi ditampilkan`,
  noListItems: "Belum ada lokasi untuk ditampilkan pada daftar ini.",
  detailsAction: "Lihat detail",
  mapsAction: "Buka Google Maps",
  mapAriaLabel: "Peta wisata interaktif Desa Karang Bajo",
  multipleLocationsLabel: (count) => `${count} lokasi pada titik ini`,
  baseMapFailure: "Peta dasar tidak dapat dimuat.",
  baseMapFallback:
    "Gunakan daftar lokasi di bawah untuk membuka detail atau navigasi.",
  entityLabels: {
    destination: "Destinasi",
    traditionalHouse: "Rumah Adat",
    homestay: "Homestay",
    umkm: "UMKM",
    culturalEvent: "Acara Budaya",
  },
};

export const ENGLISH_PUBLIC_MAP_COPY: PublicMapCopy = {
  loading: "Loading the tourism map…",
  filterEyebrow: "Explore locations",
  title: "Karang Bajo tourism map",
  description:
    "Explore approved English locations for destinations, traditional houses, cultural events, and homestays.",
  categoryFilterLabel: "Filter locations on the tourism map",
  allCategories: "All locations",
  emptyTitle: "No locations are available",
  emptyDescription:
    "Approved English location information will appear here when it is published.",
  listEyebrow: "Map alternative",
  listTitle: "Location list",
  countLabel: (count) =>
    `${count} ${count === 1 ? "location" : "locations"} shown`,
  noListItems: "There are no locations to show in this list.",
  detailsAction: "View details",
  mapsAction: "Open Google Maps",
  mapAriaLabel: "Interactive tourism map of Karang Bajo Village",
  multipleLocationsLabel: (count) =>
    `${count} ${count === 1 ? "location" : "locations"} at this point`,
  baseMapFailure: "The base map could not be loaded.",
  baseMapFallback: "Use the location list below to open details or navigation.",
  entityLabels: {
    destination: "Destination",
    traditionalHouse: "Traditional House",
    homestay: "Homestay",
    umkm: "Local Business",
    culturalEvent: "Cultural Event",
  },
};

export const ENGLISH_TOURISM_MAP_PAGE_COPY = {
  metadataTitle: "Tourism Map",
  metadataDescription:
    "Explore approved English locations for tourism in Karang Bajo Village.",
  eyebrow: "Explore Karang Bajo",
  title: "Tourism map",
  description:
    "Find approved English locations for destinations, traditional houses, cultural events, and homestays.",
  emptyTitle: "No English locations are available",
  emptyDescription:
    "Approved English location information will appear here when it is published.",
} as const;
