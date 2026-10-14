/* Shared report verification status for Resident and Government Official pages. */
(function () {
    "use strict";

    function render(report, canVerify) {
        var status = String(report.verification_status || "pending");

        if (status === "verified") {
            return '<span class="report-badge is-verified" aria-label="Verified report">' +
                '<i class="fa-solid fa-check" aria-hidden="true"></i> Verified</span>';
        }

        if (status === "rejected") {
            return '<span class="report-badge is-rejected">Rejected</span>';
        }

        // Never rely on this flag for authorization: review_report.php enforces it again.
        var id = Number(report.id);
        if (canVerify && Number.isSafeInteger(id) && id > 0) {
            return '<button type="button" class="review-accept report-verify-pill" ' +
                'data-id="' + id + '" aria-label="Verify report ' + id + '">' +
                '<i class="fa-solid fa-check" aria-hidden="true"></i> Verify</button>';
        }

        return '<span class="report-badge is-pending">Pending</span>';
    }

    window.BGReportStatus = { render: render };
}());
