import { Request, Response } from "express";

export function start(request: Request, response: Response) {
  response.render('home'); 
}
