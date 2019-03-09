Sub Main()
  RunTpp()
End Sub


Sub RunTpp()

  tpp = {}

' content is on sd or usb hard drive - select here
  tpp.baseDir$ = "sd"
  tpp.baseDir$ = "usb1"

  EnableZoneSupport(true)
  
  tpp.msgPort = CreateObject("roMessagePort")

  tpp.sysInfo = getSysInfo()

  tpp.ear = newEar(tpp.msgPort)

  imageSizeThreshold = {}
  imageSizeThreshold.width = 4042
  imageSizeThreshold.height = 4032
  imageSizeThreshold.ignore = true

  vm = CreateObject("roVideoMode")
  vm.SetImageSizeThreshold(imageSizeThreshold)

  r = CreateObject("roRectangle", 0, 0, 1920, 1080)
  tpp.imagePlayer = CreateObject("roImageWidget", r)
  tpp.imagePlayer.SetDefaultMode(1)
	tpp.imagePlayer.Show()

  tpp.timer = CreateObject("roTimer")
  tpp.timer.setPort(tpp.msgPort)
  tpp.timer.SetElapsed(4, 0)

  tpp.processHtmlEvent = processHtmlEvent
  tpp.processUdpEvent = processUdpEvent

  tpp.startPlayback = startPlayback
  tpp.pausePlayback = pausePlayback
  tpp.rewind = rewind
  tpp.switchAlbum = switchAlbum
  tpp.nextPhoto = nextPhoto

  tpp.udpNotificationAddress$ = "224.0.200.200"
  tpp.udpNotificationPort% = 5000
  tpp.udpReceivePort = 5000

  tpp.udpReceiver = CreateObject("roDatagramReceiver", tpp.udpReceivePort)
  tpp.udpReceiver.SetPort(tpp.msgPort)

  tpp.localServer = CreateObject("roHttpServer", { port: 8080 })
  tpp.localServer.SetPort(tpp.msgPort)

  tpp.localServer8008 = CreateObject("roHttpServer", { port: 8008 })
  tpp.localServer8008.SetPort(tpp.msgPort)

  tpp.GetIDAA =	{ HandleEvent: GetID, mVar: tpp }
  tpp.GetID = GetID

  tpp.GetRemoteDataAA =	{ HandleEvent: GetRemoteData, mVar: tpp }
  tpp.GetRemoteData = GetRemoteData

  tpp.GetCurrentStatusAA = { HandleEvent: GetCurrentStatus, mVar: tpp }
  tpp.GetCurrentStatus = GetCurrentStatus

  tpp.GetSnapshotConfigurationAA = { HandleEvent: GetSnapshotConfiguration, mVar: tpp }

  tpp.localServer.AddGetFromEvent({ url_path: "/GetRemoteData", user_data: tpp.GetRemoteDataAA })
  tpp.localServer.AddGetFromEvent({ url_path: "/GetID", user_data: tpp.GetIDAA })
  tpp.localServer.AddGetFromEvent({ url_path: "/GetCurrentStatus", user_data: tpp.GetCurrentStatusAA, passwords: invalid })        
  tpp.localServer.AddGetFromEvent({ url_path: "/GetSnapshotConfiguration", user_data: tpp.GetSnapshotConfigurationAA})

  tpp.localServer8008.AddGetFromEvent({ url_path: "/GetRemoteData", user_data: tpp.GetRemoteDataAA })
  tpp.localServer8008.AddGetFromEvent({ url_path: "/GetID", user_data: tpp.GetIDAA })
  tpp.localServer8008.AddGetFromEvent({ url_path: "/GetCurrentStatus", user_data: tpp.GetCurrentStatusAA, passwords: invalid })        
  tpp.localServer8008.AddGetFromEvent({ url_path: "/GetSnapshotConfiguration", user_data: tpp.GetSnapshotConfigurationAA})

  tpp.GetConfigurationPageAA = { HandleEvent: GetConfigurationPage, mVar: tpp }
  tpp.localServer8008.AddGetFromEvent({ url_path: "/", user_data: tpp.GetConfigurationPageAA, passwords: invalid})

  unitName$ = "photoPlayer"
  unitNamingMethod$ = "appendUnitIDToUnitName"
  unitDescription$ = ""
  lwsConfig$ = "content"
  
  service = { 
    name: "BrightSign Web Service", 
    type: "_http._tcp", 
    port: 8080, 
    _functionality: lwsConfig$, 
    _serialNumber: tpp.sysInfo.deviceUniqueID$, 
    _unitName: unitName$, 
    _unitNamingMethod: unitNamingMethod$, 
    _unitDescription: unitDescription$
  }

  tpp.advert = CreateObject("roNetworkAdvertisement", service)
  if tpp.advert = invalid then
    stop
  end if

  tpp.eventLoop = EventLoop

  print "PhotoPlayer start"
  manifest$ = ReadAsciiFile(tpp.baseDir$ + ":/mediaItems/photoCollectionManifest.json")
  tpp.photoManifest = ParseJson(manifest$)
  albums = tpp.photoManifest.albums
  
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

  tpp.eventLoop(tpp.msgPort)

