import { google } from 'googleapis';
import { Request, Response } from "express";
import * as syncer from './syncerController';

const clientId = '1006826584050-4cad42jrlnu0bmophpuq7rt2nupslmmp.apps.googleusercontent.com';
const clientSecret = 'N3XZuKHm04cMPz8yo6wcgmBw';
const authCallbackUri = 'http://localhost:3000/authCallback.html';

const scope = 'https://www.googleapis.com/auth/photoslibrary.readonly';

let accessToken = '';

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  authCallbackUri
);

export function getAccessToken(): string {
  return accessToken;
}

export function getCode(req: Request, response: Response) {
  console.log('invoke oauth2Client.generateAuthUrl');
  const oauth2Url = oauth2Client.generateAuthUrl({
    access_type: 'online',
    scope: scope
  });
  console.log('oauth2Url:');
  console.log(oauth2Url);  

  response.writeHead(301,
    {Location: oauth2Url}
  );
  response.end();
}

export function handleAuthCallback(request: Request, response: Response) {
  var url = request.url;
  console.log('request url: ');
  console.log(url);

  var codeIndex = url.indexOf('code=');
  var urlSubstring = url.substring(codeIndex);
  var indexOfNextParam = urlSubstring.indexOf('&');
  var code = urlSubstring.substring(5, indexOfNextParam);

  console.log('code:');
  console.log(code);
  oauth2Client.getToken(code).then( (tokens: any) => {
  
    oauth2Client.setCredentials(tokens);

    console.log('access token');
    const access_token = tokens.tokens.access_token;
    console.log(access_token);

    accessToken = access_token;

    // response.redirect('/syncerHome');
    syncer.startSync(request, response);
  });
}


