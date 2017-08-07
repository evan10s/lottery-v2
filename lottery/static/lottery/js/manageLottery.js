$(document).ready(function() {
  $.ajax({
    url: "/api/manage/results/" + drawingId + "/check",
    type: "GET",
    success: function(data) {
      if (data === "No results") {
        $('#generate-results').text("End Lottery and Finalize Results").removeAttr('disabled').on('click', generateResults)
      } else {
        updateBtnResultsFinalized();
      }
    }
  });

  $('#enable-dangerous-actions').on('change', function() {
    console.log("The check box changed");
  })

  $('#provision-kiosk').on("click", provisionKioskRedirect);
  $('#generate-barcodes').on("click", genBarcodesRedirect);
})

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
}

function generateResults() {
  $('#generate-results').text('Processing...').attr('disabled', 'disabled');
  $.ajax({
    url: "/api/manage/results/generate",
    type: "POST",
    data: {
      'drawing_id': drawingId
    },
    success: function(data) {
      console.log(data);
      updateBtnResultsFinalized();
    }
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
