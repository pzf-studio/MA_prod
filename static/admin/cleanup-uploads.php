<?php
$tempDir = '../uploads/temp/';
$maxAge = 24 * 60 * 60;

if (is_dir($tempDir)) {
    $files = scandir($tempDir);
    $deleted = 0;
    
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $filePath = $tempDir . $file;
            if (time() - filemtime($filePath) > $maxAge) {
                unlink($filePath);
                $deleted++;
            }
        }
    }
    
    echo "Deleted $deleted old temporary files.";
} else {
    echo "Temp directory not found.";
}