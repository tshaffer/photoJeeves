import { Request, Response } from "express";
import requestPromise from 'request-promise';

import MediaItem from '../models/mediaItem';
import Album from '../models/album';

import * as oauth2Controller from './oauth2Controller';

import { postSseResponse } from './events';

import WebSocket from 'ws';
import { exec } from "child_process";

let checkingForContent = false;

export function checkForContent(request: Request, response: Response) {

  if (!checkingForContent) {

    checkingForContent = true;

    console.log('post response.render');

    response.render('checkForContent', {
      downloadedMediaItemCount: '',
      cloudMediaItemsCount: '',
      downloadedAlbumCount: '',
      cloudAlbumsCount: '',
      outOfDateAlbumsCount: '',
    });

    const downloadedMediaItemsPromise = getDownloadedMediaItems();
    const downloadedAlbumsPromise = getDownloadedAlbums();
    Promise.all([downloadedMediaItemsPromise, downloadedAlbumsPromise])
      .then((results) => {
        console.log(results);

        const downloadedMediaItems = results[0];
        const downloadedAlbums = results[1];
        postSseResponse({
          downloadedMediaItemCount: downloadedMediaItems.length,
          cloudMediaItemsCount: '',
          downloadedAlbumCount: downloadedAlbums.length,
          cloudAlbumsCount: '',
          outOfDateAlbumsCount: '',
        });
      })
    // downloadedMediaItemsPromise.then((downloadedMediaItems: any) => {
    //   postSseResponse({
    //     downloadedMediaItemCount: downloadedMediaItems.length,
    //     cloudMediaItemsCount: '',
    //     downloadedAlbumCount: '',
    //     cloudAlbumsCount: '',
    //     outOfDateAlbumsCount: '',
    //   });
    // })
  }



  // const googleMediaItemsPromise = getGoogleMediaItems();
  // Promise.all([downloadedMediaItemsPromise, googleMediaItemsPromise])
  //   .then((values: any) => {
  //     console.log(values);
  //   }).catch((err) => {
  //     console.log(err);
  //     debugger;
  //   });
}

function getDownloadedMediaItems(): Promise<any> {
  console.log('begin: retrieve downloadedMediaItems from mongoose');
  const query = MediaItem.find({ 'downloaded': true });
  return query.exec();
}

function getDownloadedAlbums(): Promise<any> {
  console.log('begin: retrieve downloadedAlbums from mongoose');
  const query = Album.find( {} );
  return query.exec();
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
