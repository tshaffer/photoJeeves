import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';
import { Query, Document } from 'mongoose';
import axios from 'axios';
import { getAccessToken } from './oauth2Controller';
import { isNil } from 'lodash';
import { CompositeAlbumMap, CompositeAlbum, DbMediaItem, GoogleAlbum, DbAlbum } from '../types';
import { getCompositeAlbumsById } from './albumsController';
import {
  getDbAlbums, getAllMediaItemsInDb as getAllDbMediaItems, insertAlbums as addDbAlbumsToDb, getAlbumMediaItemIds, getAllMediaItemsInDb,
} from '../utilities/dbInterface';

import {
  getGoogleAlbums, fetchAlbumContents, getAllMediaItemIds, getAlbumContents, downloadMediaItemsMetadata,
} from '../utilities/googleInterface';
import { isObject, isString } from 'util';

function addGoogleAlbumsToDb(compositeAlbums: CompositeAlbum[]): Promise<Document[]> {
  const dbAlbumsToInsert: DbAlbum[] = [];
  compositeAlbums.forEach((compositeAlbum: CompositeAlbum) => {
    const dbAlbum: DbAlbum = {
      googleId: compositeAlbum.googleAlbum.googleAlbumId,
      title: compositeAlbum.googleAlbum.title,
      mediaItemIds: compositeAlbum.googleAlbum.mediaItemIds,
    };
    dbAlbumsToInsert.push(dbAlbum);
  });
  return addDbAlbumsToDb(dbAlbumsToInsert);
}

function fetchNewAlbumsContents(accessToken: string, compositeAlbumsToDownload: CompositeAlbum[]): Promise<void> {

  const processFetchAlbumContents = (index: number): Promise<void> => {

    console.log('fetchNewAlbumsContents for index: ', index);

    if (index >= compositeAlbumsToDownload.length) {
      return Promise.resolve();
    }

    const compositeAlbum: CompositeAlbum = compositeAlbumsToDownload[index];
    const albumId = compositeAlbum.id;
    return getAlbumContents(accessToken, albumId)
      .then((mediaItemIds: string[]) => {

        compositeAlbum.googleAlbum.mediaItemIds = mediaItemIds;

        return processFetchAlbumContents(index + 1);
      });
  };
  return processFetchAlbumContents(0);
}

export function downloadNewAlbums(request: Request, response: Response): Promise<any> {
  response.render('downloadNewAlbums');
  return getAlbumMediaItemIds().then((mediaItemIdsInAlbums: string[]) => {
    return getAllMediaItemsInDb()
      .then((allMediaItems: Document[]) => {
        console.log('return from getAllMediaItems: ', allMediaItems);
        const mediaItemsInDbById: Map<string, any> = new Map();
        allMediaItems.forEach((mediaItem: any) => {
          mediaItemsInDbById.set(mediaItem.id, mediaItem);
        });

        const albumMediaItemsInDbToDownload: Map<string, any> = new Map();
        const albumMediaItemIdsNotInDb: string[] = [];

        mediaItemIdsInAlbums.forEach((mediaItemIdInAlbum) => {
          const matchingMediaItem: any = mediaItemsInDbById.get(mediaItemIdInAlbum);
          if (isNil(matchingMediaItem)) {
            albumMediaItemIdsNotInDb.push(mediaItemIdInAlbum);
          }
          else {
            if (!matchingMediaItem.downloaded) {
              // mediaItem exists in db; add to map
              albumMediaItemsInDbToDownload.set(mediaItemIdInAlbum, matchingMediaItem);
            }
          }
        });
        console.log(albumMediaItemsInDbToDownload);
        console.log(albumMediaItemIdsNotInDb);

        return downloadMediaItemsMetadata(albumMediaItemIdsNotInDb);

      }).then((missingMediaItemResults: any[]) => {
        console.log(missingMediaItemResults);
        return downloadMediaItems(missingMediaItemResults);
      });
  });
}

