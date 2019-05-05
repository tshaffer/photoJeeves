Sub Main()
  RunSnips()
End Sub


Sub RunSnips()

  EnableZoneSupport(true)

  snips = {}

  snips.msgPort = CreateObject("roMessagePort")

' content is on sd or usb hard drive - select here
  snips.baseDir$ = "sd"
  snips.baseDir$ = "usb1"

  imageSizeThreshold = {}
  imageSizeThreshold.width = 4042
  imageSizeThreshold.height = 4032
  imageSizeThreshold.ignore = true

  vm = CreateObject("roVideoMode")
  vm.SetImageSizeThreshold(imageSizeThreshold)

  r = CreateObject("roRectangle", 0, 0, 1920, 1080)
  snips.imagePlayer = CreateObject("roImageWidget", r)
  snips.imagePlayer.SetDefaultMode(1)
	snips.imagePlayer.Show()

  snips.timer = CreateObject("roTimer")
  snips.timer.setPort(snips.msgPort)
  snips.timer.SetElapsed(4, 0)

  snips.eventLoop = EventLoop
  snips.processHtmlWidgetEvent = processHtmlWidgetEvent
  snips.parsePhrase = parsePhrase
  snips.startPlayback = startPlayback
  snips.pausePlayback = pausePlayback
  snips.rewind = rewind
  snips.switchAlbum = switchAlbum
  snips.nextPhoto = nextPhoto
  snips.hideAlbumList = hideAlbumList
  snips.showAlbumList = showAlbumList

  snips.htmlRect = CreateObject("roRectangle", 0, 0, 1000, 1080)
  is = {
      port: 2999
  }
  config = {
      nodejs_enabled: true,
      inspector_server: is,
      brightsign_js_objects_enabled: true,
      javascript_enabled: true,
      url:  "file:///SD:/index.html",
      security_params: {websecurity: false}
  }
  snips.htmlContainer = CreateObject("roHtmlWidget", snips.htmlRect, config)
  snips.htmlContainer.setPort(snips.msgPort)
  snips.htmlContainer.AllowJavaScriptUrls({ all: "*" })
  snips.htmlContainer.SetUserData("server")
  snips.htmlContainer.Show()

  print "PhotoPlayer start"
  manifest$ = ReadAsciiFile(snips.baseDir$ + ":/mediaItems/photoCollectionManifest.json")
  snips.photoManifest = ParseJson(manifest$)
  albums = snips.photoManifest.albums
  
  for each albumName in albums
    if albumName <> lcase(albumName) then
      albumValue = albums[albumName]
      albums.delete(albumName)
      albums.addReplace(lcase(albumName), albumValue)
    endif
  next

  print "Albums:"
  for each albumName in albums
    print albumName
  next

  snips.eventLoop(snips.msgPort)

End Sub

Sub EventLoop(msgPort As Object)

  while true
    event = wait(0, msgPort)
    print "event: " + type(event)
    if type(event) = "roTimerEvent" then
      m.nextPhoto()
    else if type(event) = "roHtmlWidgetEvent" then
      m.processHtmlWidgetEvent(event)
    endif
  end while

End Sub


Function processHtmlWidgetEvent(event As Object) as boolean

  print "=== processHtmlWidgetEvent"
  print type(event)

  retval = false
  
  payload = event.GetData()
  if payload.reason = "message" then
    result = payload.message
    print "=== result"
    print result
    if (result.event = "textCaptured") then
      json = ParseJson(result.payload)
      text = json.text
      likelihood = json.likelihood
      print "=== textCaptured:";text
      print "likelihood: ";likelihood

    else if (result.event = "intentParsed") then
      json = ParseJson(result.payload)
      intentName = json.intent.intentName
      probability = json.intent.confidenceScore
      print "=== intentParsed:";intentName
      print "probability: ";probability
      retval = m.parsePhrase(intentName, probability, json)

    else if (result.event = "startListening") then'
      v = "Start-Listening"
      print "=== startListening: value sent to BA: ";v
      retval = true

    else if (result.event = "stopListening") then'
      v = "Stop-Listening"
      print "=== stopListening: value sent to BA: ";v
      retval = true
    end if
  end if

  return retval

