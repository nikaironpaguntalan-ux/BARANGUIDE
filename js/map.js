
/* =====================================================
   BARANGUIDE - MAP JAVASCRIPT
   jQuery + AJAX + Leaflet
   ===================================================== */

$(document).ready(function () {

    if (!$("#map").length) {
        return;
    }

    if (typeof L === "undefined") {
        $("#mapError").text("Leaflet could not load.").prop("hidden", false);
        return;
    }


    /* =====================================================
       1. MAP SETUP
       ===================================================== */

    var map = L.map("map", {
        zoomControl: false
    }).setView([10.669644, 122.948844], 17);

    L.control.zoom({
        position: "bottomright"
    }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);


    // ADDRESS SEARCH

    if (L.esri && L.esri.Geocoding && L.esri.Geocoding.geosearch) {

        var search = L.esri.Geocoding.geosearch({
            position: "bottomleft",
            expanded: false,
            placeholder: "Search place or address"
        }).addTo(map);

        var searchResults = L.layerGroup().addTo(map);

        search.on("results", function (data) {

            searchResults.clearLayers();

            $.each(data.results || [], function (index, result) {

                L.marker(result.latlng)
                    .bindPopup(escapeHTML(result.text || "Search result"))
                    .addTo(searchResults);

            });
        });
    }


    /* =====================================================
       2. USER ACCESS
       ===================================================== */

    var isAdmin = $("body").attr("data-is-admin") === "1";
    var isVerifiedOfficial = $("body").attr("data-official-verified") === "1";
    var csrf = $("body").attr("data-csrf");


    /* =====================================================
       3. REPORT CATEGORIES
       ===================================================== */

    var categories = [
        {
            name: "Human / Vector-borne",
            key: "animal_transmitted",
            color: "#346c77",
            icon: "fa-shield-virus"
        },
        {
            name: "Animal Disease",
            key: "animal_disease",
            color: "#ad6a42",
            icon: "fa-paw"
        },
        {
            name: "Habitat / Environment",
            key: "habitat_risk",
            color: "#a6823b",
            icon: "fa-seedling"
        }
    ];

    var reportOptions = {
        animal_transmitted: [
            "Dengue",
            "Rabies",
            "Malaria",
            "Leptospirosis",
            "Chikungunya",
            "Other human/vector-borne disease"
        ],

        animal_disease: [
            "African Swine Fever (ASF)",
            "Avian Influenza",
            "Newcastle Disease",
            "Foot-and-Mouth Disease",
            "Other animal disease"
        ],

        habitat_risk: [
            "Mosquito breeding site",
            "Stagnant water",
            "Rat/rodent infestation",
            "Flood-prone area",
            "Improper waste accumulation",
            "Stray/aggressive animal area",
            "Animal bite incident",
            "Unusual animal deaths",
            "Other environmental risk"
        ]
    };


    /* =====================================================
       4. VARIABLES
       ===================================================== */

    var allReports = [];
    var allInterventions = [];
    var reportMarkers = [];
    var shownReports = [];

    var activeMode = "";
    var selectionMarker = null;

    var radiusCenter = null;
    var radiusCircle = null;

    var distancePoints = [];
    var distanceLine = null;
    var distanceLabel = null;

    var loadingReports = false;
    var loadingInterventions = false;


    /* =====================================================
       5. SHARED FUNCTIONS
       ===================================================== */

    function escapeHTML(value) {

        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function categoryInfo(type) {

        for (var i = 0; i < categories.length; i++) {

            if (categories[i].key === type) {
                return categories[i];
            }
        }

        return categories[2];
    }


    function categoryName(key) {
        return categoryInfo(key).name;
    }


    function updateReportDetails() {

        var category = $("#reportType").val();
        var detail = $("#reportDetail");

        detail.empty();
        detail.append('<option value="">Select disease or hazard</option>');

        var options = reportOptions[category] || [];

        $.each(options, function (index, item) {
            detail.append($("<option>").val(item).text(item));
        });
    }


    $("#reportType").change(function () {
        updateReportDetails();
    });


    function verificationLabel(value) {

        if (value === "pending") {
            return "Pending official verification";
        }

        if (value === "verified") {
            return "Verified by official";
        }

        if (value === "rejected") {
            return "Rejected by official";
        }

        return "Awaiting verification";
    }


    function niceStatus(value) {

        if (value === "in_progress") {
            return "In progress";
        }

        var status = String(value || "pending");

        return status.charAt(0).toUpperCase() + status.slice(1);
    }


    // Common verification badge: resident sees Pending; officials can verify pending reports.
    function reportStatus(report) {
        return window.BGReportStatus.render(report, isVerifiedOfficial);
    }


    function notify(icon, title, message) {

        if (window.Swal) {

            Swal.fire({
                icon: icon,
                title: title,
                text: message,
                showCloseButton: true
            });

        } else {

            alert(title + "\n" + message);
        }
    }


    function setHint(message) {

        $("#toolHint").text(message);

        if (message) {
            $("#toolHint").prop("hidden", false);
        } else {
            $("#toolHint").prop("hidden", true);
        }
    }


    /* =====================================================
       6. SIDEBAR / DRAWER
       ===================================================== */

    function closeDrawer() {

        $("#mapDrawer").removeClass("is-open");
        $("#mapDrawer").attr("aria-hidden", "true");

        $("#menuButton").attr("aria-expanded", "false");
    }


    function openDrawer(panel) {

        $("#mapDrawer").addClass("is-open");
        $("#mapDrawer").attr("aria-hidden", "false");

        $("#menuButton").attr("aria-expanded", "true");

        if (panel) {
            showPanel(panel);
        }
    }


    function showPanel(name) {

        $(".drawer-tab").removeClass("is-selected");

        $('.drawer-tab[data-panel="' + name + '"]')
            .addClass("is-selected");

        $(".drawer-page").prop("hidden", true);

        $("#panel-" + name).prop("hidden", false);
    }


    $("#menuButton").click(function () {

        if ($("#mapDrawer").hasClass("is-open")) {

            closeDrawer();

        } else {

            openDrawer("analytics");
        }
    });


    $("#closeMenu").click(function () {
        closeDrawer();
    });


    $(".drawer-tab").click(function () {

        var panel = $(this).attr("data-panel");

        showPanel(panel);
    });


    $(document).keydown(function (e) {

        if (e.key === "Escape") {

            closeDrawer();
            closeReport();
            closeIntervention();
            clearMeasurements();
        }
    });


    /* =====================================================
       7. REPORT FORM
       ===================================================== */

    function removeSelectionMarker() {

        if (selectionMarker !== null) {
            map.removeLayer(selectionMarker);
        }

        selectionMarker = null;
    }


    function closeReport() {

        $("#reportForm").removeClass("is-open").hide();

        removeSelectionMarker();

        if (activeMode === "report") {
            activeMode = "";
            setHint("");
        }
    }


    function startReport() {

        closeDrawer();
        closeIntervention();
        clearMeasurements();

        $("#reportForm")[0].reset();

        $("#reportLat").val("");
        $("#reportLng").val("");

        updateReportDetails();

        removeSelectionMarker();

        activeMode = "report";

        $("#reportForm").addClass("is-open").show();

        setHint("Click the map to select a report location. You can drag the pin.");
    }


    $("#addReportBtn, #drawerAddReport").click(function () {
        startReport();
    });


    $("#closeReportForm").click(function () {
        closeReport();
    });


    /* =====================================================
       8. INTERVENTION FORM
       ===================================================== */

    function closeIntervention() {
        $("#interventionForm").removeClass("is-open").hide();
    }


    function openIntervention(reportId) {

        if (!isVerifiedOfficial) {
            return;
        }

        closeReport();
        clearMeasurements();
        closeDrawer();

        $("#interventionForm")[0].reset();

        if (reportId) {
            $("#interventionReport").val(String(reportId));
        }

        $("#interventionForm").addClass("is-open").show();
    }


    $("#newIntervention").click(function () {
        openIntervention("");
    });


    $("#closeInterventionForm").click(function () {
        closeIntervention();
    });


    /* =====================================================
       9. MAP CLICK AND DRAGGABLE REPORT MARKER
       ===================================================== */

    map.on("click", function (event) {

        if (activeMode === "report") {

            var lat = event.latlng.lat;
            var lng = event.latlng.lng;

            $("#reportLat").val(lat.toFixed(6));
            $("#reportLng").val(lng.toFixed(6));

            removeSelectionMarker();

            selectionMarker = L.marker([lat, lng], {
                opacity: 0.8,
                draggable: true
            }).addTo(map);


            // UPDATE COORDINATES AFTER DRAGGING

            selectionMarker.on("dragend", function () {

                var position = selectionMarker.getLatLng();

                $("#reportLat").val(position.lat.toFixed(6));
                $("#reportLng").val(position.lng.toFixed(6));

                setHint("Marker location updated. Complete the report form.");

            });

            setHint("Location selected. Drag the marker if you want to adjust it.");

        } else if (activeMode === "radius") {

            radiusCenter = event.latlng;
            drawRadius();

        } else if (activeMode === "distance") {

            addDistancePoint(event.latlng);
        }
    });


    /* =====================================================
       10. REPORT MARKER ICONS
       ===================================================== */

    function makeReportIcon(type, verification) {

        var info = categoryInfo(type);

        var state = "pending";

        if (verification === "verified") {
            state = "verified";
        } else if (verification === "rejected") {
            state = "rejected";
        }

        var stateIcon = "fa-clock";

        if (state === "verified") {
            stateIcon = "fa-check";
        } else if (state === "rejected") {
            stateIcon = "fa-xmark";
        }

        return L.divIcon({

            className: "report-marker-icon",

            html:
                '<span class="report-pin report-' + state +
                '" style="--pin-color:' + info.color + '">' +
                '<i class="fa-solid ' + info.icon + '"></i></span>' +
                '<span class="pin-state ' + state + '">' +
                '<i class="fa-solid ' + stateIcon + '"></i></span>',

            iconSize: [34, 37],
            iconAnchor: [17, 34],
            popupAnchor: [0, -32]

        });
    }


    /* =====================================================
       11. MARKER POPUP
       ===================================================== */

    function makeReportPopup(report) {

        var info = categoryInfo(report.risk_category);

        var html = '<div class="report-popup">';

        html += '<div class="report-popup-head">' +
            '<div class="report-popup-title">' + escapeHTML(report.location_name) + '</div>' +
            reportStatus(report) + '</div>';

        html += '<div class="report-popup-meta">';

        html += '<span style="color:' + info.color + '">&#9679;</span> ';

        html += escapeHTML(categoryName(report.risk_category));

        html += '<br>' + escapeHTML(report.risk_detail || report.report_type);


        html += '<br>Reported urgency: ' +
            escapeHTML(niceStatus(report.severity));

        html += '<br>Response: ' +
            escapeHTML(niceStatus(report.status));

        html += '</div>';


        if (report.verification_note) {

            html += '<div class="report-popup-description">' +
                '<strong>Review note:</strong> ' +
                escapeHTML(report.verification_note) +
                '</div>';
        }


        if (report.photo_path &&
            /^\.\.\/assets\/uploads\/reports\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(report.photo_path)) {

            html += '<a href="' + escapeHTML(report.photo_path) +
                '" target="_blank" rel="noopener noreferrer">';

            html += '<img class="report-photo" src="' +
                escapeHTML(report.photo_path) +
                '" alt="Submitted evidence"></a>';
        }


        html += '<div class="report-popup-description">' +
            escapeHTML(report.description) + '</div>';

        html += '<small>' +
            escapeHTML(report.created_at || "") +
            '</small>';

        html += '</div>';

        return html;
    }


    /* =====================================================
       12. FILTER REPORTS
       ===================================================== */

    function checkedValues(selector) {

        var values = [];

        $(selector + ":checked").each(function () {
            values.push($(this).val());
        });

        return values;
    }


    function filterReports() {

        var types = checkedValues(".filter-type");
        var severities = checkedValues(".filter-severity");
        var statuses = checkedValues(".filter-status");
        var verifications = checkedValues(".filter-verification");

        var selectedDetail = $("#detailFilter").val();

        var results = [];

        $.each(allReports, function (index, report) {

            if (types.indexOf(report.risk_category) === -1) {
                return;
            }

            if (severities.indexOf(report.severity) === -1) {
                return;
            }

            if (statuses.indexOf(report.status) === -1) {
                return;
            }

            if (verifications.indexOf(report.verification_status) === -1) {
                return;
            }

            if (selectedDetail && selectedDetail !== report.risk_detail) {
                return;
            }

            results.push(report);
        });

        return results;
    }


    /* =====================================================
       13. DISPLAY REPORT MARKERS
       ===================================================== */

    function renderReports() {

        $.each(reportMarkers, function (index, item) {
            map.removeLayer(item.marker);
        });

        reportMarkers = [];

        shownReports = filterReports();

        var visible = $("#showReportMarkers").is(":checked");


        $.each(shownReports, function (index, report) {

            var lat = parseFloat(report.latitude);
            var lng = parseFloat(report.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return;
            }

            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return;
            }


            // SAVED REPORT MARKERS ARE NOT DRAGGABLE

            var marker = L.marker([lat, lng], {

                icon: makeReportIcon(
                    report.risk_category,
                    report.verification_status
                ),

                draggable: false

            });


            marker.bindPopup(makeReportPopup(report));


            if (visible) {
                marker.addTo(map);
            }


            reportMarkers.push({
                marker: marker,
                report: report
            });

        });


        $("#reportCount").text(shownReports.length);

        renderReportList();
        renderAnalytics();
        updateRadiusCount();
        updateInterventionOptions();
        renderVerificationQueue();
    }


    /* =====================================================
       14. REPORT LIST
       ===================================================== */

    function renderReportList() {

        var container = $("#reportList");
        container.empty();

        if (shownReports.length === 0) {
            container.append('<p class="empty-note">No reports match the current filters.</p>');
            return;
        }

        $.each(shownReports, function (index, report) {

            var info = categoryInfo(report.risk_category);
            var entry = $("<div class='record-entry report-card'>");

            // Separate buttons: do not nest Verify inside another clickable button.
            entry.html(
                '<div class="record-head">' +
                '<button type="button" class="report-view" aria-label="View report on map">' +
                '<i class="record-dot" style="--record-color:' + info.color + '"></i>' +
                escapeHTML(report.risk_detail || report.report_type) +
                '</button>' +
                reportStatus(report) + '</div>' +
                '<p>' + escapeHTML(categoryName(report.risk_category)) +
                ' · ' + escapeHTML(report.location_name) + '</p>' +
                '<small>' + escapeHTML(report.created_at || "") + '</small>'
            );

            entry.find(".report-view").data("report-id", report.id);
            container.append(entry);
        });
    }


    /* =====================================================
       15. ANALYTICS
       ===================================================== */

    function renderAnalytics() {

        $("#statTotal").text(allReports.length);

        var pending = 0;
        var verified = 0;
        var progress = 0;


        $.each(allReports, function (index, report) {

            if (report.verification_status === "pending") {
                pending++;
            }

            if (report.verification_status === "verified") {
                verified++;
            }

            if (report.status === "in_progress") {
                progress++;
            }

        });


        $("#statPending").text(pending);
        $("#statVerified").text(verified);
        $("#statProgress").text(progress);


        var container = $("#categoryBreakdown");

        container.empty();

        renderRiskNotices();


        if (allReports.length === 0) {

            container.append(
                '<p class="empty-note">No reports yet.</p>'
            );

            return;
        }


        $.each(categories, function (index, category) {

            var count = 0;


            $.each(allReports, function (index, report) {

                if (report.risk_category === category.key) {
                    count++;
                }

            });


            if (count === 0) {
                return;
            }


            var width = (count / allReports.length * 100).toFixed(1);


            container.append(
                '<div class="breakdown-row">' +
                '<span>' + escapeHTML(category.name) + '</span>' +
                '<strong>' + count + '</strong>' +
                '<div class="breakdown-bar">' +
                '<div style="width:' + width +
                '%;background:' + category.color + '"></div>' +
                '</div></div>'
            );

        });
    }


    /* =====================================================
       16. VERIFIED HIGH-PRIORITY NOTICES
       ===================================================== */

    function renderRiskNotices() {

        var alerts = $("#priorityAlerts");

        alerts.empty();

        var count = 0;
        var recent = 0;
        var earlier = 0;

        var now = new Date().getTime();
        var month = 30 * 24 * 60 * 60 * 1000;


        $.each(allReports, function (index, report) {

            if (report.verification_status !== "verified") {
                return;
            }


            var created = new Date(
                String(report.created_at || "").replace(" ", "T")
            ).getTime();


            if (Number.isFinite(created)) {

                var age = now - created;

                if (age >= 0 && age < month) {
                    recent++;
                } else if (age >= month && age < 2 * month) {
                    earlier++;
                }
            }


            if (report.status !== "resolved" &&
                (report.severity === "high" || report.severity === "critical")) {

                count++;


                if (count <= 5) {

                    alerts.append(
                        '<div class="notice-item">' +
                        escapeHTML(report.risk_detail) +
                        ' · ' +
                        escapeHTML(report.location_name) +
                        ' · ' +
                        escapeHTML(niceStatus(report.severity)) +
                        ' priority. Awaiting / undergoing an appropriate response.' +
                        '</div>'
                    );

                }
            }

        });


        if (count === 0) {

            alerts.html(
                '<p class="empty-note">No verified high-priority unresolved reports.</p>'
            );

        } else if (count > 5) {

            alerts.append(
                '<p class="context-note">' +
                (count - 5) +
                ' more high-priority reports are visible on the map.</p>'
            );

        }


        var direction = "the same number of";

        if (recent > earlier) {
            direction = "more";
        } else if (recent < earlier) {
            direction = "fewer";
        }


        $("#submissionTrend").text(
            recent + " verified reports from the last 30 days; " +
            earlier + " during the preceding 30 days (" +
            direction +
            " reports). This tracks reporting volume, not confirmed disease incidence."
        );
    }


    /* =====================================================
       17. SPECIFIC DISEASE / HAZARD FILTER
       ===================================================== */

    function updateDetailFilter() {

        var selected = $("#detailFilter").val();
        var values = [];

        $("#detailFilter").empty();

        $("#detailFilter").append(
            '<option value="">All diseases and hazards</option>'
        );


        $.each(allReports, function (index, report) {

            var detail = report.risk_detail || report.report_type;

            if (detail && values.indexOf(detail) === -1) {
                values.push(detail);
            }

        });


        values.sort();


        $.each(values, function (index, item) {

            $("#detailFilter").append(
                $("<option>").val(item).text(item)
            );

        });


        $("#detailFilter").val(selected || "");

        if ($("#detailFilter").val() === null) {
            $("#detailFilter").val("");
        }
    }


    /* =====================================================
       18. OFFICIAL VERIFICATION QUEUE
       ===================================================== */

    function renderVerificationQueue() {

        if (!isVerifiedOfficial) {
            return;
        }

        var box = $("#verificationQueue");

        box.empty();

        var count = 0;


        $.each(allReports, function (index, report) {

            if (report.verification_status !== "pending") {
                return;
            }

            count++;


            var entry = $("<div>");

            entry.addClass("record-entry");


            entry.html(
                '<div class="record-head">' +
                '<span>#' + escapeHTML(report.id) +
                ' · ' + escapeHTML(report.risk_detail) +
                '</span>' +
                reportStatus(report) + '</div>' +
                '<p>' + escapeHTML(report.location_name) +
                ' · ' + escapeHTML(report.description) +
                '</p>'
            );


            var actions = $("<div>");

            actions.addClass("review-buttons");


            actions.append(
                $("<button type='button' class='review-decline'>Reject</button>")
                    .data("id", report.id)
            );

            actions.append(
                $("<button type='button' class='review-view'>View on map</button>")
                    .data("id", report.id)
            );


            entry.append(actions);
            box.append(entry);

        });


        if (count === 0) {

            box.html(
                '<p class="empty-note">No reports awaiting verification.</p>'
            );
        }
    }


    /* =====================================================
       19. FOCUS ON A REPORT
       ===================================================== */

    function focusReport(id) {

        var existsInLayer = false;


        $.each(reportMarkers, function (index, item) {

            if (String(item.report.id) === String(id)) {
                existsInLayer = true;
            }

        });


        if (!existsInLayer) {

            $(".filter-type, .filter-verification, .filter-severity, .filter-status")
                .prop("checked", true);

            $("#detailFilter").val("");

            renderReports();
        }


        if (!$("#showReportMarkers").is(":checked")) {

            $("#showReportMarkers").prop("checked", true);

            renderReports();
        }


        $.each(reportMarkers, function (index, item) {

            if (String(item.report.id) === String(id)) {

                $("#showReportMarkers").prop("checked", true);

                if (!map.hasLayer(item.marker)) {
                    map.addLayer(item.marker);
                }

                closeDrawer();

                map.flyTo(item.marker.getLatLng(), 18);

                item.marker.openPopup();

                return false;
            }

        });
    }


    $("#reportList").on("click", ".report-view", function () {
        focusReport($(this).data("report-id"));
    });


    /* =====================================================
       20. LOAD REPORTS USING AJAX
       ===================================================== */

    function loadReports() {

        if (loadingReports) {
            return;
        }

        loadingReports = true;


        $.ajax({

            url: "fetch_reports.php",
            type: "GET",
            dataType: "json",
            cache: false,


            success: function (response) {

                if (response.status === "success") {

                    allReports = response.data || [];

                    updateDetailFilter();
                    renderReports();

                } else {

                    $("#reportList").html(
                        '<p class="empty-note">' +
                        escapeHTML(response.message || "Unable to load reports.") +
                        '</p>'
                    );

                    notify(
                        "error",
                        "Could not load reports",
                        response.message || "Check the report database table."
                    );
                }
            },


            error: function (xhr) {

                if (xhr.status === 401) {

                    window.location.href = "../index.html";
                    return;
                }

                $("#reportList").html(
                    '<p class="empty-note">Database not available. Check the report database connection.</p>'
                );

                console.error("Loading reports failed:", xhr.status);
            },


            complete: function () {
                loadingReports = false;
            }

        });
    }


    /* =====================================================
       21. SUBMIT REPORT USING AJAX
       ===================================================== */

    $("#reportForm").submit(function (e) {

        e.preventDefault();


        var latitude = $("#reportLat").val();
        var longitude = $("#reportLng").val();

        var reportType = $("#reportType").val();
        var reportDetail = $("#reportDetail").val();

        var locationName = $("#reportPlace").val().trim();
        var severity = $("#reportSeverity").val();
        var description = $("#reportDescription").val().trim();


        if (latitude === "" || longitude === "") {

            notify(
                "warning",
                "Map point needed",
                "Click the map to choose the location."
            );

            return;
        }


        if (!reportType || !reportDetail || !locationName || !description) {

            notify(
                "warning",
                "Missing details",
                "Complete the category, location and description."
            );

            return;
        }


        var formData = new FormData();

        formData.append("latitude", latitude);
        formData.append("longitude", longitude);
        formData.append("risk_category", reportType);
        formData.append("risk_detail", reportDetail);
        formData.append("location_name", locationName);
        formData.append("severity", severity);
        formData.append("description", description);
        formData.append("csrf_token", csrf);


        var photoInput = $("#reportPhoto")[0];
        var file = null;

        if (photoInput && photoInput.files) {
            file = photoInput.files[0];
        }


        if (file) {

            if (file.size > 5 * 1024 * 1024) {

                notify(
                    "warning",
                    "Image too large",
                    "Maximum file size is 5 MB."
                );

                return;
            }

            formData.append("photo", file);
        }


        $("#saveReportBtn").prop("disabled", true);


        $.ajax({

            url: "save_report.php",
            type: "POST",

            data: formData,
            processData: false,
            contentType: false,
            dataType: "json",


            success: function (response) {

                if (response.status === "success") {

                    closeReport();

                    loadReports();

                    notify(
                        "success",
                        "Report submitted",
                        "Your report is pending official government verification."
                    );

                } else {

                    notify(
                        "error",
                        "Unable to submit",
                        response.message || "The report was not saved."
                    );
                }
            },


            error: function (xhr) {

                if (xhr.status === 401) {
                    window.location.href = "../index.html";
                    return;
                }

                notify(
                    "error",
                    "Save failed",
                    (xhr.responseJSON && xhr.responseJSON.message) ||
                    "Check the PHP/MySQL setup."
                );
            },


            complete: function () {
                $("#saveReportBtn").prop("disabled", false);
            }

        });

    });


    /* =====================================================
       22. FILTER CONTROLS
       ===================================================== */

    $("#filterToggleBtn").click(function () {

        var open = $("#reportFilters").prop("hidden");

        $("#reportFilters").prop("hidden", !open);

        $(this).attr("aria-expanded", String(open));
        $(this).toggleClass("is-active", open);
    });


    $("#applyReportFilters").click(function () {
        renderReports();
    });


    $("#detailFilter, .filter-type, .filter-verification, .filter-severity, .filter-status, #showReportMarkers")
        .change(function () {

            renderReports();

        });


    $("#clearReportFilters").click(function () {

        $(".filter-type, .filter-verification, .filter-severity, .filter-status")
            .prop("checked", true);

        $("#showReportMarkers").prop("checked", true);

        $("#detailFilter").val("");

        renderReports();
    });


    /* =====================================================
       23. VIEW ALL MARKERS
       ===================================================== */

    $("#viewMarkersBtn").click(function () {

        closeReport();
        closeIntervention();
        clearMeasurements();


        $(".filter-type, .filter-verification, .filter-severity, .filter-status")
            .prop("checked", true);

        $("#showReportMarkers").prop("checked", true);

        $("#detailFilter").val("");

        renderReports();


        var bounds = [];

        $.each(reportMarkers, function (index, item) {

            bounds.push(item.marker.getLatLng());

        });


        if (bounds.length > 1) {

            map.fitBounds(bounds, {
                padding: [75, 75],
                maxZoom: 17
            });

        } else if (bounds.length === 1) {

            map.setView(bounds[0], 17);

        } else {

            notify(
                "info",
                "No markers found",
                "Submit a report first."
            );
        }
    });


    /* =====================================================
       24. RADIUS TOOL
       ===================================================== */

    function drawRadius() {

        if (!radiusCenter) {
            return;
        }

        var meters = parseInt($("#radiusMeters").val(), 10) || 500;


        if (radiusCircle) {
            map.removeLayer(radiusCircle);
        }


        radiusCircle = L.circle(radiusCenter, {

            radius: meters,
            color: "#2f7771",
            weight: 2,
            fillColor: "#82dcd5",
            fillOpacity: 0.15

        }).addTo(map);


        updateRadiusCount();

        $("#clearMeasureBtn").prop("hidden", false);

        setHint("Radius centered. Click another point to move the circle.");
    }


    function updateRadiusCount() {

        if (!radiusCenter) {
            return;
        }

        var meters = parseInt($("#radiusMeters").val(), 10) || 500;

        var count = 0;


        $.each(shownReports, function (index, report) {

            var lat = parseFloat(report.latitude);
            var lng = parseFloat(report.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return;
            }

            var distance = map.distance(radiusCenter, [lat, lng]);

            if (distance <= meters) {
                count++;
            }

        });


        $("#radiusResult").text(
            count + " matching reports within " +
            meters + " meters (straight-line radius)."
        );
    }


    $("#radiusBtn").click(function () {

        if (activeMode === "radius") {

            clearMeasurements();
            return;
        }


        closeReport();
        closeIntervention();
        clearMeasurements();

        activeMode = "radius";

        $("#radiusOptions").prop("hidden", false);

        $("#radiusBtn").addClass("is-active");

        $("#clearMeasureBtn").prop("hidden", false);

        setHint("Radius tool: click the map to choose a center point.");
    });


    $("#radiusMeters").change(function () {
        drawRadius();
    });


    /* =====================================================
       25. DISTANCE TOOL
       ===================================================== */

    function clearDistance() {

        distancePoints = [];


        if (distanceLine) {
            map.removeLayer(distanceLine);
        }

        if (distanceLabel) {
            map.removeLayer(distanceLabel);
        }


        distanceLine = null;
        distanceLabel = null;
    }


    function addDistancePoint(point) {

        if (distancePoints.length === 2) {
            clearDistance();
        }


        distancePoints.push(point);


        if (distancePoints.length === 1) {

            setHint("Distance tool: select the second point on the map.");

            return;
        }


        var meters = map.distance(
            distancePoints[0],
            distancePoints[1]
        );

        var label;

        if (meters >= 1000) {

            label = (meters / 1000).toFixed(2) + " km";

        } else {

            label = Math.round(meters) + " m";
        }


        distanceLine = L.polyline(distancePoints, {

            color: "#286e64",
            weight: 3,
            dashArray: "7 5"

        }).addTo(map);


        var middle = L.latLng(

            (distancePoints[0].lat + distancePoints[1].lat) / 2,
            (distancePoints[0].lng + distancePoints[1].lng) / 2

        );


        distanceLabel = L.marker(middle, {

            icon: L.divIcon({
                className: "leaflet-div-icon",
                html: '<span class="radius-label">' + label + '</span>'
            }),

            interactive: false

        }).addTo(map);


        $("#clearMeasureBtn").prop("hidden", false);

        setHint(
            "Straight-line distance: " +
            label +
            ". Click again to start another measurement."
        );
    }


    $("#distanceBtn").click(function () {

        if (activeMode === "distance") {

            clearMeasurements();
            return;
        }


        closeReport();
        closeIntervention();
        clearMeasurements();

        activeMode = "distance";

        $("#distanceBtn").addClass("is-active");

        $("#clearMeasureBtn").prop("hidden", false);

        setHint("Distance tool: click two locations on the map.");
    });


    /* =====================================================
       26. CLEAR MEASUREMENTS
       ===================================================== */

    function clearMeasurements() {

        if (radiusCircle) {
            map.removeLayer(radiusCircle);
        }

        radiusCircle = null;
        radiusCenter = null;

        clearDistance();

        $("#radiusOptions").prop("hidden", true);

        $("#radiusBtn, #distanceBtn").removeClass("is-active");

        $("#clearMeasureBtn").prop("hidden", true);


        if (activeMode === "radius" || activeMode === "distance") {

            activeMode = "";

            setHint("");
        }
    }


    $("#clearMeasureBtn").click(function () {
        clearMeasurements();
    });


    /* =====================================================
       27. INTERVENTION REPORT OPTIONS
       ===================================================== */

    function updateInterventionOptions() {

        if (!isVerifiedOfficial) {
            return;
        }

        var select = $("#interventionReport");

        var previous = select.val();

        select.empty();

        select.append('<option value="">Select report</option>');


        $.each(allReports, function (index, report) {

            if (report.verification_status === "verified") {

                select.append(
                    $("<option>")
                        .val(report.id)
                        .text(
                            "#" + report.id +
                            " — " + report.risk_detail +
                            " / " + report.location_name
                        )
                );
            }
        });


        select.val(previous || "");
    }


    /* =====================================================
       28. DISPLAY INTERVENTIONS
       ===================================================== */

    function renderInterventions() {

        var container = $("#interventionList");

        container.empty();


        if (allInterventions.length === 0) {

            container.append(
                '<p class="empty-note">No recorded interventions.</p>'
            );

            return;
        }


        $.each(allInterventions, function (index, entry) {

            var card = $("<button>");

            card.attr("type", "button");
            card.addClass("record-entry");
            card.data("report-id", entry.report_id);


            var html =
                '<div class="record-head">' +
                '<span>' + escapeHTML(entry.agency) + '</span>' +
                '<span class="status-chip">' +
                escapeHTML(niceStatus(entry.status)) +
                '</span></div>' +

                '<p>' + escapeHTML(entry.action_taken) + '</p>' +

                '<small>Related: #' +
                escapeHTML(entry.report_id) +
                ' · ' +
                escapeHTML(entry.risk_detail || entry.report_type) +
                ' · ' +
                escapeHTML(entry.created_at || "") +
                '</small>';


            if (entry.scheduled_for) {

                html += '<p><strong>Scheduled:</strong> ' +
                    escapeHTML(entry.scheduled_for) +
                    '</p>';
            }


            card.html(html);

            container.append(card);

        });
    }


    $("#interventionList").on("click", ".record-entry", function () {

        focusReport($(this).data("report-id"));

    });


    /* =====================================================
       29. LOAD INTERVENTIONS USING AJAX
       ===================================================== */

    function loadInterventions() {

        if (loadingInterventions) {
            return;
        }

        loadingInterventions = true;


        $.ajax({

            url: "fetch_interventions.php",
            type: "GET",
            dataType: "json",
            cache: false,


            success: function (response) {

                if (response.status === "success") {

                    allInterventions = response.data || [];

                    renderInterventions();

                } else {

                    $("#interventionList").html(
                        '<p class="empty-note">Unable to load interventions.</p>'
                    );

                }
            },


            error: function () {

                $("#interventionList").html(
                    '<p class="empty-note">Check the intervention database connection.</p>'
                );
            },


            complete: function () {
                loadingInterventions = false;
            }

        });
    }


    /* =====================================================
       30. SAVE INTERVENTION
       ===================================================== */

    $("#interventionForm").submit(function (e) {

        e.preventDefault();


        var reportId = $("#interventionReport").val();
        var agency = $("#interventionAgency").val().trim();
        var status = $("#interventionStatus").val();
        var action = $("#interventionAction").val().trim();
        var scheduledFor = $("#interventionDate").val();


        if (!reportId || !agency || !action ||
            (status === "planned" && !scheduledFor)) {

            notify(
                "warning",
                "Missing information",
                "Complete all intervention fields."
            );

            return;
        }


        $("#saveInterventionBtn").prop("disabled", true);


        $.ajax({

            url: "save_intervention.php",
            type: "POST",
            dataType: "json",

            data: {
                report_id: reportId,
                agency: agency,
                status: status,
                scheduled_for: scheduledFor,
                action_taken: action,
                csrf_token: csrf
            },


            success: function (response) {

                if (response.status === "success") {

                    closeIntervention();

                    loadInterventions();
                    loadReports();

                    notify(
                        "success",
                        "Intervention saved",
                        "The intervention was recorded successfully."
                    );

                } else {

                    notify(
                        "error",
                        "Could not save",
                        response.message || "Try again."
                    );
                }
            },


            error: function (xhr) {

                if (xhr.status === 403) {

                    notify(
                        "error",
                        "Not permitted",
                        "Only a verified government official can record interventions."
                    );

                    return;
                }

                notify(
                    "error",
                    "Connection error",
                    (xhr.responseJSON && xhr.responseJSON.message) ||
                    "Could not save this intervention."
                );
            },


            complete: function () {
                $("#saveInterventionBtn").prop("disabled", false);
            }

        });

    });


    /* =====================================================
       31. VERIFY OR REJECT COMMUNITY REPORTS
       ===================================================== */

    $("#verificationQueue").on("click", ".review-view", function () {

        focusReport($(this).data("id"));

    });


    // Government-only verification actions are maintained in a separate module.
    if (isVerifiedOfficial && window.BGOfficialReportReview) {
        window.BGOfficialReportReview.init({
            csrf: csrf,
            onReviewed: loadReports,
            notify: notify
        });
    }


    /* =====================================================
       32. LOAD GOVERNMENT OFFICIALS
       ===================================================== */

    function loadOfficials() {

        if (!isAdmin) {
            return;
        }


        $.ajax({

            url: "admin_officials.php",
            type: "GET",
            dataType: "json",


            success: function (response) {

                var box = $("#officialList");

                box.empty();


                if (response.status !== "success") {

                    box.text(
                        response.message || "Could not load official accounts."
                    );

                    return;
                }


                var officials = response.data || [];


                if (officials.length === 0) {

                    box.html(
                        '<p class="empty-note">No government official accounts yet.</p>'
                    );

                    return;
                }


                $.each(officials, function (index, official) {

                    var entry = $("<div>");

                    entry.addClass("record-entry");


                    var html =
                        '<div class="record-head">' +
                        '<span>' + escapeHTML(official.name) + '</span>' +
                        '<span class="status-chip">' +
                        escapeHTML(niceStatus(official.official_verification)) +
                        '</span></div>' +

                        '<p>' +
                        escapeHTML(official.government_office || "Profile not completed") +
                        ' · ' +
                        escapeHTML(official.position || "") +
                        '</p>' +

                        '<small>' +
                        escapeHTML(official.official_email || official.email) +
                        ' · ID: ' +
                        escapeHTML(official.employee_id || "Not provided") +
                        ' · ' +
                        escapeHTML(official.city || "") +
                        '</small>';


                    if (official.official_review_note) {

                        html += '<p>Last decision: ' +
                            escapeHTML(official.official_review_note) +
                            '</p>';
                    }


                    entry.html(html);


                    if (official.employee_id && official.government_office) {

                        var actions = $("<div>");

                        actions.addClass("review-buttons");


                        actions.append(
                            $("<button type='button' class='official-approve'>Approve</button>")
                                .data("id", official.id)
                        );


                        actions.append(
                            $("<button type='button' class='official-reject'>Reject / Revoke</button>")
                                .data("id", official.id)
                        );


                        entry.append(actions);
                    }


                    box.append(entry);

                });
            },


            error: function (xhr) {

                $("#officialList").text(
                    (xhr.responseJSON && xhr.responseJSON.message) ||
                    "Unable to load official profiles."
                );
            }

        });
    }


    /* =====================================================
       33. APPROVE OR REJECT GOVERNMENT OFFICIALS
       ===================================================== */

    // Admin account review actions are isolated in the administrator module.
    if (isAdmin && window.BGAdminOfficialReview) {
        window.BGAdminOfficialReview.init({
            csrf: csrf,
            onReviewed: loadOfficials,
            notify: notify
        });
    }


    /* =====================================================
       34. INITIAL DATA LOADING
       ===================================================== */

    loadReports();
    loadInterventions();
    loadOfficials();


    /* =====================================================
       35. AUTOMATIC REFRESH
       ===================================================== */

    window.setInterval(function () {

        if ($("#reportForm").is(":visible") ||
            $("#interventionForm").is(":visible")) {

            return;
        }

        loadReports();
        loadInterventions();

    }, 60000);


    /* =====================================================
       36. RESIZE MAP
       ===================================================== */

    window.setTimeout(function () {

        map.invalidateSize();

    }, 150);


    $(window).resize(function () {

        map.invalidateSize();

    });

});
