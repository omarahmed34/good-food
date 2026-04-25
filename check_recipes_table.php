<?php
require 'db.php';
try {
    $stmt = $pdo->query("DESCRIBE recipes");
    $structure = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($structure, JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
