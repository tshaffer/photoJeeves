import { Request, Response } from 'express';

import * as fse from 'fs-extra';

import {
  getGoogleAlbums,
} from '../utilities/googleInterface';
import {
  getDbAlbums,
} from '../utilities/dbInterface';

import {
  GoogleAlbum, DbAlbum, DbMediaItem,
} from '../types';

import Album from '../models/album';
import MediaItem from '../models/mediaItem';

interface CompositeAlbum {
  id: string;
  googleTitle: string;
  googlePhotoCount: number;
  dbTitle: string;
  dbPhotoCount: number;
  hdTitle?: string;
  hdPhotoCount?: number;
}

interface AlbumsByTitle {
  [title: string]: number;
}

interface CompositeAlbumMap {
  [id: string]: CompositeAlbum;
}

export function showAlbumsStatus(request: Request, response: Response) {

  const promises: Array<Promise<any>> = [];

  promises.push(getGoogleAlbums());
  promises.push(getDbAlbums());

  Promise.all(promises).then((albumStatusResults: any[]) => {
    console.log(albumStatusResults);
    const googleAlbums: GoogleAlbum[] = albumStatusResults[0];
    const dbAlbums: DbAlbum[] = albumStatusResults[1];

    const albumsById: CompositeAlbumMap = {};
    googleAlbums.forEach((googleAlbum: GoogleAlbum) => {
      const allAlbum: CompositeAlbum = {
        id: googleAlbum.googleAlbumId,
        googleTitle: googleAlbum.title,
        googlePhotoCount: googleAlbum.mediaItemsCount,
        dbTitle: '',
        dbPhotoCount: 0,
      };
      albumsById[googleAlbum.googleAlbumId] = allAlbum;
    });

    dbAlbums.forEach((dbAlbum: DbAlbum) => {
      if (albumsById.hasOwnProperty(dbAlbum.googleId)) {
        const compositeAlbum: CompositeAlbum = albumsById[dbAlbum.googleId];
        compositeAlbum.dbTitle = dbAlbum.title;
        compositeAlbum.dbPhotoCount = dbAlbum.mediaItemIds.length;
        albumsById[dbAlbum.googleId] = compositeAlbum;
      }
      else {
        console.log('No matching google album for dbAlbum: ', dbAlbum.title);
      }
    });

    const hdAlbumsByTitle: AlbumsByTitle = getAlbumsListFromManifest();

    const allAlbums: CompositeAlbum[] = [];
    for (const albumId in albumsById) {
      if (albumsById.hasOwnProperty(albumId)) {
        const compositeAlbum = albumsById[albumId];

        const compositeAlbumName = compositeAlbum.googleTitle;
        if (hdAlbumsByTitle.hasOwnProperty(compositeAlbumName)) {
          const hdAlbumCount: number = hdAlbumsByTitle[compositeAlbumName];
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

export function downloadNewAlbums(request: Request, response: Response) {
  console.log('downloadNewAlbums invoked');
}

export function synchronizeAlbumNames(request: Request, response: Response) {
  console.log('synchronizeAlbumNames invoked');
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
          mediaItemQueryResults.forEach( (mediaItem: any) => {
            mediaItemsById[mediaItem.id] = {
              id: mediaItem.id,
              fileName: mediaItem.fileName,
              width: mediaItem.width,
              height: mediaItem.height,
            } ;
          });

          const albumItemsByAlbumName: any = {};
          albumsQueryResults.forEach( (album: any) => {
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
