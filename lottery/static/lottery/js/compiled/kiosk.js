"use strict";

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var submitUsername = function () {
  var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
    var usernameVal, submitResult;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            usernameVal = $('#user-name').val();

            if (!(usernameVal === "")) {
              _context2.next = 5;
              break;
            }

            $('#name-submit-error').removeClass("hide");
            _context2.next = 16;
            break;

          case 5:
            switchScreens("screen-2", "loading");
            submitResult = $.ajax({
              url: "/api/kiosk/saveName",
              method: "POST",
              data: {
                name: usernameVal,
                username: currentUser
              }
            });
            _context2.next = 9;
            return submitResult;

          case 9:
            _context2.t0 = _context2.sent;

            if (!(_context2.t0 !== "200 OK")) {
              _context2.next = 15;
              break;
            }

            $('#name-submit-error').removeClass("hide");
            switchScreens("loading", "screen-2");
            _context2.next = 16;
            break;

          case 15:
            switchScreens("loading", "screen-3");

          case 16:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function submitUsername() {
    return _ref2.apply(this, arguments);
  };
}();

var validateBarcode = function () {
  var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(barcode) {
    var result;
    return _regenerator2.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            result = $.ajax({
              url: "/api/kiosk/validateBarcode/" + barcode,
              method: "GET"
            });
            _context3.t0 = console;
            _context3.next = 4;
            return result;

          case 4:
            _context3.t1 = _context3.sent;
            _context3.next = 7;
            return result;

          case 7:
            _context3.t2 = _context3.sent;
            _context3.t3 = _context3.t2 === "User exists";

            _context3.t0.log.call(_context3.t0, "Result of validateBarcode:", _context3.t1, _context3.t3);

            _context3.next = 12;
            return result;

          case 12:
            _context3.t4 = _context3.sent;
            return _context3.abrupt("return", _context3.t4 === "User exists");

          case 14:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function validateBarcode(_x3) {
    return _ref3.apply(this, arguments);
  };
}();

var hasUsername = function () {
  var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(barcode) {
    var result;
    return _regenerator2.default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            console.log("inside has Username");
            result = $.ajax({
              url: "/api/kiosk/" + barcode + "/checkForName",
              method: "GET"
            });
            _context4.t0 = console;
            _context4.next = 5;
            return result;

          case 5:
            _context4.t1 = _context4.sent;
            _context4.next = 8;
            return result;

          case 8:
            _context4.t2 = _context4.sent;
            _context4.t3 = _context4.t2 === "User has name";

            _context4.t0.log.call(_context4.t0, "Result of hasUsername", _context4.t1, _context4.t3);

            _context4.next = 13;
            return result;

          case 13:
            _context4.t4 = _context4.sent;
            return _context4.abrupt("return", _context4.t4 === "User has name");

          case 15:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function hasUsername(_x4) {
    return _ref4.apply(this, arguments);
  };
}();

var getRecentTickets = function () {
  var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(barcode) {
    var num, result;
    return _regenerator2.default.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            num = 5; //Get 5 recent tickets at most

            result = $.ajax({
              url: "/api/kiosk/" + barcode + "/recentTickets/" + num,
              method: "GET"
            });
            _context5.t0 = console;
            _context5.next = 5;
            return result;

          case 5:
            _context5.t1 = _context5.sent;

            _context5.t0.log.call(_context5.t0, _context5.t1);

            _context5.next = 9;
            return result;

          case 9:
            return _context5.abrupt("return", _context5.sent);

          case 10:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function getRecentTickets(_x5) {
    return _ref5.apply(this, arguments);
  };
}();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var wsb = new channels.WebSocketBridge();
var currentUser;
var transactionInProgress = false;

wsb.connect('ws://' + window.location.host + "/kiosk/" + kiosk_id);
wsb.listen(function () {
  var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(a, s) {
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (a.msgType === "data") {
              console.log("Barcode scanned:", a.barcode);
            } else {
              console.log("Websocket message:", a);
            }

            if (transactionInProgress) {
              _context.next = 36;
              break;
            }

            if (!(a.msgType === "info")) {
              _context.next = 6;
              break;
            }

            switchScreens("setup", "screen-1");
            _context.next = 36;
            break;

          case 6:
            if (!(a.msgType === "data")) {
              _context.next = 35;
              break;
            }

            currentUser = a.barcode;
            transactionInProgress = true;
            switchScreens("screen-1", "loading");

            _context.next = 12;
            return validateBarcode(currentUser);

          case 12:
            if (!_context.sent) {
              _context.next = 30;
              break;
            }

            clearErrorMessage();
            _context.next = 16;
            return hasUsername(currentUser);

          case 16:
            if (!_context.sent) {
              _context.next = 27;
              break;
            }

            resetTicketScreen();
            _context.t0 = updateTicketsTable;
            _context.next = 21;
            return getRecentTickets(currentUser);

          case 21:
            _context.t1 = _context.sent;
            (0, _context.t0)(_context.t1);

            console.log("got recent tickets");
            switchScreens("loading", "screen-3");

            _context.next = 28;
            break;

          case 27:

            switchScreens("loading", "screen-2");

          case 28:
            _context.next = 33;
            break;

          case 30:
            console.log("Unrecognized barcode");
            returnToWelcomeWithError("The ticket you just scanned couldn't be validated.  Please see a lottery administrator for more information.");
            transactionInProgress = false;

          case 33:
            _context.next = 36;
            break;

          case 35:
            if (a.msgType === "searchAcknowledge") {
              console.log("Scanner search was acknowledged", a);
              switchScreens("setup", "screen-1");
            }

          case 36:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}());

wsb.socket.addEventListener('open', function () {
  console.log("Connected to websocket");
  wsb.send({
    "msgType": "searchForScanner"
  });
});
var animationCycleTime = 1000;
$(document).ready(function () {
  $('#screen-1,#screen-2,#screen-3,#loading').hide();
  $('#server-address').text(window.location.host);
  $('#kiosk-id').text(kiosk_id);
  setInterval(fadeArrowsOut, 2 * animationCycleTime);
  setTimeout(function () {
    setInterval(fadeArrowsIn, 2 * animationCycleTime);
  }, animationCycleTime);
  $("#screen-2").css("height", window.innerHeight);
  var blockHeight = $('#s2-center-vertical').height();
  var blockMargin = (window.innerHeight - blockHeight) / 2;
  $('#s2-center-vertical').css("padding-top", blockMargin);

  $('#continue').on("click", submitUsername);
  $('.submit-ticket').on("click", submitTicket);
  $('.kiosk-end-session').on("click", endSession);

  setupLotteryTicket(1, 36, 6, false);
  $('#lottery-nums > tr').on("click", "td:not(.no-num)", numberClicked);
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
  var $submitTkBtn = $(".submit-ticket:not(.kiosk-end-session)");
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
  var currentNum = startNum;
  var oddRowLen = rowLength,
      evenRowLen = offsetEvenRows ? rowLength + 1 : rowLength,
      currentRowLength = void 0,
      appendStr = "";
  for (var row = 1; row <= Math.ceil((endNum - startNum + 1) / rowLength); row++) {
    if (row % 2 === 0 && offsetEvenRows) {
      //even row
      currentRowLength = evenRowLen;
      appendStr += "<tr><td class='no-num'></td>";
    } else {
      currentRowLength = oddRowLen;
      appendStr += "<tr>";
    }

    for (var col = 0; col < rowLength; col++) {
      appendStr += "<td>" + currentNum + "</td>";
      if (currentNum === endNum) {
        break;
      } else {
        currentNum++;
      }
    }
    appendStr += "</tr>";
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

function updateTicketsTable(result) {
  var tickets = result.tickets;
  console.log(tickets);

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = tickets[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var t = _step.value;

      $('#tickets-list').append("<tr>\n                                <td>" + t.id + "</td>\n                                <td>" + t.numbers.toString().replace(/,/g, ", ") + "</td>\n                                </tr>");
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
}

function updateTicketsTableServerResponse(tk) {
  console.log(tk);
  var $tkList = $('#tickets-list');

  if ($tkList.children().length === 5) {
    $('#tickets-list > tr:last-child').remove();
  }

  $('#tickets-list').prepend("<tr>\n                              <td>" + tk.id + "</td>\n                              <td>" + tk.nums + "</td>\n                              </tr>");
}

function getSelectedNums() {
  var nums = [];
  $(".selected").each(function (index, elem) {
    //jQuery .each() provides index and element parameters: https://stackoverflow.com/a/36638003/5434744
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
  }).then(function (result) {
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
  }, function (e) {
    $("#lt-submit-btns, #ticket-submit-loading-bar").toggleClass("hide");
    $('#ticket-submit-error').removeClass("hide");
    $("#ticket-submit-error").text("We couldn't process your ticket right now.  Please try again or contact the lottery administrator for assistance.");
  });
  //.catch((e) => console.error("Ticket submit error", e));
}

//this code block ($.ajaxSetup) allows Django's CSRF protection to work with AJAX requests and is from http://stackoverflow.com/a/5107878
$.ajaxSetup({
  beforeSend: function beforeSend(xhr, settings) {
    function getCookie(name) {
      var cookieValue = null;
      if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
          var cookie = jQuery.trim(cookies[i]);
          // Does this cookie string begin with the name we want?
          if (cookie.substring(0, name.length + 1) == name + '=') {
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
