var wsb = new channels.WebSocketBridge();
var currentUser;
var transactionInProgress = false;

wsb.connect('ws://' + window.location.host + "/kiosk/" + kiosk_id);
wsb.listen(function(a, s) {
  console.log("Barcode scanned:",a.barcode);
  if (!transactionInProgress) {
    if (a.msgType === "info") {
      switchScreens("setup","screen-1");
    } else if (a.msgType === "data") {
      currentUser = a.barcode;
      transactionInProgress = true;
      switchScreens("screen-1","loading");
      validateBarcode(currentUser).then(function (result) {
        if (result) {
          return hasUsername(currentUser);
        }
      }).then(function (result) {
        if (result) {
          switchScreens("loading","screen-3");
        } else {
          switchScreens("loading","screen-2");
        }
      });
    }
  }
})

wsb.socket.addEventListener('open', function() {
  console.log("Connected to websocket");
})
var animationCycleTime = 1000
$(document).ready(function() {
  $('#screen-1,#screen-2,#loading').hide();
  $('#server-address').text(window.location.host);
  $('#kiosk-id').text(kiosk_id);
  setInterval(fadeArrowsOut,2*animationCycleTime);
  setTimeout(function() { setInterval(fadeArrowsIn,2*animationCycleTime) },animationCycleTime)
  $("#screen-2").css("height",window.innerHeight);
  var blockHeight = $('#s2-center-vertical').height()
  var blockMargin = (window.innerHeight - blockHeight)/2;
  $('#s2-center-vertical').css("padding-top",blockMargin);

  $('#continue').on("click",submitUsername);

});

function fadeArrowsOut() {
  $("i.barcode-arrow").animate({ opacity: .6},animationCycleTime);
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

function submitUsername() {
  var usernameVal = $('#user-name').val();
  if (!usernameVal) {

  } else {
    switchScreens("screen-2","loading");
    $.ajax({
    	url: "/api/kiosk/saveName",
    	method: "POST",
    	data: {
    		name: username,
    		username: "ABC123"
        }
    });
  }
}

function validateBarcode(barcode) {
  return $.ajax({
    url: "/api/kiosk/validateBarcode/" + barcode,
    method: "GET",
  }).then(function(result) {
    console.log("Result of validateBarcode:",result,result === "User exists");
    return result === "User exists";
  });
}

function hasUsername(barcode) {
  console.log("inside has Username");
  return $.ajax({
    url: "/api/kiosk/" + barcode + "/checkForName",
    method: "GET",
  }).then(function(result) {
    console.log("Result of hasUsername",result,result === "User has name");
    return result === "User has name";
  });
}

//this code block ($.ajaxSetup) allows Django's CSRF protection to work with AJAX requests and is from http://stackoverflow.com/a/5107878
$.ajaxSetup({
   beforeSend: function(xhr, settings) {
       function getCookie(name) {
           var cookieValue = null;
           if (document.cookie && document.cookie != '') {
               var cookies = document.cookie.split(';');
               for (var i = 0; i < cookies.length; i++) {
                   var cookie = jQuery.trim(cookies[i]);
                   // Does this cookie string begin with the name we want?
                   if (cookie.substring(0, name.length + 1) == (name + '=')) {
                       cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                       break;
                   }
               }
           }
           return cookieValue;
       }
       if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
           // Only send the token to relative URLs i.e. locally.
           xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
       }
   }
});
//end of code block from http://stackoverflow.com/a/5107878
