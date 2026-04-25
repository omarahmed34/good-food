<?php
header("Content-Type: application/json; charset=UTF-8");
error_reporting(E_ALL);
ini_set('display_errors', 0);
require 'db.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'get_ingredients':
        try {
            $stmt = $pdo->query("SELECT * FROM ingredients");
            $ingredients = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($ingredients as &$ing) {
                // Return id as string to match JS expected types exactly
                $ing['id'] = (string) $ing['id'];
            }
            echo json_encode($ingredients);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'get_recipes':
        try {
            // Fetch all recipes
            $stmt = $pdo->query("SELECT * FROM recipes");
            $recipes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch all recipe ingredients
            $ingMap = [];
            try {
                $ingStmt = $pdo->query("SELECT recipe_id, ingredient_id FROM recipe_ingredients");
                $recipeIngredients = $ingStmt->fetchAll(PDO::FETCH_ASSOC);

                // Group ingredients by recipe_id
                foreach ($recipeIngredients as $row) {
                    $ingMap[$row['recipe_id']][] = (string) $row['ingredient_id'];
                }
            } catch (PDOException $e) {
                // Table might not exist or error
            }

            // Format recipes
            foreach ($recipes as &$recipe) {
                $recipeId = $recipe['id'];

                // Set aliases for javascript properties which checks for strict fields
                $recipe['id'] = (string) $recipe['id'];
                $recipe['title'] = isset($recipe['name']) ? $recipe['name'] : (isset($recipe['title']) ? $recipe['title'] : 'بدون عنوان');
                $recipe['time'] = isset($recipe['time']) ? $recipe['time'] : 'غير محدد';
                $recipe['level'] = isset($recipe['difficulty']) ? $recipe['difficulty'] : (isset($recipe['level']) ? $recipe['level'] : 'غير محدد');
                $recipe['description'] = isset($recipe['category']) ? 'التصنيف: ' . $recipe['category'] : (isset($recipe['description']) ? $recipe['description'] : '');
                $recipe['serves'] = isset($recipe['serves']) ? $recipe['serves'] : 'غير محدد';
                $recipe['image'] = isset($recipe['image']) ? $recipe['image'] : '';

                $recipe['ingredients'] = isset($ingMap[$recipeId]) ? $ingMap[$recipeId] : [];

                // Check if steps are separated by pipe `|` as in current db, or newline, or is JSON
                if (isset($recipe['steps'])) {
                    $decodedSteps = json_decode($recipe['steps'], true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decodedSteps)) {
                        $recipe['steps'] = $decodedSteps;
                    } else if (strpos($recipe['steps'], '|') !== false) {
                        $recipe['steps'] = array_filter(array_map('trim', explode("|", $recipe['steps'])));
                        $recipe['steps'] = array_values($recipe['steps']);
                    } else {
                        // Fallback: split by new lines
                        $recipe['steps'] = array_filter(array_map('trim', explode("\n", $recipe['steps'])));
                        $recipe['steps'] = array_values($recipe['steps']);
                    }
                } else {
                    $recipe['steps'] = [];
                }
            }

            echo json_encode($recipes);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'signup':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            echo json_encode(["error" => "No data received."]);
            break;
        }
        $name = $data['fullName'];
        $email = $data['email'];
        $pass = isset($data['password']) ? $data['password'] : null;

        if (!$name || !$email || !$pass) {
            echo json_encode(["error" => "جميع الحقول مطلوبة."]);
            break;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO logen (full_name, email, password) VALUES (?, ?, ?)");
            $stmt->execute([$name, $email, $pass]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                echo json_encode(["error" => "البريد الإلكتروني مسجل بالفعل."]);
            } else {
                echo json_encode(["error" => "حدث خطأ أثناء التسجيل: " . $e->getMessage()]);
            }
        }
        break;

    case 'login':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            echo json_encode(["error" => "No data received."]);
            break;
        }
        $email = $data['email'];
        $pass = $data['password'];

        if (!$email || !$pass) {
            echo json_encode(["error" => "البريد الإلكتروني وكلمة المرور مطلوبان."]);
            break;
        }

        try {
            $stmt = $pdo->prepare("SELECT * FROM logen WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && (password_verify($pass, $user['password']) || $pass === $user['password'])) {
                // Return basic user info
                echo json_encode(["success" => true, "user" => ["id" => $user['id'], "name" => $user['full_name']]]);
            } else {
                echo json_encode(["error" => "البريد الإلكتروني أو كلمة المرور غير صحيحة."]);
            }
        } catch (PDOException $e) {
            echo json_encode(["error" => "حدث خطأ أثناء تسجيل الدخول: " . $e->getMessage()]);
        }
        break;

    case 'admin_login':
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? '';
        $pass = $data['password'] ?? '';
        
        try {
            $stmt = $pdo->prepare("SELECT * FROM dashlogen WHERE email = ?");
            $stmt->execute([$email]);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Check password (handle both hashed and plaintext for migration period)
            if ($admin && (password_verify($pass, $admin['password']) || $pass === $admin['password'])) {
                echo json_encode(["success" => true, "admin" => ["id" => $admin['id'], "name" => $admin['name'], "role" => $admin['role']]]);
            } else {
                echo json_encode(["error" => "بيانات الدخول غير صحيحة."]);
            }
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'contact':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            echo json_encode(["error" => "No data received."]);
            break;
        }
        $name = isset($data['name']) ? $data['name'] : '';
        $email = isset($data['email']) ? $data['email'] : '';
        $message = isset($data['message']) ? $data['message'] : '';

        if (!$name || !$email || !$message) {
            echo json_encode(["error" => "جميع الحقول مطلوبة."]);
            break;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO contact (name, email, message) VALUES (?, ?, ?)");
            $stmt->execute([$name, $email, $message]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => "حدث خطأ أثناء إرسال الرسالة: " . $e->getMessage()]);
        }
        break;

    case 'get_site_content':
        try {
            $content = ['ar' => [], 'en' => []];
            
            // 1. Fetch from 'site' table
            $stmt = $pdo->query("SELECT * FROM site");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $row) {
                $content[$row['lang']][$row['content_key']] = $row['content_value'];
            }
            
            // 2. Fetch from 'about_page' table (Flat Structure)
            try {
                $stmtAbout = $pdo->query("SELECT * FROM about_page");
                $aboutRows = $stmtAbout->fetchAll(PDO::FETCH_ASSOC);
                foreach ($aboutRows as $row) {
                    $l = $row['lang'];
                    if (!isset($content[$l])) $content[$l] = [];
                    
                    $content[$l]['about.badge']    = $row['badge'] ?? '';
                    $content[$l]['about.h3']       = $row['title'] ?? '';
                    $content[$l]['about.v.h4']     = $row['vision_title'] ?? '';
                    $content[$l]['about.v.p']      = $row['vision_text'] ?? '';
                    $content[$l]['about.m.h4']     = $row['mission_title'] ?? '';
                    $content[$l]['about.m.p']      = $row['mission_text'] ?? '';
                }
            } catch (PDOException $e) {
                // Ignore if table about_page doesn't exist yet
            }
            
            echo json_encode($content);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'get_user_profile':
        $id = isset($_GET['id']) ? $_GET['id'] : '';
        if (!$id) {
            echo json_encode(["error" => "No ID provided."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("SELECT id, full_name, email FROM logen WHERE id = ?");
            $stmt->execute([$id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user) {
                echo json_encode(["success" => true, "user" => $user]);
            } else {
                echo json_encode(["error" => "User not found."]);
            }
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'update_user_profile':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['id']) || !isset($data['full_name']) || !isset($data['email'])) {
            echo json_encode(["error" => "بيانات غير مكتملة."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("UPDATE logen SET full_name = ?, email = ? WHERE id = ?");
            $stmt->execute([$data['full_name'], $data['email'], $data['id']]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'change_password':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['id']) || !isset($data['old_password']) || !isset($data['new_password'])) {
            echo json_encode(["error" => "بيانات غير مكتملة."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("SELECT password FROM logen WHERE id = ?");
            $stmt->execute([$data['id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && (password_verify($data['old_password'], $user['password']) || $user['password'] === $data['old_password'])) {
                $updateStmt = $pdo->prepare("UPDATE logen SET password = ? WHERE id = ?");
                $updateStmt->execute([$data['new_password'], $data['id']]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["error" => "كلمة المرور القديمة غير صحيحة."]);
            }
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'reset_password':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['email']) || !isset($data['new_password'])) {
            echo json_encode(["error" => "بيانات غير مكتملة."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("SELECT id FROM sine WHERE email = ?");
            $stmt->execute([$data['email']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                // For demonstration, we simply update the password directly without a token
                $updateStmt = $pdo->prepare("UPDATE sine SET password = ? WHERE id = ?");
                $updateStmt->execute([$data['new_password'], $user['id']]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["error" => "البريد الإلكتروني غير مسجل."]);
            }
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'add_recipe':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['name']) || !isset($data['time'])) {
            echo json_encode(["error" => "بيانات غير مكتملة."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO recipes (name, time, difficulty, category, serves, image) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['name'], 
                $data['time'], 
                $data['difficulty'] ?? 'متوسط', 
                $data['category'] ?? '', 
                $data['serves'] ?? '2 أشخاص', 
                $data['image'] ?? 'images/placeholder.jpg'
            ]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'delete_recipe':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['id'])) {
            echo json_encode(["error" => "معرف الوصفة مطلوب."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM recipes WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'get_shopping_list':
        $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : '';
        if (!$user_id) {
            echo json_encode(["error" => "User ID required."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("SELECT * FROM shopping_list WHERE user_id = ? ORDER BY created_at DESC");
            $stmt->execute([$user_id]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'add_to_shopping_list':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['user_id']) || !isset($data['ingredient_name'])) {
            echo json_encode(["error" => "Incomplete data."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO shopping_list (user_id, ingredient_name, recipe_id) VALUES (?, ?, ?)");
            $stmt->execute([$data['user_id'], $data['ingredient_name'], $data['recipe_id'] ?? null]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'remove_from_shopping_list':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['id'])) {
            echo json_encode(["error" => "Item ID required."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM shopping_list WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'clear_shopping_list':
        $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : '';
        if (!$user_id) {
            echo json_encode(["error" => "User ID required."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM shopping_list WHERE user_id = ?");
            $stmt->execute([$user_id]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'get_user_favorites':
        $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : '';
        if (!$user_id) {
            echo json_encode(["error" => "User ID required."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("SELECT recipe_id FROM favorites WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $favs = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode($favs);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'toggle_favorite':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['user_id']) || !isset($data['recipe_id'])) {
            echo json_encode(["error" => "Incomplete data."]);
            break;
        }
        try {
            // Check if exists
            $stmt = $pdo->prepare("SELECT id FROM favorites WHERE user_id = ? AND recipe_id = ?");
            $stmt->execute([$data['user_id'], $data['recipe_id']]);
            $exists = $stmt->fetch();

            if ($exists) {
                $del = $pdo->prepare("DELETE FROM favorites WHERE id = ?");
                $del->execute([$exists['id']]);
                echo json_encode(["success" => true, "status" => "removed"]);
            } else {
                $ins = $pdo->prepare("INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)");
                $ins->execute([$data['user_id'], $data['recipe_id']]);
                echo json_encode(["success" => true, "status" => "added"]);
            }
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'get_meal_plan':
        $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : '';
        if (!$user_id) {
            echo json_encode(["error" => "User ID required."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("SELECT mp.*, r.name as recipe_name, r.image as recipe_image FROM meal_planner mp JOIN recipes r ON mp.recipe_id = r.id WHERE mp.user_id = ? ORDER BY FIELD(day_of_week, 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')");
            $stmt->execute([$user_id]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'add_to_meal_plan':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['user_id']) || !isset($data['recipe_id']) || !isset($data['day'])) {
            echo json_encode(["error" => "Incomplete data."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO meal_planner (user_id, recipe_id, day_of_week, meal_type) VALUES (?, ?, ?, ?)");
            $stmt->execute([$data['user_id'], $data['recipe_id'], $data['day'], $data['meal_type'] ?? 'Lunch']);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'remove_from_meal_plan':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['id'])) {
            echo json_encode(["error" => "ID required."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM meal_planner WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'get_faqs':
        try {
            $stmt = $pdo->query("SELECT * FROM faq");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'get_user_stats':
        $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : '';
        if (!$user_id) {
            echo json_encode(["error" => "User ID required."]);
            break;
        }
        try {
            $favs = $pdo->prepare("SELECT COUNT(*) FROM favorites WHERE user_id = ?");
            $favs->execute([$user_id]);
            $favCount = $favs->fetchColumn();

            $shop = $pdo->prepare("SELECT COUNT(*) FROM shopping_list WHERE user_id = ?");
            $shop->execute([$user_id]);
            $shopCount = $shop->fetchColumn();

            $plan = $pdo->prepare("SELECT COUNT(*) FROM meal_planner WHERE user_id = ?");
            $plan->execute([$user_id]);
            $planCount = $plan->fetchColumn();

            echo json_encode([
                "favorites" => $favCount,
                "shopping_list" => $shopCount,
                "meal_plan" => $planCount
            ]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'get_users':
        try {
            $stmt = $pdo->query("SELECT id, full_name, email FROM logen");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($users);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'place_order':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['user_id']) || !isset($data['recipe_id']) || !isset($data['phone']) || !isset($data['address'])) {
            echo json_encode(["error" => "بيانات الطلب غير مكتملة."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO orders (user_id, recipe_id, full_name, email, phone, address, delivery_date, delivery_time, location_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['user_id'],
                $data['recipe_id'],
                $data['full_name'],
                $data['email'],
                $data['phone'],
                $data['address'],
                $data['delivery_date'] ?? null,
                $data['delivery_time'] ?? null,
                $data['location_link'] ?? null
            ]);
            $orderId = $pdo->lastInsertId();
            echo json_encode(["success" => true, "order_id" => $orderId]);
        } catch (PDOException $e) {
            echo json_encode(["error" => "حدث خطأ أثناء تنفيذ الطلب: " . $e->getMessage()]);
        }
        break;

    case 'get_user_orders':
        $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : '';
        if (!$user_id) {
            echo json_encode(["error" => "User ID required."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("SELECT o.*, r.name as recipe_name, r.image as recipe_image FROM orders o JOIN recipes r ON o.recipe_id = r.id WHERE o.user_id = ? ORDER BY o.order_date DESC");
            $stmt->execute([$user_id]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'add_recipe':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['name'])) {
            echo json_encode(["error" => "Recipe name is required."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO recipes (name, time, difficulty) VALUES (?, ?, ?)");
            $stmt->execute([$data['name'], $data['time'] ?? '30 min', $data['difficulty'] ?? 'Easy']);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'delete_recipe':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !isset($data['id'])) {
            echo json_encode(["error" => "Recipe ID required."]);
            break;
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM recipes WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(["error" => "Invalid action specified."]);
        break;
}
?>