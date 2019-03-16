import { Request, Response } from 'express';
import { Query, Document } from 'mongoose';
import { getAccessToken } from './oauth2Controller';
import { isNil } from 'lodash';
import { CompositeAlbumMap, CompositeAlbum, DbMediaItem } from '../types';
import { getCompositeAlbumsById } from './albumsController';
import {
  getDbAlbums, getAllMediaItems as getAllDbMediaItems,
} from '../utilities/dbInterface';

import {
  getGoogleAlbums, fetchAlbumContents, getAllMediaItemIds,
} from '../utilities/googleInterface';

export function downloadNewAlbums(request: Request, response: Response) {

  console.log('downloadNewAlbums invoked');

  response.render('downloadNewAlbums');

  // getAllMediaItemIds();

  const accessToken = getAccessToken();
  if (isNil(accessToken)) {
    debugger;
  }

  // TODO - check that compositeAlbumsById is built.
  const compositeAlbumsById: CompositeAlbumMap  = getCompositeAlbumsById();

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

