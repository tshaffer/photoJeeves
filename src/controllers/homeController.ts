import { isNil } from 'lodash';
import { Request, Response } from 'express';
import * as fse from 'fs-extra';

import { getGoogleAlbums } from '../utilities/googleInterface';
import { getDbAlbums } from '../utilities/dbInterface';

import {
  DbAlbum,
  GoogleAlbum,
} from '../types';

import { postSseResponse } from './events';

interface AlbumNames {
  googleAlbumId: string;
  googleAlbumTitle: string;
  dbAlbumTitle: string;
}

export function start(request: Request, response: Response) {
  const promises: Array<Promise<any>> = [];

  response.render('home', {
    // homeStatus: 'This is a test',
    albumNames: [],
  });

  promises.push(getGoogleAlbums());
  promises.push(getDbAlbums());

  Promise.all(promises).then((albumStatusResults: any[]) => {

    const googleAlbums: GoogleAlbum[] = albumStatusResults[0];
    const dbAlbums: DbAlbum[] = albumStatusResults[1];

    const albumsById: Map<string, AlbumNames> = new Map();

    googleAlbums.forEach( (googleAlbum: GoogleAlbum) => {
      albumsById.set(googleAlbum.googleAlbumId, 
        { 
          googleAlbumId: googleAlbum.googleAlbumId,
          googleAlbumTitle: googleAlbum.title,
          dbAlbumTitle: '',
        },
      );
    });

    dbAlbums.forEach( (dbAlbum: DbAlbum) => {
      const matchingAlbum: AlbumNames = albumsById.get(dbAlbum.googleId);
      if (!isNil(matchingAlbum)) {
        albumsById.set(matchingAlbum.googleAlbumId, 
          { 
            googleAlbumId: matchingAlbum.googleAlbumId,
            googleAlbumTitle: matchingAlbum.googleAlbumTitle,
            dbAlbumTitle: dbAlbum.title,
          },
        );
      }
    });

    const allAlbumNames: AlbumNames[] = [];
    albumsById.forEach( (albumNames: AlbumNames) => {
      allAlbumNames.push(albumNames);
    });

    // response.render('home', {
    //   albumNames: allAlbumNames,
    // });
    postSseResponse({
      homeStatus: ' ',
      showAlbumNames: true,
      albumNames: allAlbumNames,
    });
  

  });
}

export function oldstart(request: Request, response: Response) {

  response.render('home',
    {
      mediaItemCount: '',
      mediaItemsDownloadedCount: '',
      mediaItemsPendingDownloadCount: '',
    });

  // mongoose code to perform bulk update
  // MediaItem.updateMany({}, { $set: { downloaded: true } });

  // MediaItem.count({}, (err, count) => {
  //   if (err) { debugger }
  //   MediaItem.find({ 'downloaded': true }, 'fileName', (err, downloadedMediaItems) => {
  //     if (err) debugger;
  //     response.render('home',
  //       {
  //         mediaItemCount: count,
  //         mediaItemsDownloadedCount: downloadedMediaItems.length,
  //         mediaItemsPendingDownloadCount: count - downloadedMediaItems.length,
  //       });
  //   });
  // });
}

export function generateAlbumsList(request: Request, response: Response) {
  response.render('home',
    {
      mediaItemCount: '',
      mediaItemsDownloadedCount: '',
      mediaItemsPendingDownloadCount: '',
    });

  const manifestPath = '/Users/tedshaffer/Documents/Projects/sinker/photoCollectionManifest.json';

  const manifestContents = fse.readFileSync(manifestPath);
  // attempt to convert buffer to string resulted in Maximum Call Stack exceeded
  const photoManifest = JSON.parse(manifestContents as any);
  console.log(photoManifest);

  const photoJeevesAlbums: any[] = [];

  const albums = photoManifest.albums;

  for (const albumName in albums) {
    if (albums.hasOwnProperty(albumName)) {
      const title = albumName;
      const photoCount = albums[albumName].length;
      photoJeevesAlbums.push({
        title,
        photoCount,
      });
    }
  }

  const photoJeevesAlbumsSpec: any = {
    ALBUM_SPECS: photoJeevesAlbums,
  };

  const json = JSON.stringify(photoJeevesAlbumsSpec, null, 2);
  fse.writeFile('photoJeevesAlbums.json', json, 'utf8', (err) => {
    if (err) {
      console.log('err');
      console.log(err);
    }
    else {
      console.log('photoJeevesAlbums.json successfully written');
    }
  });
}

