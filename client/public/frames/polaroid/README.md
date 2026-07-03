# 📸 Classic Polaroid Frame Design Specifications

กรอบรูปแบบ Classic Polaroid เป็นแบบภาพถ่ายรูปเดี่ยวจัตุรัส ด้านบนมีขอบบาง และด้านล่างเป็นขอบหนาสำหรับลายมือเขียนและ QR Code

## 📐 มิติและพิกเซล (Dimensions)

*   **ขนาด Canvas ทั้งหมด**: `1200 × 1420 px`
*   **ขนาดช่องรูปภาพ (Photo Hole)**: `1080 × 1080 px` (อัตราส่วน 1:1 จัตุรัส)
*   **ระยะขอบด้านข้างและด้านบน (Margin)**: `60 px`
*   **พื้นที่วางลายเซ็นและ QR Code ด้านล่าง**: สูง `280 px` (พิกัด Y = `1140` ถึง `1420 px`)

---

## 📍 พิกัดการเจาะรูรูปภาพ (X, Y Coordinates)

นักออกแบบจะต้องเว้นพื้นที่นี้ให้โปร่งใส (Transparent) ในไฟล์ PNG 32-bit:

*   **ช่องรูปภาพเดี่ยว**: X = `60 px` \| Y = `60 px` *(กว้าง 1080 x สูง 1080 px)*

---

## 🎨 ไฟล์สำหรับนำไปเริ่มออกแบบ (Start Template)
สามารถดึงไฟล์ [template_guide.svg](file:///d:/photobooth/client/public/frames/polaroid/template_guide.svg) ไปวางใน Figma เพื่อใช้เป็นโครงสร้างได้ทันที
