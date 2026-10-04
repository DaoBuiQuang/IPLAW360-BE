import nodemailer from 'nodemailer';

const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
export function mailConfig(env = process.env) {
  const port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_USER?.trim();
  const to = env.MAIL_TEST_TO?.trim();
  return { configured: Boolean(env.SMTP_HOST && env.SMTP_PASS && validEmail(user) && [465, 587].includes(port)),
    enabled: env.MAIL_ENABLED === 'true', from: user || '', to: to || '',
    options: { host: env.SMTP_HOST, port, secure: port === 465, requireTLS: true,
      auth: { user, pass: env.SMTP_PASS }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 } };
}
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const formatDate = date => date.toISOString().slice(0, 10).split('-').reverse().join('/');
function parseDate(value) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Ngày không hợp lệ.');
  return parsed;
}
export function attachment(file, imageOnly = false) {
  if (!file) return null;
  if (typeof file.name !== 'string' || !file.name.trim() || file.name.length > 180 || /[\x00-\x1f\\/]/.test(file.name) || typeof file.base64 !== 'string' || file.base64.length > 7 * 1024 * 1024 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.base64)) throw new Error('Tệp đính kèm không hợp lệ.');
  const content = Buffer.from(file.base64, 'base64');
  const signatures = { 'image/png': '89504e470d0a1a0a', 'image/jpeg': 'ffd8ff', 'application/pdf': '255044462d' };
  const signature = signatures[file.type];
  if (!signature || (imageOnly && file.type === 'application/pdf') || !content.length || content.length > 5 * 1024 * 1024 || !content.toString('hex', 0, signature.length / 2).startsWith(signature)) throw new Error('Chỉ nhận PNG/JPEG hoặc PDF (trang công bố), tối đa 5 MB/tệp.');
  return { filename: file.name, content, contentType: file.type };
}
export function publicationPreview(data = {}) {
  const field = (key, optional = false) => {
    const value = data[key];
    if (optional && (value === undefined || value === '')) return '';
    if (typeof value !== 'string' || !value.trim() || value.length > 1000 || /[\r\n\x00-\x1f]/.test(value)) throw new Error(`Thông tin ${key} không hợp lệ.`);
    return value.trim();
  };
  const to = field('to');
  if (!validEmail(to)) throw new Error('Nhập một địa chỉ email người nhận hợp lệ.');
  if (data.cc !== undefined && (!Array.isArray(data.cc) || data.cc.length > 50)) throw new Error('CC phải là danh sách tối đa 50 email.');
  const cc = [];
  const seen = new Set([to.toLowerCase()]);
  for (const value of data.cc || []) {
    if (typeof value !== 'string' || !validEmail(value.trim())) throw new Error('Có địa chỉ email CC không hợp lệ.');
    const email = value.trim();
    if (!seen.has(email.toLowerCase())) { cc.push(email); seen.add(email.toLowerCase()); }
  }
  const names = ['country', 'applicant', 'trademarkName', 'classes', 'applicationNumber', 'ourRef', 'recipientName', 'address'];
  const values = Object.fromEntries(names.map(key => [key, field(key)]));
  const yourRef = field('yourRef', true);
  const filing = parseDate(field('filingDate'));
  const publication = parseDate(field('publicationDate'));
  if (publication < filing) throw new Error('Ngày công bố không được trước ngày nộp đơn.');
  const deadline = new Date(publication);
  deadline.setUTCDate(1);
  deadline.setUTCMonth(deadline.getUTCMonth() + 3);
  const lastDay = new Date(Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth() + 1, 0)).getUTCDate();
  deadline.setUTCDate(Math.min(publication.getUTCDate(), lastDay));
  const oppositionDeadline = formatDate(deadline);
  const logo = attachment(data.trademarkImage, true);
  const page = attachment(data.publicationFile);
  const subject = `${values.country} – ${values.applicant} – Trademark Application for “${values.trademarkName}” in Class ${values.classes} – Application No. ${values.applicationNumber} - Publication`;
  const intro = 'This trademark application has been accepted as to form and published in the IP Gazette with the following details:';
  const examination = 'Substantive examination will be conducted in parallel and is statutorily set at five (05) months from the publication date. However, in practice, due to the current backlog at IP Vietnam, the examination period may be prolonged to approximately 9–12 months.';
  const opposition = `This application is now open to third-party opposition for three (03) months from the publication date (until ${oppositionDeadline}).`;
  const rows = [['Trademark', values.trademarkName], ['App No.', values.applicationNumber], ['Class', values.classes], ['Filing date', formatDate(filing)], ['Applicant', values.applicant], ['Address', values.address]];
  const closing = 'We will keep you informed of any further developments.';
  const text = [`Our ref: ${values.ourRef}`, `Your ref: ${yourRef || '—'}`, `Dear ${values.recipientName},`, intro, ...rows.map(([k, v]) => `${k}: ${v}`), ...(page ? ['(*) Please find attached the publication page for your records.'] : []), opposition, examination, closing, 'Regards,\nIPAC Formality Team'].join('\n\n');
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#222"><p><strong>Our ref: ${escapeHtml(values.ourRef)}<br>Your ref: ${escapeHtml(yourRef || '—')}</strong></p><p>Dear ${escapeHtml(values.recipientName)},</p><p>${intro}</p><table cellpadding="10" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px">${rows.map(([k, v]) => `<tr><th style="border:1px solid #ccc;text-align:left;width:140px">${k}</th><td style="border:1px solid #ccc">${escapeHtml(v)}${k === 'Trademark' && logo ? '<br><img src="cid:trademark-logo" alt="Trademark" style="max-width:240px;max-height:180px">' : ''}</td></tr>`).join('')}</table>${page ? '<p><em>(*) Please find attached the publication page for your records.</em></p>' : ''}<p>This application is now open to third-party opposition for <strong>three (03) months</strong> from the publication date (until <strong>${oppositionDeadline}</strong>). ${examination}</p><p>${closing}</p><p>Regards,<br>IPAC Formality Team</p></div>`;
  return { to, cc, subject, text, html, oppositionDeadline };
}
export function createTrialSender({ getConfig = mailConfig, createTransport = nodemailer.createTransport, now = Date.now } = {}) {
  let busy = false;
  let lastAttempt = -Infinity;
  return async data => {
    const draft = publicationPreview(data);
    const config = getConfig();
    if (!config.enabled || !config.configured) throw Object.assign(new Error('Chưa bật gửi mail hoặc thiếu cấu hình SMTP. Xem MAIL_SETUP.md.'), { status: 503 });
    if (busy || now() - lastAttempt < 60000) throw Object.assign(new Error('Vui lòng chờ ít nhất 60 giây giữa các lần gửi.'), { status: 429 });
    busy = true; lastAttempt = now();
    try {
      const logo = attachment(data.trademarkImage, true);
      const page = attachment(data.publicationFile);
      const result = await createTransport(config.options).sendMail({ from: config.from, to: draft.to,
        cc: draft.cc, subject: draft.subject, text: draft.text, html: draft.html,
        attachments: [...(logo ? [{ ...logo, cid: 'trademark-logo' }] : []), ...(page ? [page] : [])],
        disableFileAccess: true, disableUrlAccess: true });
      if (!result.accepted?.length) throw new Error('Recipient rejected');
      const rejected = result.rejected || [];
      return { message: rejected.length ? 'Máy chủ mail chỉ chấp nhận một phần người nhận. Kiểm tra địa chỉ bị từ chối trước khi gửi lại.' : `Máy chủ mail đã chấp nhận email gửi đến ${draft.to}${draft.cc.length ? ` và ${draft.cc.length} địa chỉ CC` : ''}. Kiểm tra hộp thư đến hoặc Spam.`, messageId: result.messageId, to: draft.to, cc: draft.cc, rejected };
    } catch {
      throw Object.assign(new Error('Không xác nhận được việc gửi. Kiểm tra hộp thư trước khi thử lại và kiểm tra cấu hình SMTP/kết nối mạng.'), { status: 502 });
    } finally { busy = false; }
  };
}
