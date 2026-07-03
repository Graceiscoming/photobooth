import sys
import os
import json
import cv2
import numpy as np

# Default preset gradients in case custom files are missing
PRESETS = {
    "ixy": ["#1A252C", "#5DADE2", "#F8C471", "#F5B7B1", "#FEF5E7"],
    "gold": ["#3E2723", "#A04000", "#DC7633", "#F4D03F", "#FEF9E7"],
    "fuji": ["#1B2631", "#1F4E5B", "#2E86C1", "#A9DFBF", "#F2F4F4"],
    "instax": ["#2C3E50", "#85929E", "#AEB6BF", "#EDBB99", "#FBEEE6"],
    "trix": ["#000000", "#2C3E50", "#7B7D7D", "#D5D8DC", "#FFFFFF"]
}

def hex_to_bgr(hex_str):
    hex_str = hex_str.lstrip('#')
    r = int(hex_str[0:2], 16)
    g = int(hex_str[2:4], 16)
    b = int(hex_str[4:6], 16)
    return (b, g, r)

def generate_gradient_preset(colors, width=150, height=150):
    bgr_colors = [hex_to_bgr(c) for c in colors]
    img = np.zeros((height, width, 3), dtype=np.uint8)
    
    for y in range(height):
        for x in range(width):
            t = (x + y) / (width + height - 2)
            num_segments = len(bgr_colors) - 1
            segment = int(t * num_segments)
            segment = min(segment, num_segments - 1)
            
            seg_t = (t * num_segments) - segment
            c1 = bgr_colors[segment]
            c2 = bgr_colors[segment+1]
            
            b = c1[0] + (c2[0] - c1[0]) * seg_t
            g = c1[1] + (c2[1] - c1[1]) * seg_t
            r = c1[2] + (c2[2] - c1[2]) * seg_t
            
            img[y, x] = [int(b), int(g), int(r)]
            
    return img

def get_mean_std(img):
    mean, std = cv2.meanStdDev(img)
    return mean.flatten(), std.flatten()

def apply_color_transfer(source_img, target_img):
    # Convert both images to LAB space
    source_lab = cv2.cvtColor(source_img, cv2.COLOR_BGR2LAB).astype("float32")
    target_lab = cv2.cvtColor(target_img, cv2.COLOR_BGR2LAB).astype("float32")
    
    # Calculate means and standard deviations
    s_mean, s_std = get_mean_std(source_lab)
    t_mean, t_std = get_mean_std(target_lab)
    
    # Avoid division by zero
    s_std[s_std < 0.0001] = 0.0001
    
    # Split channels
    l, a, b = cv2.split(source_lab)
    
    # Perform color transfer mapping
    l = ((l - s_mean[0]) * (t_std[0] / s_std[0])) + t_mean[0]
    a = ((a - s_mean[1]) * (t_std[1] / s_std[1])) + t_mean[1]
    b = ((b - s_mean[2]) * (t_std[2] / s_std[2])) + t_mean[2]
    
    # Clip values to [0, 255] range
    l = np.clip(l, 0, 255)
    a = np.clip(a, 0, 255)
    b = np.clip(b, 0, 255)
    
    # Merge channels and convert back to BGR
    transfer = cv2.merge([l, a, b]).astype("uint8")
    result = cv2.cvtColor(transfer, cv2.COLOR_LAB2BGR)
    return result

def apply_color_transfer_with_stats(source_img, t_mean, t_std):
    source_lab = cv2.cvtColor(source_img, cv2.COLOR_BGR2LAB).astype("float32")
    s_mean, s_std = get_mean_std(source_lab)
    s_std[s_std < 0.0001] = 0.0001
    
    l, a, b = cv2.split(source_lab)
    l = ((l - s_mean[0]) * (t_std[0] / s_std[0])) + t_mean[0]
    a = ((a - s_mean[1]) * (t_std[1] / s_std[1])) + t_mean[1]
    b = ((b - s_mean[2]) * (t_std[2] / s_std[2])) + t_mean[2]
    
    l = np.clip(l, 0, 255)
    a = np.clip(a, 0, 255)
    b = np.clip(b, 0, 255)
    
    transfer = cv2.merge([l, a, b]).astype("uint8")
    result = cv2.cvtColor(transfer, cv2.COLOR_LAB2BGR)
    return result

def load_cube_lut(lut_path):
    with open(lut_path, 'r') as f:
        lines = f.readlines()
        
    lut_size = 0
    lut_data = []
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('LUT_3D_SIZE'):
            lut_size = int(line.split()[1])
            continue
        if line.startswith('DOMAIN_MIN') or line.startswith('DOMAIN_MAX'):
            continue
        parts = line.split()
        if len(parts) == 3:
            r, g, b = map(float, parts)
            lut_data.append([r, g, b])
            
    if lut_size == 0 or len(lut_data) != lut_size**3:
        raise ValueError("Invalid .cube LUT file")
        
    lut = np.array(lut_data, dtype=np.float32).reshape((lut_size, lut_size, lut_size, 3))
    return lut, lut_size

