<?php
$files = glob("*.html");
foreach ($files as $file) {
    if (in_array(basename($file), ['index.html', 'fridge.html'])) continue; // keep testing versions
    $content = file_get_contents($file);
    $content = str_replace('<script src="script.js"></script>', '<script src="script.js?v=4"></script>', $content);
    file_put_contents($file, $content);
}
echo "Done";