End Function


Function parsePhrase(intent as string, likelihood as float, json as object) as boolean

  print "******** parsePhrase, type(json):"
  print type(json)
  print "******** intent"
  print intent

  command$ = ""
  commandParameter$ = ""

  if likelihood > .79 then
    if intent = "&KV4lavkZXDmNqwJXzB52DWmBwMLegAM6Oyr2o1PE:PlayAlbum" then
      command$ = "PlayAlbum"
      if json.slots.count() > 0 then
        commandParameter$ = json.slots[0].value.value
        m.hideAlbumList()
        m.switchAlbum(commandParameter$)
        m.startPlayback()
      endif
    else if intent = "&KV4lavkZXDmNqwJXzB52DWmBwMLegAM6Oyr2o1PE:ListAlbums" then
      command$ = "ListAlbums"
      m.showAlbumList()
    else if intent = "&KV4lavkZXDmNqwJXzB52DWmBwMLegAM6Oyr2o1PE:Resume" then
      command$ = "Resume"
      m.startPlayback()
    else if intent = "&KV4lavkZXDmNqwJXzB52DWmBwMLegAM6Oyr2o1PE:pause" then
      command$ = "Pause"
      m.pausePlayback()
    else if intent = "&KV4lavkZXDmNqwJXzB52DWmBwMLegAM6Oyr2o1PE:rewind" then
      command$ = "Rewind"
      m.rewind()
    else
      print "=== Could not understand phrase!"
    end if
  else
    print "=== likelihood is not > .79, unable to accept!"
  end if
  print "=== likelihood; ";likelihood
  print "=== command: ";command$
  print "=== commandParameter: ";commandParameter$
  return true
End Function


Sub startPlayback()
  m.timer.Start()
End Sub


Sub pausePlayback()
  m.timer.Stop()
End Sub


Sub rewind()

  m.photoIndex% = m.photoIndex% - 1
  if m.photoIndex% < 0 then
    m.photoIndex% = m.numPhotos% - 1
  endif

  photoId$ = m.photoIds[m.photoIndex%]
  idLength% = len(photoId$)
  dir1$ = mid(photoId$, idLength% - 1, 1)
  dir2$ = mid(photoId$, idLength%, 1)

  filePath$ = m.baseDir$ + ":/mediaItems/" + dir1$ + "/" + dir2$ + "/" + photoId$ + ".jpg"
  print filePath$

  aa = {}
  aa.filename = filePath$
  ok = m.imagePlayer.DisplayFile(aa)
  print "DisplayFile returned: ";ok
  print filePath$

  m.timer.Stop()

End Sub


Sub hideAlbumList()
  m.htmlContainer.Hide()
End Sub


Sub showAlbumList()
  m.htmlContainer.Show()
End Sub


Sub switchAlbum(albumName As String)
  m.photoIndex% = -1
  albumSpec = m.photoManifest.albums[lcase(albumName)]
  m.photoIds = albumSpec.mediaItemIds
  m.numPhotos% = m.photoIds.count()
End Sub


Sub nextPhoto()

  m.photoIndex% = m.photoIndex% + 1
  if m.photoIndex% >= m.numPhotos% then
    m.photoIndex% = 0
  endif

  photoId$ = m.photoIds[m.photoIndex%]
  idLength% = len(photoId$)
  dir1$ = mid(photoId$, idLength% - 1, 1)
  dir2$ = mid(photoId$, idLength%, 1)

  filePath$ = m.baseDir$ + ":/mediaItems/" + dir1$ + "/" + dir2$ + "/" + photoId$ + ".jpg"
  print filePath$

  aa = {}
  aa.filename = filePath$
  ok = m.imagePlayer.DisplayFile(aa)
  print "DisplayFile returned: ";ok
  print filePath$

  m.timer.Start()

End Sub



