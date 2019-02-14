import { Request, Response } from "express";
import requestPromise from 'request-promise';

import MediaItem from '../models/mediaItem';
import Album from '../models/album';

import * as oauth2Controller from './oauth2Controller';

import { postSseResponse } from './events';

import WebSocket from 'ws';
import { exec } from "child_process";
import { google } from "googleapis";

let checkingForContent = false;

export function checkForContent(request: Request, response: Response) {

  if (!checkingForContent) {

    checkingForContent = true;

    console.log('post response.render');

    response.render('checkForContent', {
      downloadedMediaItemCount: '',
      cloudMediaItemsCount: '',
      downloadedAlbumCount: '',
      cloudAlbumsCount: '',
      outOfDateAlbumsCount: '',
    });

    const downloadedMediaItemsPromise = getDownloadedMediaItems();
    const downloadedAlbumsPromise = getDownloadedAlbums();
    const googleAlbumsPromise = getGoogleAlbums();
    // const googleMediaItemsPromise = getGoogleMediaItems();
    Promise.all([downloadedMediaItemsPromise, downloadedAlbumsPromise, googleAlbumsPromise])
      .then((results) => {
        console.log(results);

        const downloadedMediaItems = results[0];
        const downloadedAlbums = results[1];
        const googleAlbums = results[2];

        // compare googleAlbums to downloadedAlbums
        compareAlbums(googleAlbums, downloadedAlbums);
        
        postSseResponse({
          downloadedMediaItemCount: downloadedMediaItems.length,
          cloudMediaItemsCount: '',
          downloadedAlbumCount: downloadedAlbums.length,
          googleAlbumCount: googleAlbums.length,
          outOfDateAlbumsCount: '',
        });
      })
  }
}

function getDownloadedMediaItems(): Promise<any> {
  console.log('begin: retrieve downloadedMediaItems from mongoose');
  const query = MediaItem.find({ 'downloaded': true });
  return query.exec();
}

function getDownloadedAlbums(): Promise<any> {
  console.log('begin: retrieve downloadedAlbums from mongoose');
  const query = Album.find({});
  return query.exec();
}

function getGoogleMediaItems(): Promise<any> {

  console.log('begin: retrieve cloudMediaItems from google');

  let mediaItems: any = [];
  let numMediaItemsRetrieved = 0;

  var access_token = oauth2Controller.getAccessToken();
  const apiEndpoint = 'https://photoslibrary.googleapis.com';

  return new Promise((resolve, reject) => {

    var processGetMediaFiles = (pageToken: string) => {

      var url = apiEndpoint + '/v1/mediaItems?pageSize=100'
      if (pageToken !== '') {
        url = url + '&pageToken=' + pageToken;
      }
      requestPromise.get(url, {
        headers: { 'Content-Type': 'application/json' },
        json: true,
        auth: { 'bearer': access_token },
      }).then((result) => {

        mediaItems = mediaItems.concat(result.mediaItems);

        if (result.mediaItems.length === 0 || result.nextPageToken === undefined) {
          console.log('retrieved all mediaItems');
          resolve(mediaItems);
        }
        else {
          numMediaItemsRetrieved += result.mediaItems.length;
          console.log('numMediaItemsRetrieved: ', numMediaItemsRetrieved);
          processGetMediaFiles(result.nextPageToken);
        }
      });
    };

    processGetMediaFiles('');
  });
}

function getGoogleAlbums(): Promise<any> {

  console.log('begin: retrieve cloudAlbums from google');

  let albums: any = [];
  let numAlbumsRetrieved = 0;

  var access_token = oauth2Controller.getAccessToken();
  const apiEndpoint = 'https://photoslibrary.googleapis.com';

  return new Promise((resolve, reject) => {

    var processGetAlbums = (pageToken: string) => {

      var url = apiEndpoint + '/v1/albums?pageSize=50'
      if (pageToken !== '') {
        url = url + '&pageToken=' + pageToken;
      }
      requestPromise.get(url, {
        headers: { 'Content-Type': 'application/json' },
        json: true,
        auth: { 'bearer': access_token },
      }).then((result) => {

        albums = albums.concat(result.albums);

        if (result.albums.length === 0 || result.nextPageToken === undefined) {
          console.log('retrieved all albums');
          resolve(albums);
        }
        else {
          numAlbumsRetrieved += result.albums.length;
          console.log('numAlbumsRetrieved: ', numAlbumsRetrieved);
          processGetAlbums(result.nextPageToken);
        }
      });
    };

    processGetAlbums('');
  });
}

function compareAlbums(googleAlbums: any[], downloadedAlbums: any[]) {

  const googleAlbumsById: any = {};
  googleAlbums.forEach((googleAlbum: any) => {
    googleAlbumsById[googleAlbum.id] = googleAlbum;
  });

  const downloadedAlbumsById: any = {};
  downloadedAlbums.forEach((downloadedAlbum: any) => {
    downloadedAlbumsById[downloadedAlbum.id] = downloadedAlbum;
  });

  const googleAlbumsNotDownloaded: any[] = [];
  for (const albumId in googleAlbumsById) {
    if (googleAlbumsById.hasOwnProperty(albumId)) {
      const googleAlbum = googleAlbumsById[albumId];
      if (!downloadedAlbumsById.hasOwnProperty(albumId)) {
        googleAlbumsNotDownloaded.push(googleAlbum);
      }
    }
  }

  const downloadedAlbumsNotInCloud: any[] = [];
  for (const albumId in downloadedAlbumsById) {
    if (downloadedAlbumsById.hasOwnProperty(albumId)) {
      const downloadedAlbum = downloadedAlbumsById[albumId];
      if (!downloadedAlbumsById.hasOwnProperty(albumId)) {
        downloadedAlbumsNotInCloud.push(downloadedAlbum);
      }
    }
  }

  console.log('googleAlbumsNotDownloaded');
  console.log(googleAlbumsNotDownloaded);

  console.log('downloadedAlbumsNotInCloud');
  console.log(downloadedAlbumsNotInCloud);
}
