import { Router } from 'express';
import { getOdds, getOddsPage, getOddsAll, getBooking, teamStats, matchInsight, createSlip } from '../controllers/oddsController.js';

const router = Router();

router.get('/odds', getOdds);
router.get('/odds/all', getOddsAll);
router.get('/odds/page/:pageNum', getOddsPage);
router.get('/odds/booking/:code', getBooking);
router.get('/odds/team-stats', teamStats);
router.get('/odds/match-insight', matchInsight);
router.post('/odds/share', createSlip);

export default router;
