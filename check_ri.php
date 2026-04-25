<?php
require 'db.php';
try {
    $stmt = $pdo->query("SELECT * FROM recipe_ingredients");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Recipe Ingredients count: " . count($rows) . "\n";
    foreach($rows as $r) {
        echo "Recipe: " . $r['recipe_id'] . " | Ingredient: " . $r['ingredient_id'] . "\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
