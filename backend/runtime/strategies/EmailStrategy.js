const NodeStrategy = require('./NodeStrategy');
const nodemailer = require('nodemailer');
const Credential = require('../../models/Credential');
const { decrypt } = require('../../utils/encryption');

/**
 * Phase 2 flagged this exact gap when it was built: email needs
 * multiple fields (host/port/user/pass), not the one secret string
 * every other provider stores. Rather than changing the Credential
 * schema now, the 'email' provider's `value` is a JSON string --
 * {host, port, user, pass} -- encrypted as one blob through the exact
 * same encrypt()/decrypt() Phase 2 already built. No schema change,
 * no new vault UI required for the backend to work correctly; only the
 * shape of what's inside `value` differs for this one provider.
 */
async function getSmtpConfig(userId) {
  const credentialDoc = await Credential.findOne({ userId, provider: 'email' });
  if (!credentialDoc) {
    throw new Error('No email credential found for this user. Add SMTP settings in the Credential Vault first.');
  }
  const decrypted = decrypt(credentialDoc.encryptedValue);
  try {
    return JSON.parse(decrypted);
  } catch {
    throw new Error('Stored email credential is not valid JSON. Expected {"host","port","user","pass"}.');
  }
}

class EmailStrategy extends NodeStrategy {
  async execute(input, context) {
    const { to, subject } = input;
    if (!to) throw new Error('Email node has no recipient configured');

    const smtp = await getSmtpConfig(context.userId);

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: Number(smtp.port) === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    // The upstream node (typically PDF) is where the actual content
    // comes from -- this strategy doesn't generate a report, it just
    // delivers whatever the previous node produced.
    const upstream = input.upstreamOutput;
    const attachments = [];
    let bodyText = 'Your FlowEngine workflow has completed.';

    if (upstream?.pdfBase64) {
      attachments.push({
        filename: `${upstream.template || 'report'}.pdf`,
        content: Buffer.from(upstream.pdfBase64, 'base64'),
      });
      bodyText = `Your ${upstream.template || 'report'} is attached.`;
    } else if (upstream?.output) {
      bodyText = upstream.output;
    }

    const info = await transporter.sendMail({
      from: smtp.user,
      to,
      subject: subject || 'FlowEngine workflow result',
      text: bodyText,
      attachments,
    });

    return { sent: true, messageId: info.messageId, to };
  }
}

module.exports = EmailStrategy;
