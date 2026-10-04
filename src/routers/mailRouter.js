import express from 'express';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';
import { mailConfig, publicationPreview, createTrialSender } from '../services/mailTrial.js';

const router = express.Router();
const sendTrial = createTrialSender();
router.use('/mail', authenticateUser, authorizeRoles('admin'));
router.get('/mail/status', (req, res) => {
  const { configured, enabled, from, to } = mailConfig();
  res.json({ configured, enabled, from, to });
});
router.post('/mail/preview', (req, res) => {
  try { res.json(publicationPreview(req.body)); }
  catch (error) { res.status(400).json({ message: error.message }); }
});
router.post('/mail/test', async (req, res) => {
  try { res.json(await sendTrial(req.body)); }
  catch (error) { res.status(error.status || 400).json({ message: error.message }); }
});
export default router;
