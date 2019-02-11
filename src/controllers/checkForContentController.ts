import { Request, Response } from "express";
import requestPromise from 'request-promise';

import MediaItem from '../models/mediaItem';

import * as oauth2Controller from './oauth2Controller';

import WebSocket from 'ws';

export function checkForContent(request: Request, response: Response) {

  // response.render('checkForContent', {
  //   downloadedMediaItemCount: '',
  //   cloudMediaItemsCount: '',
  //   downloadedAlbumCount: '',
  //   cloudAlbumsCount: '',
  //   outOfDateAlbumsCount: '',
  // });

  // only looking for items to download; i.e., not currently a sync type function (no deletions)
  //
  // retrieve all photoIds from
  //    cloud
  //    db
  // determine delta

  const downloadedMediaItemsPromise = getDownloadedMediaItems();
  const googleMediaItemsPromise = getGoogleMediaItems();
  Promise.all([downloadedMediaItemsPromise, googleMediaItemsPromise])
    .then((values: any) => {
      console.log(values);
    }).catch((err) => {
      console.log(err);
      debugger;
    });
}

function getDownloadedMediaItems(): Promise<any> {
  console.log('begin: retrieved downloadedMediaItems from mongoose');
  return new Promise((resolve, reject) => {
    const query = MediaItem.find({ 'downloaded': true });
    let promise = query.exec();
    promise.then((doc: any[]) => {
      console.log('mediaItems retrieved from mongo');
      resolve(doc);
    }).catch((err) => {
      reject(err);
    });
  });
}

function getGoogleMediaItems(): Promise<any> {
  
  console.log('begin: retrieved cloudMediaItems from google');

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
