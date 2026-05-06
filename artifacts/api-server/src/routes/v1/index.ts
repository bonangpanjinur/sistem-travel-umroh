import { Router } from 'express';
import packagesRouter from './packages.js';
import departuresRouter from './departures.js';
import leadsRouter from './leads.js';

const v1Router = Router();

v1Router.use('/packages', packagesRouter);
v1Router.use('/departures', departuresRouter);
v1Router.use('/leads', leadsRouter);

export default v1Router;
