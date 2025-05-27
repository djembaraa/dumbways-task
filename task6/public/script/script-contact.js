function getData(event) {
  event.preventDefault();

  let name = document.getElementById("name").value;
  let email = document.getElementById("email").value;
  let phoneNumber = document.getElementById("phone").value;
  let subject = document.getElementById("subject").value;
  let message = document.getElementById("message").value;

  console.log(name, email, phoneNumber, subject, message);
}

document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("contactForm")
    .addEventListener("submit", function (e) {
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const phoneNumber = document.getElementById("phone").value.trim();
      const subject = document.getElementById("subject").value.trim();
      const message = document.getElementById("message").value.trim();
      const errorMsg = document.getElementById("error-message");

      if (
        name === "" ||
        email === "" ||
        phoneNumber === "" ||
        subject === "" ||
        message === ""
      ) {
        e.preventDefault();
        errorMsg.style.display = "block";
        alert("Mohon diisi semua form yang tersedia");
      } else {
        errorMsg.style.display = "none";
      }
    });
});
