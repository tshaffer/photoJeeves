import { Request, Response } from "express";
import requestPromise from 'request-promise';

import {
  isNil,
} from 'lodash';

import MediaItem from '../models/mediaItem';
import Album from '../models/album';

import * as oauth2Controller from './oauth2Controller';

import { postSseResponse } from './events';

import {
  GoogleAlbumsContentsByAlbumIdMap,
  GoogleAlbumData,
  DbAlbum,
  PhotoMetadata,
  PhotoStatus,
  DbMediaItem,
  GoogleAlbum,
  GoogleMediaItem,
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
    const googleAlbumsPromise: Promise<GoogleAlbumData> = getGoogleAlbums();
    const googleMediaItemsPromise: Promise<GoogleMediaItem[]> = getGoogleMediaItems();
    
    Promise.all([downloadedMediaItemsPromise, downloadedAlbumsPromise, googleAlbumsPromise, googleMediaItemsPromise])
      .then((results) => {
        console.log(results);

        const downloadedMediaItems: DbMediaItem[] = results[0];
        const downloadedAlbums: DbAlbum[] = results[1];
        const googleAlbumData: GoogleAlbumData = results[2];
        const googleMediaItems: GoogleMediaItem[] = results[3];

        analyseResults(downloadedMediaItems, downloadedAlbums, googleAlbumData, googleMediaItems);

        postSseResponse({
          downloadedMediaItemCount: downloadedMediaItems.length,
          cloudMediaItemsCount: '',
          downloadedAlbumCount: downloadedAlbums.length,
          googleAlbumCount: googleAlbumData.googleAlbums.length,
          outOfDateAlbumsCount: '',
        });
      })
  }
}

function getDownloadedMediaItems(): Promise<DbMediaItem[]> {
  console.log('begin: retrieve downloadedMediaItems from mongoose');
  const query = MediaItem.find({ 'downloaded': true });
    return query.exec().then( (results) => {
      const dbMediaItems: DbMediaItem[] = results.map( (result: any) => {
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
  return query.exec().then( (results: any) => {
    const dbAlbums: DbAlbum[] = results.map( (result: any) => {
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
          googleMediaItems = result.mediaItems.map( (downloadedMediaItem: any) => {

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

function getGoogleAlbums(): Promise<GoogleAlbumData> {

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

        const googleAlbums: GoogleAlbum[] = result.albums.map( (downloadedGoogleAlbum: any) => {
          return {
            googleAlbumId: downloadedGoogleAlbum.id,
            title: downloadedGoogleAlbum.title,
            productUrl: downloadedGoogleAlbum.productUrl,
            mediaItemsCount: downloadedGoogleAlbum.mediaItemsCount,
            mediaItems: [],
          } as GoogleAlbum;
        });
        allGoogleAlbums = allGoogleAlbums.concat(googleAlbums);

        if (result.albums.length === 0 || result.nextPageToken === undefined) {
          console.log('retrieved all albums');
          console.log('Albums:');
          console.log(allGoogleAlbums);

          fetchContentsForAlbums(access_token, allGoogleAlbums).then((albumContentsByAlbumId: GoogleAlbumsContentsByAlbumIdMap) => {
            console.log('All album related information retrieved');
            console.log('Album contents by albumId');
            console.log(albumContentsByAlbumId);

            const albumData: GoogleAlbumData = {
              googleAlbums: allGoogleAlbums, 
              albumContentsByAlbumId,
            };
            resolve(albumData);
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
function fetchContentsForAlbums(access_token: string, albums: GoogleAlbum[]): Promise<GoogleAlbumsContentsByAlbumIdMap> {

  console.log('number of albums');
  console.log(albums.length);

  return new Promise((resolve, reject) => {

    const albumsById: GoogleAlbumsContentsByAlbumIdMap = {};

    var processFetchAlbumContents = (albumIdIndex: number, pageToken: string) => {

      console.log('processFetchAlbumContent for albumIdIndex: ', albumIdIndex);

      const albumId: string = albums[albumIdIndex].googleAlbumId;

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

          let mediaItemIdsInAlbum: string[] = result.mediaItems.map((mediaItem: any) => {
            return mediaItem.id;
          });
          // concat data from prior call on same album
          if ((albumsById as any)[albumId]) {
            mediaItemIdsInAlbum = (albumsById as any)[albumId].concat(mediaItemIdsInAlbum);
          }
          (albumsById as any)[albumId] = mediaItemIdsInAlbum;
        }

        if (result.nextPageToken === undefined) {
          albumIdIndex = albumIdIndex + 1;
          if (albumIdIndex >= albums.length) {
            console.log(albumsById);
            return resolve(albumsById);
          }
        }
        processFetchAlbumContents(albumIdIndex, result.nextPageToken);
      }).catch((err) => {
        debugger;
      });
    }

    processFetchAlbumContents(0, '');
  });
}

function getAlbumStatus(googleAlbumData: GoogleAlbumData, downloadedAlbums: any[]): PhotoStatus {

  const googleAlbumsById: any = {};

  const googleAlbums = googleAlbumData.googleAlbums;
  googleAlbums.forEach((googleAlbum: any) => {
    googleAlbumsById[googleAlbum.id] = googleAlbum;
  });

  const downloadedAlbumsById: any = {};
  downloadedAlbums.forEach((downloadedAlbum: any) => {
    downloadedAlbumsById[downloadedAlbum.id] = downloadedAlbum;
  });

  const googleAlbumsNotDownloaded: any[] = [];
  for (const albumId in googleAlbumsById) {
    if (googleAlbumsById.hasOwnProperty(albumId)) {
      const googleAlbum = googleAlbumsById[albumId];
      if (!downloadedAlbumsById.hasOwnProperty(albumId)) {
        googleAlbumsNotDownloaded.push(googleAlbum);
      }
    }
  }

  const downloadedAlbumsNotInCloud: any[] = [];
  for (const albumId in downloadedAlbumsById) {
    if (downloadedAlbumsById.hasOwnProperty(albumId)) {
      const downloadedAlbum = downloadedAlbumsById[albumId];
      if (!downloadedAlbumsById.hasOwnProperty(albumId)) {
        downloadedAlbumsNotInCloud.push(downloadedAlbum);
      }
    }
  }

  console.log('googleAlbumsNotDownloaded');
  console.log(googleAlbumsNotDownloaded);

  console.log('downloadedAlbumsNotInCloud');
  console.log(downloadedAlbumsNotInCloud);

  const albumStatus: PhotoStatus = {
    googleAlbumsNotDownloaded,
    downloadedAlbumsNotInCloud,
  }

  return albumStatus;
}

function analyseResults(
  downloadedMediaItems: any, 
  downloadedAlbums: any, 
  googleAlbumData: any,       
  googleMediaItems: any) {

    const photoStatus: PhotoStatus = getAlbumStatus(googleAlbumData, downloadedAlbums);
    debugger;

}