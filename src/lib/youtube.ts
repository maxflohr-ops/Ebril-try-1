const YT_HOSTS = /(?:^|\.)(youtube\.com|youtu\.be)$/i;

export interface YouTubeRef {
  kind: "video" | "channel" | "playlist";
  id: string;
}

export function parseYouTubeUrl(raw: string | null | undefined): YouTubeRef | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!YT_HOSTS.test(url.hostname)) return null;

    if (url.hostname.endsWith("youtu.be")) {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id ? { kind: "video", id } : null;
    }

    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id ? { kind: "video", id } : null;
    }
    if (url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.split("/")[2];
      return id ? { kind: "video", id } : null;
    }
    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.split("/")[2];
      return id ? { kind: "video", id } : null;
    }
    if (url.pathname === "/playlist") {
      const id = url.searchParams.get("list");
      return id ? { kind: "playlist", id } : null;
    }
    if (url.pathname.startsWith("/channel/")) {
      const id = url.pathname.split("/")[2];
      return id ? { kind: "channel", id } : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(ref: YouTubeRef, channelUploadsPlaylistId?: string): string {
  if (ref.kind === "video") {
    return `https://www.youtube-nocookie.com/embed/${ref.id}?rel=0&modestbranding=1`;
  }
  if (ref.kind === "playlist") {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${ref.id}&rel=0&modestbranding=1`;
  }
  // channel: derive the uploads playlist by flipping the UC prefix to UU if not explicitly given
  const listId = channelUploadsPlaylistId ?? (ref.id.startsWith("UC") ? `UU${ref.id.slice(2)}` : ref.id);
  return `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&rel=0&modestbranding=1`;
}
