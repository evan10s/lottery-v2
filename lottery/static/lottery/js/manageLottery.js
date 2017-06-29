$(document).ready(function() {
  $('#generate-results').on('click',generateResults);
})

function generateResults() {
  $('#generate-results').text('Processing...').attr('disabled','disabled');
  $.ajax({
       url: "/api/manage/results/generate",
       type: "POST",
       data: {
         'drawing_id': drawingId
       },
       success: function(data) {
		       console.log(data);
           $('#generate-results').text('Results Finalized').addClass('success').off().removeAttr('disabled');
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
