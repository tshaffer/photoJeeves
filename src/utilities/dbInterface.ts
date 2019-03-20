import { union } from 'lodash';

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

export function getAlbumMediaItemIds(): Promise<string[]> {
  const query = Album.find({});
  return query.exec().then((results: any) => {
    const mediaItemIdsInAlbums: [any][any] = results.map( (result: any) => {
      return getDbMediaItemIds(result.mediaItemIds);
    });
    const uniqueMediaItemIdsInAlbums: string[] = union(...mediaItemIdsInAlbums);
    return Promise.resolve(uniqueMediaItemIdsInAlbums);
  });
}

export function getAllMediaItemsInDb(): Promise<Document[]> {
  console.log('getAllMediaItems');
  const query = MediaItem.find({});
  return query.exec();
}

export function insertAlbums(albums: DbAlbum[]): Promise<Document[]> {
  const albumsToInsert: any[] = [];
  albums.forEach((dbAlbum: DbAlbum) => {
    albumsToInsert.push({
      id: dbAlbum.googleId,
      title: dbAlbum.title,
      mediaItemIds: dbAlbum.mediaItemIds,
    });
  });
  return Album.insertMany(albumsToInsert);
}

