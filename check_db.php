<?php
require 'db.php';
try {
    $tables = ['site', 'about_page'];
    foreach ($tables as $table) {
        echo "--- $table ---\n";
        $stmt = $pdo->query("DESCRIBE $table");
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
