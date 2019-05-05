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
        retval = parseearPhrase(m, intentName, probability, json)

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


Function parseearPhrase(h as object, intent as string, likelihood as float, json as object) as boolean
  id = "-1"

  if likelihood > .79 then
    if intent = "Aaron:what_should_I_bu" then
      id = "What-Should-I-Buy"
    else if intent = "Aaron:shopping_party" then
      id = "Shopping-Party"
    else if intent = "Aaron:amazon_meow" then
      id = "Meow"
    else if intent = "Aaron:joke_demo" then
      print type(json.slots)
      if json.slots.count() = 0 then
        value = ""
        id = "Joke"
        print "No slot value defined: ";id
      else if json.slots.count() > 0 then
        value = json.slots[0].value.value
      end if
      if value = "How Many" then
        id = "How-Many-Best-Buy-Joke"
      else if value = "Geek Squad" then
        id = "Geek-Squad-Joke"
      else if value = "Best Buy" then
        id = "Best-Buy-Joke"
      end if
    else if intent = "Aaron:music_by_genre" then
      id = "Playlist-Classical-Music"
    else if intent = "Aaron:timer" then
      id = "Time-Three-Seconds"
    else if intent = "Aaron:life_in_the_cloud" then
      id = "Life-In-The-Cloud"
    else if intent = "Aaron:turn_on_the_fan" then
      id = "Turn-On-The-Fan"
    else if intent = "Aaron:music_by_song" then
      id = "Play-Song-Thunder-Imagine-Dragons"
    else if intent = "Aaron:shirt_color" then
      id = "What-Color-Shirt"
    else if intent = "Aaron:light_demo" then
      print type(json.slots)
      if json.slots.count() = 0 then
        value = ""
        id = "-1"
        print "No slot value defined: ";id
      else if json.slots.count() > 0 then
        value = json.slots[0].value.value
      end if
      if value = "blue" then
        id = "blue"
      else if value = "bright" then
        id = "bright"
      else if value = "dim" then
        id = "dim"
      else if value = "pink" then
        id = "pink"
      else if value = "white" then
        id = "white"
      else if value = "purple" then
        id = "purple"
      else if value = "red" then
        id = "red"
      else if value = "yellow" then
        id = "yellow"
      else if value = "green" then
        id = "green"
      else if value = "off" then
        id = "off"
      else if value = "on" then
        id = "on"
      end if
    else if intent = "Aaron:what_is_demo" then
      print type(json.slots)
      if json.slots.count() = 0 then
        value = ""
        id = "-1"
        print "No slot value defined: ";id
      else if json.slots.count() > 0 then
        value = json.slots[0].value.value
      end if
      if value = "Amazon Echo" then
        id = "What-Is-Amazon-Echo"
      else if value = "Echo Show" then
        id = "What-Is-Echo-Show"
      else if value = "Echo Dot" then
        id = "What-Is-Echo-Dot"
      end if
    else if intent = "Aaron:whats_new" then
      id = "What-Is-New"
    else if intent = "Aaron:demo_rap" then
      id = "Can-You-Rap"
    else if intent = "Aaron:are_you_listening" then
      id = "Are-You-Listening"
    else if intent = "Aaron:music_play_list" then
      if json.slots.count() = 0 then
        value = ""
        id = "-1"
        print "No slot value defined: ";id
      else if json.slots.count() > 0 then
        value = json.slots[0].value.value
      end if
      if value = "favorite" then
        id = "Playlist-Favorite"
      else if value = "party" then
        id = "Playlist-Party"
      end if
    else
      print "=== Could not understand phrase!"
    end if
  else
    print "=== likelihood is not > .79, unable to accept!"
  end if
  id = id.trim()
  print "=== likelihood; ";likelihood
  print "=== id: ";id
  print "=== Successfully sent to BrightAuthor"
  return true
End Function
