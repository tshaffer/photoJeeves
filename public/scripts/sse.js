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

  var pLocalMediaContent  = document.getElementById('localMediaContent');
  console.log(pLocalMediaContent)
  pLocalMediaContent.innerHTML = 'Number of local media items: ' + messageData.downloadedMediaItemCount.toString();

  var pLocalAlbumContent  = document.getElementById('localAlbumContent');
  console.log(pLocalAlbumContent)
  pLocalAlbumContent.innerHTML = 'Number of local Album items: ' + messageData.downloadedAlbumCount.toString();

}