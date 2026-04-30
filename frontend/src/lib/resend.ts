import { sector } from "@/config";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  `${sector.brand.name} <noreply@${sector.brand.domain}>`;
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || `https://${sector.brand.domain}`;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ id: string }> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      reply_to: opts.replyTo,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }

  return res.json();
}

export function teamInvitationEmail(params: {
  teamName: string;
  inviterName: string;
  token: string;
  role: string;
}): { subject: string; html: string; text: string } {
  const acceptUrl = `${SITE_URL}/equipe/invitation?token=${params.token}`;
  const brandName = sector.brand.name;
  const brandDomain = sector.brand.domain;
  const subject = `${params.inviterName} vous invite à rejoindre ${params.teamName} sur ${brandName}`;

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;padding:16px;background:#1E40AF;border-radius:12px;">
      <span style="color:white;font-size:28px;font-weight:bold;">${brandName}</span>
    </div>
  </div>
  <h1 style="font-size:24px;margin-bottom:16px;">Invitation à rejoindre une équipe</h1>
  <p style="font-size:16px;line-height:1.6;color:#4b5563;">
    <strong>${params.inviterName}</strong> vous a invité à rejoindre l'équipe
    <strong>${params.teamName}</strong> sur ${brandName} avec le rôle <strong>${params.role}</strong>.
  </p>
  <div style="margin:32px 0;text-align:center;">
    <a href="${acceptUrl}" style="display:inline-block;padding:14px 32px;background:#1E40AF;color:white;text-decoration:none;border-radius:8px;font-weight:600;">
      Accepter l'invitation
    </a>
  </div>
  <p style="font-size:14px;color:#6b7280;line-height:1.5;">
    Ce lien expire dans 7 jours. Si vous n'avez pas de compte ${brandName}, créez-en un avec
    l'adresse email à laquelle vous avez reçu cette invitation.
  </p>
  <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;">
  <p style="font-size:12px;color:#9ca3af;text-align:center;">
    ${brandName} — Veille ${sector.vocab.regulatorName} automatisée par IA<br>
    <a href="${SITE_URL}" style="color:#6b7280;">${brandDomain}</a>
  </p>
</body></html>`;

  const text = `${params.inviterName} vous invite à rejoindre l'équipe ${params.teamName} sur ${brandName} (rôle : ${params.role}).

Acceptez l'invitation : ${acceptUrl}

Ce lien expire dans 7 jours.

${brandName} — ${brandDomain}`;

  return { subject, html, text };
}

export function subscribeConfirmationEmail(params: {
  firstName?: string;
}): { subject: string; html: string; text: string } {
  const greeting = params.firstName ? `Bonjour ${params.firstName}` : "Bonjour";
  const brandName = sector.brand.name;
  const brandDomain = sector.brand.domain;
  const subject = `Bienvenue sur ${brandName} — votre veille ${sector.vocab.regulatorName} commence ce mardi`;

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;padding:16px;background:#1E40AF;border-radius:12px;">
      <span style="color:white;font-size:28px;font-weight:bold;">${brandName}</span>
    </div>
  </div>
  <h1 style="font-size:24px;margin-bottom:16px;">${greeting},</h1>
  <p style="font-size:16px;line-height:1.6;color:#4b5563;">
    Merci pour votre inscription à la newsletter ${brandName}.
  </p>
  <p style="font-size:16px;line-height:1.6;color:#4b5563;">
    Chaque mardi à 8h, vous recevrez :
  </p>
  <ul style="font-size:16px;line-height:1.8;color:#4b5563;">
    <li>Les textes réglementaires qui impactent votre certification ${sector.vocab.regulatorName}</li>
    <li>Les appels d'offres formation pertinents de la semaine</li>
    <li>Les veilles métier et handicap (indicateurs 23-26)</li>
  </ul>
  <p style="font-size:16px;line-height:1.6;color:#4b5563;">
    À mardi.
  </p>
  <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;">
  <p style="font-size:12px;color:#9ca3af;text-align:center;">
    ${brandName} — Veille ${sector.vocab.regulatorName} automatisée par IA<br>
    <a href="${SITE_URL}" style="color:#6b7280;">${brandDomain}</a>
  </p>
</body></html>`;

  const text = `${greeting},

Merci pour votre inscription à la newsletter ${brandName}.

Chaque mardi à 8h, vous recevrez :
- Les textes réglementaires qui impactent votre certification ${sector.vocab.regulatorName}
- Les appels d'offres formation pertinents de la semaine
- Les veilles métier et handicap (indicateurs 23-26)

À mardi.

${brandName} — ${brandDomain}`;

  return { subject, html, text };
}
