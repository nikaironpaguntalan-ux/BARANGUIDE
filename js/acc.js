
/* =========================================================
   BARANGUIDE - ACCOUNT JAVASCRIPT
   jQuery and AJAX
   Works on index.html, user.html, and profile.html
   ========================================================= */
   // RESIDENT LOCATION MAP

var residentMap = null;
var residentMarker = null;


// UPDATE SELECTED LOCATION

function selectResidentLocation(lat, lng) {

    $("#resident-lati").val(lat.toFixed(7));
    $("#resident-longi").val(lng.toFixed(7));

    $("#location-status").text(
        "Location selected: " +
        lat.toFixed(6) + ", " +
        lng.toFixed(6)
    );

    if (residentMap !== null) {

        if (residentMarker !== null) {

            residentMarker.setLatLng([lat, lng]);

        } else {

            residentMarker = L.marker([lat, lng], {
                draggable: true
            }).addTo(residentMap);

            residentMarker.on("dragend", function () {

                var position = residentMarker.getLatLng();

                selectResidentLocation(position.lat, position.lng);

            });
        }

        residentMap.setView([lat, lng], 17);
    }
}


// OPEN MAP WHEN BUTTON IS CLICKED

$("#pin-location").click(function () {

    $("#resident-map").show();

    if (residentMap === null) {

        residentMap = L.map("resident-map").setView(
            [10.669644, 122.948844],
            13
        );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution: '&copy; OpenStreetMap contributors'
            }
        ).addTo(residentMap);


        // CLICK ON MAP TO SELECT LOCATION

        residentMap.on("click", function (e) {

            var lat = e.latlng.lat;
            var lng = e.latlng.lng;

            selectResidentLocation(lat, lng);

        });

    }

    residentMap.invalidateSize();


    // DISPLAY EXISTING GPS SELECTION

    var lat = parseFloat($("#resident-lati").val());
    var lng = parseFloat($("#resident-longi").val());

    if (!isNaN(lat) && !isNaN(lng)) {

        selectResidentLocation(lat, lng);

    }

});

