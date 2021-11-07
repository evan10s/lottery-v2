var wsb = new channels.WebSocketBridge();
var currentUser;
var transactionInProgress = false;
let processingScratchoff = false;
var kioskClosed = false;

wsb.connect('ws://' + window.location.host + "/kiosk/" + kiosk_id);
wsb.listen(async function (a, s) {
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
            if (kioskClosed) {
                console.log("active for closed");
                $('#loading').fadeIn();
                transactionInProgress = false;
            } else {
                switchScreens("screen-1", "loading");
                transactionInProgress = false; //transaction can't be in progress if kiosk is closed
            }
            if (await validateBarcode(currentUser)) {
                clearErrorMessage();
                console.log("inside validateBarcode, kioskClosed is", kioskClosed);
                if (await isAdmin(currentUser)) {
                    console.log("admin");
                    switchScreens("loading", "admin");
                    transactionInProgress = false;
                } else if (await hasUsername(currentUser) && !kioskClosed) {
                    console.log("closed", kioskClosed)
                    resetTicketScreen();
                    updateTicketsTable(await getRecentTickets(currentUser));
                    console.log("got recent tickets");
                    switchScreens("loading", "screen-3");
                } else if (!kioskClosed) {
                    switchScreens("loading", "screen-2");
                } else {
                    switchScreens("loading", "closed");
                }
            } else if (!kioskClosed) {
                console.log("closed", kioskClosed);
                console.log("Unrecognized barcode")
                returnToWelcomeWithError("The ticket you just scanned can't be used.  Please see a lottery administrator for more information.");
                transactionInProgress = false;
            }
        } else if (a.msgType === "searchAcknowledge") {
            console.log("Scanner search was acknowledged", a);
            switchScreens("setup", "screen-1");
        }
    }
});

wsb.socket.addEventListener('open', function () {
    console.log("Connected to websocket");
    wsb.send({
        "msgType": "searchForScanner"
    });
    // wsb.send({
    //   "msgType": "searchAcknowledge"
    // });
    switchScreens("setup", "screen-2")
});

function toggleFullScreen() {
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  }
  else {
    cancelFullScreen.call(doc);
  }
}

function generateSetupBarcode(kioskId, serverUrl) {
    const kioskConfig = {
        kioskId,
        serverUrl
    }

    new QRious({
        element: document.getElementById("kiosk-config-barcode"),
        value: JSON.stringify(kioskConfig),
        size: 150,
        level: "L"
    })
}

const animationCycleTime = 1000;
$(document).ready(function () {
    $('#screen-1,#screen-2,#screen-3,#screen-4,#loading,#closed,#admin').hide();

    const serverUrl = window.location.host;

    $('#server-address').text(serverUrl);
    $('#kiosk-id').text(kiosk_id);

    generateSetupBarcode(kiosk_id, serverUrl);

    setInterval(fadeArrowsOut, 2 * animationCycleTime);
    setTimeout(function () {
        setInterval(fadeArrowsIn, 2 * animationCycleTime)
    }, animationCycleTime)
    $("#screen-2").css("height", window.innerHeight);
    var blockHeight = $('#s2-center-vertical').height();
    var blockMargin = (window.innerHeight - blockHeight) / 2;
    $('#s2-center-vertical').css("padding-top", blockMargin);

    // let colorIdx = 0;
    // let colors = ["#a491d3", "#23b5d3", "#2c4251", "#ffc857", "#fe6d73"];
    // setInterval(() => {
    //     document.body.style.backgroundColor = colors[colorIdx];
    //     colorIdx = (colorIdx + 1) % colors.length
    // }, 3000)

    setupScratchoffTicket();
    //$('#screen-4').css("height", window.innerHeight);
    //var s4Height = $('#s4-center-vertical').height();
    //var s4Margin = (window.innerHeight - s4Height) / 2;
    //$('#s4-center-vertical').css("padding-top", s4Margin / 2);

    $('#continue').on("click", submitUsername);
    $('.submit-ticket').on("click", submitTicket);
    $('.kiosk-end-session').on("click", endSession);

    setupLotteryTicket(1, 36, 6, false);

    $('#lottery-nums > tr').on("click", "td:not(.no-num)", numberClicked);
    $('#scratchoff > tr').on("click", "td", scratchoffItemPicked);
    $('.reset-scratchoff').on("click", resetScratchoffScreen);
    $('#enable-fullscreen').on("click", toggleFullScreen);
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
    console.log($('#screen-3').attr("style") !== "display: none;");
    if ($('#screen-3').attr("style") !== "display: none;") {
        switchScreens("screen-3", "screen-4");
    } else {
        switchScreens("screen-4", "screen-1");
        $("#user-name").val("");
        transactionInProgress = false;
        resetTicketScreen();
        resetScratchoffScreen();
    }

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
}

function scratchoffItemPicked() {
    let numberPicked = parseInt($(this).children("img").attr('data-number'));
    if (!processingScratchoff) {
        processingScratchoff = true;
        submitScratchoff(numberPicked, $(this).children("img"));
    }
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

function setupScratchoffTicket() {
    let appendStr = "";
    for (let row = 1; row <= 4; row++) {
        appendStr += "<tr>";
        for (let col = 1; col <= 4; col++) {
            appendStr += `<td><img src="/static/lottery/scratchoff-imgs/dollar.jpg" alt="?" width="100" height="100" draggable="false" data-number="${(row - 1) * 4 + col}"
                            data-selected="0"></td>`
        }
        appendStr += "</tr>";
    }
    $('#scratchoff').append(appendStr);
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
            switchScreens("loading", "screen-2",);
        } else {
            switchScreens("loading", "screen-3");
        }

    }
}

