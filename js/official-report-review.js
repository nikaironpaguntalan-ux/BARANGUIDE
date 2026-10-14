/* Government Official only — verification and rejection requests. */
(function () {
    "use strict";

    function init(settings) {
        var submitting = false;
        // Delegate so dynamically created map popups work too.
        $(document).on("click", ".review-accept, #verificationQueue .review-decline", function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (submitting) return;
            var id = Number($(this).data("id"));
            if (!Number.isSafeInteger(id) || id < 1) return;
            var decision = $(this).hasClass("review-decline") ? "rejected" : "verified";
            var isReject = decision === "rejected";
            function save(notes) {
                submitting = true;
                // Disable all verify/reject controls while request is being processed.
                $(".review-accept, #verificationQueue .review-decline").prop("disabled", true);
                $.ajax({
                    url: "review_report.php",
                    type: "POST",
                    dataType: "json",
                    data: {
                        report_id: id,
                        decision: decision,
                        notes: notes,
                        csrf_token: settings.csrf
                    },
                    success: function (result) {
                        if (result.status === "success") {
                            settings.onReviewed();
                            settings.notify(result.notification_warning ? "warning" : "success", "Report reviewed", result.message);
                        } else {
                            settings.notify("error", "Review failed", result.message || "Try again.");
                        }
                    },
                    error: function (xhr) {
                        settings.notify("error", "Review failed",
                            (xhr.responseJSON && xhr.responseJSON.message) || "Please check your permissions.");
                        // Reload after a conflict so a previously verified report is not shown as actionable.
                        if (xhr.status === 409) settings.onReviewed();
                    },
                    complete: function () {
                        submitting = false;
                        $(".review-accept, #verificationQueue .review-decline").prop("disabled", false);
                    }
                });
            }

            if (window.Swal) {
                Swal.fire({
                    title: isReject ? "Reject report #" + id + "?" : "Verify report #" + id + "?",
                    text: isReject
                        ? "This report will be marked rejected. A reason is required."
                        : "Confirm that you have reviewed the submitted information. Verification is not a medical diagnosis.",
                    icon: isReject ? "warning" : "question",
                    input: "textarea",
                    inputLabel: isReject ? "Reason for rejection" : "Review notes (optional)",
                    inputPlaceholder: isReject ? "Explain why the report cannot be verified" : "Optional notes",
                    inputAttributes: { maxlength: "1000", "aria-label": "Review notes" },
                    showCancelButton: true,
                    showCloseButton: true,
                    confirmButtonText: isReject ? "Confirm rejection" : "Confirm verification",
                    confirmButtonColor: isReject ? "#995047" : "#276b5e",
                    inputValidator: function (value) {
                        if (isReject && !String(value || "").trim()) 
                            return "Provide a rejection reason.";
                        if (String(value || "").length > 1000) return "Notes must be 1000 characters or fewer.";
                    }
                }).then(function (answer) {
                    if (answer.isConfirmed) save(String(answer.value || "").trim());
                });
            } else {
                var notes = window.prompt(isReject ? "Reason for rejection (required):" : "Review notes (optional):", "");
                if (notes === null) return;
                if (isReject && !notes.trim()) {
                    settings.notify("warning", "Reason required", "Please provide a reason for rejection.");
                    return;
                }
                if (notes.length > 1000) {
                    settings.notify("warning", "Notes too long", "Limit notes to 1000 characters.");
                    return;
                }
                if (window.confirm("Confirm " + (isReject ? "rejection" : "verification") + " for report #" + id + "?")) {
                    save(notes.trim());
                }
            }
        });
    }

    window.BGOfficialReportReview = { init: init };
}());
