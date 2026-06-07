<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');


$uploadDir = '../uploads/products/';
$tempDir = '../uploads/temp/';
$maxFileSize = 5 * 1024 * 1024;
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];


if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}
if (!file_exists($tempDir)) {
    mkdir($tempDir, 0777, true);
}

function generateFileName($originalName) {
    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
    $timestamp = time();
    $random = bin2hex(random_bytes(4));
    return $timestamp . '_' . $random . '.' . strtolower($extension);
}

function compressImage($source, $destination, $quality = 80) {
    $info = getimagesize($source);
    
    if ($info['mime'] == 'image/jpeg') {
        $image = imagecreatefromjpeg($source);
    } elseif ($info['mime'] == 'image/png') {
        $image = imagecreatefrompng($source);
    } elseif ($info['mime'] == 'image/webp') {
        $image = imagecreatefromwebp($source);
    } elseif ($info['mime'] == 'image/gif') {
        $image = imagecreatefromgif($source);
    } else {
        return false;
    }
    
    $maxWidth = 1200;
    $maxHeight = 1200;
    
    $width = imagesx($image);
    $height = imagesy($image);
    
    if ($width > $maxWidth || $height > $maxHeight) {
        $ratio = $width / $height;
        
        if ($ratio > 1) {
            $newWidth = $maxWidth;
            $newHeight = $maxWidth / $ratio;
        } else {
            $newHeight = $maxHeight;
            $newWidth = $maxHeight * $ratio;
        }
        
        $newImage = imagecreatetruecolor($newWidth, $newHeight);
        
        if ($info['mime'] == 'image/png' || $info['mime'] == 'image/webp') {
            imagealphablending($newImage, false);
            imagesavealpha($newImage, true);
            $transparent = imagecolorallocatealpha($newImage, 255, 255, 255, 127);
            imagefilledrectangle($newImage, 0, 0, $newWidth, $newHeight, $transparent);
        }
        
        imagecopyresampled($newImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        $image = $newImage;
    }
    
    if ($info['mime'] == 'image/jpeg') {
        imagejpeg($image, $destination, $quality);
    } elseif ($info['mime'] == 'image/png') {
        imagepng($image, $destination, 9);
    } elseif ($info['mime'] == 'image/webp') {
        imagewebp($image, $destination, $quality);
    } elseif ($info['mime'] == 'image/gif') {
        imagegif($image, $destination);
    }
    
    imagedestroy($image);
    return true;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method');
    }
    
    $action = $_POST['action'] ?? 'upload';
    
    switch ($action) {
        case 'upload':
            if (!isset($_FILES['file'])) {
                throw new Exception('No file uploaded');
            }
            
            $file = $_FILES['file'];
            
            if ($file['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('Upload error: ' . $file['error']);
            }
            
            if (!in_array($file['type'], $allowedTypes)) {
                throw new Exception('Invalid file type. Allowed: JPG, PNG, WebP, GIF');
            }
            
            if ($file['size'] > $maxFileSize) {
                throw new Exception('File too large. Max: 5MB');
            }
            
            $fileName = generateFileName($file['name']);
            $tempPath = $tempDir . $fileName;
            $finalPath = $uploadDir . $fileName;
            
            if (!move_uploaded_file($file['tmp_name'], $tempPath)) {
                throw new Exception('Failed to save uploaded file');
            }
            
            if (!compressImage($tempPath, $finalPath)) {
                copy($tempPath, $finalPath);
            }
            
            unlink($tempPath);
            
            $fileUrl = 'uploads/products/' . $fileName;
            
            echo json_encode([
                'success' => true,
                'filename' => $fileName,
                'url' => $fileUrl,
                'size' => filesize($finalPath),
                'original_name' => $file['name']
            ]);
            break;
            
        case 'delete':
            $filename = $_POST['filename'] ?? '';
            
            if (empty($filename)) {
                throw new Exception('No filename provided');
            }
            
            $safeFilename = basename($filename);
            $filePath = $uploadDir . $safeFilename;
            
            if (!file_exists($filePath)) {
                throw new Exception('File not found');
            }
            
            if (unlink($filePath)) {
                echo json_encode(['success' => true]);
            } else {
                throw new Exception('Failed to delete file');
            }
            break;
            
        case 'list':
            $files = [];
            
            if (is_dir($uploadDir)) {
                $dirFiles = scandir($uploadDir);
                foreach ($dirFiles as $file) {
                    if ($file !== '.' && $file !== '..' && !is_dir($uploadDir . $file)) {
                        $filePath = $uploadDir . $file;
                        $files[] = [
                            'name' => $file,
                            'url' => 'uploads/products/' . $file,
                            'size' => filesize($filePath),
                            'modified' => filemtime($filePath)
                        ];
                    }
                }
            }
            
            echo json_encode([
                'success' => true,
                'files' => $files
            ]);
            break;
            
        default:
            throw new Exception('Unknown action');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}