console.log('hello, I am sse');

var evtSource = new EventSource('events');

evtSource.onmessage = function (e) {
  console.log('received message: ');
  console.log(e);

  console.log('data is: ');
  console.log(e.data);

  messageData = JSON.parse(e.data);
  console.log('message data: ');
  console.log(messageData);

  if (messageData.homeStatus) {
    var homeStatusP = document.getElementById('homeStatusP');
    homeStatusP.innerHTML = messageData.homeStatus;
  }

  var albumNamesDiv = document.getElementById('albumNamesDiv');
  if (messageData.showAlbumNames) {
    albumNamesDiv.style.visibility = 'visible';
    /*
     https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Traversing_an_HTML_table_with_JavaScript_and_DOM_Interfaces
    */
    var albumNamesTable = document.getElementById('albumNamesTable');
    var tblBody = document.createElement("tbody");

    const albumNames = messageData.albumNames;
    albumNames.forEach( (albumNameObj, index) => {

      var albumRow = document.createElement("tr");

      var googleAlbumNameCell = document.createElement("td");
      var googleAlbumNameText = document.createTextNode(albumNameObj.googleAlbumTitle);
      googleAlbumNameCell.appendChild(googleAlbumNameText);
      albumRow.appendChild(googleAlbumNameCell);

      var dbAlbumNameCell = document.createElement("td");
      var dbAlbumNameText = document.createTextNode(albumNameObj.dbAlbumTitle);
      dbAlbumNameCell.appendChild(dbAlbumNameText);   
      albumRow.appendChild(dbAlbumNameCell);

      tblBody.appendChild(albumRow);

    });

    // put the <tbody> in the <table>
    albumNamesTable.appendChild(tblBody);
  }
  else {
    albumNamesDiv.style.visibility = 'hidden';
  }

  // var pLocalMediaCount  = document.getElementById('localMediaCount');
  // console.log(pLocalMediaCount)
  // pLocalMediaCount.innerHTML = 'Number of local media items: ' + messageData.downloadedMediaItemCount.toString();

  // var pLocalAlbumCount  = document.getElementById('localAlbumCount');
  // console.log(pLocalAlbumCount)
  // pLocalAlbumCount.innerHTML = 'Number of local albums: ' + messageData.downloadedAlbumCount.toString();

  // var pGoogleAlbumCount  = document.getElementById('googleAlbumCount');
  // console.log(pGoogleAlbumCount)
  // pGoogleAlbumCount.innerHTML = 'Number of google albums: ' + messageData.googleAlbumCount.toString();


}