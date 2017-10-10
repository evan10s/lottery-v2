var wsb = new channels.WebSocketBridge();
var currentUser;
var transactionInProgress = false;

wsb.connect('ws://' + window.location.host + "/kiosk/" + kiosk_id);
wsb.listen(async function(a, s) {
  if (a.msgType === "data") {
    console.log("Barcode scanned:", a.barcode);
  } else {
    console.log("Websocket message:", a);
  }
  if (!transactionInProgress) {
    if (a.msgType === "info") {
      switchScreens("setup", "screen-1");
    } else if (a.msgType === "data") {
      currentUser = a.barcode;
      transactionInProgress = true;
      switchScreens("screen-1", "loading");

      if (await validateBarcode(currentUser)) {
        clearErrorMessage();
        if (await hasUsername(currentUser)) {
          resetTicketScreen();
          updateTicketsTable(await getRecentTickets(currentUser));
          console.log("got recent tickets");
          switchScreens("loading", "screen-3");

        } else {

          switchScreens("loading", "screen-2");
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
      console.log("Scanner search was acknowledged", a);
      switchScreens("setup", "screen-1");
    }
  }
})

wsb.socket.addEventListener('open', function() {
  console.log("Connected to websocket");
  wsb.send({
    "msgType": "searchForScanner"
  });
})
var animationCycleTime = 1000
$(document).ready(function() {
  $('#screen-1,#screen-2,#screen-3,#loading').hide();
  $('#server-address').text(window.location.host);
  $('#kiosk-id').text(kiosk_id);
  setInterval(fadeArrowsOut, 2 * animationCycleTime);
  setTimeout(function() {
    setInterval(fadeArrowsIn, 2 * animationCycleTime)
  }, animationCycleTime)
  $("#screen-2").css("height", window.innerHeight);
  var blockHeight = $('#s2-center-vertical').height()
  var blockMargin = (window.innerHeight - blockHeight) / 2;
  $('#s2-center-vertical').css("padding-top", blockMargin);

  $('#continue').on("click", submitUsername);
  $('.submit-ticket').on("click", submitTicket);
  $('.kiosk-end-session').on("click", endSession);


  setupLotteryTicket(1, 36, 6, false);
  $('#lottery-nums > tr').on("click", "td:not(.no-num)", numberClicked)

});

function fadeArrowsOut() {
  $("i.barcode-arrow").animate({
    opacity: .6
  }, animationCycleTime);
}

function fadeArrowsIn() {
  $("i.barcode-arrow").animate({
    opacity: 1
  }, animationCycleTime);
}

function switchScreens(s1, s2) {
  s1 = "#" + s1;
  s2 = "#" + s2;
  $(s1).fadeOut();
  $(s2).fadeIn();
}

function endSession() {
  switchScreens("screen-3", "screen-1");
  $("#user-name").val("");
  transactionInProgress = false;
}

function resetTicketScreen() {
  $('.submit-ticket, .submit-ticket.kiosk-end-session').removeAttr("disabled");
  $("#max-nums-selected, #ticket-submit-error, #ticket-submit-loading-bar").addClass("hide");
  $('.submit-ticket:not(.kiosk-end-session)').removeClass("success").text("Submit this ticket");
  $("#lt-submit-btns").removeClass("hide");
  $('#tickets-list > tr').remove();
}

function numberClicked() {
  if ($(".kiosk-end-session.submit-ticket[disabled]").length >= 1) {
    return;
  }
  let $submitTkBtn = $(".submit-ticket:not(.kiosk-end-session)");
  if ($submitTkBtn.hasClass("success")) {
    $submitTkBtn.removeClass("success").text("Submit this ticket");
  }

  if (!$(this).hasClass("selected") && $(".selected").length >= 4) {
    $('#max-nums-attempted').text($(this).html());
    $('#max-nums-selected').removeClass("hide");
  } else {
    $('#max-nums-selected').addClass("hide");
    $(this).toggleClass("selected");
  }

  console.log($(this).html());
}

function setupLotteryTicket(startNum, endNum, rowLength, offsetEvenRows) {
  let currentNum = startNum;
  let oddRowLen = rowLength,
    evenRowLen = (offsetEvenRows) ? rowLength + 1 : rowLength,
    currentRowLength,
    appendStr = "";
  for (let row = 1; row <= Math.ceil((endNum - startNum + 1) / rowLength); row++) {
    if (row % 2 === 0 && offsetEvenRows) { //even row
      currentRowLength = evenRowLen;
      appendStr += "<tr><td class='no-num'></td>";
    } else {
      currentRowLength = oddRowLen;
      appendStr += "<tr>";
    }


    for (let col = 0; col < rowLength; col++) {
      appendStr += `<td>${currentNum}</td>`;
      if (currentNum === endNum) {
        break;
      } else {
        currentNum++;
      }
    }
    appendStr += `</tr>`;
  }
  $("#lottery-nums").append(appendStr);
}

function returnToWelcomeWithError(msg) {
  console.log("Error, returning to screen-1 (welcome)", "The specific error is:", msg);
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
    switchScreens("screen-2", "loading");
    var submitResult = $.ajax({
      url: "/api/kiosk/saveName",
      method: "POST",
      data: {
        name: usernameVal,
        username: currentUser
      }
    });
    if (await submitResult !== "200 OK") {
      $('#name-submit-error').removeClass("hide");
      switchScreens("loading", "screen-2", );
    } else {
      switchScreens("loading", "screen-3");
    }

  }
}

async function validateBarcode(barcode) {
  var result = $.ajax({
    url: "/api/kiosk/validateBarcode/" + barcode,
    method: "GET",
  });
  console.log("Result of validateBarcode:", await result, await result === "User exists");
  return await result === "User exists";

}

async function hasUsername(barcode) {
  console.log("inside has Username");
  var result = $.ajax({
    url: "/api/kiosk/" + barcode + "/checkForName",
    method: "GET"
  });
  console.log("Result of hasUsername", await result, await result === "User has name");
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
                                <td>${t.numbers.toString().replace(/,/g,", ")}</td>
                                </tr>`)
  }

}

function updateTicketsTableServerResponse(tk) {
  console.log(tk)
  let $tkList = $('#tickets-list');

  if ($tkList.children().length === 5) {
    $('#tickets-list > tr:last-child').remove();
  }

  $('#tickets-list').prepend(`<tr>
                              <td>${tk.id}</td>
                              <td>${tk.nums}</td>
                              </tr>`)
}



function getSelectedNums() {
  let nums = []
  $(".selected").each((index, elem) => { //jQuery .each() provides index and element parameters: https://stackoverflow.com/a/36638003/5434744
    nums.push($(elem).html());
  });
  return nums;
}

function submitTicket() {
  $("#lt-submit-btns, #ticket-submit-loading-bar").toggleClass("hide");
  $('#ticket-submit-error, #max-nums-selected').addClass("hide");

  $.ajax({
    url: "/api/kiosk/tickets/add/" + currentUser,
    method: "POST",
    data: {
      nums: getSelectedNums().toString()
    }
  }).then((result) => {
    $("#lt-submit-btns, #ticket-submit-loading-bar").toggleClass("hide");
    $('.selected').removeClass("selected");
    console.log("result is", result);

    if (result.state === "error") {
      $("#ticket-submit-error").removeClass("hide");
      $("#ticket-submit-error > p").text(result.status);
      if (result.hasOwnProperty("error_short_desc")) {
        if (result.error_short_desc === "TICKET_RATE_LIMIT_EXCEEDED") {
          $('.submit-ticket, .submit-ticket.kiosk-end-session').attr("disabled", "disabled");
        }
      }
    } else {
      $(".submit-ticket:not(.kiosk-end-session)").addClass("success").text("Ticket submitted");
      updateTicketsTableServerResponse(result);
    }
  }, (e) => {
    $("#lt-submit-btns, #ticket-submit-loading-bar").toggleClass("hide");
    $('#ticket-submit-error').removeClass("hide");
    $("#ticket-submit-error").text("We couldn't process your ticket right now.  Please try again or contact the lottery administrator for assistance.");
  });
  //.catch((e) => console.error("Ticket submit error", e));
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
