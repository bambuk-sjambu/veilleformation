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

/**
 * Email d'activation Founder envoyé après paiement réussi (mode=payment one-shot).
 * L'URL contient un magic link single-use qui mène à /connexion/activer.
 */
export async function sendFounderActivationEmail(
  email: string,
  activationUrl: string,
  firstName: string
): Promise<void> {
  const subject = "Bienvenue chez les Founders Cipia — Activez votre compte";
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#F3F4F6;margin:0;padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F6;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1E40AF;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;font-size:24px;color:#FFFFFF;font-weight:700;">Bienvenue chez les Founders Cipia 🎉</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;line-height:1.5;">Bonjour ${firstName},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
            Votre paiement Cipia Founder est confirmé. Vous faites partie des fondateurs.
            Pour finaliser votre compte, cliquez sur le bouton ci-dessous et choisissez votre mot de passe.
          </p>
          <p style="margin:24px 0;text-align:center;">
            <a href="${activationUrl}" style="display:inline-block;padding:14px 28px;background:#1E40AF;color:#FFFFFF;font-weight:700;text-decoration:none;border-radius:6px;font-size:15px;">
              Activer mon compte
            </a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#6B7280;line-height:1.5;">
            Ce lien est valable 72 heures. Si vous l'avez déjà utilisé, demandez un nouveau lien depuis la page connexion.
          </p>
          <p style="margin:0 0 16px;font-size:12px;color:#9CA3AF;word-break:break-all;">
            Lien direct : ${activationUrl}
          </p>
          <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;">
          <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
            Une question ? Répondez à ce mail ou écrivez à <a href="mailto:contact@${sector.brand.domain}" style="color:#1E40AF;">contact@${sector.brand.domain}</a>.
          </p>
          <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">
            Stéphane Jambu — Cipia · Edité par Haruna SARL (RCS Créteil 752 912 022).
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `Bonjour ${firstName},

Votre paiement Cipia Founder est confirmé. Bienvenue chez les fondateurs.

Pour finaliser votre compte, ouvrez ce lien et choisissez votre mot de passe :
${activationUrl}

Ce lien est valable 72 heures. Si vous l'avez déjà utilisé, demandez un nouveau lien depuis ${SITE_URL}/connexion.

Une question ? contact@${sector.brand.domain}

Stéphane Jambu — Cipia (Haruna SARL).
`;
  await sendEmail({ to: email, subject, html, text });
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
