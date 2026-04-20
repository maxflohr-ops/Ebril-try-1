import { LinkKind } from "@prisma/client";
import { prisma } from "./db";

export const LINK_KINDS: LinkKind[] = [
  "spotify_artist",
  "spotify_featured",
  "youtube_channel",
  "youtube_featured",
  "apple_music",
  "shopify_store",
  "bandcamp",
  "soundcloud",
  "instagram",
  "tiktok",
  "discord",
  "website",
];

export const LINK_LABEL: Record<LinkKind, string> = {
  spotify_artist: "spotify",
  spotify_featured: "featured on spotify",
  youtube_channel: "youtube",
  youtube_featured: "featured video",
  apple_music: "apple music",
  shopify_store: "merch",
  bandcamp: "bandcamp",
  soundcloud: "soundcloud",
  instagram: "instagram",
  tiktok: "tiktok",
  discord: "discord",
  website: "website",
};

const SOCIAL_KINDS: LinkKind[] = [
  "spotify_artist",
  "apple_music",
  "youtube_channel",
  "bandcamp",
  "soundcloud",
  "instagram",
  "tiktok",
  "discord",
  "website",
];

export async function getActiveLinks() {
  return prisma.externalLink.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getSocialLinks() {
  return prisma.externalLink.findMany({
    where: { active: true, kind: { in: SOCIAL_KINDS } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getFeaturedTrack() {
  return prisma.externalLink.findFirst({
    where: { active: true, kind: "spotify_featured" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getFeaturedVideo() {
  return prisma.externalLink.findFirst({
    where: { active: true, kind: "youtube_featured" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getYouTubeChannel() {
  return prisma.externalLink.findFirst({
    where: { active: true, kind: "youtube_channel" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getShopifyStore() {
  return prisma.externalLink.findFirst({
    where: { active: true, kind: "shopify_store" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}
