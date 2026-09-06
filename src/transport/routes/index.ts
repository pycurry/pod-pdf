import { Router } from 'express';
import { GenerateController } from '../controllers/generate.controller';
import { TemplatesController } from '../controllers/templates.controller';
import { JobsController } from '../controllers/jobs.controller';
import { HealthController } from '../controllers/health.controller';
import { StorageController } from '../controllers/storage.controller';
import { validateBody } from '../middleware/validator.middleware';
import { generatePdfRequestSchema, previewPdfRequestSchema } from '../schemas/generate.schema';
import { saveTemplateSchema } from '../schemas/template.schema';

const router = Router();

// Health Check
router.get('/health', HealthController.check);

// PDF Generation
router.post('/generate', validateBody(generatePdfRequestSchema), GenerateController.generate);
router.post('/preview', validateBody(previewPdfRequestSchema), GenerateController.preview);

// Templates & Presets Management
router.get('/presets', TemplatesController.listPresets);
router.get('/templates', TemplatesController.list);
router.get('/templates/:name', TemplatesController.getByName);
router.post('/templates/:name', validateBody(saveTemplateSchema), TemplatesController.save);
router.delete('/templates/:name', TemplatesController.delete);

// Async Jobs Tracking
router.get('/jobs', JobsController.list);
router.get('/jobs/:jobId', JobsController.getById);

// Storage Download
router.get('/storage/download', StorageController.download);

export default router;