function closeKiosk() {
    $('#screen-1,#screen-2,#screen-3,#loading,#admin').fadeOut();
    kioskClosed = true;
    $("#closed").fadeIn();
}

function openKiosk() {
    $('#screen-1,#screen-2,#screen-3,#loading,#admin,#closed').fadeOut();
    kioskClosed = false;
    $("#screen-1").fadeIn();
}

async function isAdmin(barcode) {
    var result = $.ajax({
        url: "/api/kiosk/checkAdmin/" + barcode,
        method: "GET",
    });

    console.log("Result of isAdmin:", await result);
    var resultObj = await result;
    console.log(resultObj);
    console.log(resultObj.is_admin);
    return await resultObj.is_admin;
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
    var result = $.ajax({
        url: "/api/kiosk/" + barcode + "/checkForName",
        method: "GET"
    });
    return await result === "User has name";

}

async function getRecentTickets(barcode) {
    var num = 5; //Get 5 recent tickets at most
    var result = $.ajax({
        url: "/api/kiosk/" + barcode + "/recentTickets/" + num,
        method: "GET"
    });

    return await result;
}

function updateTicketsTable(result) {
    let tickets = result.tickets;

    for (let t of tickets) {
        $('#tickets-list').append(`<tr>
                                <td>${t.id}</td>
                                <td>${t.numbers.toString().replace(/,/g, ", ")}</td>
                                </tr>`)
    }

}

function updateTicketsTableServerResponse(tk) {
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
    let nums = [];
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

function resetScratchoffScreen() {
    restoreChangedScratchoffSquares();
    $('#scratchoff-submit-incorrect, #scratchoff-submit-error, #scratchoff-submit-correct, #max-scratchoff-squares-selected').addClass("hide");
    $('.reset-scratchoff').removeClass("hide");

    $(".reset-scratchoff").addClass("hide");
}

function restoreChangedScratchoffSquares() {
    $('#scratchoff > tr > td > img[data-selected="1"]').attr("src", "/static/lottery/scratchoff-imgs/dollar.jpg")
        .attr("data-selected", "0");
}

function getAnimalString(animal) {
    let article = animal.search(/[aeiou]/) === 0 ? "an" : "a";
    return `${article} ${animal}`;
}

function submitScratchoff(num, imgToUpdate) {
    $('#scratchoff-submit-incorrect, #scratchoff-submit-error, #scratchoff-submit-correct, #max-scratchoff-squares-selected').addClass("hide");

    if ($('#scratchoff > tr > td > img[data-selected="1"]').length >= 1) {
        $('#max-scratchoff-squares-selected').removeClass("hide");
        processingScratchoff = false;
        return;
    }

    $.ajax({
        url: "/api/kiosk/scratchoffs/add/" + currentUser,
        method: "POST",
        data: {
            num: num
        }
    }).then((result) => {
        console.log("result is", result);
        $("#scratchoff-submit-loading-bar").addClass("hide");
        if (result.state === "error") {
            $("#scratchoff-submit-error").removeClass("hide");
            $("#scratchoff-submit-error > p").text(result.status);
            if (result.hasOwnProperty("error_short_desc")) {
                $("#scratchoff-table").addClass("hide");
            }
        } else {
            $(".reset-scratchoff").removeClass("hide");
            imgToUpdate.attr("data-selected", 1);

            if (result.won) {
                $("#scratchoff-submit-correct").removeClass("hide");
            } else {
                $("#scratchoff-submit-incorrect").removeClass("hide");
                console.log(result.animal);
                $("#scratchoff-animal").text(getAnimalString(result.animal));
            }
            imgToUpdate.attr("src", `/static/lottery/scratchoff-imgs/${result.animal}.jpg`)
            //$(".submit-ticket:not(.kiosk-end-session)").addClass("success").text("Ticket submitted");
            //updateTicketsTableServerResponse(result);
        }
        processingScratchoff = false;
    }, (e) => {
        processingScratchoff = false;
        console.log("Error: ", e);

        $('#scratchoff-submit-error').removeClass("hide");
        $("#scratchoff-submit-error").text("We couldn't process your scratchoff right now.  Please try again or contact the lottery administrator for assistance.");
    });
}

//this code block ($.ajaxSetup) allows Django's CSRF protection to work with AJAX requests and is from http://stackoverflow.com/a/5107878
$.ajaxSetup({
    beforeSend: function (xhr, settings) {
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
