import removeBackground from "https://esm.sh/@imgly/background-removal@1.0.4";



/**
 * Toast Notification System
 */
class ToastSystem {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    show(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        if (type === 'success') icon = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
        else if (type === 'error') icon = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        else icon = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

        toast.innerHTML = `${icon}<span>${message}</span>`;
        this.container.appendChild(toast);

        // Animation
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
}

/**
 * Image Editor Class
 * Handles all core logic for image manipulation
 */
class ImageEditor {
    constructor() {
        this.cropper = null;
        this.imageElement = document.getElementById('image');
        this.toasts = new ToastSystem('toastContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        // 👇 เพิ่มบรรทัดนี้
        this.loadingPercent = document.getElementById('loadingPercent'); 
    }
    // ....

    /**
     * Load an image file into the editor
     * @param {File} file 
     */
    loadImage(file) {
        if (!file.type.startsWith('image/')) {
            this.toasts.show('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น', 'error');
            return;
        }

        if (this.cropper) this.cropper.destroy();

        const url = URL.createObjectURL(file);
        this.imageElement.src = url;

        // UI Updates
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('editorContainer').style.display = 'block';
        document.getElementById('resultContainer').style.display = 'none';

        this.imageElement.onload = () => {
            this.initCropper();
            this.toasts.show('โหลดรูปภาพสำเร็จ', 'success');
        };
    }

    initCropper() {
        if (this.cropper) this.cropper.destroy();
        
        this.cropper = new Cropper(this.imageElement, {
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    }

    rotate(degree) {
        if (this.cropper) this.cropper.rotate(degree);
    }

    reset() {
        if (this.cropper) this.cropper.reset();
        this.toasts.show('รีเซ็ตการแก้ไขแล้ว');
    }

   async removeBackground() {
        if (!this.cropper) return;

        // 1. เปิดหน้าจอโหลดและรีเซ็ตเปอร์เซ็นต์
        this.loadingOverlay.style.display = 'flex';
        if (this.loadingPercent) this.loadingPercent.innerText = '0%';
        
        let animationInterval; // ตัวแปรสำหรับเก็บ ID ของ setInterval
        let currentPercent = 0; // เปอร์เซ็นต์ปัจจุบันที่แสดงผล
        const finalTargetPercent = 100; // เป้าหมายสูงสุดของการวิ่งจำลอง
        
        // ฟังก์ชันสำหรับอัปเดตตัวเลขให้วิ่งไปอย่างช้าๆ (Simulated Progress)
        const startSmoothAnimation = (start) => {
            currentPercent = start;
            // คำนวณความเร็วที่เหมาะสม: วิ่งจาก start ไป 99% ภายในเวลา 10-15 วินาที
            const duration = 9000; // 12 วินาที (ปรับได้ตามความรู้สึก)
            const steps = duration / 50; // จำนวนครั้งที่จะอัปเดต (อัปเดตทุก 50ms)
            const incrementPerStep = (finalTargetPercent - start) / steps;
            
            if (animationInterval) clearInterval(animationInterval);
            
            animationInterval = setInterval(() => {
                if (currentPercent < finalTargetPercent) {
                    currentPercent += incrementPerStep;
                    // ปัดเศษลงเพื่อไม่ให้ตัวเลขกระโดดเกิน 99% ในการวิ่งจำลอง
                    const displayPercent = Math.min(finalTargetPercent, Math.round(currentPercent)); 
                    
                    if (this.loadingPercent) {
                        this.loadingPercent.innerText = `${displayPercent}%`;
                    }
                } else {
                    clearInterval(animationInterval); // หยุดเมื่อถึง 99%
                }
            }, 50); // อัปเดตทุก 50 มิลลิวินาที
        };

        try {
            const canvas = this.cropper.getCroppedCanvas();
            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            
            const config = {
                progress: (key, current, total) => {
                    // หากมีแอนิเมชันวิ่งอยู่ ให้หยุดไว้ก่อน เพื่อให้ตัวเลขจริงทำงาน
                    if (animationInterval) clearInterval(animationInterval);

                    if (key.includes('fetch')) {
                        // เฟส 1: Real Progress (การดาวน์โหลดโมเดล)
                        currentPercent = (current / total) * 40; // 40% แรก
                        if (this.loadingPercent) {
                            this.loadingPercent.innerText = `${Math.round(currentPercent)}%`;
                        }
                    } else if (key.includes('compute')) {
                        // เฟส 2: Compute เริ่มต้น (AI เริ่มประมวลผล)
                        // ตัวเลขจริงจะค้าง/กระโดด เราเริ่มใช้ Simulated Progress แทน
                        
                        // ให้ตัวเลขกระโดดไปที่ฐาน 45% (40% Fetch + 5% Compute เริ่มต้น)
                        const startSmoothFrom = Math.max(45, Math.round(currentPercent));
                        
                        // เริ่มแอนิเมชันให้วิ่งจาก 45% ไปจนถึง 99% อย่างช้าๆ
                        startSmoothAnimation(startSmoothFrom);
                    }
                }
            };

            // AI Processing. โค้ดจะหยุดรอนานที่สุดที่บรรทัดนี้
            const imageBlob = await removeBackground(blob, config); 
            
            // 2. เมื่อ AI เสร็จสิ้นการทำงานจริง (ผ่าน await แล้ว)
            if (animationInterval) {
                clearInterval(animationInterval); // หยุดแอนิเมชันจำลองทันที
            }
            
            // 3. การันตีว่าเห็น 100% ก่อนปิดหน้าจอโหลด
            if (this.loadingPercent) {
                this.loadingPercent.innerText = '100%';
            }

            const url = URL.createObjectURL(imageBlob);

            // Reload into editor
            this.cropper.destroy();
            this.imageElement.src = url;
            
            // Wait for load then re-init
            await new Promise(resolve => {
                this.imageElement.onload = resolve;
            });
            
            this.initCropper();
            this.toasts.show('ลบพื้นหลังเรียบร้อย', 'success');

        } catch (error) {
            console.error(error);
            this.toasts.show('เกิดข้อผิดพลาดในการลบพื้นหลัง', 'error');
        } finally {
            // 4. ปิดหน้าจอโหลด
            this.loadingOverlay.style.display = 'none';
        }
    }

    getCroppedImage() {
        if (!this.cropper) return null;
        return this.cropper.getCroppedCanvas().toDataURL('image/png');
    }

    splitGrid(rows, cols) {
        if (!this.cropper) return null;
        if (rows < 1 || cols < 1) {
            this.toasts.show('จำนวนแถว/คอลัมน์ต้องมากกว่า 0', 'error');
            return null;
        }

        const sourceCanvas = this.cropper.getCroppedCanvas();
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const cellWidth = Math.floor(width / cols);
        const cellHeight = Math.floor(height / rows);

        const images = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const canvas = document.createElement('canvas');
                canvas.width = cellWidth;
                canvas.height = cellHeight;
                const ctx = canvas.getContext('2d');

                ctx.drawImage(sourceCanvas, 
                    c * cellWidth, r * cellHeight, cellWidth, cellHeight, 
                    0, 0, cellWidth, cellHeight
                );
                
                images.push(canvas.toDataURL('image/png'));
            }
        }
        return images;
    }
}

/**
 * App Initialization & Event Wiring
 */
document.addEventListener('DOMContentLoaded', () => {
    const editor = new ImageEditor();

    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const resultContainer = document.getElementById('resultContainer');
    const resultImages = document.getElementById('resultImages');

    // --- Event Handlers ---

    // File Upload
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) editor.loadImage(e.target.files[0]);
    });

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) editor.loadImage(e.dataTransfer.files[0]);
    });

    // Buttons
    document.getElementById('btnRotateLeft').onclick = () => editor.rotate(-90);
    document.getElementById('btnRotateRight').onclick = () => editor.rotate(90);
    document.getElementById('btnReset').onclick = () => editor.reset();
    document.getElementById('btnRemoveBg').onclick = () => editor.removeBackground();

    // Crop Action
    document.getElementById('btnCrop').onclick = () => {
        const img = editor.getCroppedImage();
        if (img) showResults([img]);
    };

    // Grid Split Action
    document.getElementById('btnSplitGrid').onclick = () => {
        const rows = parseInt(document.getElementById('inputRows').value);
        const cols = parseInt(document.getElementById('inputCols').value);
        const images = editor.splitGrid(rows, cols);
        if (images) showResults(images);
    };

    // New Image Action
    document.getElementById('btnNew').onclick = () => {
        resultContainer.style.display = 'none';
        document.getElementById('dropZone').style.display = 'block'; // Or flex/grid depending on CSS
        document.getElementById('editorContainer').style.display = 'none';
        fileInput.value = '';
    };

    // Helper: Show Results
    function showResults(images) {
        resultImages.innerHTML = '';
        
        images.forEach((url, index) => {
            const div = document.createElement('div');
            div.className = 'result-item';
            
            const img = document.createElement('img');
            img.src = url;
            
            const btn = document.createElement('a');
            btn.href = url;
            btn.download = `crop_${index + 1}.png`;
            btn.className = 'btn-download-sm';
            btn.textContent = 'ดาวน์โหลด';

            div.appendChild(img);
            div.appendChild(btn);
            resultImages.appendChild(div);
        });

        document.getElementById('editorContainer').style.display = 'none';
        resultContainer.style.display = 'block';
        editor.toasts.show(`สร้างรูปภาพสำเร็จ ${images.length} รูป`, 'success');
    }
});

