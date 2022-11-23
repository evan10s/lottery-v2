const wsb = new channels.WebSocketBridge();

let currentUser;
let transactionInProgress = false;
let processingScratchoff = false;
let kioskClosed = false;
const colors = ["#a491d3", "#23b5d3", "#2c4251", "#ffc857", "#fe6d73"];

const facts = [
    "The Thanksgiving Lottery is so old, we don't remember when it started.",
    "Randy claims there was also once a New Year's Eve Lottery.",
    "The modern Thanksgiving Lottery was founded in 2013.",
    "The ultra-modern Thanksgiving Lottery was founded in 2017.",
    "{int} turtles are currently stuck inside this iPad.",
    "The Thanksgiving Lottery now uses Random.org to source entropy.",
    "Protect your Lottery Access Card as you would a credit card."
]

function aAn(word, capitalize) {
    const a = capitalize ? "a" : "A";
    const an = capitalize ? "an" : "An";
    if (["a", "e", "i", "o", "u"].find(x => x === word.substring(0).toLowerCase())) {
        return an;
    }

    return a;
}

const scratchoffPhrases = {
    0: (animal) => pickRandomElement([
        `Shucks! Seems this ${animal} can't offer you anything.`,
        `Rats! TurtleTastics already took all of this points this ${animal} had.`,
        `Sorry, this ${animal} doesn't have anything for you.`,
        `Thanksgiving is a time for generosity! That's why this ${animal} has ... oh, oops. This ${animal} has no points for you. Sorry!`,
        `Yay! I just got my paycheck! Oh, your scratchoff points? Looks like you didn't get any because all you found was this ${animal}.`,
        `YOU JUST WON THE LOTTERY! *checks notes* Oh, wait. Huh. No, you didn't. All you found was this useless ${animal}.`,
        `Hmm, maybe check for a turtle under that rock? This ${animal} certainly isn't one.`,
        `Hmm, maybe check for a turtle behind that desk? This ${animal} certainly isn't one.`,
        `Hmm, maybe check for a turtle over that hill? This ${animal} certainly isn't one.`,
        `Hmm, maybe check for a turtle beyond that stop sign? This ${animal} certainly isn't one.`,
        `Hmm, maybe check for a turtle under that used tissue? This ${animal} certainly isn't one.`,
        `Hmm, maybe check for a turtle in the loft? This ${animal} certainly isn't one.`,
        `Hmm, maybe check for a turtle in the microwave? This ${animal} certainly isn't one.`,
        `This just in! You won 0 points from this ${animal}.`,
        `Sorry, that ${animal} just won't do. Find a turtle if you want points!`,
        `Oooh boy! This is your time to shine! You've won 0 points. Oh, wait, oops!`,
        `A point? A point is worth so, so much in your quest to win the lottery. Instead, all you got was this inspirational message. Oof.`,
        `What's better than ${aAn(animal, true)} ${animal}? ${aAn(animal, true)} ${animal} who gives you 4 points. Too bad it doesn't have anything to give you.`,
        `Rats! 0 points! This is worse than turkey.`,
        `I wish I could say you won. But you lost. Enjoy your ${animal}.`,
    ]),
    1: (turtle) => pickRandomElement([
        `This ${turtle} offers you: 1 point.`,
        `Yippee! Yippee! You get 1 point courtesy of the ${turtle} you just found.`,
        `Yay! You got 1 point from this ${turtle}.`,
        `Hoodoo! This ${turtle} gave you 1 point!`,
        `@${turtle.replaceAll(" ", "_")} Venmo'd you 1 point. Hooray!`,
        `YOU JUST WON THE LOTTERY! Oh, just kidding. But here's a point courtesy of ${turtle} instead.`,
        `1 point? That's all you get? Yep! Send thanks to that ${turtle} you just found!`,
        `The exchange rate between a point and a dollar? Maybe you should worry more about winning the lottery first.`,
        `What's better than a ${turtle}? ${aAn(turtle, true)} ${turtle} who gives you 4 points. Too bad he only has 1 point to give you!`,
    ]),
    4: (turtle) => pickRandomElement([
        `Amazing! Here's 4 points for finding a rare ${turtle}.`,
        `Did you really just find a ${turtle}?! Here's 4 points!`,
        `Oooh boy! This is your time to shine! You've won 4 points. Oh, hoodoo! Hoodoo! HOOODOOOO!`,
        `You just found gold! Not really, but here's 4 points from ${turtle} instead!`,
        `YOU JUST WON THE LOTTERY! Oh, just kidding. But here's 4 points from ${turtle} instead.`,
        `You found a ${turtle}! He has 4 points for you.`,
        `What's better than ${aAn(turtle, true)} ${turtle}? ${aAn(turtle, true)} ${turtle} who gives you 4 points. And that's what just happened!`,
        `It's ${turtle} and he has 4 points for you. Yay!`,
    ])
}

function pickRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

wsb.connect('ws://' + window.location.host + "/kiosk/" + kiosk_id);
wsb.listen(async function (a, s) {
    if (a.msgType === "data") {
        console.log("Barcode scanned:", a.barcode);
    } else {
        console.log("Websocket message:", a);
    }
    if (!transactionInProgress) {
        if (a.msgType === "info") {
            switchScreens("setup", "screen-1-new");
        } else if (a.msgType === "data") {
            currentUser = a.barcode;
            if (kioskClosed) {
                console.log("active for closed");
                $('#loading').fadeIn();
                transactionInProgress = false;  //transaction can't be in progress if kiosk is closed
            } else {
                switchScreens("screen-1-new", "loading");
                transactionInProgress = true;
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
                returnToWelcomeWithError("The ticket you just scanned can't be used. Please see a lottery administrator for more information.");
                transactionInProgress = false;
            }
        } else if (a.msgType === "searchAcknowledge") {
            console.log("Scanner search was acknowledged", a);
            switchScreens("setup", "screen-1-new");
        }
    }
});

wsb.socket.addEventListener('open', function () {
    console.log("Connected to websocket");
    wsb.send({
        "msgType": "searchForScanner"
    });
});

function toggleFullScreen() {
    const doc = window.document;
    const docEl = doc.documentElement;

    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        requestFullScreen.call(docEl);
    } else {
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

/**
 * Vertically centers a div.  But be sure it actually has a height when you call this function (e.g., it can center
 * something that is invisible (still has height/width but not on screen) but not something that is hidden (no height/width)).
 */
function verticallyCenter(container, selector) {
    $(container).css("height", window.innerHeight);
    const blockHeight = $(selector).height();
    const blockMargin = (window.innerHeight - blockHeight) / 2;
    if (blockHeight === 0) {
        console.warn(`verticallyCenter ${selector}: block height is 0!`)
    } else {
        console.log(`verticallyCenter ${selector}: block height is ${blockHeight}`)
    }
    $(selector).css("padding-top", blockMargin);
}

const animationCycleTime = 1000;
$(document).ready(function () {
    $('#screen-1,#screen-3,#screen-4,#loading,#admin').hide();

    verticallyCenter('#closed', '#closed-center-vertical');
    $('#closed').hide().removeClass('invisible')
    const serverUrl = window.location.host;

    $('#server-address').text(serverUrl);
    $('#kiosk-id').text(kiosk_id);

    generateSetupBarcode(kiosk_id, serverUrl);

    setInterval(fadeArrowsOut, 2 * animationCycleTime);
    setTimeout(function () {
        setInterval(fadeArrowsIn, 2 * animationCycleTime)
    }, animationCycleTime)

    verticallyCenter('#screen-1-new', '#s1-center-vertical');
    verticallyCenter('#screen-2', '#s2-center-vertical');
    $('#screen-2').hide().removeClass('invisible');

    setupScratchoffTicket();

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
    $("i.barcode-arrow-small").animate({
        opacity: .6
    }, animationCycleTime);
}

function fadeArrowsIn() {
    $("i.barcode-arrow-small").animate({
        opacity: 1
    }, animationCycleTime);
}

function switchScreens(s1, s2) {
    s1 = "#" + s1;
    s2 = "#" + s2;
    $(s1).fadeOut();
    $(s2).removeClass("invisible")
    $(s2).fadeIn();
}

function endSession() {
    $('.pretty-outline-footer').css("background-color", pickRandomElement(colors));

    if ($('#screen-3').attr("style") !== "display: none;") {
        switchScreens("screen-3", "screen-4");
    } else {
        switchScreens("screen-4", "screen-1-new");
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
    $('#screen-1-new,#screen-2,#screen-3,#loading').fadeOut();
    $('#s1-error-msg > h5').text(msg).parent().removeClass("hide");
    $("#screen-1-new").fadeIn();
}

function clearErrorMessage() {
    $('#s1-error-msg').addClass("hide");
}

async function submitUsername() {
    const usernameVal = $('#user-name').val();
    if (usernameVal === "") {
        $('#name-submit-error').removeClass("hide");
    } else {
        switchScreens("screen-2", "loading");
        const submitResult = $.ajax({
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
    $('#screen-1-new,#screen-2,#screen-3,#loading,#admin').fadeOut();
    kioskClosed = true;
    $("#closed").fadeIn();
}

function openKiosk() {
    $('#screen-1-new,#screen-2,#screen-3,#loading,#admin,#closed').fadeOut();
    kioskClosed = false;
    $("#screen-1-new").fadeIn();
}

async function isAdmin(barcode) {
    const result = $.ajax({
        url: "/api/kiosk/checkAdmin/" + barcode,
        method: "GET",
    });

    const resultObj = await result;

    return await resultObj.is_admin;
}

async function validateBarcode(barcode) {
    const result = $.ajax({
        url: "/api/kiosk/validateBarcode/" + barcode,
        method: "GET",
    });
    console.log("Result of validateBarcode:", await result, await result === "User exists");
    return await result === "User exists";

}

async function hasUsername(barcode) {
    const result = $.ajax({
        url: "/api/kiosk/" + barcode + "/checkForName",
        method: "GET"
    });
    return await result === "User has name";

}

async function getRecentTickets(barcode) {
    const num = 5; //Get 5 recent tickets at most
    const result = $.ajax({
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
    $("#scratchoff-table").removeClass("hide");
    $('#scratchoff-submit-incorrect, #scratchoff-submit-error, #scratchoff-submit-correct, #max-scratchoff-squares-selected').addClass("hide");
    $('.reset-scratchoff').removeClass("hide");

    $(".reset-scratchoff").addClass("hide");
}

function restoreChangedScratchoffSquares() {
    $('#scratchoff > tr > td > img[data-selected="1"]').attr("src", "/static/lottery/scratchoff-imgs/dollar.jpg")
        .attr("data-selected", "0");
}

function scratchoffJackpot(animal_file, animal, points, phrase) {
    Swal.fire({
        title: "JACKPOT!",
        text: phrase,
        iconHtml: `<img alt="${animal}" src="/static/lottery/scratchoff-imgs/${animal_file}" />`,
        customClass: {
            icon: 'no-border'
        }
    }).then(() => {
        resetScratchoffScreen()
    })
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
            if (imgToUpdate) {
                imgToUpdate.attr("data-selected", 1);
            } else {
                console.warn("submitScratchoff imgToUpdate is null")
            }

            if (result.points == null) {
                console.error("Scratchoff result points are null/undefined:", result)
                $("#scratchoff-submit-error").removeClass("hide");
                $("#scratchoff-submit-error > p").text("Your scratchoff was submitted, but we are unable to show you the result. Please contact a Lottery Administrator for assistance.");
            } else if (!result.animal) {
                console.error("Scratchoff result is winning but animal is false-y:", result)
                $("#scratchoff-submit-error").removeClass("hide");
                $("#scratchoff-submit-error > p").text(result.status);
            } else {
                const correctIncorrect = result.won ? "correct" : "incorrect";

                const resultTextElement = `#scratchoff-${correctIncorrect}-text`;
                const resultElement = `#scratchoff-submit-${correctIncorrect}`;

                const phrase = scratchoffPhrases[result.points](result.animal);

                if (result.points === 4) {
                    scratchoffJackpot(result.animal_file, result.animal, result.points, phrase)
                } else {
                    $(resultTextElement).text(phrase)
                    $(resultElement).removeClass("hide");
                }
            }

            if (imgToUpdate) {
                imgToUpdate.attr("src", `/static/lottery/scratchoff-imgs/${result.animal_file}`)
            } else {
                console.warn("submitScratchoff imgToUpdate is null")
            }
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
            let cookieValue = null;
            if (document.cookie && document.cookie != '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = jQuery.trim(cookies[i]);
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
