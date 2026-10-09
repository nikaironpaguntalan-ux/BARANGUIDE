BARANGUIDE – installation and changes
====================================

This update preserves the original pages, PHP endpoints, and Leaflet map.js.
It does NOT replace the project with the ANI-SALBA agricultural system.

WHAT CHANGED
* The map now has a correctly sized .map-area parent. It loads on dashboard.php.
* JavaScript recalculates Leaflet size after page load and on resize.
* jQuery loads from your existing js/jquery-3.7.1.min.js, not a remote CDN.
* If the Leaflet CDN is unavailable, a readable error appears in the map area.
* Signup starts a PHP session and redirects to user.html (Resident / Government Official).
* After profile completion, the user opens forms/dashboard.php.
* Sign in (including administrator) goes DIRECTLY to forms/dashboard.php.
* Administrator accounts must be created from the terminal, not the signup form.
* Only administrators may delete mapped locations. Other signed-in members can
  still create map locations using the existing functionality. Choosing Government
  Official alone does NOT verify government employment or give admin privileges.
* BARANGUIDE logo is in assets/images/baranguide-logo.svg, also easy to replace.

INSTALL IN LARAGON
1. Copy the BARANGGUIDE folder inside C:\laragon\www\BARANGGUIDE
   (or your actual Laragon www folder). Start Apache and MySQL in Laragon.
2. Import database_setup.sql in HeidiSQL or phpMyAdmin. Import even if you
   previously imported the old version: it adds the new is_admin column safely.
   Back up your database before running schema updates.
3. Visit http://localhost/BARANGGUIDE/login.html
   Do not open the pages as file:///... because PHP won't run.
4. Sign up -> choose role -> enter details -> see map.
   Sign out -> Sign in -> automatically see map (no role question).

CONFIGURE YOUR ADMIN (PowerShell / Laragon terminal)
  cd C:\laragon\www\BARANGGUIDE
  $env:BARANGUIDE_ADMIN_PASSWORD = "put-your-own-long-unique-password-here"
  php forms/create_admin.php admin@example.com "Admin Name"
  Remove-Item Env:BARANGUIDE_ADMIN_PASSWORD

Replace admin@example.com and Admin Name with your own details. The PHP command
creates the account or upgrades an existing account with that email to admin.
Use your actual MySQL credentials in create_admin.php if not Laragon defaults.
If you use Laragon CMD rather than PowerShell, use:
  set BARANGUIDE_ADMIN_PASSWORD=your-own-long-unique-password
  php forms/create_admin.php admin@example.com "Admin Name"
  set BARANGUIDE_ADMIN_PASSWORD=

MAP NOTES
* Internet access is needed for OpenStreetMap tiles and Leaflet CDN libraries.
* A map can appear with ZERO saved markers; this is normal if locationtagging is empty.
* The map starts at the original Bacolod coordinates [10.669644, 122.948844].
* Confirm you open forms/dashboard.php after sign-in (not a cached old HTML page).
* Press Ctrl+Shift+R to reload cached CSS and scripts after replacing files.
* When disconnected, a message is displayed instead of a silent blank map if
  the Leaflet library itself fails to load.
* For public deployment, add moderation, rate limits, verified government roles,
  CSRF protection, and HTTPS before allowing real community contributions.

DISCLAIMER
This environment cannot verify your local Laragon/MySQL settings or live map
tile availability. PHP syntax and JavaScript syntax are checked before delivery.
