import { Request, Response } from "express";
import requestPromise from 'request-promise';

import MediaItem from '../models/mediaItem';

import * as oauth2Controller from './oauth2Controller';

import WebSocket from 'ws';

export function checkForContent(request: Request, response: Response) {

  // const wss = new WebSocket.Server({ port: 8080 })

  // console.log('setup wss');
  // wss.on('connection', ws => {
  //   ws.on('message', message => {
  //     console.log(`Received message => ${message}`)
  //   })
  //   console.log('connection on');
  //   const messageData = {
  //     type: 'OverallStatus',
  //     data: 'Preparing download...'
  //   };
  //   ws.send(JSON.stringify(messageData));
  // });
	request.socket.setTimeout(Number.MAX_VALUE);
  response.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache"
  });
  response.write('\n');

  response.render('checkForContent', {
    dbMediaItemCount: '',
    cloudMediaItemsCount: '',
    dbAlbumCount: '',
    cloudAlbumsCount: '',
    outOfDateAlbumsCount: '',
  });

  MediaItem.find({ 'downloaded': true }, 'fileName', (err, downloadedMediaItems) => {
    if (err) debugger;
  });

  // only looking for items to download; i.e., not currently a sync type function (no deletions)
  //
  // retrieve all photoIds from
  //    cloud
  //    db
  // determine delta

  // getGooglePhotoMediaItems().then((mediaItems: any[]) => {
  //   console.log(mediaItems);
  //   debugger;
  // });
}

function getGooglePhotoMediaItems(): Promise<any> {

  let mediaItems: any = [];
  let numMediaItemsRetrieved = 0;

  var access_token = oauth2Controller.getAccessToken();
  const apiEndpoint = 'https://photoslibrary.googleapis.com';

  return new Promise((resolve, reject) => {

    var processGetMediaFiles = (pageToken: string) => {

      var url = apiEndpoint + '/v1/mediaItems?pageSize=100'
      if (pageToken !== '') {
        url = url + '&pageToken=' + pageToken;
      }
      requestPromise.get(url, {
        headers: { 'Content-Type': 'application/json' },
        json: true,
        auth: { 'bearer': access_token },
      }).then((result) => {

        mediaItems = mediaItems.concat(result.mediaItems);

        if (result.mediaItems.length === 0 || result.nextPageToken === undefined) {
          console.log('retrieved all mediaItems');
          resolve(mediaItems);
        }
        else {
          numMediaItemsRetrieved += result.mediaItems.length;
          console.log('numMediaItemsRetrieved: ', numMediaItemsRetrieved);
          processGetMediaFiles(result.nextPageToken);
        }
      });
    };

    processGetMediaFiles('');

  });
}
