import { Router } from 'express';
import { listLeagues, leagueOverview, teamOverview, teamSearch, listMatches, matchDetail } from '../controllers/statsController.js';

const router = Router();

router.get('/stats/leagues', listLeagues);
router.get('/stats/team-search', teamSearch);
router.get('/stats/matches', listMatches);
router.get('/stats/league/:id', leagueOverview);
router.get('/stats/team/:id', teamOverview);
router.get('/stats/match/:id', matchDetail);

export default router;
