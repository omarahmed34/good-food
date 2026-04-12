<?php
$files = glob("*.html");
foreach ($files as $file) {
    $content = file_get_contents($file);
    // Replace old style.css link with the new version stamp
    $content = preg_replace('/href="style\.css(\?v=[a-zA-Z0-9_]+)?"/', 'href="style.css?v=premium1"', $content);
    file_put_contents($file, $content);
}
echo "CSS version bumped in all HTML files.";
