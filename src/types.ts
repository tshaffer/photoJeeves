
export interface AlbumData {
  albums: GoogleAlbum[];
  albumContentsByAlbumId: any;
}

export interface PhotoStatus {
  googleAlbumsNotDownloaded: any[];
  downloadedAlbumsNotInCloud: any[];
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
  mediaItems: GoogleMediaItem[];
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
