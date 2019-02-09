import { Request, Response, response } from 'express';
import express from 'express';

import { getCode, handleAuthCallback } from '../controllers/oauth2Controller';
import { startSync } from '../controllers/syncerController';
export class Routes {
  
    public routes(app: express.Application): void {
      this.createRoutes(app);
    }

    createRoutes(app: express.Application) {
      console.log(getCode);
      // express.Router().get('/', getCode);
      app.route('/')
      .get((request: Request, response: Response) => {
        getCode(request, response);
        // res.status(200).send({
        //     message: 'Default GET request successfulll!!!!',
        // });
      });
      express.Router().get('/authCallback.*', handleAuthCallback);
      express.Router().get('/syncer', startSync);
    }
}
