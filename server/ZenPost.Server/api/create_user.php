<?php
require_once __DIR__ . '/db_zenpost.php';

$email = "saghallo@denisbitter.de";
$pass  = "27476Cux!";
$hash  = password_hash($pass, PASSWORD_DEFAULT);

$stmt = $conn->prepare("INSERT INTO users (email, password_hash, must_change) VALUES (?, ?, 0)");
$stmt->bind_param("ss", $email, $hash);
$stmt->execute();

echo "OK";
