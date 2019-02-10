import * as fs from 'fs';
import * as path from 'path';
import * as fse from 'fs-extra';
import { Request, Response } from "express";

export function startSync(request: Request, response: Response, next?: any): any {
  console.log(__dirname);
  console.log(process.cwd());

  // const baseDir: string = process.cwd();
  // const pagePath = path.join(baseDir, '/views/syncer.html');
  
  // below works but is not using pug
  // const pagePath = path.join(__dirname, '../../views/syncer.html');
  // response.sendFile(pagePath);

  response.render('syncer');
}
