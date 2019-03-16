import { Request, Response } from 'express';

import * as fse from 'fs-extra';

import { Query, Document } from 'mongoose';

import {
  isNil,
} from 'lodash';

import {
  getGoogleAlbums, fetchAlbumContents, getAllMediaItemIds,
} from '../utilities/googleInterface';
import {
  getDbAlbums, getAllMediaItems as getAllDbMediaItems,
} from '../utilities/dbInterface';

import {
  GoogleAlbum, DbAlbum, DbMediaItem,
} from '../types';

import Album from '../models/album';
import MediaItem from '../models/mediaItem';
import { getAccessToken } from './oauth2Controller';

interface CompositeAlbum {
  id: string;
  googleTitle: string;
  googlePhotoCount: number;
  inDb: boolean;
  dbTitle: string;
  dbPhotoCount: number;
  onHd: boolean;
  hdTitle?: string;
  hdPhotoCount?: number;
}

interface AlbumsByTitle {
  [title: string]: number;
}

interface CompositeAlbumMap {
  [id: string]: CompositeAlbum;
}

const compositeAlbumsById: CompositeAlbumMap = {};
let downloadNewAlbumsInProgress = false;

export function showAlbumsStatus(request: Request, response: Response) {

  const promises: Array<Promise<any>> = [];

  promises.push(getGoogleAlbums());
  promises.push(getDbAlbums());

  Promise.all(promises).then((albumStatusResults: any[]) => {
    console.log(albumStatusResults);
    const googleAlbums: GoogleAlbum[] = albumStatusResults[0];
    const dbAlbums: DbAlbum[] = albumStatusResults[1];

    googleAlbums.forEach((googleAlbum: GoogleAlbum) => {
      const allAlbum: CompositeAlbum = {
        id: googleAlbum.googleAlbumId,
        googleTitle: googleAlbum.title,
        googlePhotoCount: googleAlbum.mediaItemsCount,
        inDb: false,
        dbTitle: '',
        dbPhotoCount: 0,
        onHd: false,
      };
      compositeAlbumsById[googleAlbum.googleAlbumId] = allAlbum;
    });

    dbAlbums.forEach((dbAlbum: DbAlbum) => {
      if (compositeAlbumsById.hasOwnProperty(dbAlbum.googleId)) {
        const compositeAlbum: CompositeAlbum = compositeAlbumsById[dbAlbum.googleId];
        compositeAlbum.inDb = true;
        compositeAlbum.dbTitle = dbAlbum.title;
        compositeAlbum.dbPhotoCount = dbAlbum.mediaItemIds.length;
        compositeAlbumsById[dbAlbum.googleId] = compositeAlbum;
      }
      else {
        console.log('No matching google album for dbAlbum: ', dbAlbum.title);
      }
    });

    const hdAlbumsByTitle: AlbumsByTitle = getAlbumsListFromManifest();

    const allAlbums: CompositeAlbum[] = [];
    for (const albumId in compositeAlbumsById) {
      if (compositeAlbumsById.hasOwnProperty(albumId)) {
        const compositeAlbum = compositeAlbumsById[albumId];

        const compositeAlbumName = compositeAlbum.googleTitle;
        if (hdAlbumsByTitle.hasOwnProperty(compositeAlbumName)) {
          const hdAlbumCount: number = hdAlbumsByTitle[compositeAlbumName];
          compositeAlbum.onHd = true;
          compositeAlbum.hdPhotoCount = hdAlbumCount;
        }
        allAlbums.push(compositeAlbum);
      }
    }
    response.render('albums', {
      albums: allAlbums,
    });
  });
}

