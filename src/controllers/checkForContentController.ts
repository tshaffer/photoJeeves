import { Request, Response } from "express";
import requestPromise from 'request-promise';

import MediaItem from '../models/mediaItem';

import * as oauth2Controller from './oauth2Controller';

export function checkForContent(request: Request, response: Response) {

  // updateDisplay(response, '', '', '', '', '');

  MediaItem.find({ 'downloaded': true }, 'fileName', (err, downloadedMediaItems) => {
    if (err) debugger;
    updateDisplay(response, downloadedMediaItems.length, '', '', '', '');
  });

  // only looking for items to download; i.e., not currently a sync type function (no deletions)
  //
  // retrieve all photoIds from
  //    cloud
  //    db
  // determine delta

  getGooglePhotoMediaItems().then((mediaItems: any[]) => {
    console.log(mediaItems);
    debugger;
  });
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

function updateDisplay(
  response: Response,
  dbMediaItemCount: string | number,
  cloudMediaItemsCount: string | number,
  dbAlbumCount: string | number,
  cloudAlbumsCount: string | number,
  outOfDateAlbumsCount: string | number,
) {
  response.render('checkForContent', {
    dbMediaItemCount,
    cloudMediaItemsCount,
    dbAlbumCount,
    cloudAlbumsCount,
    outOfDateAlbumsCount,
  });
}
