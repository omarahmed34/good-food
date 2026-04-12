<?php
$files = glob("*.html");
$button = '<button id="themeToggle" title="تبديل المظهر">☀️</button>';

foreach ($files as $file) {
    if (in_array(basename($file), ['index.html', 'recipes.html', 'fridge.html', 'details.html', 'favorites.html', 'about.html', 'contact.html'])) {
        $content = file_get_contents($file);
        
        // Ensure button doesn't already exist
        if (strpos($content, 'id="themeToggle"') === false) {
            $content = str_replace('</nav>', $button . "\n      </nav>", $content);
            file_put_contents($file, $content);
        }
    }
}
echo "Theme button added successfully.";
