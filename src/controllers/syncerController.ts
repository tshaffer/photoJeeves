import * as fs from 'fs';
import * as path from 'path';
import * as fse from 'fs-extra';
import { Request, Response } from "express";

export function startSync(request: Request, response: Response, next?: any): any {
  response.render('syncer');
}
