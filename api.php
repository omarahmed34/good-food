<?php
header("Content-Type: application/json; charset=UTF-8");
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
            $stmt = $pdo->prepare("INSERT INTO sine (full_name, email, password) VALUES (?, ?, ?)");
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
            $stmt = $pdo->prepare("SELECT * FROM sine WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && $pass === $user['password']) {
                // Return basic user info
                echo json_encode(["success" => true, "user" => ["id" => $user['id'], "name" => $user['full_name']]]);
            } else {
                echo json_encode(["error" => "البريد الإلكتروني أو كلمة المرور غير صحيحة."]);
            }
        } catch (PDOException $e) {
            echo json_encode(["error" => "حدث خطأ أثناء تسجيل الدخول: " . $e->getMessage()]);
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
            $stmt = $pdo->prepare("SELECT id, full_name, email FROM sine WHERE id = ?");
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
            $stmt = $pdo->prepare("UPDATE sine SET full_name = ?, email = ? WHERE id = ?");
            $stmt->execute([$data['full_name'], $data['email'], $data['id']]);
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