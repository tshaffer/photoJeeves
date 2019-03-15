import { Request, Response } from 'express';
import requestPromise from 'request-promise';

import {
  isNil,
} from 'lodash';

import MediaItem from '../models/mediaItem';
import Album from '../models/album';

import * as oauth2Controller from './oauth2Controller';

import { postSseResponse } from './events';

import {
  DbAlbum,
  PhotoMetadata,
  PhotoStatus as PendingSyncStatus,
  DbMediaItem,
  GoogleAlbum,
  GoogleMediaItem,
  AlbumWithDifferences,
} from '../types';

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

    const downloadedMediaItemsPromise: Promise<DbMediaItem[]> = getDownloadedMediaItems();
    const downloadedAlbumsPromise: Promise<DbAlbum[]> = getDownloadedAlbums();
    const googleAlbumsPromise: Promise<GoogleAlbum[]> = getGoogleAlbums();
    // const googleMediaItemsPromise: Promise<GoogleMediaItem[]> = getGoogleMediaItems();

    Promise.all([downloadedMediaItemsPromise, downloadedAlbumsPromise, googleAlbumsPromise])
      .then((results) => {
        console.log(results);

        const downloadedMediaItems: DbMediaItem[] = results[0];
        const downloadedAlbums: DbAlbum[] = results[1];
        const googleAlbums: GoogleAlbum[] = results[2];
        // const googleMediaItems: GoogleMediaItem[] = results[3];

        getPendingSynchronizations(
          downloadedMediaItems,
          downloadedAlbums,
          googleAlbums,
          // googleMediaItems,
          null,
        );

        postSseResponse({
          downloadedMediaItemCount: downloadedMediaItems.length,
          cloudMediaItemsCount: '',
          downloadedAlbumCount: downloadedAlbums.length,
          googleAlbumCount: googleAlbums.length,
          outOfDateAlbumsCount: '',
        });
      })
  }
}

function getDownloadedMediaItems(): Promise<DbMediaItem[]> {
  console.log('begin: retrieve downloadedMediaItems from mongoose');
  const query = MediaItem.find({ downloaded: true });
  return query.exec().then((results) => {
    const dbMediaItems: DbMediaItem[] = results.map((result: any) => {
      return {
        googleMediaItemId: result.id,
        fileName: result.fileName,
        filePath: result.filePath,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height,
        creationTime: new Date(result.creationTime),
        downloaded: true,
        baseUrl: result.baseUrl,
        productUrl: result.productUrl,
      };
    });
    return Promise.resolve(dbMediaItems);
  });
}

function getMediaItemIds(dbMediaItemIds: any[]): string[] {
  return dbMediaItemIds.map((mediaItemId: any) => {
    return mediaItemId.toString();
  });
}

function getDownloadedAlbums(): Promise<DbAlbum[]> {
  console.log('begin: retrieve downloadedAlbums from mongoose');
  const query = Album.find({});
  return query.exec().then((results: any) => {
    const dbAlbums: DbAlbum[] = results.map((result: any) => {
      return {
        googleId: result.id,
        title: result.title,
        mediaItemIds: getMediaItemIds(result.mediaItemIds),
      };
    });
    return Promise.resolve(dbAlbums);
  });
}

