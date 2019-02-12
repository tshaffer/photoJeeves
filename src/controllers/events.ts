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

  setTimeout(() => {
    sendFirstResponse();
    // console.log(sseResponse);
    // sseResponse.write('data: {"flight": "I768", "state": "landing"}');
    // sseResponse.write("\n\n");
  }, 10000);

  setTimeout(() => {
    sendSecondResponse();
    // console.log(sseResponse);
    // sseResponse.write('data: {"pizza": "I768", "state": "pepperoni"}');
    // sseResponse.write("\n\n");
  }, 20000);

  console.log(sseResponse);
}

// export function getSseResponse(): Response {
//   return sseResponse;
// }

function sendFirstResponse() {
  console.log(sseResponse);
  sseResponse.write('data: {"flight": "I768", "state": "landing"}');
  sseResponse.write("\n\n");
}

function sendSecondResponse() {
  console.log(sseResponse);
  sseResponse.write('data: {"pizza": "I768", "state": "pepperoni"}');
  sseResponse.write("\n\n");
}

export function postSseResponse(responseContents: any) {

  const responseData = 'data: ' + JSON.stringify(responseContents);
  console.log(responseData);

  // sseResponse.write('data: {"pizza": "I768", "state": "sausage"}');
  sseResponse.write(responseData);
  sseResponse.write("\n\n");
  // console.log(sseResponse);
  // console.log('postSseResponse');
  // if (sseResponse) {
  //   console.log('invoke sseResponse.write');
  //   console.log(JSON.stringify(responseContents));
  //   sseResponse.write(JSON.stringify(responseContents));
  //   sseResponse.write('\n\n');
  //   sseResponse.write('\n\n');
  // }
}
