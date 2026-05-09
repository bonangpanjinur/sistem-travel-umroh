import { Router } from 'express';
import packagesRouter from './packages.js';
import departuresRouter from './departures.js';
import leadsRouter from './leads.js';
import webhookTestRouter from './webhook-test.js';
import testSmtpRouter from './test-smtp.js';

const v1Router = Router();

v1Router.use('/packages', packagesRouter);
v1Router.use('/departures', departuresRouter);
v1Router.use('/leads', leadsRouter);
v1Router.use('/webhook-test', webhookTestRouter);
v1Router.use('/test-smtp', testSmtpRouter);

export default v1Router;
