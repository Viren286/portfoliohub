import "server-only";
import { env } from "./env";

/**
 * Sends transactional email through Resend when RESEND_API_KEY is set.
 * Without a key (local development) the message is printed to the server log,
 * so verification links still work while developing.
 */
export async function sendEmail(to: string, subject: string, text: string, htmlBody?: string) {
  if (!env.email.resendApiKey) {
    console.info(`\n[email:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.email.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.email.from, to, subject, text, html: htmlBody }),
  });
  if (!res.ok) {
    console.error("[email] Resend error", res.status, await res.text().catch(() => ""));
    throw new Error("Could not send email");
  }
}
