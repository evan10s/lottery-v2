$(document).ready(function() {
  $.ajax({
    url: "/api/manage/results/" + drawingId + "/check",
    type: "GET",
    success: function(data) {
      if (data === "No results") {
        $('#generate-results').text("End Lottery and Finalize Results").on('click', confirmCustomAnswers);
        $("#results-load-status").text("Results not generated");
        console.log("made it past");
      } else {
        updateBtnResultsFinalized();
      }
    }
  });

  $('#enable-dangerous-actions').on('change', function() {
    if ($(this).val() === "on") {
      $('#generate-results').removeAttr("disabled");
    } else {
      $('#generate-results').attr("disabled","disabled");
    }
  });

  $('#provision-kiosk').on("click", provisionKioskRedirect);
  $('#generate-barcodes').on("click", genBarcodesRedirect);
  $('#submit-custom-answers').on("click",genResultsWithAnswers);

});

function confirmCustomAnswers() {
    $('#choose-ans').foundation('open');
}

function genResultsWithAnswers() {
    $('#submit-custom-answers').attr("disabled","disabled")
                               .text("Processing...")
                               .off();

    let ans1 = $('#ans-1').val(),
        ans2 = $('#ans-2').val();

    $.ajax({
      url: "/api/manage/results/generate",
      type: "POST",
      data: {
        'drawing_id': drawingId,
        'answer_1': ans1,
        'answer_2': ans2
      },
      success: function(data) {
        $('#choose-ans').foundation('close');
        updateBtnResultsFinalized();
      }
    });
}

function provisionKioskRedirect() {
  window.location = "/api/kiosk/provision";
}

function genBarcodesRedirect() {
  if (typeof drawingId === "number") {
    window.location = drawingId + "/barcodes";
  } else {
    console.error("The drawing id is not a number.  The redirect has been cancelled because of this.");
  }
}

function updateBtnResultsFinalized() {
  $('#generate-results').text('Results Finalized').addClass('success').off().removeAttr('disabled');
  displayResults();
}


function displayResults() {
    $.ajax({
        url: "/api/manage/results/" + drawingId,
        success: function(data) {
            showResultsInTable(data);
        }
    })
}

//from MDN - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
function round(number, precision) {
    let factor = Math.pow(10, precision);
    let tempNumber = number * factor;
    let roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
}

function showResultsInTable(data) {
    var tableBody = $("#results > tbody");
    var entry, percentCorrect, dqStatus,
        dqYes = "Disqualified",
        dqNo = "",
        correct,
        possible;
    tableBody.empty();
    for (var i = 0; i < data.length; i++) {
        entry = data[i];
        dqStatus = entry.disqualify ? dqYes : dqNo;
        tableBody.append(`<tr>
            <td>${i + 1}</td>
            <td>${entry.barcode}</td>
            <td>${entry.username}</td>
            <td>${round(entry.lottery_percent, 2)}% 
             (${entry.lottery_correct}/${entry.lottery_possible})
            </td>
            <td>${round(entry.scratchoffs_percent, 2)}%
            (${entry.scratchoffs_correct}/${entry.scratchoffs_possible})</td>
            <td>${round(entry.overall_score, 2)}%</td>
            <td>${dqStatus}</td></tr>`);
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
