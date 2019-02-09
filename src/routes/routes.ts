import { Request, Response } from 'express';
import express from 'express';

export class Routes {
    public routes(app: express.Application): void {
        app.route('/')
        .get((req: Request, res: Response) => {
            res.status(200).send({
                message: 'GET request successfulll!!!!',
            });
        });
    }
}
