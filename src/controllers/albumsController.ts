import { Request, Response } from 'express';

import {
  getGoogleAlbums,
} from '../utilities/googleInterface';
import {
  getDbAlbums,
} from '../utilities/dbInterface';

import {
  GoogleAlbum, DbAlbum,
} from '../types';

interface CompositeAlbum {
  id: string;
  googleTitle: string;
  googlePhotoCount: number;
  dbTitle: string;
  dbPhotoCount: number;
  hdTitle?: string;
  hdPhotoCount?: number;
}

export function showAlbumsStatus(request: Request, response: Response) {

  const promises: Array<Promise<any>> = [];

  promises.push(getGoogleAlbums());
  promises.push(getDbAlbums());

  Promise.all(promises).then((albumStatusResults: any[]) => {
    console.log(albumStatusResults);
    const googleAlbums: GoogleAlbum[] = albumStatusResults[0];
    const dbAlbums: DbAlbum[] = albumStatusResults[1];

    const albumsById: any = {};
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

    const allAlbums: CompositeAlbum[] = [];
    for (const albumId in albumsById) {
      if (albumsById.hasOwnProperty(albumId)) {
        const compositeAlbum = albumsById[albumId];
        allAlbums.push(compositeAlbum);
      }
    }
    response.render('albums', {
      albums: allAlbums,
    });
  });
}
