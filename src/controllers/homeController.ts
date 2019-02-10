import { Request, Response } from "express";

import MediaItem from '../models/mediaItem';

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