function getGoogleMediaItems(): Promise<GoogleMediaItem[]> {

  console.log('begin: retrieve cloudMediaItems from google');

  let allGoogleMediaItems: GoogleMediaItem[] = [];
  let numMediaItemsRetrieved = 0;

  const access_token = oauth2Controller.getAccessToken();
  const apiEndpoint = 'https://photoslibrary.googleapis.com';

  return new Promise((resolve, reject) => {

    var processGetMediaFiles = (pageToken: string) => {

      let url = apiEndpoint + '/v1/mediaItems?pageSize=100';
      if (pageToken !== '') {
        url = url + '&pageToken=' + pageToken;
      }
      requestPromise.get(url, {
        headers: { 'Content-Type': 'application/json' },
        json: true,
        auth: { 'bearer': access_token },
      }).then((result) => {

        let googleMediaItems: GoogleMediaItem[] = [];
        try {
          googleMediaItems = result.mediaItems.map((downloadedMediaItem: any) => {

            const photo: PhotoMetadata | null = isNil(downloadedMediaItem.mediaMetadata.photo) ?
              null :
              {
                apertureFNumber: downloadedMediaItem.mediaMetadata.photo.apertureFNumber,
                cameraMake: downloadedMediaItem.mediaMetadata.photo.cameraMake,
                cameraModel: downloadedMediaItem.mediaMetadata.photo.cameraModel,
                focalLength: downloadedMediaItem.mediaMetadata.photo.focalLength,
                isoEquivalent: downloadedMediaItem.mediaMetadata.photo.isoEquivalent,
              };

            return {
              baseUrl: downloadedMediaItem.baseUrl,
              fileName: downloadedMediaItem.filename,
              googleMediaItemId: downloadedMediaItem.id,
              mediaMetadata: {
                creationTime: downloadedMediaItem.mediaMetadata.creationTime,
                height: downloadedMediaItem.mediaMetadata.height,
                width: downloadedMediaItem.mediaMetadata.width,
                photo,
              },
              mimeType: downloadedMediaItem.mimeType,
              productUrl: downloadedMediaItem.productUrl,
            } as GoogleMediaItem;
          });
        }
        catch (err) {
          console.log(googleMediaItems.length);
          debugger;
        }
        allGoogleMediaItems = allGoogleMediaItems.concat(googleMediaItems);

        if (result.mediaItems.length === 0 || result.nextPageToken === undefined) {
          console.log('retrieved all mediaItems');
          resolve(allGoogleMediaItems);
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

function getGoogleAlbums(): Promise<GoogleAlbum[]> {

  console.log('begin: retrieve cloudAlbums from google');

  let allGoogleAlbums: GoogleAlbum[] = [];
  let numAlbumsRetrieved = 0;

  const access_token = oauth2Controller.getAccessToken();
  const apiEndpoint = 'https://photoslibrary.googleapis.com';

  return new Promise((resolve, reject) => {

    var processGetAlbums = (pageToken: string) => {

      let url = apiEndpoint + '/v1/albums?pageSize=50';
      if (pageToken !== '') {
        url = url + '&pageToken=' + pageToken;
      }
      requestPromise.get(url, {
        headers: { 'Content-Type': 'application/json' },
        json: true,
        auth: { 'bearer': access_token },
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
          console.log('retrieved all albums');
          console.log('Albums:');
          console.log(allGoogleAlbums);

          fetchContentsForAlbums(access_token, allGoogleAlbums).then(() => {
            console.log('All album related information retrieved');
            console.log(allGoogleAlbums);

            resolve(allGoogleAlbums);
          });
        }
        else {
          numAlbumsRetrieved += result.albums.length;
          console.log('numAlbumsRetrieved: ', numAlbumsRetrieved);
          processGetAlbums(result.nextPageToken);
        }
      });
    };

    processGetAlbums('');
  });
}

// albums is an array of the album structures retrieved directly from google api 
function fetchContentsForAlbums(access_token: string, albums: GoogleAlbum[]): Promise<void> {

  console.log('number of albums');
  console.log(albums.length);

  return new Promise((resolve, reject) => {

    var processFetchAlbumContents = (albumIdIndex: number, pageToken: string) => {

      console.log('processFetchAlbumContent for albumIdIndex: ', albumIdIndex);

      const album: GoogleAlbum = albums[albumIdIndex];
      const albumId: string = album.googleAlbumId;

      let apiEndpoint = 'https://photoslibrary.googleapis.com/v1/mediaItems:search?pageSize=100';
      if (pageToken !== '' && (typeof pageToken !== 'undefined')) {
        apiEndpoint = apiEndpoint + '&pageToken=' + pageToken;
      }

      requestPromise.post(apiEndpoint, {
        headers: { 'Content-Type': 'application/json' },
        json: true,
        auth: { 'bearer': access_token },
        body: { albumId },
      }).then((result) => {

        if (result.mediaItems && result.mediaItems.length > 0) {
          const mediaItemIdsInAlbum: string[] = result.mediaItems.map((mediaItem: any) => {
            return mediaItem.id;
          });
          album.mediaItemIds = album.mediaItemIds.concat(mediaItemIdsInAlbum);
        }

        if (result.nextPageToken === undefined) {
          albumIdIndex = albumIdIndex + 1;
          if (albumIdIndex >= albums.length) {
            return resolve();
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

function cb(value: GoogleAlbum, key: string, photoMap: Map<string, GoogleAlbum>) {

}

function getAlbumDifferences(googleAlbums: GoogleAlbum[], downloadedAlbums: DbAlbum[]): PendingSyncStatus {

  const albumDifferencesByAlbumId: Map<string, AlbumWithDifferences> = new Map();

  const googleAlbumsById: Map<string, GoogleAlbum> = new Map();
  googleAlbums.forEach((googleAlbum: GoogleAlbum) => {
    googleAlbumsById.set(googleAlbum.googleAlbumId, googleAlbum);
  });

  const downloadedAlbumsById: Map<string, DbAlbum> = new Map();
  downloadedAlbums.forEach((downloadedAlbum: DbAlbum) => {
    downloadedAlbumsById.set(downloadedAlbum.googleId, downloadedAlbum);
  });

  const googleAlbumsNotDownloaded: GoogleAlbum[] = [];

  googleAlbumsById.forEach( (googleAlbum: GoogleAlbum, albumId: string, pm: Map<string, GoogleAlbum>) => {
    
    const matchingDownloadedAlbum: DbAlbum = downloadedAlbumsById.get(albumId);
    if (isNil(matchingDownloadedAlbum)) {

      googleAlbumsNotDownloaded.push(googleAlbum); // new google album, add to list
    
    }
    else {

      // downloaded album that matches current googleAlbum
      const downloadedAlbum: DbAlbum = downloadedAlbumsById.get(albumId);

      // create an object to track the differences, if any
      const albumDifferences: AlbumWithDifferences = {
        googleId: albumId,
        title: downloadedAlbum.title,
        addedMediaItemIds: [],
        deletedMediaItemIds: [],
      };
      albumDifferencesByAlbumId.set(albumId, albumDifferences);

      // look for mediaItems in google album, not in downloaded album - indicates additions on the web
      googleAlbum.mediaItemIds.forEach((mediaItemId: string) => {
        if (downloadedAlbum.mediaItemIds.indexOf(mediaItemId) < 0) {
          albumDifferences.addedMediaItemIds.push(mediaItemId);
        }
      });

      // look for mediaItems not in google album, but still in downloaded album - indicates deletions on the web
      downloadedAlbum.mediaItemIds.forEach((mediaItemId: string) => {
        if (googleAlbum.mediaItemIds.indexOf(mediaItemId) < 0) {
          albumDifferences.deletedMediaItemIds.push(mediaItemId);
        }
      });
    }

  });

  // for (const albumId in googleAlbumsById) {
  //   if (googleAlbumsById.hasOwnProperty(albumId)) {
  //     const googleAlbum = googleAlbumsById.get(albumId);
  //     if (!downloadedAlbumsById.hasOwnProperty(albumId)) {
  //       // new google album, add to list
  //       googleAlbumsNotDownloaded.push(googleAlbum);
  //     }
  //     else {
  //       // downloaded album that matches current googleAlbum
  //       const downloadedAlbum: DbAlbum = downloadedAlbumsById.get(albumId);

  //       // create an object to track the differences, if any
  //       const albumDifferences: AlbumWithDifferences = {
  //         googleId: albumId,
  //         title: downloadedAlbum.title,
  //         addedMediaItemIds: [],
  //         deletedMediaItemIds: [],
  //       };
  //       albumDifferencesByAlbumId.set(albumId, albumDifferences);

  //       // look for mediaItems in google album, not in downloaded album - indicates additions on the web
  //       googleAlbum.mediaItemIds.forEach((mediaItemId: string) => {
  //         if (downloadedAlbum.mediaItemIds.indexOf(mediaItemId) < 0) {
  //           albumDifferences.addedMediaItemIds.push(mediaItemId);
  //         }
  //       });

  //       // look for mediaItems not in google album, but still in downloaded album - indicates deletions on the web
  //       downloadedAlbum.mediaItemIds.forEach((mediaItemId: string) => {
  //         if (googleAlbum.mediaItemIds.indexOf(mediaItemId) < 0) {
  //           albumDifferences.deletedMediaItemIds.push(mediaItemId);
  //         }
  //       });
  //     }
  //   }
  // }

  const downloadedAlbumsNotInCloud: DbAlbum[] = [];
  for (const albumId in downloadedAlbumsById) {
    if (downloadedAlbumsById.hasOwnProperty(albumId)) {
      const downloadedAlbum = downloadedAlbumsById.get(albumId);
      if (!downloadedAlbumsById.hasOwnProperty(albumId)) {
        downloadedAlbumsNotInCloud.push(downloadedAlbum);
      }
    }
  }

  console.log('googleAlbumsNotDownloaded');
  console.log(googleAlbumsNotDownloaded);

  console.log('downloadedAlbumsNotInCloud');
  console.log(downloadedAlbumsNotInCloud);

  const albumStatus: PendingSyncStatus = {
    googleAlbumsNotDownloaded,
    albumDifferencesByAlbumId,
    downloadedAlbumsNotInCloud,
  };

  return albumStatus;
}

// generate a list of all items out of sync between google photos and the db
//  albums
//    albums that exist in cloud that don't exist in db
//    albums that exist in db that don't exist in cloud
//    albums that exist in both but whose content is different
//    mediaItems that are in current account that are not in db
//    ? what about mediaItems that are in db but not current account
//      this is expected for mediaItems that are in a shared album and belong to a different account
//      perhaps these should be tracked?

function getPendingSynchronizations(
  downloadedMediaItems: DbMediaItem[],
  downloadedAlbums: DbAlbum[],
  googleAlbums: GoogleAlbum[],
  googleMediaItems: GoogleMediaItem[]) {

  const albumDifferences: PendingSyncStatus = getAlbumDifferences(googleAlbums, downloadedAlbums);

  const { googleAlbumsNotDownloaded, albumDifferencesByAlbumId, downloadedAlbumsNotInCloud } = albumDifferences;

}