$(document).ready(function () {
    function showAlert(options, callback) {
        if (window.Swal) {
            options.showCloseButton = true;
            Swal.fire(options).then(function () {
                if (callback) {
                    callback();
                }
            });
        } else {

            alert(options.text || options.title || "BARANGUIDE");
            if (callback) {
                callback();
            }
        }
    }

    function checkAccountStatus(callback) {
        $.ajax({
            url: "forms/account_status.php",
            type: "GET",
            dataType: "json",
            success: function (account) {
                if (!account.signed_in) {
                    window.location.href = "index.html";
                    return;
                }
                callback(account);
            },
            error: function () {
                window.location.href = "index.html";
            }
        });
    }

    /* =====================================================
       1. LOGIN AND SIGNUP (index.html)
       ===================================================== */

    if ($("#signup-form").length && $("#signin-form").length) {
   // SWITCH BETWEEN FORMS
        function showSignIn() {
            $("#signup-container").prop("hidden", true);
            $("#signin-container").prop("hidden", false);
            document.title = "BARANGUIDE | Sign In";
            $("#signin-email").focus();
        }
        function showSignUp() {
            $("#signin-container").prop("hidden", true);
            $("#signup-container").prop("hidden", false);
            document.title = "BARANGUIDE | Sign Up";
            $("#signup-name").focus();
        }
        $("#signup-to-signin").click(function (e) {
            e.preventDefault();
            showSignIn();
        });

        $("#signin-to-signup").click(function (e) {
            e.preventDefault();
            showSignUp();
        });


        if (window.location.hash.toLowerCase() === "#signup") {
            showSignUp();
        } else {
            showSignIn();
        }

        $("#signup-form").submit(function (e) {
            e.preventDefault();
            var name = $("#signup-name").val().trim();
            var email = $("#signup-email").val().trim();
            var password = $("#signup-password").val();
            var button = $("#signup-form .submit-btn");
            if (name === "" || email === "" || password === "") {
                showAlert({
                    icon: "warning",
                    title: "Incomplete form",
                    text: "Please complete all fields."
                });

                return;
            }
            if (password.length < 8) {

                showAlert({
                    icon: "warning",
                    title: "Password too short",
                    text: "Password must contain at least 8 characters."
                });
                return;
            }
            button.prop("disabled", true);
            $.ajax({
                url: "forms/signup.php",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                }),
                dataType: "json",
                success: function (res) {
                    if (res.success) {
                        showAlert({
                            icon: "success",
                            title: "Account created",
                            text: res.message || "Your account has been created."
                        }, function () {
                            window.location.href = res.redirect || "user.html";
                        });

                    } else {
                        showAlert({
                            icon: "error",
                            title: "Registration failed",
                            text: res.message || "Please try again."
                        });

                    }
                },
                error: function (xhr) {
                    var message = "Error connecting to server.";
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }
                    showAlert({
                        icon: "error",
                        title: "Server error",
                        text: message
                    });

                },

                complete: function () {
                    button.prop("disabled", false);

                }
            });
        });

        $("#signin-form").submit(function (e) {
            e.preventDefault();
            var email = $("#signin-email").val().trim();
            var password = $("#signin-password").val();
            var button = $("#signin-form .submit-btn");
            if (email === "" || password === "") {

                showAlert({
                    icon: "warning",
                    title: "Incomplete form",
                    text: "Please enter your email and password."
                });

                return;
            }
            button.prop("disabled", true);
            $.ajax({
                url: "forms/signin.php",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    email: email,
                    password: password
                }),

                dataType: "json",


                success: function (res) {

                    if (res.success) {

                        window.location.href = res.redirect || "forms/dashboard.php";

                    } else {

                        showAlert({
                            icon: "error",
                            title: "Sign in failed",
                            text: res.message || "Invalid email or password."
                        });

                    }

                },


                error: function (xhr) {

                    var message = "Error connecting to server.";

                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }

                    showAlert({
                        icon: "error",
                        title: "Server error",
                        text: message
                    });

                },

                complete: function () {
                    button.prop("disabled", false);

                }

            });

        });

        $("#forgot-password").click(function (e) {

            e.preventDefault();

            var email = $("#signin-email").val().trim();
            if (email === "") {

                showAlert({
                    icon: "info",
                    title: "Enter your email",
                    text: "Enter your account email first."
                });

            } else {

                showAlert({
                    icon: "info",
                    title: "Password recovery",
                    text: "Password recovery is not enabled in this project yet."
                });

            }

        });

    }



    /* =====================================================
       2. IDENTITY SELECTION (user.html)
       ===================================================== */

    if ($("#resident-btn").length && $("#official-btn").length) {

        checkAccountStatus(function (account) {

            if (account.is_admin || account.identity) {
                window.location.href = "forms/dashboard.php";
            }

        });

        function chooseIdentity(identity) {
            localStorage.setItem("userIdentity", identity);
            window.location.href = "profile.html";

        }

        $("#resident-btn").click(function () {
            chooseIdentity("resident");

        });

        $("#official-btn").click(function () {
            chooseIdentity("government_official");

        });

    }

    /* =====================================================
       3. PROFILE INFORMATION (profile.html)
       ===================================================== */

    if ($("#resident-form").length && $("#official-form").length) {
        var identity = localStorage.getItem("userIdentity");
        checkAccountStatus(function (account) {
            if (account.is_admin ||
                (account.identity && account.identity !== identity)) {
                window.location.href = "forms/dashboard.php";
            }

        });
        // DISPLAY CORRECT PROFILE
        if (identity === "resident") {
            $("#resident-form").prop("hidden", false);
            $("#profile-title").text("Resident Information");
            $("#profile-description").text(
                "Provide your residential and contact details for your BARANGUIDE profile."
            );
        } else if (identity === "government_official") {
            $("#official-form").prop("hidden", false);
            $("#profile-title").text("Government Official Information");
            $("#profile-description").text(
                "Provide your designation, office, and official contact details."
            );
        } else {
            window.location.href = "user.html";
            return;

        }
        /* ===================================================
           GET RESIDENT LOCATION
           ===================================================== */
        $("#get-location").click(function () {
            if (navigator.geolocation) {
                $("#location-status").text("Getting your location...");
                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        var lat = position.coords.latitude;
                        var lng = position.coords.longitude;
                        // PLACE COORDINATES IN HIDDEN INPUTS
                        selectResidentLocation(lat, lng);
                        $("#location-status").text(
                            "Location selected: " +
                            lat.toFixed(6) + ", " +
                            lng.toFixed(6)
                        );
                        console.log("Latitude: " + lat);
                        console.log("Longitude: " + lng);
                    },
                    function (error) {
                        $("#location-status").text(
                            "Unable to get location: " + error.message
                        );
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 0
                    }

                );
            } else {

                showAlert({
                    icon: "error",
                    title: "Location unavailable",
                    text: "Your browser does not support geolocation."
                });

            }

        });

        /* =====================================================
           SAVE PROFILE USING AJAX
           ===================================================== */
        function saveProfile(form) {
            if (!form.checkValidity()) {
                form.reportValidity();

                return;
            }


            var data = {};


            // COLLECT FORM INPUTS

            $.each($(form).serializeArray(), function (index, field) {

                data[field.name] = field.value;

            });


            data.identity = identity;



            // RESIDENT LOCATION AND NOTIFICATION

            if (identity === "resident") {

                var lat = $("#resident-lati").val();
                var lng = $("#resident-longi").val();


                data.lati = lat;
                data.longi = lng;


                if ($("#resident-notif").is(":checked")) {

                    data.notif = 1;

                } else {

                    data.notif = 0;

                }



                // CHECK IF COORDINATES ARE COMPLETE

                if ((lat === "" && lng !== "") ||
                    (lat !== "" && lng === "")) {

                    showAlert({
                        icon: "warning",
                        title: "Incomplete location",
                        text: "Please select a valid location."
                    });

                    return;

                }



                // LOCATION IS REQUIRED FOR LOCATION-BASED NOTICES

                if (data.notif === 1 &&
                    (lat === "" || lng === "")) {

                    showAlert({
                        icon: "warning",
                        title: "Location required",
                        text: "Please select your location or uncheck community notifications."
                    });

                    return;

                }

            }



            var button = $(form).find(".submit-button");

            button.prop("disabled", true);



            $.ajax({
                url: "forms/save_profile.php",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(data),
                dataType: "json",
                success: function (res) {
                    if (res.success) {
                        showAlert({
                            icon: "success",
                            title: "Profile completed",
                            text: res.message || "Your profile has been saved.",
                            confirmButtonText: "Continue"
                        }, function () {
                            localStorage.removeItem("userIdentity");
                            window.location.href =
                                res.redirect || "forms/dashboard.php";

                        });
                    } else {
                        showAlert({
                            icon: "error",
                            title: "Unable to save profile",
                            text: res.message || "Please try again."
                        });
                    }

                },


                error: function (xhr) {

                    var message = "Unable to connect to the server.";

                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }

                    showAlert({
                        icon: "error",
                        title: "Server error",
                        text: message
                    });

                },


                complete: function () {

                    button.prop("disabled", false);

                }

            });

        }

        $("#resident-form, #official-form").submit(function (e) {
            e.preventDefault();
            saveProfile(this);
        });
    }
});
