import Album from '../models/album';
import MediaItem from '../models/mediaItem';

import {
  DbAlbum,
  PhotoMetadata,
  DbMediaItem,
  GoogleAlbum,
  GoogleMediaItem,
  AlbumWithDifferences,
} from '../types';
import { Query, Document } from 'mongoose';

export function getDbAlbums(): Promise<DbAlbum[]> {
  console.log('begin: retrieve downloadedAlbums from mongoose');
  const query = Album.find({});
  return query.exec().then((results: any) => {
    const dbAlbums: DbAlbum[] = results.map((result: any) => {
      return {
        googleId: result.id,
        title: result.title,
        mediaItemIds: getDbMediaItemIds(result.mediaItemIds),
      };
    });
    return Promise.resolve(dbAlbums);
  });
}

function getDbMediaItemIds(dbMediaItemIds: any[]): string[] {
  return dbMediaItemIds.map((mediaItemId: any) => {
    return mediaItemId.toString();
  });
}

export function getAllMediaItems(): Promise<Document[]> {
  console.log('getAllMediaItems');
  const query = MediaItem.find({});
  return query.exec();
}


