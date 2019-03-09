const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const https = require('https');
const bsCore = require('@brightsign/bscore');
const bsnConnector = require('@brightsign/bsnconnector');
const bsnGetSession = bsnConnector.bsnGetSession;
const bsnConnectorConfig = bsnConnector.bsnConnectorConfig;
const dwsManager = require('@brightsign/bs-dws-manager');
const getDwsConnector = dwsManager.getDwsConnector;
const request = require('request');

const noBsMode = true;

function getOAuthToken() {

  if (noBsMode) {
    return;
  }
  
  var jsonBody =
  {
    "grant_type": "password",
    "username": "ted@brightsign.biz",
    "password": "P@ssw0rd"
  };

  request({
    url: 'https://oademo.brightsignnetwork.com/v1/token',
    method: "POST",
    auth: {
      'user': '8ybX72Gt',
      'pass': 'oJkARlw1-Ta2G-5WMo-gKJ3-5RxvHpaD5Ngk'
    },
    json: true,
    body: jsonBody
  }, function (error, response, body) {

    console.log('received response, accessToken:');
    console.log(response.body.access_token);

    accessToken = response.body.access_token;
  });
}

const sendPlayAlbum = (albumName) => {
  sendCommandToBrightSign('album!!' + albumName.toLowerCase());
  sendResumePlayback();
}

const sendPausePlayback = () => {
  sendCommandToBrightSign('pausePlayback');
}

const sendResumePlayback = () => {
  sendCommandToBrightSign('startPlayback');
}

const sendRewindPlayback = () => {
  sendCommandToBrightSign('rewind');
}

const sendCommandToBrightSign = (cmd) => {

  if (noBsMode) {
    return;
  }
  
  jsonBody = {
    'data': {
      'command': cmd,
      'return immediately': true,
    }
  };

  console.log('send command: ', cmd);

  request({
    url: 'https://wsdemo.brightsignnetwork.com/rest/v1/custom?destinationType=player&destinationName=D7D834000029',
    method: "PUT",
    auth: {
      'bearer': accessToken,
    },
    json: true,
    body: jsonBody
  }, function (error, response, body) {

    console.log('error');
    console.log(error);

    console.log('received response, body:');
    console.log(response.body);
  });
}

module.exports.noBsMode = noBsMode;
module.exports.getOAuthToken = getOAuthToken;
module.exports.sendPlayAlbum = sendPlayAlbum;
module.exports.sendPausePlayback = sendPausePlayback;
module.exports.sendResumePlayback = sendResumePlayback;
module.exports.sendRewindPlayback = sendRewindPlayback;
