console.log('hello, I am sse');

var evtSource = new EventSource('events'); 

evtSource.onmessage = function(e) {
  console.log('received message: ');
  console.log(e);

  console.log('data is: ');
  console.log(e.data);

  messageData = JSON.parse(e.data);
  console.log('message data: ');
  console.log(messageData);

  var pLocalMediaCount  = document.getElementById('localMediaCount');
  console.log(pLocalMediaCount)
  pLocalMediaCount.innerHTML = 'Number of local media items: ' + messageData.downloadedMediaItemCount.toString();

  var pLocalAlbumCount  = document.getElementById('localAlbumCount');
  console.log(pLocalAlbumCount)
  pLocalAlbumCount.innerHTML = 'Number of local albums: ' + messageData.downloadedAlbumCount.toString();

  var pGoogleAlbumCount  = document.getElementById('googleAlbumCount');
  console.log(pGoogleAlbumCount)
  pGoogleAlbumCount.innerHTML = 'Number of google albums: ' + messageData.googleAlbumCount.toString();


}