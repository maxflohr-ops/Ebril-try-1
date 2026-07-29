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

export async function getSocialLinks() {
  return prisma.externalLink.findMany({
    where: { active: true, kind: { in: SOCIAL_KINDS } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getShopifyStore() {
  return prisma.externalLink.findFirst({
    where: { active: true, kind: "shopify_store" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}