End Sub


Function getSysInfo() as Object

  autorunVersion$ = "7.10.8"
  customAutorunVersion$ = "7.10.8"

  modelObject = CreateObject("roDeviceInfo")

  sysInfo = {}
  sysInfo.autorunVersion$ = autorunVersion$
  sysInfo.customAutorunVersion$ = customAutorunVersion$
  sysInfo.deviceUniqueID$ = modelObject.GetDeviceUniqueId()
  sysInfo.deviceFWVersion$ = modelObject.GetVersion()
  sysInfo.deviceFWVersionNumber% = modelObject.GetVersionNumber()

  sysInfo.deviceModel$ = modelObject.GetModel()
  sysInfo.deviceFamily$ = modelObject.GetFamily()
  sysInfo.enableLogDeletion = true

  sysInfo.ipAddressWired$ = "Invalid"
  nc = CreateObject("roNetworkConfiguration", 0)
  if type(nc) = "roNetworkConfiguration" then
    currentConfig = nc.GetCurrentConfig()
    if type(currentConfig) = "roAssociativeArray" then
      if currentConfig.ip4_address <> "" then
        sysInfo.ipAddressWired$ = currentConfig.ip4_address
      endif
    endif
  endif
  nc = invalid

  sysInfo.modelSupportsWifi = false
  sysInfo.ipAddressWireless$ = "Invalid"
  nc = CreateObject("roNetworkConfiguration", 1)
  if type(nc) = "roNetworkConfiguration" then
    currentConfig = nc.GetCurrentConfig()
    if type(currentConfig) = "roAssociativeArray" then
      sysInfo.modelSupportsWifi = true
      if currentConfig.ip4_address <> "" then
        sysInfo.ipAddressWireless$ = currentConfig.ip4_address
      endif
    endif
  endif
  nc = invalid

	' determine if the storage device is writable
	du = CreateObject("roStorageInfo", "./")
	if du.IsReadOnly() then
		sysInfo.storageIsWriteProtected = true
	else
		sysInfo.storageIsWriteProtected = false
	endif

  return sysInfo

End Function


Function newEar(msgPort As Object) As Object

  t = {}
  t.msgPort = msgPort

  print "=== Setting up node server..."
  t.htmlRect = CreateObject("roRectangle", 0, 0, 1000, 1080)
  is = {
      port: 2999
  }
  config = {
      nodejs_enabled: true,
      inspector_server: is,
      brightsign_js_objects_enabled: true,
      javascript_enabled: true,
      url:  "file:///sd:/server.html",
      security_params: {websecurity: false}
  }
  t.htmlNet = CreateObject("roHtmlWidget", t.htmlRect, config)
  t.htmlNet.setPort(t.msgPort)
  t.htmlNet.AllowJavaScriptUrls({ all: "*" })
  t.htmlNet.SetUserData("server")
  t.htmlNet.Show()

  return t

