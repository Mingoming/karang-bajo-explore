import type { PublicLocale } from "./locale.ts";

const idDictionary = {
  shell: {
    skipLink: "Lewati ke konten utama",
    homeAriaLabel: "Karang Bajo Explore, beranda",
    villageLabel: "Desa Karang Bajo",
  },
  navigation: {
    label: "Navigasi publik utama",
    mobileLabel: "Navigasi publik mobile",
    mobileTitle: "Menu jelajah",
    open: "Buka navigasi",
    close: "Tutup navigasi",
    closeButton: "Tutup",
    home: "Beranda",
    profile: "Profil Desa",
    destinations: "Destinasi",
    tourismPackages: "Paket Wisata",
    homestays: "Homestay",
    umkm: "UMKM",
    traditionalHouses: "Rumah Adat",
    culturalEvents: "Acara Budaya",
    tourismMap: "Peta Wisata",
    contact: "Kontak",
  },
  languageSwitcher: {
    label: "Pilihan bahasa",
    current: "Bahasa saat ini",
    id: "Bahasa Indonesia",
    en: "English",
  },
  footer: {
    description:
      "Fondasi informasi pariwisata Desa Karang Bajo dalam bahasa Indonesia.",
    navigationHeading: "Jelajahi",
    informationHeading: "Informasi resmi",
    whatsapp: "WhatsApp Desa",
    contact: "Lihat kontak resmi",
    unavailable: "Kontak resmi belum tersedia.",
    copyright: "Informasi Desa Karang Bajo.",
  },
  home: {
    metadataTitle: "Beranda",
    metadataDescription:
      "Jelajahi destinasi, budaya, homestay, UMKM, paket wisata, dan acara di Desa Karang Bajo.",
    hero: {
      eyebrow: "Desa Karang Bajo",
      title: "Jelajahi Alam, Budaya, dan Tradisi",
      description:
        "Fondasi informasi pariwisata yang menghimpun konten terbit dan terverifikasi tentang Desa Karang Bajo.",
      primaryAction: "Jelajahi destinasi",
      secondaryAction: "Mengenal desa",
    },
    availability: {
      eyebrow: "Informasi terverifikasi",
      title: "Informasi pariwisata berbahasa Indonesia tersedia lengkap",
      description:
        "Gunakan Bahasa Indonesia untuk membaca informasi desa dan pariwisata yang telah diterbitkan.",
    },
    contact: {
      eyebrow: "Karang Bajo Explore",
      title: "Mulai mengenal Karang Bajo dari informasi yang terverifikasi",
      button: "Hubungi WhatsApp Desa",
      accessibleLabel: "Hubungi desa melalui WhatsApp",
      unavailable: "WhatsApp resmi belum tersedia.",
    },
    externalTourism: {
      eyebrow: "Jelajahi lebih lanjut",
      title: "Temukan Karang Bajo di platform pilihan Anda",
      description:
        "Buka peta wisata melalui Google Maps atau temukan informasi Karang Bajo di Tripadvisor.",
      googleMaps: "Buka di Google Maps",
      googleMapsAccessible:
        "Buka Karang Bajo Explore di Google Maps (tab baru)",
      tripadvisor: "Buka Tripadvisor",
      tripadvisorAccessible:
        "Buka informasi Karang Bajo di Tripadvisor (tab baru)",
    },
  },
  states: {
    loadingTitle: "Memuat informasi",
    loadingDescription: "Mohon tunggu sebentar.",
    errorTitle: "Informasi belum dapat dimuat",
    errorDescription: "Silakan coba kembali beberapa saat lagi.",
    retry: "Coba lagi",
    notFoundTitle: "Halaman tidak ditemukan",
    notFoundDescription: "Halaman yang Anda cari tidak tersedia.",
    notFoundAction: "Kembali ke beranda",
  },
  villageProfile: {
    metadataTitlePrefix: "Profil Desa",
    metadataUnavailableTitle: "Profil desa belum tersedia",
    metadataUnavailableDescription:
      "Profil resmi Desa Karang Bajo belum tersedia atau belum diterbitkan.",
    eyebrow: "Mengenal desa",
    historyHeading: "Sejarah",
    visionHeading: "Visi",
    missionHeading: "Misi",
    locationHeading: "Lokasi",
    openMap: "Buka lokasi di peta",
  },
} as const;

