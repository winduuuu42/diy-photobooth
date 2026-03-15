const video = document.getElementById('video');
const snapBtn = document.getElementById('snap');
const switchBtn = document.getElementById('switch-cam');
const miniCountEl = document.getElementById('mini-countdown');
const flashEl = document.getElementById('flash');
const resultContainer = document.getElementById('result-container');
const mainUI = document.getElementById('main-ui');
const resultImg = document.getElementById('result-img');
const quickPreview = document.getElementById('quick-preview');
const previewImg = document.getElementById('preview-img');

const shutterSound = new Audio('assets/shutter.mp3');
let capturedPhotos = [];
let currentFacingMode = 'user';

// 1. Camera Initialization
async function startCamera() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        video.srcObject = stream;
        video.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
    } catch (err) {
        alert("Camera access denied or not found.");
    }
}

switchBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera();
});

startCamera();

// 2. Auto-Save Logic (Reload Fix)
function triggerAutoSave(dataUrl) {
    const byteString = atob(dataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], {type: 'image/png'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booth-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 3. Generate Single 2x6 Strip
async function generateFinalLayout() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 600; canvas.height = 1800;

    const overlay = new Image();
    overlay.src = 'assets/overlay.png'; 

    const slotW = 550, slotH = 420, topM = 140, sideM = 25, gap = 30;

    overlay.onload = async () => {
        for (let i = 0; i < capturedPhotos.length; i++) {
            const img = new Image();
            img.src = capturedPhotos[i];
            await new Promise(r => img.onload = r);

            const ratio = slotW / slotH;
            let sW, sH, sx, sy;
            if (img.width / img.height > ratio) {
                sH = img.height; sW = img.height * ratio;
                sx = (img.width - sW) / 2; sy = 0;
            } else {
                sW = img.width; sH = img.width / ratio;
                sx = 0; sy = (img.height - sH) / 2;
            }
            const dy = topM + (i * (slotH + gap));
            ctx.drawImage(img, sx, sy, sW, sH, sideM, dy, slotW, slotH);
        }
        ctx.drawImage(overlay, 0, 0, 600, 1800);
        const data = canvas.toDataURL('image/png');
        resultImg.src = data;
        triggerAutoSave(data);
        mainUI.style.display = 'none';
        resultContainer.style.display = 'flex';
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    };
}

// 4. Session Trigger
snapBtn.addEventListener('click', async () => {
    // Attempt Full Screen for mobile
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }

    snapBtn.classList.add('hidden');
    switchBtn.classList.add('hidden');
    capturedPhotos = [];

    for (let i = 0; i < 3; i++) {
        let count = 5;
        while (count > 0) {
            miniCountEl.innerText = count;
            await new Promise(r => setTimeout(r, 1000));
            count--;
        }
        miniCountEl.innerText = "";

        const c = document.createElement('canvas');
        c.width = video.videoWidth; c.height = video.videoHeight;
        const cx = c.getContext('2d');
        if(currentFacingMode === 'user') { cx.translate(c.width, 0); cx.scale(-1, 1); }
        cx.drawImage(video, 0, 0);
        
        const shot = c.toDataURL('image/png');
        capturedPhotos.push(shot);
        shutterSound.play();
        flashEl.style.display = 'block';
        setTimeout(() => flashEl.style.display = 'none', 100);

        previewImg.src = shot;
        quickPreview.style.display = 'block';
        await new Promise(r => setTimeout(r, 1500));
        quickPreview.style.display = 'none';
    }
    generateFinalLayout();
});

document.getElementById('restart').addEventListener('click', () => {
    location.reload(); // Cleanest way to reset the camera and UI
});

document.getElementById('print-btn').addEventListener('click', () => window.print());