End Function


Sub processUdpEvent(event As Object)

  udpEvent$ = event.GetString()
  print "udpEvent: ";udpEvent$

  ' format
  '   <command>!!<parameters>
  regex = CreateObject("roRegEx", "!!", "i")
  commandComponents = regex.Split(udpEvent$)
  if commandComponents.Count() > 0 then
    command$ = commandComponents[0]
    if command$ = "album" then
      if commandComponents.Count() > 1 then
        albumName$ = commandComponents[1]
        print "Switch to album: ";albumName$
        m.switchAlbum(albumName$)
      else
        print "Syntax error: album name missing for album command"
      endif
    else if command$ = "startPlayback" then
      m.startPlayback()
    else if command$ = "pausePlayback" then
      m.pausePlayback()
    else if command$ = "rewind" then
      m.rewind()
    endif
  endif

End Sub


Sub processHtmlEvent(event As Object)

  eventData = event.GetData()
'      print "reason:"
'      print eventData.reason
  if eventData.reason = "message" then
'        print "message:"
'        print eventData.message
    message = eventData.message
    if type(message.event) = "roString" then
      if message.event = "intentParsed" then
        if type(message.payload) = "roString" then

          payload = ParseJson(message.payload)
          intent = payload.intent
          input = payload.input
          slots = payload.slots
          
          print "intent:"
          print intent.intentName
          
          print "input:"
          print input

          if type(slots) = "roArray" then
            if slots.count() > 0 then
              slot = slots[0]

              print "slotName:"
              print slot.slotName

              print "rawValue:"
              print slot.rawValue

              if type(slot.value) = "roAssociativeArray" then
                print "slotValue:"
                print slot.value
                command = slot.value.value
                if command = "on" then
                  m.startPlayback()
                else if command = "off" then
                  m.pausePlayback()
                else if command = "blue" then
                  m.switchAlbum("New Zealand -Abel Tasman")
                else if command = "red" then
                  m.switchAlbum("Cabo2018")
                endif
              endif
            endif
          endif
        endif
      endif
    endif
  endif
End Sub


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


Sub switchAlbum(albumName As String)
  m.photoIndex% = -1
  m.photoIds = m.photoManifest.albums[albumName]
  m.numPhotos% = m.photoIds.count()
End Sub


Sub nextPhoto()

  ' perform initialization (select album) if necessary
  if m.numPhotos% = invalid then
    m.switchAlbum("Cabo2018")
  endif

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


Sub GetID(userData as Object, e as Object)

  mVar = userData.mVar

  print "respond to GetID request"

  root = CreateObject("roXMLElement")
  root.SetName("BrightSignID")

  PopulateIDData(mVar, root)

  xml = root.GenXML({ indent: " ", newline: chr(10), header: true })

  e.AddResponseHeader("Content-type", "text/xml")
  e.SetResponseBodyString(xml)
  e.SendResponse(200)
      
End Sub


Sub GetRemoteData(userData as Object, e as Object)
  
  mVar = userData.mVar

  print "respond to GetRemoteData request"

  root = CreateObject("roXMLElement")
  root.SetName("BrightSignRemoteData")

  PopulateIDData(mVar, root)

  PopulateUDPData(mVar, root)

  elem = root.AddElement("contentPort")
  elem.SetBody("8008")

' TODO
  elem = root.AddElement("activePresentation")
'  if mVar.activePresentation$ <> invalid then
'  elem.SetBody(mVar.activePresentation$)
'  endif
  elem.SetBody("photoJeeves")

  xml = root.GenXML({ indent: " ", newline: chr(10), header: true })
print xml

  e.AddResponseHeader("Content-type", "text/xml")
  e.SetResponseBodyString(xml)
  e.SendResponse(200)

End Sub