function getAlbumsListFromManifest(): AlbumsByTitle {

  const manifestPath = '/Users/tedshaffer/Documents/Projects/photoJeeves/photoCollectionManifest.json';

  const manifestContents = fse.readFileSync(manifestPath);
  // attempt to convert buffer to string resulted in Maximum Call Stack exceeded
  const photoManifest = JSON.parse(manifestContents as any);
  console.log(photoManifest);

  const photoJeevesAlbums: AlbumsByTitle = {};

  const albums = photoManifest.albums;

  for (const albumName in albums) {
    if (albums.hasOwnProperty(albumName)) {
      const title = albumName;
      const photoCount = albums[albumName].length;
      photoJeevesAlbums[title] = photoCount;
    }
  }

  return photoJeevesAlbums;
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

export function downloadNewAlbums(request: Request, response: Response) {

  if (downloadNewAlbumsInProgress) {
    console.log('downloadNewAlbums already in progress');
  }

  downloadNewAlbumsInProgress = true;

  console.log('downloadNewAlbums invoked');

  getAllMediaItemIds();

  // const accessToken = getAccessToken();
  // if (isNil(accessToken)) {
  //   debugger;
  // }

  // // TODO - check that compositeAlbumsById is built.

  // const albumIds: string[] = [];

  // Object.keys(compositeAlbumsById).forEach((compositeAlbumId: string) => {
  //   const compositeAlbum: CompositeAlbum = compositeAlbumsById[compositeAlbumId];
  //   const { id, googleTitle } = compositeAlbum;
  //   if (!compositeAlbum.inDb) {
  //     console.log('download album:');
  //     console.log(googleTitle);

  //     albumIds.push(compositeAlbum.id);
  //   }
  // });

  // let allMediaItemIdsByAlbumId: any;

  // const mediaItemIdsToDownload: string[] = [];

  // console.log('fetchAlbumContents');

  // fetchAlbumContents(accessToken, albumIds)
  //   .then((mediaItemIdsByAlbumId) => {
  //     allMediaItemIdsByAlbumId = mediaItemIdsByAlbumId;
  //     return getAllDbMediaItems();
  //   }).then((dbMediaItems: Document[]) => {
  //     console.log('return from getAllDbMediaItems');
  //     const dbMediaItemsByMediaItemId: Map<string, DbMediaItem> = buildAllDbMediaItemsById(dbMediaItems);

  //     // iterate through all albums, mediaItems - compare against dbMediaItemsByMediaItemId
  //     Object.keys(allMediaItemIdsByAlbumId).forEach((albumId: string) => {
  //       const mediaItemIds: any[] = allMediaItemIdsByAlbumId[albumId];
  //       mediaItemIds.forEach((mediaItemId: string) => {
  //         if (!dbMediaItemsByMediaItemId.hasOwnProperty(mediaItemId)) {
  //           mediaItemIdsToDownload.push(mediaItemId);
  //         }
  //       });
  //     });

  //     console.log('number of mediaItems to download:');
  //     console.log(mediaItemIdsToDownload.length);
  //     console.log(mediaItemIdsToDownload);
  //   });

  //  next steps
  //    generate a list of all the mediaItemIds required for these albums
  //    compare to list of mediaItemIds that are
  //      in the db?
  //      on the hd?
  //    download the media items associated with those mediaItemIds
  //      where do they go?
  //      manual copy to hd?
  //      or what?
  //    upload the db
  //    update manifest?
}

export function synchronizeAlbumNames(request: Request, response: Response) {
  console.log('synchronizeAlbumNames invoked');

  Object.keys(compositeAlbumsById).forEach((compositeAlbumId: string) => {
    const compositeAlbum: CompositeAlbum = compositeAlbumsById[compositeAlbumId];
    const { id, googleTitle, dbTitle } = compositeAlbum;
    if (compositeAlbum.inDb) {
      if (googleTitle !== dbTitle) {
        Album.update({ id }, { $set: { title: googleTitle } }, () => {
          console.log('rename ', dbTitle, ' to ', googleTitle);
        });
      }
    }
  });
}

export function regenerateManifest(request: Request, response: Response) {

  console.log('regenerateManifest invoked');
  const manifestPath = '/Users/tedshaffer/Documents/Projects/photoJeeves/photoCollectionManifest.json';

  const mediaItemsQuery = MediaItem.find({});
  return mediaItemsQuery.exec()
    .then((mediaItemQueryResults: any) => {
      const albumsQuery = Album.find({});
      return albumsQuery.exec()
        .then((albumsQueryResults: any) => {

          const mediaItemsById: any = {};
          mediaItemQueryResults.forEach((mediaItem: any) => {
            mediaItemsById[mediaItem.id] = {
              id: mediaItem.id,
              fileName: mediaItem.fileName,
              width: mediaItem.width,
              height: mediaItem.height,
            };
          });

          const albumItemsByAlbumName: any = {};
          albumsQueryResults.forEach((album: any) => {
            const albumName: string = album.title;
            const albumId: string = album.id;
            const mediaItemIdsInAlbum: any[] = [];
            const dbMediaItemIdsInAlbum = album.mediaItemIds;
            // tslint:disable-next-line: prefer-for-of
            for (let j = 0; j < dbMediaItemIdsInAlbum.length; j++) {
              mediaItemIdsInAlbum.push(dbMediaItemIdsInAlbum[j]);
            }
            albumItemsByAlbumName[albumName] = {
              id: albumId,
              mediaItemIds: dbMediaItemIdsInAlbum,
            };
          });
          console.log(albumItemsByAlbumName);

          const manifestFile = {
            mediaItemsById,
            albums: albumItemsByAlbumName,
          };
          const json = JSON.stringify(manifestFile, null, 2);
          fse.writeFile('photoCollectionManifest.json', json, 'utf8', (err) => {
            if (err) {
              console.log('err');
              console.log(err);
            }
            else {
              console.log('photoCollectionManifest.json successfully written');
            }
          });
        });
    });
}