// algorithm
// starting point
//    compositeAlbumsById
//      indicates which albums are on google but not in the db
//        full googleAlbum
// steps
//    generate a list of compositeAlbums to download
//    iterate through compositeAlbumsToDownload
//      get mediaItemIds in each compositeAlbumToDownload
//      add album to db
//    generate list of mediaItemIds in albums getting downloaded
//    determine which ones need to be downloaded
//    add to db and download
export function olddownloadNewAlbums(request: Request, response: Response) {

  console.log('downloadNewAlbums invoked');

  response.render('downloadNewAlbums');

  const accessToken = getAccessToken();
  if (isNil(accessToken)) {
    debugger;
  }

  // Step 1 - generate a list of compositeAlbums to download
  const compositeAlbumsToDownload: CompositeAlbum[] = [];
  // TODO - check that compositeAlbumsById is built.
  const compositeAlbumsById: CompositeAlbumMap = getCompositeAlbumsById();
  Object.keys(compositeAlbumsById).forEach((compositeAlbumId: string) => {
    const compositeAlbum: CompositeAlbum = compositeAlbumsById[compositeAlbumId];
    if (!compositeAlbum.inDb) {
      compositeAlbumsToDownload.push(compositeAlbum);
    }
  });

  // Step 2
  //   iterate through compositeAlbumsToDownload
  //     get mediaItemIds for each compositeAlbumToDownload
  //     add to compositeAlbumToDownload
  return fetchNewAlbumsContents(accessToken, compositeAlbumsToDownload)
    .then(() => {
      debugger;
      // Step 3
      //   add albums to db
      return addGoogleAlbumsToDb(compositeAlbumsToDownload)
    }).then(() => {
      debugger;
    });

  //     add album to db
  // const processFetchAlbumContents = (index: number): any => {
  //   const albumId = compositeAlbumsToDownload[index].id;
  //   return getAlbumContents(accessToken, albumId)
  //     .then( () => {
  //       debugger;
  //     });
  // };
  // processFetchAlbumContents(0);


  return;

  // getAllMediaItemIds();


  const albumIds: string[] = [];

  Object.keys(compositeAlbumsById).forEach((compositeAlbumId: string) => {
    const compositeAlbum: CompositeAlbum = compositeAlbumsById[compositeAlbumId];
    const { id, googleTitle } = compositeAlbum;
    if (!compositeAlbum.inDb) {
      console.log('download album:');
      console.log(googleTitle);

      albumIds.push(compositeAlbum.id);
    }
  });

  let allMediaItemIdsByAlbumId: any;

  const mediaItemIdsToDownload: string[] = [];

  console.log('fetchAlbumContents');

  // fetchAlbumContents
  //    proposal
  //      rename to fetchAlbumData
  //      returns a map indexed by albumId
  //      map entries are all the information that is necessary for
  //        the database
  //        the media items in the album (redundant)
  fetchAlbumContents(accessToken, albumIds)
    .then((mediaItemIdsByAlbumId) => {
      allMediaItemIdsByAlbumId = mediaItemIdsByAlbumId;
      return getAllDbMediaItems();
    }).then((dbMediaItems: Document[]) => {
      console.log('return from getAllDbMediaItems');
      const dbMediaItemsByMediaItemId: Map<string, DbMediaItem> = buildAllDbMediaItemsById(dbMediaItems);

      // iterate through all albums, mediaItems - compare against dbMediaItemsByMediaItemId
      Object.keys(allMediaItemIdsByAlbumId).forEach((albumId: string) => {
        const mediaItemIds: any[] = allMediaItemIdsByAlbumId[albumId];
        mediaItemIds.forEach((mediaItemId: string) => {
          const matchingMediaItem: any = dbMediaItemsByMediaItemId.get(mediaItemId);
          if (isNil(matchingMediaItem)) {
            mediaItemIdsToDownload.push(mediaItemId);
          }
        });
      });

      console.log('number of mediaItems to download:');
      console.log(mediaItemIdsToDownload.length);
      console.log(mediaItemIdsToDownload);
    });

  //  next steps
  //    generate a list of all the mediaItemIds required for these albums
  //    compare to list of mediaItemIds that are
  //      in the db? DONE to here.
  //      on the hd?
  //    download the media items associated with those mediaItemIds
  //      where do they go?
  //      manual copy to hd?
  //      or what?
  //    upload the db
  //    update manifest?
}

function buildAllDbMediaItemsById(dbMediaItems: Document[]): Map<string, DbMediaItem> {

  const dbMediaItemsByMediaItemId: Map<string, DbMediaItem> = new Map();
  dbMediaItems.forEach((rawDbMediaItem: Document) => {
    const { fileName, filePath, mimeType, width, height, creationTime, downloaded, baseUrl, productUrl } = rawDbMediaItem as any;
    const dbMediaItem: DbMediaItem = {
      googleMediaItemId: rawDbMediaItem.id,
      fileName,
      filePath,
      mimeType,
      width,
      height,
      creationTime,
      downloaded,
      baseUrl,
      productUrl,
    };
    dbMediaItemsByMediaItemId.set(dbMediaItem.googleMediaItemId, dbMediaItem);
  });
  return dbMediaItemsByMediaItemId;
}