Sub PopulateIDData(mVar As Object, root As Object)

  unitName$ = "photoPlayer"
  unitNamingMethod$ = "appendUnitIDToUnitName"
  unitDescription$ = ""
  lwsConfig$ = "content"

  elem = root.AddElement("unitName")
  elem.SetBody(unitName$)

  elem = root.AddElement("unitNamingMethod")
  elem.SetBody(unitNamingMethod$)

  elem = root.AddElement("unitDescription")
  elem.SetBody(unitDescription$)

  elem = root.AddElement("serialNumber")
  elem.SetBody(mVar.sysInfo.deviceUniqueID$)

  elem = root.AddElement("functionality")
  elem.SetBody(lwsConfig$)

  elem = root.AddElement("autorunVersion")
  elem.SetBody(mVar.sysInfo.autorunVersion$)

  elem = root.AddElement("firmwareVersion")
  elem.SetBody(mVar.sysInfo.deviceFWVersion$)

  elem = root.AddElement("bsnActive")
  elem.SetBody("no")

  elem = root.AddElement("snapshotsAvailable")
  elem.SetBody("no")
	
End Sub


' requires the following
' label & action for each udp item that appears in app.

Sub PopulateUDPData(mVar As Object, root As Object)

  tpp = mVar

  elem = root.AddElement("udpNotificationAddress")
  elem.SetBody(tpp.udpNotificationAddress$)

  elem = root.AddElement("notificationPort")
  elem.SetBody(StripLeadingSpaces(stri(tpp.udpNotificationPort%)))

  elem = root.AddElement("destinationPort")
  elem.SetBody(StripLeadingSpaces(stri(tpp.udpNotificationPort%)))

  elem = root.AddElement("receivePort")
  elem.SetBody(StripLeadingSpaces(stri(tpp.udpReceivePort)))

  udpEventsElem = root.AddElement("udpEvents")
  udpEventsElem.AddAttribute("useLabel","true")

  udpEventElem = udpEventsElem.AddElement("udpEvent")
  udpEventLabel = udpEventElem.AddElement("label")
  udpEventLabel.SetBody("Start")
  udpEventAction = udpEventElem.AddElement("action")
  udpEventAction.SetBody("startPlayback")

  udpEventElem = udpEventsElem.AddElement("udpEvent")
  udpEventLabel = udpEventElem.AddElement("label")
  udpEventLabel.SetBody("Pause")
  udpEventAction = udpEventElem.AddElement("action")
  udpEventAction.SetBody("pausePlayback")

  ' album!!<album name>

  albums = tpp.photoManifest.albums
  albumNames = []
  for each albumName in albums
    albumNames.push(lcase(albumName))
    print albumName
  next

  for i = 0 to albumNames.count() - 1
    albumName$ = albumNames[i]
    udpEventElem = udpEventsElem.AddElement("udpEvent")
    udpEventLabel = udpEventElem.AddElement("label")
    udpEventLabel.SetBody(albumName$)
    udpEventAction = udpEventElem.AddElement("action")
    udpEventAction.SetBody("album!!" + albumName$)
  next

End Sub


Sub GetCurrentStatus(userData as Object, e as Object)

  mVar = userData.mVar

  '    print "respond to GetCurrentStatus request"

  root = CreateObject("roXMLElement")
  root.SetName("BrightSignStatus")

  autorunVersion$ = mVar.sysInfo.autorunVersion$

  unitName$ = "photoPlayer"
  unitNamingMethod$ = "appendUnitIDToUnitName"
  unitDescription$ = ""
    
  elem = root.AddElement("unitName")
  elem.AddAttribute("label", "Unit Name")
  elem.SetBody(unitName$)

  elem = root.AddElement("unitNamingMethod")
  elem.AddAttribute("label", "Unit Naming Method")
  elem.SetBody(unitNamingMethod$)

  elem = root.AddElement("unitDescription")
  elem.AddAttribute("label", "Unit Description")
  elem.SetBody(unitDescription$)

  modelObject = CreateObject("roDeviceInfo")
  
  elem = root.AddElement("model")
  elem.AddAttribute("label", "Model")
  elem.SetBody(modelObject.GetModel())

  elem = root.AddElement("firmware")
  elem.AddAttribute("label", "Firmware")
  elem.SetBody(modelObject.GetVersion())

  elem = root.AddElement("autorun")
  elem.AddAttribute("label", "Autorun")
  elem.SetBody(mVar.sysInfo.autorunVersion$)

  elem = root.AddElement("serialNumber")
  elem.AddAttribute("label", "Serial Number")
  elem.SetBody(modelObject.GetDeviceUniqueId())

  elem = root.AddElement("functionality")
  elem.AddAttribute("label", "Functionality")
  elem.SetBody("content")
    
