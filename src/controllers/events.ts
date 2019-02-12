import { Request, Response } from "express";

let sseResponse: Response = null;

export function eventHandler(request: Request, response: Response) {

  response.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*"
  });

  sseResponse = response;
}

export function postSseResponse(responseContents: any) {

  const responseData = 'data: ' + JSON.stringify(responseContents);
  console.log(responseData);

  if (sseResponse) {
    sseResponse.write(responseData);
    sseResponse.write("\n\n");
  }
}
