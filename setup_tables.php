<?php
require 'db.php';

try {
    // 1. Create the about_page table
    $createAboutTable = "CREATE TABLE IF NOT EXISTS about_page (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content_key VARCHAR(100) NOT NULL,
        content_value TEXT,
        lang ENUM('ar', 'en') DEFAULT 'ar',
        UNIQUE KEY (content_key, lang)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($createAboutTable);
    echo "Table 'about_page' created successfully or already exists.<br>";

    // 2. Create the site table (as backup/alternative)
    $createSiteTable = "CREATE TABLE IF NOT EXISTS site (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content_key VARCHAR(100) NOT NULL,
        content_value TEXT,
        lang ENUM('ar', 'en') DEFAULT 'ar',
        UNIQUE KEY (content_key, lang)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($createSiteTable);
    echo "Table 'site' created successfully or already exists.<br>";

    // 3. Insert default data into about_page if empty
    $check = $pdo->query("SELECT COUNT(*) FROM about_page")->fetchColumn();
    if ($check == 0) {
        $defaults = [
            // Arabic Content
            ['about.badge', 'قصتنا', 'ar'],
            ['about.h3', 'تاريخ من الجودة والتميز في عالم الطهي', 'ar'],
            ['about.v.h4', 'رؤيتنا', 'ar'],
            ['about.v.p', 'أن نصبح المصدر الأول والملهم لكل طارق لباب المطبخ، من المبتدئين إلى المحترفين.', 'ar'],
            ['about.m.h4', 'مهمتنا', 'ar'],
            ['about.m.p', 'تبسيط فنون الطبخ وتقديم وصفات صحية ولذيذة باستخدام مكونات بسيطة وتقنيات حديثة.', 'ar'],
            // English Content
            ['about.badge', 'Our Story', 'en'],
            ['about.h3', 'A History of Quality and Excellence in Culinary Arts', 'en'],
            ['about.v.h4', 'Our Vision', 'en'],
            ['about.v.p', 'To become the primary and inspiring source for everyone entering the kitchen, from beginners to professionals.', 'en'],
            ['about.m.h4', 'Our Mission', 'en'],
            ['about.m.p', 'Simplifying the art of cooking and providing healthy, delicious recipes using simple ingredients and modern techniques.', 'en'],
        ];

        $stmt = $pdo->prepare("INSERT INTO about_page (content_key, content_value, lang) VALUES (?, ?, ?)");
        foreach ($defaults as $row) {
            $stmt->execute($row);
        }
        echo "Default data inserted into 'about_page'.<br>";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
