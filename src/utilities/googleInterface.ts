import requestPromise from 'request-promise';

import * as oauth2Controller from '../controllers/oauth2Controller';

import {
  DbAlbum,
  PhotoMetadata,
  PhotoStatus as PendingSyncStatus,
  DbMediaItem,
  GoogleAlbum,
  GoogleMediaItem,
  AlbumWithDifferences,
} from '../types';

export function getGoogleAlbums(): Promise<GoogleAlbum[]> {

  let allGoogleAlbums: GoogleAlbum[] = [];
  const accessToken = oauth2Controller.getAccessToken();
  const apiEndpoint = 'https://photoslibrary.googleapis.com';

  return new Promise((resolve, reject) => {

    const processGetAlbums = (pageToken: string) => {
      let url = apiEndpoint + '/v1/albums?pageSize=50';
      if (pageToken !== '') {
        url = url + '&pageToken=' + pageToken;
      }
      requestPromise.get(url, {
        headers: { 'Content-Type': 'application/json' },
        json: true,
        auth: { bearer: accessToken },
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
          resolve(allGoogleAlbums);
        }
        else {
          processGetAlbums(result.nextPageToken);
        }
      });
    };
    processGetAlbums('');
  });
}

