import express from 'express';

import { getCode, handleAuthCallback } from '../controllers/oauth2Controller';
import {
  generateAlbumsList,
  start,
} from '../controllers/homeController';
import { 
  checkForContent,
} from '../controllers/checkForContentController';
import { eventHandler } from '../controllers/events';

export class Routes {

  public routes(app: express.Application): void {
    this.createRoutes(app);
  }

  createRoutes(app: express.Application) {
    app.get('/', getCode);
    app.get('/authCallback.*', handleAuthCallback);
    app.get('/checkForNewContent', checkForContent);
    app.get('/generateAlbumsList', generateAlbumsList);
    app.get('/events', eventHandler);
    app.get('/home', start);
  }
}
