import { Router } from 'express';
import packagesRouter from './packages.js';
import departuresRouter from './departures.js';
import leadsRouter from './leads.js';
import webhookTestRouter from './webhook-test.js';
import testSmtpRouter from './test-smtp.js';
import kursRouter from './kurs.js';
import chatbotRouter from './chatbot.js';

const v1Router = Router();

v1Router.use('/packages', packagesRouter);
v1Router.use('/departures', departuresRouter);
v1Router.use('/leads', leadsRouter);
v1Router.use('/webhook-test', webhookTestRouter);
v1Router.use('/test-smtp', testSmtpRouter);
v1Router.use('/kurs', kursRouter);
v1Router.use('/chatbot', chatbotRouter);

export default v1Router;
