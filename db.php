<?php
$host = 'sql312.infinityfree.com';
$dbname = 'if0_41641864_if0_41641864_if0_12345678_dbname';
$username = 'if0_41641864';
$password = 'O6fTYjh6f9';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["error" => "Database connection failed: " . $e->getMessage()]));
}
?>