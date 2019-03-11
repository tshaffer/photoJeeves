import { Request, Response } from 'express';

import {
  getGoogleAlbums,
} from '../utilities/googleInterface';
import {
  GoogleAlbum,
} from '../types';

export function showAlbumsStatus(request: Request, response: Response) {
  getGoogleAlbums().then((googleAlbums: GoogleAlbum[]) => {
    console.log('showAlbumsStatus');
    console.log(googleAlbums);

    response.render('albums');
  });
}
