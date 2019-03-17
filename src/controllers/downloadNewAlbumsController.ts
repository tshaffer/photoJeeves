import { Request, Response } from 'express';
import { Query, Document } from 'mongoose';
import { getAccessToken } from './oauth2Controller';
import { isNil } from 'lodash';
import { CompositeAlbumMap, CompositeAlbum, DbMediaItem, GoogleAlbum, DbAlbum } from '../types';
import { getCompositeAlbumsById } from './albumsController';
import {
  getDbAlbums, getAllMediaItems as getAllDbMediaItems, insertAlbums as addDbAlbumsToDb,
} from '../utilities/dbInterface';

import {
  getGoogleAlbums, fetchAlbumContents, getAllMediaItemIds, getAlbumContents,
} from '../utilities/googleInterface';

function addGoogleAlbumsToDb(compositeAlbums: CompositeAlbum[]): Promise<Document[]> {
  const dbAlbumsToInsert: DbAlbum[] = [];
  compositeAlbums.forEach( (compositeAlbum: CompositeAlbum) => {
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
      .then( (mediaItemIds: string[]) => {

        compositeAlbum.googleAlbum.mediaItemIds = mediaItemIds;

        return processFetchAlbumContents(index + 1);
      });
  };
  return processFetchAlbumContents(0);
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
export function downloadNewAlbums(request: Request, response: Response) {

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
    .then( () => {
      debugger;
      // Step 3
      //   add albums to db
      return addGoogleAlbumsToDb(compositeAlbumsToDownload)
    }).then( () => {
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

