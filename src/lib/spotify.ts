const SPOTIFY_HOST = /(?:^|\.)spotify\.com$/i;

export type SpotifyEmbedKind = "track" | "album" | "playlist" | "artist" | "episode";

export interface SpotifyRef {
  kind: SpotifyEmbedKind;
  id: string;
}

export function parseSpotifyUrl(raw: string | null | undefined): SpotifyRef | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!SPOTIFY_HOST.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const kinds: SpotifyEmbedKind[] = ["track", "album", "playlist", "artist", "episode"];
    for (let i = 0; i < parts.length - 1; i++) {
      if ((kinds as string[]).includes(parts[i])) {
        return { kind: parts[i] as SpotifyEmbedKind, id: parts[i + 1] };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function spotifyEmbedUrl(ref: SpotifyRef, theme: "dark" | "light" = "dark"): string {
  const themeQ = theme === "dark" ? "?theme=0" : "";
  return `https://open.spotify.com/embed/${ref.kind}/${ref.id}${themeQ}`;
}
