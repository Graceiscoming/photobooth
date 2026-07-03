import os
import sys
import json
import cv2
import numpy as np

def calculate_image_stats(img_path):
    img = cv2.imread(img_path)
    if img is None:
        return None
        
    # Convert to LAB space
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype("float32")
    
    # Calculate mean and standard deviation
    mean, std = cv2.meanStdDev(lab)
    return mean.flatten(), std.flatten()

def precompute_folder(folder_path):
    # Support common image formats
    valid_exts = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
    img_files = [
        os.path.join(folder_path, f)
        for f in os.listdir(folder_path)
        if f.lower().endswith(valid_exts)
    ]
    
    if not img_files:
        print(f"No valid images found in folder: {folder_path}")
        return None
        
    means = []
    stds = []
    
    print(f"Processing {len(img_files)} images in folder: {folder_path}...")
    for img_path in img_files:
        stats = calculate_image_stats(img_path)
        if stats is not None:
            mean, std = stats
            means.append(mean)
            stds.append(std)
            
    if not means:
        return None
        
    # Average the means and standard deviations across all images
    avg_mean = np.mean(means, axis=0).tolist()
    avg_std = np.mean(stds, axis=0).tolist()
    
    return {
        "mean": avg_mean,
        "std": avg_std
    }

def main():
    ref_dir = os.path.dirname(os.path.abspath(__file__))
    ref_tones_dir = os.path.join(ref_dir, "reference_tones")
    
    if not os.path.exists(ref_tones_dir):
        os.makedirs(ref_tones_dir)
        print(f"Created reference_tones folder at: {ref_tones_dir}")
        print("Please create subfolders (e.g. 'ixy', 'gold') and put sample photos inside.")
        sys.exit(0)
        
    # Scan subdirectories inside reference_tones
    subfolders = [
        d for d in os.listdir(ref_tones_dir)
        if os.path.isdir(os.path.join(ref_tones_dir, d))
    ]
    
    if not subfolders:
        print("No subfolders found inside reference_tones/.")
        print("Create subfolders named after filter IDs (e.g., 'ixy', 'gold', 'fuji', 'instax', 'trix') and add sample images.")
        sys.exit(0)
        
    for sub in subfolders:
        folder_path = os.path.join(ref_tones_dir, sub)
        stats = precompute_folder(folder_path)
        if stats:
            output_json_path = os.path.join(ref_tones_dir, f"{sub}.json")
            with open(output_json_path, 'w') as f:
                json.dump(stats, f, indent=2)
            print(f"Successfully saved cumulative stats to: {output_json_path}")
            print(f"  Mean: {stats['mean']}")
            print(f"  Std: {stats['std']}")
            
if __name__ == "__main__":
    main()
