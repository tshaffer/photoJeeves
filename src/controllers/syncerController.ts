import * as fs from 'fs';
import * as path from 'path';
import * as fse from 'fs-extra';
import { Request, Response } from "express";

export function startSync(request: Request, response: Response, next?: any): any {
  console.log(__dirname);
  console.log(process.cwd());
  // response.sendFile('../views/syncer.html');

  const baseDir: string = process.cwd();
  const pagePath = path.join(baseDir, 'src/views/syncer.html');
  response.sendFile(pagePath);
}
