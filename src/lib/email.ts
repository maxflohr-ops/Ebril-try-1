interface SendArgs {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({ to, subject, text }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Ebril Rewards <rewards@ebril.app>";

  if (!apiKey) {
    console.log(`[email:noop] to=${to} subject=${subject}\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) {
    console.error(`[email] send failed ${res.status}: ${await res.text()}`);
  }
}
