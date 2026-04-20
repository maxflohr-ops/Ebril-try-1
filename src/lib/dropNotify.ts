import { prisma } from "./db";
import { sendEmail } from "./email";
import { sendPushToUser } from "./push";

export interface NotifyResult {
  songId: string;
  title: string;
  notified: number;
  skipped: number;
}

export async function notifySubscribersForSong(songId: string): Promise<NotifyResult> {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      id: true,
      title: true,
      slug: true,
      spotifyUrl: true,
      appleMusicUrl: true,
      youtubeUrl: true,
    },
  });
  if (!song) throw new Error("not_found");

  // song-specific + generic "anything next" subscriptions.
  const subs = await prisma.dropSubscription.findMany({
    where: {
      OR: [{ songId: song.id }, { songId: null }],
      notifiedAt: null,
    },
    select: { id: true, userId: true },
  });

  const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "";
  const link = `${baseUrl}/songs/${song.slug}`;
  const title = `it's out: ${song.title.toLowerCase()}`;
  const body = `the new one is live. press play when you can — i wrote you a small note on the song's page.`;

  let notified = 0;
  let skipped = 0;

  for (const s of subs) {
    const user = await prisma.user.findUnique({
      where: { id: s.userId },
      select: { email: true, displayName: true },
    });
    try {
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: title,
          text: `${body}\n\n${link}`,
        });
      }
      await sendPushToUser(s.userId, { title, body, url: `/songs/${song.slug}` });
      notified++;
    } catch (err) {
      console.error("[drop-notify] failed", s.userId, err);
      skipped++;
      continue;
    }
    await prisma.dropSubscription.update({
      where: { id: s.id },
      data: { notifiedAt: new Date() },
    });
  }

  return { songId: song.id, title: song.title, notified, skipped };
}
