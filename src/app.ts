import * as bodyParser from 'body-parser';
import express from 'express';
import mongoose from 'mongoose';
import * as path from 'path';

import { Routes } from './routes/routes';

const mongoDB = 'mongodb://ted:photoTed0524@ds014648.mlab.com:14648/photos';

class App {

  public app: express.Application;
  public route: Routes = new Routes();

  constructor() {

    this.app = express();
    this.config();
    this.route.routes(this.app);

    mongoose.connect(mongoDB);
    mongoose.Promise = global.Promise;
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'MongoDB connection error:'));

    console.log('end of constructor');
  }

  private config(): void {

    this.app.set("port", process.env.PORT || 3000);

    // support application/json type post data
    this.app.use(bodyParser.json());

    // support application/x-www-form-urlencoded post data
    this.app.use(bodyParser.urlencoded({ extended: false }));

    // view setup
    this.app.set("views", path.join(__dirname, "../views"));
    this.app.set("view engine", "pug");
  }
}

export default new App().app;
