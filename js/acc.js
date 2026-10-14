
/* =========================================================
   BARANGUIDE - ACCOUNT JAVASCRIPT
   jQuery and AJAX
   Works on index.html, user.html, and profile.html
   ========================================================= */
   // RESIDENT LOCATION MAP AND ADJUSTABLE NOTIFICATION RADIUS
var residentMap = null;
var residentMarker = null;
var residentCircle = null;
var residentHandle = null;
var residentRadiusAngle = Math.PI / 2;

function residentRadiusValue() {
    var meters = Number($("#resident-radius").val());
    if (!Number.isFinite(meters)) meters = 500;
    meters = Math.round(meters / 50) * 50;
    return Math.max(100, Math.min(3000, meters));
}

function residentHandlePosition(center, meters) {
    // East of the center marker; Leaflet distances use meters.
    var latRadians = center.lat * Math.PI / 180;
    var latitude = center.lat + meters * Math.cos(residentRadiusAngle) / 111320;
    var longitude = center.lng + meters * Math.sin(residentRadiusAngle) / (111320 * Math.cos(latRadians));
    return L.latLng(latitude, longitude);
}

function updateResidentCircle() {
    if (!residentMarker || !residentMap) return;
    var center = residentMarker.getLatLng();
    var meters = residentRadiusValue();
    $("#resident-radius").val(meters);

    if (!residentCircle) {
        residentCircle = L.circle(center, {
            radius: meters, color: "#286e64", weight: 2,
            fillColor: "#80cfc8", fillOpacity: 0.12,
            interactive: false
        }).addTo(residentMap);
    } else {
        residentCircle.setLatLng(center);
        residentCircle.setRadius(meters);
    }

    if (!residentHandle) {
        residentHandle = L.marker(residentHandlePosition(center, meters), {
            draggable: true,
            icon: L.divIcon({
                className: "radius-handle-icon",
                html: '<span class="radius-handle" title="Drag to resize notification radius"></span>',
                iconSize: [26, 26], iconAnchor: [13, 13]
            })
        }).addTo(residentMap);
        residentHandle.on("drag", function (e) {
            var center = residentMarker.getLatLng();
            var point = e.target.getLatLng();
            residentRadiusAngle = Math.atan2(
                (point.lng - center.lng) * Math.cos(center.lat * Math.PI / 180),
                point.lat - center.lat
            );
            var distance = residentMap.distance(center, point);
            $("#resident-radius").val(Math.max(100, Math.min(3000, Math.round(distance / 50) * 50)));
            residentCircle.setRadius(residentRadiusValue());
        });
        residentHandle.on("dragend", function () {
            updateResidentCircle();
        });
    } else {
        residentHandle.setLatLng(residentHandlePosition(center, meters));
    }
}

function selectResidentLocation(lat, lng) {
    $("#resident-lati").val(lat.toFixed(7));
    $("#resident-longi").val(lng.toFixed(7));
    $("#location-status").text("Location selected: " + lat.toFixed(6) + ", " + lng.toFixed(6));

    if (!residentMap) return;
    if (residentMarker) {
        residentMarker.setLatLng([lat, lng]);
    } else {
        residentMarker = L.marker([lat, lng], { draggable: true, autoPan: true }).addTo(residentMap);
        residentMarker.on("drag", function () {
            var position = residentMarker.getLatLng();
            $("#resident-lati").val(position.lat.toFixed(7));
            $("#resident-longi").val(position.lng.toFixed(7));
            $("#location-status").text("Location selected: " + position.lat.toFixed(6) + ", " + position.lng.toFixed(6));
            updateResidentCircle();
        });
    }
    updateResidentCircle();
    residentMap.setView([lat, lng], 16);
}

$("#resident-radius").on("change", function () {
    updateResidentCircle();
});

$("#pin-location").click(function () {
    $("#resident-map").show();
    if (!residentMap) {
        residentMap = L.map("resident-map").setView([10.669644, 122.948844], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(residentMap);
        residentMap.on("click", function (e) {
            selectResidentLocation(e.latlng.lat, e.latlng.lng);
        });
    }
    residentMap.invalidateSize();
    var lat = parseFloat($("#resident-lati").val());
    var lng = parseFloat($("#resident-longi").val());
    if (Number.isFinite(lat) && Number.isFinite(lng)) selectResidentLocation(lat, lng);
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
        // Existing residents can return here from the dashboard to edit alert area.
        if (new URLSearchParams(window.location.search).get("identity") === "resident") {
            identity = "resident";
            localStorage.setItem("userIdentity", identity);
        }
        checkAccountStatus(function (account) {
            if (account.is_admin || (account.identity && account.identity !== identity)) {
                window.location.href = "forms/dashboard.php";
                return;
            }
            if (identity === "resident" && account.identity === "resident") {
                $.getJSON("forms/get_resident_profile.php", function (response) {
                    if (!response.success || !response.data) return;
                    var fields = response.data;
                    var names = ["contact_number", "house_address", "barangay", "city", "province", "postal_code"];
                    $.each(names, function (i, key) {
                        $("#resident-form [name='" + key + "']").val(fields[key]);
                    });
                    $("#resident-lati").val(fields.lati || "");
                    $("#resident-longi").val(fields.longi || "");
                    $("#resident-radius").val(fields.radius_meters || 500);
                    $("#resident-notif").prop("checked", Number(fields.notif) === 1);
                    if (fields.lati !== null && fields.longi !== null) {
                        $("#location-status").text("Saved pin loaded. Open the map to change it.");
                    }
                });
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
                        // Show the circle immediately after locating the resident.
                        $("#pin-location").trigger("click");
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
                data.radius_meters = residentRadiusValue();


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
