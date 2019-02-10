import { Request, Response, response } from 'express';
import express from 'express';

import { getCode, handleAuthCallback } from '../controllers/oauth2Controller';
import { start } from '../controllers/homeController';
import { checkForContent } from '../controllers/checkForContentController';

export class Routes {

  public routes(app: express.Application): void {
    this.createRoutes(app);
  }

  createRoutes(app: express.Application) {

    // express.Router().get('/', getCode);
    app.route('/')
      .get((request: Request, response: Response) => {
        getCode(request, response);
      });

    // express.Router().get('/authCallback.*', handleAuthCallback);
    app.route('/authCallback.*')
      .get((request: Request, response: Response) => {
        handleAuthCallback(request, response);
      });

    express.Router().get('/home', start);

    // the following does not work - figure out why
    // express.Router().get('/checkForNewContent', checkForContent);

    app.route('/checkForNewContent')
      .get((request: Request, response: Response) => {
        checkForContent(request, response);
      });
  }
}
