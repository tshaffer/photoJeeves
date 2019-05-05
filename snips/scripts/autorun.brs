Sub Main()
  RunSnips()
End Sub

Sub RunSnips()

  snips = {}

  snips.msgPort = CreateObject("roMessagePort")
  snips.ProcessEvent = processEvent

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

  snips.eventLoop = EventLoop

  snips.eventLoop(snips.msgPort)

End Sub

Sub EventLoop(msgPort As Object)

  while true
    event = wait(0, msgPort)
    print "event: " + type(event)
    m.processEvent(event)
  end while

End Sub


Function processEvent(event As Object) as boolean

  print "=== processEvent"
  print type(event)

  retval = false
  
  if type(event) = "roHtmlWidgetEvent" then
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
        retval = parsePhrase(m, intentName, probability, json)

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
	else if type(event) = "roAssociativeArray" then
    if type(event["EventType"]) = "roString"
    print "=== event[EventType]: ";event["EventType"]
      if (event["EventType"] = "SEND_PLUGIN_MESSAGE") then
        if (event["PluginName"] = "ear") then
          pluginMessage = event["PluginMessage"]
          print "Received a Plugin Message: "; pluginMessage
          if pluginMessage = "showInfo" then
              m.htmlContainer.Show()
          else if pluginMessage = "hideInfo" then
              m.htmlContainer.Hide()
          else if pluginMessage = "enableTriggerDetection" then
            m.htmlContainer.PostJSMessage({type:"enableTriggerDetection"})
            print "===Trigger on"
          else if pluginMessage = "disableTriggerDetection" then
            m.htmlContainer.PostJSMessage({type:"disableTriggerDetection"})
            print "===Trigger off"
          end if
        end if
      end if
    end if
  end if

  return retval
End Function


Function parsePhrase(h as object, intent as string, likelihood as float, json as object) as boolean

  print "******** parsePhrase, type(json):"
  print type(json)
  print "******** intent"
  print intent

  command$ = ""

  if likelihood > .79 then
    if intent = "&KV4lavkZXDmNqwJXzB52DWmBwMLegAM6Oyr2o1PE:ListAlbums" then
      command$ = "ListAlbums"
    else if intent = "&KV4lavkZXDmNqwJXzB52DWmBwMLegAM6Oyr2o1PE:Resume" then
      command$ = "Resume"
    else if intent = "&KV4lavkZXDmNqwJXzB52DWmBwMLegAM6Oyr2o1PE:pause" then
      command$ = "Pause"
    else if intent = "&KV4lavkZXDmNqwJXzB52DWmBwMLegAM6Oyr2o1PE:rewind" then
      command$ = "Rewind"
    else
      print "=== Could not understand phrase!"
    end if
  else
    print "=== likelihood is not > .79, unable to accept!"
  end if
  print "=== likelihood; ";likelihood
  print "=== command: ";command$
  return true
End Function
