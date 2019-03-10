import { Request, Response } from 'express';

import * as fse from 'fs-extra';

export function start(request: Request, response: Response) {

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