def apply_3d_lut(img, lut, lut_size):
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32)
    scaled_img = rgb_img * ((lut_size - 1) / 255.0)
    
    c_floor = np.floor(scaled_img).astype(np.int32)
    c_ceil = np.minimum(c_floor + 1, lut_size - 1)
    
    d = scaled_img - c_floor
    
    r_f, g_f, b_f = c_floor[:, :, 0], c_floor[:, :, 1], c_floor[:, :, 2]
    r_c, g_c, b_c = c_ceil[:, :, 0], c_ceil[:, :, 1], c_ceil[:, :, 2]
    
    dr, dg, db = d[:, :, 0:1], d[:, :, 1:2], d[:, :, 2:3]
    
    c000 = lut[b_f, g_f, r_f]
    c100 = lut[b_f, g_f, r_c]
    c010 = lut[b_f, g_c, r_f]
    c001 = lut[b_c, g_f, r_f]
    c110 = lut[b_f, g_c, r_c]
    c101 = lut[b_c, g_f, r_c]
    c011 = lut[b_c, g_c, r_f]
    c111 = lut[b_c, g_c, r_c]
    
    c00 = c000 * (1 - dr) + c100 * dr
    c01 = c001 * (1 - dr) + c101 * dr
    c10 = c010 * (1 - dr) + c110 * dr
    c11 = c011 * (1 - dr) + c111 * dr
    
    c0 = c00 * (1 - dg) + c10 * dg
    c1 = c01 * (1 - dg) + c11 * dg
    
    c = c0 * (1 - db) + c1 * db
    
    result_rgb = (c * 255.0).clip(0, 255).astype(np.uint8)
    result_bgr = cv2.cvtColor(result_rgb, cv2.COLOR_RGB2BGR)
    return result_bgr

def main():
    if len(sys.argv) < 4:
        print("Usage: python color_transfer.py [source_path] [filter_name] [output_path]")
        sys.exit(1)
        
    source_path = sys.argv[1]
    filter_name = sys.argv[2]
    output_path = sys.argv[3]
    
    if not os.path.exists(source_path):
        print(f"Error: Source image not found: {source_path}")
        sys.exit(1)
        
    source_img = cv2.imread(source_path)
    if source_img is None:
        print("Error: Failed to decode source image.")
        sys.exit(1)
        
    # Check for custom .cube LUT file first
    ref_folder = os.path.join(os.path.dirname(__file__), "reference_tones")
    cube_path = None
    
    # 1. Check in root of reference_tones
    root_cube = os.path.join(ref_folder, f"{filter_name}.cube")
    if os.path.exists(root_cube):
        cube_path = root_cube
    else:
        # 2. Check inside subfolder
        sub_folder = os.path.join(ref_folder, filter_name)
        if os.path.exists(sub_folder) and os.path.isdir(sub_folder):
            specific_cube = os.path.join(sub_folder, f"{filter_name}.cube")
            if os.path.exists(specific_cube):
                cube_path = specific_cube
            else:
                # Scan for any .cube file in the subfolder
                for f in os.listdir(sub_folder):
                    if f.lower().endswith(".cube"):
                        cube_path = os.path.join(sub_folder, f)
                        break
                        
    if cube_path and os.path.exists(cube_path):
        try:
            lut, lut_size = load_cube_lut(cube_path)
            result = apply_3d_lut(source_img, lut, lut_size)
            cv2.imwrite(output_path, result)
            print(f"Success (3D LUT loaded from: {cube_path})")
            sys.exit(0)
        except Exception as e:
            print(f"Warning: Failed to apply 3D LUT, falling back: {e}")
            
    # Check for precomputed cumulative JSON stats second
    json_path = os.path.join(ref_folder, f"{filter_name}.json")
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r') as f:
                stats = json.load(f)
            t_mean = np.array(stats["mean"], dtype=np.float32)
            t_std = np.array(stats["std"], dtype=np.float32)
            result = apply_color_transfer_with_stats(source_img, t_mean, t_std)
            cv2.imwrite(output_path, result)
            print("Success (Cumulative JSON Stats)")
            sys.exit(0)
        except Exception as e:
            print(f"Warning: Failed to apply JSON stats, falling back: {e}")
        
    # Get target reference image for Reinhard fallback
    target_img = None
    custom_ref_path = os.path.join(ref_folder, f"{filter_name}.jpg")
    
    if os.path.exists(custom_ref_path):
        target_img = cv2.imread(custom_ref_path)
        
    if target_img is None:
        if filter_name in PRESETS:
            target_img = generate_gradient_preset(PRESETS[filter_name])
        else:
            cv2.imwrite(output_path, source_img)
            print("Direct copy (original/unknown filter)")
            sys.exit(0)
            
    result = apply_color_transfer(source_img, target_img)
    cv2.imwrite(output_path, result)
    print("Success")

if __name__ == "__main__":
    main()
