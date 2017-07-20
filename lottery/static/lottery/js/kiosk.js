var wsb = new channels.WebSocketBridge();
var currentUser;
var transactionInProgress = false;

wsb.connect('ws://' + window.location.host + "/kiosk/" + kiosk_id);
wsb.listen(async function(a, s) {
  if (a.msgType === "data") {
    console.log("Barcode scanned:",a.barcode);
  } else {
    console.log("Websocket message:",a);
  }
  if (!transactionInProgress) {
    if (a.msgType === "info") {
      switchScreens("setup","screen-1");
    } else if (a.msgType === "data") {
      currentUser = a.barcode;
      transactionInProgress = true;
      switchScreens("screen-1","loading");

      if (await validateBarcode(currentUser)) {
        clearErrorMessage();
        if (await hasUsername(currentUser)) {
          updateTicketsTable(await getRecentTickets(currentUser));
          console.log("got recent tickets");
          switchScreens("loading","screen-3");

        } else {

          switchScreens("loading","screen-2");
        }
      } else {
        console.log("Unrecognized barcode")
        returnToWelcomeWithError("The ticket you just scanned couldn't be validated.  Please see a lottery administrator for more information.");
        transactionInProgress = false;
      }
      // validateBarcode(currentUser).then(function (result) {
      //   console.log(result);
      //   if (result) {
      //     console.log("inside true");
      //     return hasUsername(currentUser);
      //   } else {
      //     console.log("inside false");
      //     Promise.reject("User DNE");
      //   }
      // }, returnToWelcomeWithError("That barcode isn't in this system")).then(function (result) {
      //   if (result) {
      //     switchScreens("loading","screen-3");
      //   } else {
      //     switchScreens("loading","screen-2");
      //   }
      // }).catch(function() { console.log("Caught an error"); });

    } else if (a.msgType === "searchAcknowledge") {
      console.log("Scanner search was acknowledged",a);
      switchScreens("setup","screen-1");
    }
  }
})

wsb.socket.addEventListener('open', function() {
  console.log("Connected to websocket");
  wsb.send({"msgType":"searchForScanner"});
})
var animationCycleTime = 1000
$(document).ready(function() {
  $('#screen-1,#screen-2,#screen-3,#loading').hide();
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

function returnToWelcomeWithError(msg) {
  console.log("Error, returning to screen-1 (welcome)","The specific error is:",msg);
  $('#screen-1,#screen-2,#screen-3,#loading').fadeOut();
  $('#s1-error-msg > h5').text(msg).parent().removeClass("hide");
  $("#screen-1").fadeIn();
}

function clearErrorMessage() {
  $('#s1-error-msg').addClass("hide");
}

async function submitUsername() {
  var usernameVal = $('#user-name').val();
  if (usernameVal === "") {
    $('#name-submit-error').removeClass("hide");
  } else {
    switchScreens("screen-2","loading");
    var submitResult = $.ajax({
    	url: "/api/kiosk/saveName",
    	method: "POST",
    	data: {
    		name: usernameVal,
    		username: currentUser
        }
    });
    if (await submitResult !== "Username saved") {
      $('#name-submit-error').removeClass("hide");
    } else {
      switchScreens("loading","screen-3");
    }

  }
}

async function validateBarcode(barcode) {
   var result = $.ajax({
    url: "/api/kiosk/validateBarcode/" + barcode,
    method: "GET",
  });
    console.log("Result of validateBarcode:",await result, await result === "User exists");
    return await result === "User exists";

}

async function hasUsername(barcode) {
  console.log("inside has Username");
  var result = $.ajax({
      url: "/api/kiosk/" + barcode + "/checkForName",
      method: "GET"
    });
    console.log("Result of hasUsername",await result, await result === "User has name");
    return await result === "User has name";

}

async function getRecentTickets(barcode) {
  var num = 5; //Get 5 recent tickets at most
  var result = $.ajax({
    url: "/api/kiosk/" + barcode + "/recentTickets/" + num,
    method: "GET"
  })

  console.log(await result);
  return await result;
}

function updateTicketsTable(result) {
  let tickets = result.tickets;
  console.log(tickets)
  for (let t of tickets) {
    $('#tickets-list').append(`<tr>
                                  <td>${t.id}</td>
                                  <td>${t.numbers.toString()}</td>
                                  </tr>`)
  }
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
