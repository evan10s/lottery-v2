var wsb = new channels.WebSocketBridge();
wsb.connect('ws://' + window.location.host + "/kiosk/" + kiosk_id);
wsb.listen(function(a, s) {
  console.log(a.barcode,"scanned");
  switchScreens("screen-1","loading");
})

wsb.socket.addEventListener('open', function() {
  console.log("Connected to websocket")
  $('#status').text("Scan your ticket below")
})
var animationCycleTime = 1000
$(document).ready(function() {
  setInterval(fadeArrowsOut,2*animationCycleTime);
  setTimeout(function() { setInterval(fadeArrowsIn,2*animationCycleTime) },animationCycleTime)
  $("#screen-2").css("height",window.innerHeight);
  var blockHeight = $('#s2-center-vertical').height()
  var blockMargin = (window.innerHeight - blockHeight)/2;
  $('#s2-center-vertical').css("margin-top",blockMargin)
                          .css("margin-bottom",blockMargin)
});

function fadeArrowsOut() {
  $("i.barcode-arrow").animate({ opacity: .5},animationCycleTime);
}

function fadeArrowsIn() {
  $("i.barcode-arrow").animate({ opacity: 1},animationCycleTime);
}

function switchScreens(s1, s2) {
  s1 = "#" + s1;
  s2 = "#" + s2;
  $(s1).fadeOut();
  $(s2).fadeIn();
}
