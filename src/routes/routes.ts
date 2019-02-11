import express from 'express';

import { getCode, handleAuthCallback } from '../controllers/oauth2Controller';
import { start } from '../controllers/homeController';
import { checkForContent } from '../controllers/checkForContentController';

export class Routes {

  public routes(app: express.Application): void {
    this.createRoutes(app);
  }

  createRoutes(app: express.Application) {
    app.get('/', getCode);
    app.get('/authCallback.*', handleAuthCallback);
    app.get('/home', start);
    app.get('/checkForNewContent', checkForContent);
  }
}
