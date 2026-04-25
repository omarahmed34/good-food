<?php
require 'db.php';
header('Content-Type: text/html; charset=utf-8');
try {
    $stmt = $pdo->query("SELECT * FROM site WHERE lang='ar' LIMIT 20");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "<pre>";
    print_r($rows);
    echo "</pre>";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
