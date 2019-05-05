//version = 3
//adds support for turning trigger word on and off

var bsMessagePort = new BSMessagePort()
mqtt = require('./mqttShim.js');
var client  = mqtt.connect('mqtt:localhost');

var bsMessage = new BSMessagePort();
 
bsMessage.onbsmessage = function(msg)
{
      console.log('bsMessage.onbsmessage')  

    if (msg.data['type'] == 'enableTriggerDetection')
    {
      client.publish('brightear/trigger/toggleOn', '{"siteId": "default"}')
      console.log('On')  
    } else if (msg.data['type'] == 'disableTriggerDetection'){
      client.publish('brightear/trigger/toggleOff', '{"siteId": "default"}')
      console.log('Off')  
    }
}

client.on("message", function (topic, payload) {
    console.log([topic, payload].join(": "))
    console.log("TOPIC: " + topic);

    var event = ''
    var content = ''
    if (topic == 'brightear/speech/textCaptured') {
        out = document.getElementById('result')
        out.textContent = payload
        event = 'textCaptured'
        content = payload
    } else if (topic == 'brightear/speech/startListening') {
        act = document.getElementById('action')
        act.style.color = "red"
        event = 'startListening'
    } else if (topic == 'brightear/speech/stopListening') {
        act = document.getElementById('action')
        act.style.color = "white"
        event = 'stopListening'
    //}else if (topic == 'brightear/trigger/default/detected') {
    //    act = document.getElementById('hotword')
    //    act.style.color = "orange"
    //    event = 'startListening'
    //    setTimeout(function(){document.getElementById('hotword').style.color = 'white'}, 1000)
    } else if (topic == 'brightear/language/intentParsed') {
        res = document.getElementById('intentresult')
        res.textContent = payload
        event = 'intentParsed'
        content = payload
        //client.publish('brightear/speech/stopListening', {"sideId": "default"})
    } else if (topic == 'brightear/language/intentNotRecognised') {
        res = document.getElementById('notrecognized')
        res.textContent = payload
        event = 'intentNotRecognised'
        content = payload
        //client.publish('brightear/speech/stopListening', {"sideId": "default"})
    }
    
    if (event != '') {
        console.log("PostBSMessage");
        // console.log(content);
        bsMessagePort.PostBSMessage({event: event, payload: String(payload)})
    }
})

client.subscribe("brightear/trigger/+/detected")
client.subscribe("brightear/speech/toggleOff")
client.subscribe("brightear/speech/toggleOn")
client.subscribe("brightear/speech/startListening")
client.subscribe("brightear/speech/stopListening")
client.subscribe("brightear/speech/reload")
client.subscribe("brightear/speech/error")
client.subscribe("brightear/speech/textCaptured")
client.subscribe("brightear/language/slotParsed")
client.subscribe("brightear/language/intentParsed")
client.subscribe("brightear/language/intentNotRecognised")
client.subscribe("brightear/language/error")
client.subscribe("brightear/language/query")
client.subscribe("brightear/language/partialQuery")
client.subscribe("brightear/language/versionRequest")
client.subscribe("brightear/language/reload")
