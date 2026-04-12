<?php
// db_zenpost.php – Verbindung zur ZenPost-Cloud DB

$host     = "db5020117882.hosting-data.io";
$dbname   = "dbs15495655";
$username = "dbu1782728";
$password = "27476Cuxhaven!";

$conn = new mysqli($host, $username, $password, $dbname, 3306);
if ($conn->connect_error) {
    die(json_encode([
        "success" => false,
        "message" => "DB Verbindung fehlgeschlagen: " . $conn->connect_error
    ]));
}
$conn->set_charset("utf8mb4");
