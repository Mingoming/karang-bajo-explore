const DOMAIN_PATHS = {
  destination: {
    idCollection: "/destinasi",
    englishCollection: "/en/destinations",
    idDetail: (slug) => `/destinasi/${encodeURIComponent(slug)}`,
    englishDetail: (slug) => `/en/destinations/${encodeURIComponent(slug)}`,
    map: true,
  },
  homestay: {
    idCollection: "/homestay",
    englishCollection: "/en/homestays",
    idDetail: (slug) => `/homestay/${encodeURIComponent(slug)}`,
    englishDetail: (slug) => `/en/homestays/${encodeURIComponent(slug)}`,
    map: true,
  },
  umkm: {
    idCollection: "/umkm",
    englishCollection: "/en/local-businesses",
    idDetail: (slug) => `/umkm/${encodeURIComponent(slug)}`,
    englishDetail: (slug) => `/en/local-businesses/${encodeURIComponent(slug)}`,
    map: false,
  },
  traditionalHouse: {
    idCollection: "/rumah-adat",
    englishCollection: "/en/traditional-houses",
    idDetail: (slug) => `/rumah-adat/${encodeURIComponent(slug)}`,
    englishDetail: (slug) =>
      `/en/traditional-houses/${encodeURIComponent(slug)}`,
    map: true,
  },
  culturalEvent: {
    idCollection: "/acara-budaya",
    englishCollection: "/en/cultural-events",
    idDetail: (slug) => `/acara-budaya/${encodeURIComponent(slug)}`,
    englishDetail: (slug) => `/en/cultural-events/${encodeURIComponent(slug)}`,
    map: true,
  },
};

const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function revalidateEnglishTourismPackagePaths(runtime, trustedSlugs) {
  push(runtime, "/en/tourism-packages");
  for (const slug of new Set(trustedSlugs)) {
    if (typeof slug === "string" && VALID_SLUG.test(slug)) {
      push(runtime, `/en/tourism-packages/${encodeURIComponent(slug)}`);
    }
  }
}

function push(runtime, path) {
  runtime.paths.push(path);
  runtime.events?.push(`revalidate:${path}`);
}

function revalidateEnglishAggregatePaths(runtime, includeTourismMap) {
  push(runtime, "/en");
  if (includeTourismMap) push(runtime, "/en/tourism-map");
}

function revalidatePublicDomainDetailPaths(runtime, domain, trustedSlugs) {
  const config = DOMAIN_PATHS[domain];
  for (const slug of new Set(trustedSlugs)) {
    if (typeof slug !== "string" || !VALID_SLUG.test(slug)) continue;
    push(runtime, config.idDetail(slug));
    push(runtime, config.englishDetail(slug));
  }
}

export function createPublicRevalidationMock(runtime) {
  return {
    revalidateEnglishAggregatePaths: (includeTourismMap) =>
      revalidateEnglishAggregatePaths(runtime, includeTourismMap),
    revalidatePublicDomainDetailPaths: (domain, trustedSlugs) =>
      revalidatePublicDomainDetailPaths(runtime, domain, trustedSlugs),
    revalidateEnglishTourismPackagePaths: (trustedSlugs) =>
      revalidateEnglishTourismPackagePaths(runtime, trustedSlugs),
    revalidatePublicDomainPaths: (domain, trustedSlugs) => {
      const config = DOMAIN_PATHS[domain];
      push(runtime, config.idCollection);
      push(runtime, config.englishCollection);
      revalidateEnglishAggregatePaths(runtime, config.map);
      revalidatePublicDomainDetailPaths(runtime, domain, trustedSlugs);
    },
  };
}
