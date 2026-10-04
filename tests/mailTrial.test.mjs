import test from 'node:test';
import assert from 'node:assert/strict';
import { mailConfig, publicationPreview, createTrialSender, attachment } from '../src/services/mailTrial.js';
const data = { to: 'receiver@example.com', country: 'Vietnam', applicant: 'Ren Chenying', trademarkName: 'ZHA 7 GONG logo', classes: '43', applicationNumber: '4-2026-24533', ourRef: 'R00010-00001', yourRef: 'PS26-1199', recipientName: 'Tina', filingDate: '2026-05-27', publicationDate: '2026-09-15', address: 'China' };
test('template fills fields, dates and omits attachment claim without a file', () => {
  const draft = publicationPreview(data);
  assert.equal(draft.oppositionDeadline, '15/12/2026');
  assert.match(draft.html, /Dear Tina/);
  assert.match(draft.html, /27\/05\/2026/);
  assert.match(draft.subject, /4-2026-24533/);
  assert.doesNotMatch(draft.text, /find attached/);
});
test('calendar months clamp to the last day and cross years', () => {
  assert.equal(publicationPreview({ ...data, publicationDate: '2026-11-30' }).oppositionDeadline, '28/02/2027');
  assert.equal(publicationPreview({ ...data, publicationDate: '2027-11-30' }).oppositionDeadline, '29/02/2028');
});
test('rejects invalid dates, multiple recipients and header injection; escapes HTML', () => {
  for (const patch of [{ publicationDate: '2026-02-30' }, { to: 'a@example.com,b@example.com' }, { applicationNumber: 'A\r\nBcc: b@example.com' }, { publicationDate: '2026-01-01' }]) assert.throws(() => publicationPreview({ ...data, ...patch }));
  assert.match(publicationPreview({ ...data, recipientName: '<script>alert(1)</script>' }).html, /&lt;script&gt;/);
});
test('configuration does not depend on default recipient', () => {
  assert.equal(mailConfig({}).configured, false);
  assert.equal(mailConfig({ SMTP_HOST: 'smtp.gmail.com', SMTP_USER: 'test@example.com', SMTP_PASS: 'fake' }).configured, true);
});
test('attachments require supported content and size', () => {
  assert.throws(() => attachment({ name: 'a.png', type: 'image/png', base64: Buffer.from('not an image').toString('base64') }));
  assert.throws(() => attachment({ name: '../a.pdf', type: 'application/pdf', base64: 'JVBERi0=' }));
  assert.throws(() => attachment({ name: 'a.pdf', type: 'application/pdf', base64: 'JVBERi0=' }, true));
});
test('disabled configuration never connects', async () => {
  const send = createTrialSender({ getConfig: () => ({ enabled: false }), createTransport: () => assert.fail('must not connect') });
  await assert.rejects(send(data), error => error.status === 503);
});
test('uses selected recipient, fixed sender, attachments and rate limit', async () => {
  let captured;
  const send = createTrialSender({ getConfig: () => ({ enabled: true, configured: true, from: 'sender@example.com', to: 'default@example.com', options: {} }), createTransport: () => ({ sendMail: async message => { captured = message; return { accepted: [message.to], messageId: 'mock' }; } }) });
  const result = await send({ ...data, from: 'spoof@example.com', publicationFile: { name: 'publication.pdf', type: 'application/pdf', base64: Buffer.from('%PDF-1.4\nmock').toString('base64') } });
  assert.equal(result.to, data.to);
  assert.equal(captured.to, data.to);
  assert.equal(captured.from, 'sender@example.com');
  assert.equal(captured.attachments[0].filename, 'publication.pdf');
  assert.match(captured.html, /find attached/);
  await assert.rejects(send(data), error => error.status === 429);
});
test('SMTP errors never expose secrets', async () => {
  const send = createTrialSender({ getConfig: () => ({ enabled: true, configured: true, options: {} }), createTransport: () => ({ sendMail: async () => { throw new Error('secret-password'); } }) });
  await assert.rejects(send(data), error => error.status === 502 && !error.message.includes('secret-password'));
});

test('CC normalizes, deduplicates and excludes primary recipient', () => {
  assert.deepEqual(publicationPreview({ ...data, cc: [' team@example.com ', 'TEAM@example.com', data.to, 'second@example.com'] }).cc, ['team@example.com', 'second@example.com']);
  assert.deepEqual(publicationPreview(data).cc, []);
  for (const cc of ['a@example.com', null, ['bad'], ['a@example.com\r\nBcc: b@example.com'], Array(51).fill('a@example.com')]) assert.throws(() => publicationPreview({ ...data, cc }));
});
test('SMTP receives CC list and exposes partial rejection', async () => {
  let captured;
  const send = createTrialSender({ getConfig: () => ({ enabled: true, configured: true, from: 'sender@example.com', options: {} }), createTransport: () => ({ sendMail: async message => { captured = message; return { accepted: [message.to], rejected: ['cc@example.com'], messageId: 'mock' }; } }) });
  const result = await send({ ...data, cc: ['cc@example.com'] });
  assert.deepEqual(captured.cc, ['cc@example.com']);
  assert.deepEqual(result.rejected, ['cc@example.com']);
});
