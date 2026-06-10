import { Router } from 'express';
import packagesRouter from './packages.js';
import departuresRouter from './departures.js';
import leadsRouter from './leads.js';
import webhookTestRouter from './webhook-test.js';
import testSmtpRouter from './test-smtp.js';
import kursRouter from './kurs.js';
import chatbotRouter from './chatbot.js';
import whatsappRouter from './whatsapp.js';
import integrationsRouter from './integrations.js';
import systemRouter from './system.js';
import trainingNotifRouter from './training-notifications.js';
import audioRouter from './audio.js';
import guideRouter from '../guide.js';
import paymentsRouter from './payments.js';

const v1Router = Router();

v1Router.use('/packages', packagesRouter);
v1Router.use('/departures', departuresRouter);
v1Router.use('/leads', leadsRouter);
v1Router.use('/webhook-test', webhookTestRouter);
v1Router.use('/test-smtp', testSmtpRouter);
v1Router.use('/kurs', kursRouter);
v1Router.use('/chatbot', chatbotRouter);
v1Router.use('/whatsapp', whatsappRouter);
v1Router.use('/settings/integrations', integrationsRouter);
v1Router.use('/system', systemRouter);
v1Router.use('/training', trainingNotifRouter);
v1Router.use('/guide/audio', audioRouter);
v1Router.use('/guide', guideRouter);
v1Router.use('/payments', paymentsRouter);

export default v1Router;
