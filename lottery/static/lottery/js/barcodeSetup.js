$(document).ready(function() {
  $('#submit').on('click', redirectToBarcodeOutput);
});

function redirectToBarcodeOutput() {
  let numReg = $('#num-regular').val(),
    numAdmin = $('#num-admin').val();

  if (numReg <= 25 && numAdmin <= 25) {
    window.location = `barcodes/generate/r/${numReg}/a/${numAdmin}`;
  } else {
    alert("Enter a number less than or equal 25 for both the number of regular cards and number of admin cards fields.")
  }
}
