import requestPromise from 'request-promise';

import * as oauth2Controller from '../controllers/oauth2Controller';

import {
  DbAlbum,
  PhotoMetadata,
  PhotoStatus as PendingSyncStatus,
  DbMediaItem,
  GoogleAlbum,
  GoogleMediaItem,
  AlbumWithDifferences,
} from '../types';
import { isNil } from 'lodash';

export function getGoogleAlbums(): Promise<GoogleAlbum[]> {

  let allGoogleAlbums: GoogleAlbum[] = [];
  const accessToken = oauth2Controller.getAccessToken();
  const apiEndpoint = 'https://photoslibrary.googleapis.com';

  return new Promise((resolve, reject) => {

    const processGetAlbums = (pageToken: string) => {
      let url = apiEndpoint + '/v1/albums?pageSize=50';
      if (pageToken !== '') {
        url = url + '&pageToken=' + pageToken;
      }
      requestPromise.get(url, {
        headers: { 'Content-Type': 'application/json' },
        json: true,
        auth: { bearer: accessToken },
      }).then((result) => {
        const googleAlbums: GoogleAlbum[] = result.albums.map((downloadedGoogleAlbum: any) => {
          return {
            googleAlbumId: downloadedGoogleAlbum.id,
            title: downloadedGoogleAlbum.title,
            productUrl: downloadedGoogleAlbum.productUrl,
            mediaItemsCount: downloadedGoogleAlbum.mediaItemsCount,
            mediaItemIds: [],
          } as GoogleAlbum;
        });
        allGoogleAlbums = allGoogleAlbums.concat(googleAlbums);

        if (result.albums.length === 0 || result.nextPageToken === undefined) {
          resolve(allGoogleAlbums);
        }
        else {
          processGetAlbums(result.nextPageToken);
        }
      });
    };
    processGetAlbums('');
  });
}

export function getAlbumContents(accessToken: string, albumId: string): Promise<string[]> {

  let mediaItemsIds: string[] = [];

  const processFetchAlbumContents = (pageToken: string): any => {

    let apiEndpoint = 'https://photoslibrary.googleapis.com/v1/mediaItems:search?pageSize=100';
    if (pageToken !== '' && (typeof pageToken !== 'undefined')) {
      apiEndpoint = apiEndpoint + '&pageToken=' + pageToken;
    }

    console.log('get album mediaItemIds for albumId: ', albumId, ', pageToken: ', pageToken);

    return requestPromise.post(apiEndpoint, {
      headers: { 'Content-Type': 'application/json' },
      json: true,
      auth: { bearer: accessToken },
      body: { albumId },
    }).then((result) => {

      if (result.mediaItems && result.mediaItems.length > 0) {
        const mediaItemIdsInAlbum: string[] = result.mediaItems.map((mediaItem: any) => {
          return mediaItem.id;
        });
        mediaItemsIds = mediaItemsIds.concat(mediaItemIdsInAlbum);
      }

      if (result.nextPageToken === undefined) {
        return Promise.resolve(mediaItemsIds);
      }
      return processFetchAlbumContents(result.nextPageToken);
    }).catch( (error: Error) => {
      debugger;
      return Promise.reject();
    });
  };

  return processFetchAlbumContents('');
}

export function fetchAlbumContents(accessToken: string, albumIds: string[]): Promise<any> {

  console.log('number of albums');
  console.log(albumIds.length);

  const mediaItemIdsByAlbumId: any = {};

  return new Promise((resolve, reject) => {

    const processFetchAlbumContents = (albumIdIndex: number, pageToken: string) => {

      console.log('processFetchAlbumContent for albumIdIndex: ', albumIdIndex);

      const albumId = albumIds[albumIdIndex];
      if (isNil(mediaItemIdsByAlbumId[albumId])) {
        mediaItemIdsByAlbumId[albumId] = [];
      }

      let apiEndpoint = 'https://photoslibrary.googleapis.com/v1/mediaItems:search?pageSize=100';
      if (pageToken !== '' && (typeof pageToken !== 'undefined')) {
        apiEndpoint = apiEndpoint + '&pageToken=' + pageToken;
      }

      requestPromise.post(apiEndpoint, {
        headers: { 'Content-Type': 'application/json' },
        json: true,
        auth: { bearer: accessToken },
        body: { albumId },
      }).then((result) => {

        if (result.mediaItems && result.mediaItems.length > 0) {
          const mediaItemIdsInAlbum: string[] = result.mediaItems.map((mediaItem: any) => {
            return mediaItem.id;
          });
          mediaItemIdsByAlbumId[albumId] = mediaItemIdsByAlbumId[albumId].concat(mediaItemIdsInAlbum);
        }

        if (result.nextPageToken === undefined) {
          albumIdIndex = albumIdIndex + 1;
          if (albumIdIndex >= albumIds.length) {
            return resolve(mediaItemIdsByAlbumId);
          }
        }
        processFetchAlbumContents(albumIdIndex, result.nextPageToken);
      }).catch((err) => {
        debugger;
      });
    };

    processFetchAlbumContents(0, '');
  });
}

export function getAllMediaItemIds(): any {

  const accessToken = oauth2Controller.getAccessToken();

  console.log('start sync process');
  console.log(accessToken);

  const apiEndpoint = 'https://photoslibrary.googleapis.com';

  console.log('invoke: ', apiEndpoint + '/v1/mediaItems');

  let totalNumberOfMediaItems = 0;
  const processGetMediaFiles = (pageToken: string) => {
    let url = apiEndpoint + '/v1/mediaItems?pageSize=100';
    if (pageToken !== '') {
      url = url + '&pageToken=' + pageToken;
    }
    requestPromise.get(url, {
      headers: { 'Content-Type': 'application/json' },
      json: true,
      auth: { bearer: accessToken },
    }).then((result) => {

      console.log(result.mediaItems.length);
      console.log(result.nextPageToken);

      if (result.mediaItems.length === 0 || result.nextPageToken === undefined) {
        console.log('retrieved all mediaItems');
        console.log('total number of media items:');
        console.log(totalNumberOfMediaItems);
        debugger;
      }
      else {
        totalNumberOfMediaItems = totalNumberOfMediaItems + result.mediaItems.length;
        console.log('running total is: ', totalNumberOfMediaItems);

        processGetMediaFiles(result.nextPageToken);
      }
    });
  };

  processGetMediaFiles('');
}


