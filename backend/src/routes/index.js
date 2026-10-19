import { Router } from 'express';
import healthRoutes from './health.routes.js';
import matchesRoutes from './matches.routes.js';
import oddsRoutes from './odds.routes.js';
import statsRoutes from './stats.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/matches', matchesRoutes);
router.use('/', statsRoutes);
router.use('/', oddsRoutes);

export default router;