' 86400 seconds per day
  deviceUptime% = modelObject.GetDeviceUptime()
  numDays% = deviceUptime% / 86400
  numHours% = (deviceUptime% - (numDays% * 86400)) / 3600
  numMinutes% = (deviceUptime% - (numDays% * 86400) - (numHours% * 3600)) / 60
  numSeconds% = deviceUptime% - (numDays% * 86400) - (numHours% * 3600) - (numMinutes% * 60)
  deviceUptime$ = ""
  if numDays% > 0 then deviceUptime$ = stri(numDays%) + " days "
  if numHours% > 0 then deviceUptime$ = deviceUptime$ + stri(numHours%) + " hours "
  if numMinutes% > 0 then deviceUptime$ = deviceUptime$ + stri(numMinutes%) + " minutes "
  if numSeconds% > 0 then deviceUptime$ = deviceUptime$ + stri(numSeconds%) + " seconds"
            
  elem = root.AddElement("deviceUptime")
  elem.AddAttribute("label", "Device Uptime")
  elem.SetBody(deviceUptime$)
  
  elem = root.AddElement("activePresentation")
  elem.AddAttribute("label", "Active Presentation")
  elem.SetBody(mVar.activePresentation$)
    
  xml = root.GenXML({ header: true })

  e.AddResponseHeader("Content-type", "text/xml")
  e.SetResponseBodyString(xml)
  e.SendResponse(200)
  
End Sub


Function GetSnapshotConfiguration(userData as Object, e as Object) As Object

  mVar = userData.mVar

  globalAA = GetGlobalAA()

  root = CreateObject("roXMLElement")
  root.SetName("BrightSignSnapshots")
  root.AddAttribute("Count", "0")

  ' CanConfigure attribute notifies clients if snapshot configuration can be managed by this unit
  root.AddAttribute("CanConfigure","false")

  xml = root.GenXML({ indent: " ", newline: chr(10), header: true })

  e.AddResponseHeader("Content-type", "text/xml")
  e.SetResponseBodyString(xml)
  e.SendResponse(200)

End Function


Function GetConfigurationPage(userData as Object, e as Object) As Object

' TODO - return some real html here

  e.AddResponseHeader("Content-type", "text/html; charset=utf-8")
  e.SetResponseBodyString("")
'   if not e.SendResponse(403) then stop
  e.SendResponse(200)

End Function


Function StripLeadingSpaces(inputString$ As String) As String

    while true
        if left(inputString$, 1)<>" " then return inputString$
        inputString$ = right(inputString$, len(inputString$)-1)
    endwhile

    return inputString$

End Function


Sub EventLoop(msgPort As Object)

  ' m.switchAlbum("Lori-Shared#2")
  ' m.switchAlbum("2015")
  ' m.switchAlbum("test2")
  ' m.switchAlbum("Trips")
  ' m.startPlayback()

  while true
    event = wait(0, msgPort)
    print "event: " + type(event)
    if type(event) = "roTimerEvent" then
      m.nextPhoto()
    else if type(event) = "roHtmlWidgetEvent" then
      m.processHtmlEvent(event)
    else if type(event) = "roHttpEvent" then
      userdata = event.GetUserData()
      if type(userdata) = "roAssociativeArray" and type(userdata.HandleEvent) = "roFunction" then
        userData.HandleEvent(userData, event)
      endif
    else if type(event) = "roDatagramEvent" then
      m.processUdpEvent(event)
    endif
  end while

End Sub
