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
import { Query, Document, Model, Schema } from 'mongoose';
import { create } from 'domain';

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

// returns an array of mediaItemIds that represents all the mediaItems in all the albums
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

// returns all MediaItem objects in the db
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

export function addMediaItemToDb(mediaItem: GoogleMediaItem): Promise<Document> {

  const { baseUrl, filename, id, mediaMetadata, mimeType, productUrl } = mediaItem;

  // TEDTODO - typing as MediaItem doesn't work - it can't find it?
  // const newMediaItem: MediaItem = new MediaItem();
  const dbSchemaMediaItem: any = new MediaItem();
  dbSchemaMediaItem.id = id;
  dbSchemaMediaItem.baseUrl = baseUrl;
  dbSchemaMediaItem.fileName = filename;
  dbSchemaMediaItem.downloaded = true;  // TEDTODO - do I want this set here, or as a parameter?
  dbSchemaMediaItem.filePath = '';
  dbSchemaMediaItem.productUrl = productUrl;
  dbSchemaMediaItem.mimeType = mimeType;
  dbSchemaMediaItem.creationTime = mediaMetadata.creationTime;
  dbSchemaMediaItem.width = parseInt(mediaMetadata.width, 10);
  dbSchemaMediaItem.height = parseInt(mediaMetadata.height, 10);

  console.log('add db item with google id to db:');
  console.log(id);
  return dbSchemaMediaItem.save();
}
