// ============================================
// EMAIL API SERVER
// Dev: Mailpit SMTP | Prod: Resend API
// ============================================

import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); // PDF base64 can be large

const PORT = process.env.PORT || 3001;
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'mailpit';

// ===== MAILPIT (Dev) =====
const mailpitTransport = nodemailer.createTransport({
  host: process.env.MAILPIT_HOST || 'localhost',
  port: parseInt(process.env.MAILPIT_PORT || '1025'),
  secure: false,
  tls: { rejectUnauthorized: false },
});

// ===== RESEND (Prod) =====
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: EMAIL_PROVIDER });
});

// ===== SEND INVOICE EMAIL =====
app.post('/api/send-invoice', async (req, res) => {
  const { to, subject, html, pdfBase64, fileName, from } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, subject, html' });
  }

  const senderName = 'PT Global Teknik Multi Guna';
  const senderEmail = from || 'invoice@gtmgroup.co.id';

  try {
    if (EMAIL_PROVIDER === 'resend' && resend) {
      // --- RESEND API ---
      const payload = {
        from: process.env.RESEND_FROM || `${senderName} <${senderEmail}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      };

      if (pdfBase64 && fileName) {
        payload.attachments = [{
          filename: fileName,
          content: pdfBase64, // Resend accepts base64 directly
        }];
      }

      const { error } = await resend.emails.send(payload);
      if (error) throw new Error(error.message);

    } else {
      // --- MAILPIT (SMTP) ---
      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
      };

      if (pdfBase64 && fileName) {
        mailOptions.attachments = [{
          filename: fileName,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf',
        }];
      }

      await mailpitTransport.sendMail(mailOptions);
    }

    console.log(`✅ Email sent to ${to} via ${EMAIL_PROVIDER}`);
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n📧 Email server running on http://localhost:${PORT}`);
  console.log(`   Provider: ${EMAIL_PROVIDER}`);
  if (EMAIL_PROVIDER === 'mailpit') {
    console.log(`   Mailpit SMTP: ${process.env.MAILPIT_HOST || 'localhost'}:${process.env.MAILPIT_PORT || '1025'}`);
    console.log(`   Mailpit UI:   http://localhost:8025\n`);
  }
});
