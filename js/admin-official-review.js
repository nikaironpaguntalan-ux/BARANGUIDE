/* Admin-only account review dialogs. Keeps existing API behavior for Phase 1. */
(function () {
    "use strict";

    function init(settings) {
        var busy = false;

        $("#officialList").on("click", ".official-approve, .official-reject", function () {
            if (busy) return;

            var id = Number($(this).data("id"));
            if (!Number.isSafeInteger(id) || id < 1) return;

            var isApprove = $(this).hasClass("official-approve");
            var decision = isApprove ? "verified" : "rejected";

            function submit(notes) {
                busy = true;
                $("#officialList .official-approve, #officialList .official-reject").prop("disabled", true);

                $.ajax({
                    url: "review_official.php",
                    type: "POST",
                    dataType: "json",
                    data: {
                        user_id: id,
                        decision: decision,
                        notes: notes,
                        csrf_token: settings.csrf
                    },
                    success: function (response) {
                        if (response.status === "success") {
                            settings.onReviewed();
                            settings.notify("success", "Account reviewed", response.message);
                        } else {
                            settings.notify("error", "Review failed", response.message || "Try again.");
                        }
                    },
                    error: function (xhr) {
                        settings.notify("error", "Review failed",
                            (xhr.responseJSON && xhr.responseJSON.message) || "Check permissions.");
                    },
                    complete: function () {
                        busy = false;
                        $("#officialList .official-approve, #officialList .official-reject").prop("disabled", false);
                    }
                });
            }

            if (window.Swal) {
                Swal.fire({
                    title: (isApprove ? "Approve" : "Reject / revoke") + " account #" + id + "?",
                    text: "Confirm that you independently checked the official's credentials.",
                    icon: isApprove ? "question" : "warning",
                    input: "textarea",
                    inputLabel: isApprove ? "Review notes (optional)" : "Reason (required)",
                    inputAttributes: { maxlength: "1000", "aria-label": "Account review notes" },
                    showCancelButton: true,
                    showCloseButton: true,
                    confirmButtonText: isApprove ? "Confirm approval" : "Confirm rejection / revocation",
                    confirmButtonColor: isApprove ? "#276b5e" : "#995047",
                    inputValidator: function (value) {
                        if (!isApprove && !String(value || "").trim()) return "Enter a review reason.";
                        if (String(value || "").length > 1000) return "Limit notes to 1000 characters.";
                    }
                }).then(function (answer) {
                    if (answer.isConfirmed) submit(String(answer.value || "").trim());
                });
            } else {
                var notes = window.prompt(isApprove ? "Review notes (optional):" : "Reason (required):", "");
                if (notes === null) return;
                if (!isApprove && !notes.trim()) {
                    settings.notify("warning", "Reason needed", "Enter a review reason.");
                    return;
                }
                if (notes.length > 1000) {
                    settings.notify("warning", "Notes too long", "Limit notes to 1000 characters.");
                    return;
                }
                if (window.confirm("Confirm account " + (isApprove ? "approval" : "rejection / revocation") + "?")) {
                    submit(notes.trim());
                }
            }
        });
    }

    window.BGAdminOfficialReview = { init: init };
}());
