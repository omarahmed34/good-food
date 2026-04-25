<?php
require 'db.php';
try {
    $stmt = $pdo->query("SELECT * FROM dashlogen");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Users in dashlogen: " . count($users) . "\n";
    foreach($users as $u) {
        echo "- " . $u['email'] . "\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
