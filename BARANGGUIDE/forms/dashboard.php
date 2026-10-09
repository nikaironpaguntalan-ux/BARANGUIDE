<?php
session_start();

if (!isset($_SESSION["user_id"])) {
    header("Location: ../login.html");
    exit;
}

$name = $_SESSION["user_name"] ?? "User";
$email = $_SESSION["user_email"] ?? "";
$identity = $_SESSION["user_identity"] ?? "";
$isAdmin = !empty($_SESSION["is_admin"]);
$identityLabel = $isAdmin ? "Administrator" : ($identity === "government_official" ? "Government Official" : ($identity === "resident" ? "Resident" : "Member"));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BARANGUIDE | Map</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" onerror="this.onerror=null;this.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/chosen/1.8.7/chosen.min.css">
    <link rel="stylesheet" href="https://unpkg.com/esri-leaflet-geocoder@3.1.4/dist/esri-leaflet-geocoder.css">
    <link rel="stylesheet" href="../css/mystyle.css">
</head>
<body data-is-admin="<?= $isAdmin ? '1' : '0' ?>">
<header class="app-header">
    <a class="app-brand" href="../login.html" aria-label="BARANGUIDE sign in page">
        <span class="brand-mark"><img class="site-logo" src="../assets/images/baranguide-logo.svg" alt=""></span>
        <span>BARAN<span>GUIDE</span></span>
    </a>

    <div class="header-user">
        <div class="header-user-copy">
            <strong><?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?></strong>
            <span><?= htmlspecialchars($identityLabel, ENT_QUOTES, 'UTF-8') ?></span>
        </div>
        <a class="logout-button" href="logout.php">Sign out</a>
    </div>
</header>

<main class="dashboard-shell">
    <aside class="map-sidebar" aria-label="Map tools">
        <div class="sidebar-heading">
            <span class="section-kicker">BARANGUIDE MAP</span>
            <h1>Community locations</h1>
            <p>Search, filter, and manage mapped places in your community.</p>
        </div>

        <div class="search-block">
            <label for="searchInput">Find a location</label>
            <div class="search-row">
                <input id="searchInput" type="search" placeholder="Location name" autocomplete="off">
                <button id="searchBtn" type="button" aria-label="Search"><i class="fa-solid fa-magnifying-glass"></i></button>
            </div>
        </div>

        <div class="filter-block">
            <label for="filterCategory">Filter by category</label>
            <select id="filterCategory" class="chosen-select" multiple data-placeholder="Select categories">
                <option value="Restaurant">Restaurant</option>
                <option value="Church">Church</option>
                <option value="Mall">Mall</option>
                <option value="School">School</option>
                <option value="Park">Park</option>
            </select>
            <button id="submitBtn" type="button" class="secondary-button">Apply filter</button>
        </div>

        <div class="tool-grid">
            <button id="newBtn" type="button" class="tool-button">New</button>
            <button id="deleteBtn" type="button" class="tool-button danger" <?= $isAdmin ? '' : 'hidden' ?> disabled>Delete selected</button>
        </div>

        <div class="sidebar-help">
            <span class="help-icon"><i class="fa-solid fa-circle-info"></i></span>
            <p>Click the map to place a new location. Use <strong>Plot</strong> to open the entry form.</p>
        </div>

        <div class="account-line">
            <span><?= htmlspecialchars($email, ENT_QUOTES, 'UTF-8') ?></span>
            <a href="logout.php">Log out</a>
        </div>
    </aside>

    <section class="map-area" aria-label="Interactive BARANGUIDE map">
        <div id="map" aria-label="Interactive map centered on Bacolod"></div>
        <div id="mapError" class="map-error" hidden role="alert"></div>

        <form id="plotForm" class="plot-panel" novalidate>
            <button type="button" class="close-btn" id="closeForm" aria-label="Close form">&times;</button>
            <div class="plot-heading">
                <span class="section-kicker">NEW LOCATION</span>
                <h2>Add a mapped place</h2>
            </div>

            <div class="plot-fields">
                <div class="field-row">
                    <div>
                        <label for="lat">Latitude</label>
                        <input id="lat" type="text" readonly>
                    </div>
                    <div>
                        <label for="lng">Longitude</label>
                        <input id="lng" type="text" readonly>
                    </div>
                </div>

                <label for="category">Category</label>
                <select id="category">
                    <option value="">Select category</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Church">Church</option>
                    <option value="Mall">Mall</option>
                    <option value="School">School</option>
                    <option value="Park">Park</option>
                </select>

                <label for="name">Location name</label>
                <input id="name" type="text" placeholder="Enter location name" maxlength="120">

                <label for="description">Description</label>
                <textarea id="description" rows="4" placeholder="Add a short description" maxlength="500"></textarea>
            </div>

            <div class="form-buttons">
                <button id="saveBtn" type="submit" class="save-button">Save location</button>
            </div>
        </form>
    </section>
</main>

<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" onerror="this.onerror=null;this.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'"></script>
<script src="https://unpkg.com/esri-leaflet@3.0.19/dist/esri-leaflet.js"></script>
<script src="https://unpkg.com/esri-leaflet-geocoder@3.1.4/dist/esri-leaflet-geocoder.js"></script>
<script src="../js/jquery-3.7.1.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chosen/1.8.7/chosen.jquery.min.js"></script>
<script src="../js/map.js"></script>
</body>
</html>
