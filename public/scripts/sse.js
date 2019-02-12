console.log('hello, I am sse');

var evtSource = new EventSource('events'); 

evtSource.onmessage = function(e) {
  console.log('received message');
  console.log(e);
}