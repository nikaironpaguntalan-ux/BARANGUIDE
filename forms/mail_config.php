
<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . "/../vendor/autoload.php";

function sendEmail($receiver, $subject, $message) {

    // Load Gmail credentials
    $settings = require dirname(__DIR__, 3) . "/baranguide_mail_secrets.php";

    $mail = new PHPMailer(true);

    try {

        // Gmail SMTP settings
        $mail->isSMTP();
        $mail->Host = "smtp.gmail.com";
        $mail->SMTPAuth = true;

        // Gmail account
        $mail->Username = $settings["email"];
        $mail->Password = $settings["password"];

        // Security settings
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->CharSet = "UTF-8";

        // Sender and receiver
        $mail->setFrom($settings["email"], "BARANGUIDE");
        $mail->addAddress($receiver);

        // Email content
        $mail->Subject = $subject;
        $mail->Body = $message;

        // Send email
        $mail->send();

        return true;

    } catch (Exception $error) {

        error_log("Email Error: " . $error->getMessage());

        return false;
    }
}

?>
