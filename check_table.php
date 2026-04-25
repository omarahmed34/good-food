<?php
require 'db.php';
try {
    $tables = ['shopping_list', 'meal_planner', 'favorites'];
    foreach($tables as $t) {
        $stmt = $pdo->query("DESCRIBE $t");
        $structure = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "Table $t:\n";
        print_r($structure);
        echo "\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
