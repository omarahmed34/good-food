<?php
require 'db.php';
try {
    // Check toggle
    $_GET['action'] = 'toggle_favorite';
    $_SERVER['REQUEST_METHOD'] = 'POST';
    
    // Add favorite
    $data = ['user_id' => 1, 'recipe_id' => 1];
    $ins = $pdo->prepare("INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)");
    $ins->execute([$data['user_id'], $data['recipe_id']]);
    echo "Inserted favorite successfully.\n";
    
    // Get favorites
    $stmt = $pdo->prepare("SELECT recipe_id FROM favorites WHERE user_id = ?");
    $stmt->execute([1]);
    $favs = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Favorites for user 1: " . implode(', ', $favs) . "\n";
    
    // Clean up
    $del = $pdo->prepare("DELETE FROM favorites WHERE user_id = 1");
    $del->execute();
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
