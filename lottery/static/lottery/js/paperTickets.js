$(document).ready(function () {
    $('#screen-1,#screen-2,#screen-3,#screen-4,#loading,#closed,#admin').hide();

    $('.submit-ticket').on("click", submitTicket);
    $('.kiosk-end-session').on("click", endSession);

    setupLotteryTicket(1, 36, 6, false);

    $('#lottery-nums > tr').on("click", "td:not(.no-num)", numberClicked);
});

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
        url: "/api/kiosk/tickets/add/" + $('#barcode').val().trim().toUpperCase(),
        method: "POST",
        data: {
            nums: getSelectedNums().toString(),
            paperTicket: true
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
        }
    }, (e) => {
        $("#lt-submit-btns, #ticket-submit-loading-bar").toggleClass("hide");
        $('#ticket-submit-error').removeClass("hide");
        $("#ticket-submit-error").text("We couldn't process your ticket right now.  Please try again or contact the lottery administrator for assistance.");
    });
    //.catch((e) => console.error("Ticket submit error", e));
}

function endSession() {
    $("#barcode").val("");
}


function resetTicketScreen() {
    $('.submit-ticket, .submit-ticket.kiosk-end-session').removeAttr("disabled");
    $("#max-nums-selected, #ticket-submit-error, #ticket-submit-loading-bar").addClass("hide");
    $('.submit-ticket:not(.kiosk-end-session)').removeClass("success").text("Submit this ticket");
    $("#lt-submit-btns").removeClass("hide");
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