//the methodology for submitting a ticket is from this tutorial: https://realpython.com/blog/python/django-and-ajax-form-submissions/

$("#submit-ticket").on('submit',function(e) {
  e.preventDefault();
  console.log("hi");
  submitTicket();
})

function updateTicketsTable(id,timestamp,nums) {
  //Removing last row from table: https://stackoverflow.com/questions/16010791/css-selector-last-row-from-main-table
  $('#tickets-table > tbody > tr:last-child').remove();
  $('#tickets-table > tbody').prepend("<tr><td>" + id + "</td><td>" + timestamp + "</td><td>" + nums + "</td></tr>");
}

function updateLotteryNumberDisplay(result) {
  $('#submitBtn,#nums').removeAttr("disabled");
  console.log("Got",result);

  if (result.state === "success") {
    $('#nums').val("");
    $('#submit-success > p').text(result.status);
    $('#submit-error').addClass("hide");
    $('#submit-success').removeClass("hide");
    updateTicketsTable(result.id, result.timestamp, result.nums);
  } else if (result.state === "error") {
    console.log("Im here")
    $('#submit-error > p').text(result.status);
    $('#submit-success').addClass("hide");
    $('#submit-error').removeClass("hide");
  }
}

function submitTicket() {
  console.log("hi","the form value is",$("#nums").val());

  $('#submit-success,#submit-error').addClass("hide");
  $('#submitBtn,#nums').attr("disabled","disabled");
  $.ajax({
    url: "/tickets/add",
    type: "POST",
    data: {
      nums: $('#nums').val()
    },
    success: updateLotteryNumberDisplay,
    error: function(xhr,msg,err) {
      $('#submitBtn,#nums').removeAttr("disabled");
      $('#submit-error > p').text("Your ticket wasn't submitted because of an error.");
      $('#submit-success').addClass("hide");
      $('#submit-error').removeClass("hide");
      console.log(xhr,msg,err);
    }
  })
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
