<?php
// Mock a POST request to login.php
$_SERVER['REQUEST_METHOD'] = 'POST';
$input = ['email' => 'bbc10595@gmail.com', 'password' => '123456']; // Assuming 123456 is the password
// We need to pass the input via php://input, but we can't easily mock that in a script that requires another.
// However, we can modify login.php temporarily to accept a variable if defined.

// Let's just check if login.php handles errors correctly.
require 'db.php';
try {
    $stmt = $pdo->prepare("SELECT * FROM dashlogen WHERE email = ? LIMIT 1");
    $stmt->execute(['bbc10595@gmail.com']);
    $user = $stmt->fetch();
    if($user) {
        echo "User found: " . $user['email'] . " | Password stored: " . $user['password'] . "\n";
    } else {
        echo "User NOT found.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