/*
  results[0].mediaItem
    baseUrl
    filename
    id
    mediaMetadata
      creationTime
      height
      width
      photo
        apertureFNumber
        cameraMake
        cameraModel
        focalLength
        isoEquivalent
    mimeType
    productUrl
  results[69].status
    code
    message
*/

function downloadMediaItems(missingMediaItemResults: any[]): Promise<void> {

  const mediaItemsToRetrieve: any[] = [];

  missingMediaItemResults.forEach((missingMediaItemResult: any) => {
    if (isObject(missingMediaItemResult.mediaItem)) {
      mediaItemsToRetrieve.push(missingMediaItemResult.mediaItem);
    }
  });

  console.log('retrieve the following media items');
  console.log(mediaItemsToRetrieve);

  const processFetchMediaItem = (index: number): Promise<void> => {

    if (index >= mediaItemsToRetrieve.length) {
      return Promise.resolve();
    }

    const mediaItem: any = mediaItemsToRetrieve[index];

    const id = mediaItem.id;
    let baseUrl = mediaItem.baseUrl;
    console.log('baseUrl: ');
    console.log(baseUrl);

    if (isObject(mediaItem.mediaMetadata)) {
      const mediaMetadata = mediaItem.mediaMetadata;
      const { width, height } = mediaMetadata;
      if (isString(width) && isString(height)) {
        baseUrl += '=w' + width + '-h' + height;
        console.log('baseUrl with dimensions:');
        console.log(baseUrl);
      }
    }

    // TODO - check mimeType
    const fileName = mediaItem.id + '.jpg';
    console.log('filename');
    console.log(fileName);

    const baseDir = '/Users/tedshaffer/Documents/Projects/photoJeeves/tmp';
    const filePath = path.join(baseDir, fileName);

    const writer = fs.createWriteStream(filePath);

    axios({
      method: 'get',
      url: baseUrl,
      responseType: 'stream',
    }).then((response: any) => {
      response.data.pipe(writer);
      // writer.on('finish', Promise.resolve);
      // writer.on('error', Promise.reject);
      writer.on('finish', () => {
        return Promise.resolve();
      });
      writer.on('error', () => {
        return Promise.reject();
      });
      processFetchMediaItem(index + 1);
    }).catch((err: Error) => {
      console.log('mediaItem file get/write failed for id:');
      console.log(id);
      debugger;
    });
  };

  return processFetchMediaItem(0);
}
// function downloadMediaItem(mediaItem) {

//   return new Promise((resolve, reject) => {

//       var id = mediaItem.id;

//       const apiEndpoint = 'https://photoslibrary.googleapis.com';
//       var getMediaItemEndpoint = apiEndpoint + '/v1/mediaItems/' + id;
//       console.log('mediaItems endpoint:');
//       console.log(getMediaItemEndpoint);

//       var access_token = oauth2Controller.getAccessToken();

//       requestPromise.get(getMediaItemEndpoint, {
//           headers: { 'Content-Type': 'application/json' },
//           json: true,
//           auth: { 'bearer': access_token },
//       }).then((result) => {

//           const populatedMediaItem = result;
//           var baseUrl = populatedMediaItem.baseUrl;
//           console.log('baseUrl: ');
//           console.log(baseUrl);

//           if (typeof populatedMediaItem.mediaMetadata === 'object') {
//               var mediaMetadata = populatedMediaItem.mediaMetadata;
//               if (typeof mediaMetadata.width === 'string' && typeof mediaMetadata.height === 'string') {
//                   width = mediaMetadata.width;
//                   height = mediaMetadata.height;
//                   baseUrl = baseUrl + '=w' + width + '-h' + height;
//                   console.log('baseUrl with dimensions:');
//                   console.log(baseUrl);
//               }
//           }

//           // populatedMediaItem.mediaMetadata.width, height

//           // TODO - can't really do this - some are movies
//           var fileName = mediaItem.id + '.jpg';
//           console.log('filename');
//           console.log(fileName);

//           const filePath = path.join(baseDir, fileName);

//           const writer = fs.createWriteStream(filePath)

//           axios({
//               method: 'get',
//               url: baseUrl,
//               responseType: 'stream'
//           }).then((response) => {
//               response.data.pipe(writer);
//               writer.on('finish', resolve)
//               writer.on('error', reject)
//           }).catch((err) => {
//             console.log('mediaItem file get/write failed for id:');
//             console.log(id);
//             debugger;
//           });
//       }).catch((err) => {
//         console.log('mediaItems fetched failed for id:');
//         console.log(id);
//         console.log(err);
//         debugger;
//       });
//   });
// }
