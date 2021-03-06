export interface Dict<T> {
  [id: string]: T;
}

// investigate map as alternative to Dict
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

// export type GoogleAlbumsContentsByAlbumIdMap = Dict<GoogleAlbum> | {};

// export interface GoogleAlbumData {
//   googleAlbums: GoogleAlbum[];
//   albumContentsByAlbumId: GoogleAlbumsContentsByAlbumIdMap;
// }

export interface PhotoStatus {
  googleAlbumsNotDownloaded: GoogleAlbum[];
  albumDifferencesByAlbumId: Map<string, AlbumWithDifferences>;
  downloadedAlbumsNotInCloud: DbAlbum[];
}

export interface AlbumWithDifferences {
  googleId: string;
  title: string;
  addedMediaItemIds: string[];
  deletedMediaItemIds: string[];
}

export interface DbAlbum {
  googleId: string; // known as id
  title: string;
  mediaItemIds: string[];
}

export interface DbMediaItem {
  googleMediaItemId: string; // id
  fileName: string;
  filePath: string;
  mimeType: string;
  width: number;
  height: number;
  creationTime: Date;
  downloaded: boolean;
  baseUrl?: string;
  productUrl?: string;
}

export interface GoogleAlbum {
  googleAlbumId: string;
  title: string;
  productUrl: string;
  mediaItemsCount: number;
  mediaItemIds: string[];
}

export interface PhotoMetadata {
  apertureFNumber: number;
  cameraMake: string;
  cameraModel: string;
  focalLength: number;
  isoEquivalent: number;
}

export interface MediaMetadata {
  creationTime: string;
  height: number;
  width: number;
  photo?: PhotoMetadata;
}

export interface GoogleMediaItem {
  baseUrl: string;
  fileName: string; // filename when downloaded
  googleMediaItemId: string;  // id when downloaded
  mediaMetadata: any;
  mimeType: string;
  productUrl: string;
}
