
/* =========================================================
   BIOGUARD - ACCOUNT JAVASCRIPT
   Combines script.js, identity.js, and profile.js
   Works on index.html, user.html, and profile.html
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    // SHARED FUNCTIONS
    function showAlert(options) {
        if (window.Swal) return Swal.fire(options);
        alert(options.text || options.title || "BIOGUARD");
        return Promise.resolve();
    }

    async function postJSON(url, data) {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const text = await response.text();
        let result;

        try {
            result = JSON.parse(text);
        } catch (error) {
            result = { success: false, message: "Invalid server response." };
        }

        return { ok: response.ok, result: result };
    }

    function checkAccountStatus(callback) {
        fetch("forms/account_status.php")
            .then(function (response) {
                if (!response.ok) throw new Error("Account check failed.");
                return response.json();
            })
            .then(function (account) {
                if (!account.signed_in) {
                    window.location.href = "index.html"
                    return;
                }
                callback(account);
            })
            .catch(function () {
                window.location.href = "index.html"
            });
    }

    /* =====================================================
       1. LOGIN AND SIGNUP (index.html)
       ===================================================== */

    const signupForm = document.getElementById("signup-form");
    const signinForm = document.getElementById("signin-form");

    if (signupForm && signinForm) {
        const signupContainer = document.getElementById("signup-container");
        const signinContainer = document.getElementById("signin-container");
        const signupToSignin = document.getElementById("signup-to-signin");
        const signinToSignup = document.getElementById("signin-to-signup");
        const forgotPassword = document.getElementById("forgot-password");

        function showSignIn() {
            signupContainer.hidden = true;
            signinContainer.hidden = false;
            document.title = "BIOGUARD | Sign In";
            document.getElementById("signin-email").focus();
        }

        function showSignUp() {
            signinContainer.hidden = true;
            signupContainer.hidden = false;
            document.title = "BIOGUARD | Sign Up";
            document.getElementById("signup-name").focus();
        }

        if (signupToSignin) signupToSignin.addEventListener("click", showSignIn);
        if (signinToSignup) signinToSignup.addEventListener("click", showSignUp);

        if (window.location.hash.toLowerCase() === "#signup") {
            showSignUp();
        } else {
            showSignIn();
        }

        // SIGNUP
        signupForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const name = document.getElementById("signup-name").value.trim();
            const email = document.getElementById("signup-email").value.trim();
            const password = document.getElementById("signup-password").value;
            const button = signupForm.querySelector(".submit-btn");

            if (!name || !email || !password) {
                await showAlert({
                    icon: "warning",
                    title: "Incomplete form",
                    text: "Please complete all fields."
                });
                return;
            }

            if (password.length < 8) {
                await showAlert({
                    icon: "warning",
                    title: "Password too short",
                    text: "Password must contain at least 8 characters."
                });
                return;
            }

            if (button) button.disabled = true;

            try {
                const response = await postJSON("forms/signup.php", {
                    name: name,
                    email: email,
                    password: password
                });

                if (response.ok && response.result.success) {
                    await showAlert({
                        icon: "success",
                        title: "Account created",
                        text: response.result.message || "Your account has been created."
                    });

                    window.location.href = response.result.redirect || "user.html";
                } else {
                    await showAlert({
                        icon: "error",
                        title: "Registration failed",
                        text: response.result.message || "Please try again."
                    });
                }
            } catch (error) {
                console.error(error);
                await showAlert({
                    icon: "error",
                    title: "Server unavailable",
                    text: "Could not connect to the server. Check Laragon and Apache."
                });
            } finally {
                if (button) button.disabled = false;
            }
        });

        // SIGNIN
        signinForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("signin-email").value.trim();
            const password = document.getElementById("signin-password").value;
            const button = signinForm.querySelector(".submit-btn");

            if (!email || !password) {
                await showAlert({
                    icon: "warning",
                    title: "Incomplete form",
                    text: "Please enter your email and password."
                });
                return;
            }

            if (button) button.disabled = true;

            try {
                const response = await postJSON("forms/signin.php", {
                    email: email,
                    password: password
                });

                if (response.ok && response.result.success) {
                    window.location.href = response.result.redirect || "forms/dashboard.php";
                } else {
                    await showAlert({
                        icon: "error",
                        title: "Sign in failed",
                        text: response.result.message || "Invalid email or password."
                    });
                }
            } catch (error) {
                console.error(error);
                await showAlert({
                    icon: "error",
                    title: "Server unavailable",
                    text: "Could not connect to the server. Check Laragon and Apache."
                });
            } finally {
                if (button) button.disabled = false;
            }
        });

        // FORGOT PASSWORD
        if (forgotPassword) {
            forgotPassword.addEventListener("click", async function (event) {
                event.preventDefault();
                const email = document.getElementById("signin-email").value.trim();

                if (!email) {
                    await showAlert({
                        icon: "info",
                        title: "Enter your email",
                        text: "Enter your account email first."
                    });
                } else {
                    await showAlert({
                        icon: "info",
                        title: "Password recovery",
                        text: "Password recovery is not enabled in this project yet."
                    });
                }
            });
        }
    }

    /* =====================================================
       2. IDENTITY SELECTION (user.html)
       ===================================================== */

    const residentButton = document.getElementById("resident-btn");
    const officialButton = document.getElementById("official-btn");

    if (residentButton && officialButton) {
        checkAccountStatus(function (account) {
            if (account.is_admin || account.identity) {
                window.location.href = "forms/dashboard.php";
            }
        });

        function chooseIdentity(identity) {
            localStorage.setItem("userIdentity", identity);
            window.location.href = "profile.html";
        }

        residentButton.addEventListener("click", function () {
            chooseIdentity("resident");
        });

        officialButton.addEventListener("click", function () {
            chooseIdentity("government_official");
        });
    }

    /* =====================================================
       3. PROFILE INFORMATION (profile.html)
       ===================================================== */

    const residentForm = document.getElementById("resident-form");
    const officialForm = document.getElementById("official-form");

    if (residentForm && officialForm) {
        const identity = localStorage.getItem("userIdentity");
        const profileTitle = document.getElementById("profile-title");
        const profileDescription = document.getElementById("profile-description");

        checkAccountStatus(function (account) {
            if (account.is_admin || (account.identity && account.identity !== identity)) {
                window.location.href = "forms/dashboard.php";
            }
        });

        // DISPLAY CORRECT PROFILE
        if (identity === "resident") {
            residentForm.hidden = false;

            if (profileTitle) {
                profileTitle.textContent = "Resident Information";
            }

            if (profileDescription) {
                profileDescription.textContent =
                    "Provide your residential and contact details for your BIOGUARD profile.";
            }

        } else if (identity === "government_official") {
            officialForm.hidden = false;

            if (profileTitle) {
                profileTitle.textContent = "Government Official Information";
            }

            if (profileDescription) {
                profileDescription.textContent =
                    "Provide your designation, office, and official contact details.";
            }

        } else {
            window.location.href = "user.html";
            return;
        }

        // SAVE PROFILE
        async function saveProfile(form) {
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const button = form.querySelector(".submit-button");
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            data.identity = identity;

            if (button) button.disabled = true;

            try {
                const response = await postJSON("forms/save_profile.php", data);

                if (response.ok && response.result.success) {
                    await showAlert({
                        icon: "success",
                        title: "Profile completed",
                        text: response.result.message || "Your profile has been saved.",
                        confirmButtonText: "Continue"
                    });

                    localStorage.removeItem("userIdentity");
                    window.location.href = response.result.redirect || "forms/dashboard.php";

                } else {
                    await showAlert({
                        icon: "error",
                        title: "Unable to save profile",
                        text: response.result.message || "Please try again."
                    });
                }
            } catch (error) {
                console.error(error);
                await showAlert({
                    icon: "error",
                    title: "Server error",
                    text: "Unable to connect to the server."
                });
            } finally {
                if (button) button.disabled = false;
            }
        }

        // BOTH FORMS USE THE SAME FUNCTION
        [residentForm, officialForm].forEach(function (form) {
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                saveProfile(form);
            });
        });
    }
});