type StringDictionary<T> = {
  readonly [Key in keyof T]: T[Key] extends string
    ? string
    : StringDictionary<T[Key]>;
};

export type PublicDictionary = StringDictionary<typeof idDictionary>;

const enDictionary = {
  shell: {
    skipLink: "Skip to main content",
    homeAriaLabel: "Karang Bajo Explore, home",
    villageLabel: "Karang Bajo Village",
  },
  navigation: {
    label: "Main public navigation",
    mobileLabel: "Mobile public navigation",
    mobileTitle: "Explore menu",
    open: "Open navigation",
    close: "Close navigation",
    closeButton: "Close",
    home: "Home",
    profile: "Village Profile",
    destinations: "Destinations",
    tourismPackages: "Tourism Packages",
    homestays: "Homestays",
    umkm: "Local Businesses",
    traditionalHouses: "Traditional Houses",
    culturalEvents: "Cultural Events",
    tourismMap: "Tourism Map",
    contact: "Contact",
  },
  languageSwitcher: {
    label: "Language selection",
    current: "Current language",
    id: "Bahasa Indonesia",
    en: "English",
  },
  footer: {
    description:
      "The English public-information foundation for Karang Bajo Village.",
    navigationHeading: "Explore",
    informationHeading: "Official information",
    whatsapp: "Village WhatsApp",
    contact: "View official contacts",
    unavailable: "Official contact information is not available yet.",
    copyright: "Karang Bajo Village information.",
  },
  home: {
    metadataTitle: "Home",
    metadataDescription:
      "Discover the English public-information foundation for Karang Bajo Village.",
    hero: {
      eyebrow: "Karang Bajo Village",
      title: "Explore Nature, Culture, and Tradition",
      description:
        "A carefully prepared English starting point for discovering Karang Bajo Village.",
      primaryAction: "Contact the village",
      secondaryAction: "English information status",
    },
    availability: {
      eyebrow: "English information",
      title: "Verified English tourism information is being prepared",
      description:
        "Detailed village and tourism content is not shown here until an approved English translation is available.",
    },
    contact: {
      eyebrow: "Karang Bajo Explore",
      title: "Ask about visiting Karang Bajo through the official channel",
      button: "Contact Village WhatsApp",
      accessibleLabel: "Contact Karang Bajo Village through WhatsApp",
      unavailable: "The official WhatsApp channel is not available yet.",
    },
    externalTourism: {
      eyebrow: "Explore further",
      title: "Find Karang Bajo on recognized platforms",
      description:
        "Open the recognized Google Maps or Tripadvisor listing when available.",
      googleMaps: "Open Google Maps",
      googleMapsAccessible: "Open Karang Bajo Explore on Google Maps (new tab)",
      tripadvisor: "Open Tripadvisor",
      tripadvisorAccessible:
        "Open Karang Bajo information on Tripadvisor (new tab)",
    },
  },
  states: {
    loadingTitle: "Loading information",
    loadingDescription: "Please wait a moment.",
    errorTitle: "Information could not be loaded",
    errorDescription: "Please try again in a moment.",
    retry: "Try again",
    notFoundTitle: "Page not found",
    notFoundDescription: "The page you requested is not available.",
    notFoundAction: "Back to homepage",
  },
  villageProfile: {
    metadataTitlePrefix: "Village Profile",
    metadataUnavailableTitle: "Village profile not available",
    metadataUnavailableDescription:
      "The approved English Village Profile is not available yet.",
    eyebrow: "Village profile",
    historyHeading: "History",
    visionHeading: "Vision",
    missionHeading: "Mission",
    locationHeading: "Location",
    openMap: "Open location in maps",
  },
} as const satisfies PublicDictionary;

export const PUBLIC_DICTIONARIES: Readonly<
  Record<PublicLocale, PublicDictionary>
> = {
  id: idDictionary,
  en: enDictionary,
};

export function getPublicDictionary(locale: PublicLocale): PublicDictionary {
  return PUBLIC_DICTIONARIES[locale];
}
