// Vercel Serverless Function — Send email via Resend
// POST /api/send-email
// Body: { to: string, cc?: string, subject: string, html: string }

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = process.env.VITE_EMAIL_FROM || 'soporte@valereconsultores.com';

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const { to, cc, subject, html, attachments } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  // attachments: [{ filename: string, content: string (base64), content_type?: string }]
  const resendAttachments = Array.isArray(attachments)
    ? attachments
        .filter((a: any) => a && a.filename && a.content)
        .map((a: any) => ({
          filename: a.filename,
          content: a.content, // base64 string
          content_type: a.content_type || 'application/octet-stream',
        }))
    : undefined;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Valere Consultores <${EMAIL_FROM}>`,
        to: Array.isArray(to) ? to : [to],
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        subject,
        html,
        attachments: resendAttachments,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Resend API error',
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: data.id,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message,
    });
  }
}
