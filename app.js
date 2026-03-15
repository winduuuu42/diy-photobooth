const video = document.getElementById('video');
const snapBtn = document.getElementById('snap');
const statusText = document.getElementById('status-text');
const miniCountEl = document.getElementById('mini-countdown');
const flashEl = document.getElementById('flash');
const resultContainer = document.getElementById('result-container');
const mainUI = document.getElementById('main-ui');
const resultImg = document.getElementById('result-img');
const quickPreview = document.getElementById('quick-preview');
const previewImg = document.getElementById('preview-img');

const shutterSound = new Audio('assets/shutter.mp3');
let capturedPhotos = [];

// 1. Camera Start
navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
    .then(stream => { video.srcObject = stream; })
    .catch(err => console.error(err));

// 2. Blob Auto-Save (Reload Fix)
function triggerAutoSave(dataUrl) {
    const byteString = atob(dataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], {type: 'image/png'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booth-strip-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 3. 3-Shot Logic
snapBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if(snapBtn.disabled) return;
    
    // HIDE TEXT & BUTTONS FOR CLEAN LOOK
    snapBtn.classList.add('hidden');
    statusText.classList.add('hidden');
    
    snapBtn.disabled = true;
    capturedPhotos = [];

    for (let i = 1; i <= 3; i++) {
        let count = 5;
        miniCountEl.innerText = count;
        
        await new Promise(resolve => {
            const timer = setInterval(() => {
                count--;
                if (count > 0) miniCountEl.innerText = count;
                else { clearInterval(timer); miniCountEl.innerText = ""; resolve(); }
            }, 1000);
        });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const shot = canvas.toDataURL('image/png');
        capturedPhotos.push(shot);

        shutterSound.play();
        flashEl.style.display = 'block';
        setTimeout(() => flashEl.style.display = 'none', 100);
        
        previewImg.src = shot;
        quickPreview.style.display = 'block';
        await new Promise(r => setTimeout(r, 2000));
        quickPreview.style.display = 'none';
    }

    generateFinalLayout();
});

// 4. Build Strip (Center Crop 500x400)
async function generateFinalLayout() {
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    finalCanvas.width = 600; finalCanvas.height = 1800;

    const overlay = new Image();
    overlay.src = 'assets/overlay.png';

    overlay.onload = async () => {
        for (let i = 0; i < capturedPhotos.length; i++) {
            const img = new Image();
            img.src = capturedPhotos[i];
            await new Promise(r => img.onload = r);

            const targetRatio = 500 / 400;
            let sWidth, sHeight, sx, sy;
            if (img.width / img.height > targetRatio) {
                sHeight = img.height; sWidth = img.height * targetRatio;
                sx = (img.width - sWidth) / 2; sy = 0;
            } else {
                sWidth = img.width; sHeight = img.width / targetRatio;
                sx = 0; sy = (img.height - sHeight) / 2;
            }

            const destY = 150 + (i * (400 + 50)); 
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 50, destY, 500, 400);
        }

        ctx.drawImage(overlay, 0, 0, 600, 1800);
        const finalData = finalCanvas.toDataURL('image/png');
        resultImg.src = finalData;

        triggerAutoSave(finalData);
        mainUI.style.display = 'none';
        resultContainer.style.display = 'flex';
    };
} 

// 4. Build Final 4x6 Layout (2 Strips Side by Side)
/*async function generateFinalLayout() {
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    
    // Set to 4x6 ratio (1200x1800)
    finalCanvas.width = 1200;
    finalCanvas.height = 1800;

    const overlay = new Image();
    overlay.src = 'assets/overlay.png';

    overlay.onload = async () => {
        // Create a temporary canvas for ONE strip
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = 600;
        tempCanvas.height = 1800;

        for (let i = 0; i < capturedPhotos.length; i++) {
            const img = new Image();
            img.src = capturedPhotos[i];
            await new Promise(r => img.onload = r);

            // Using your dimensions (Change slotH if you changed it in Canva)
            const slotW = 500; 
            const slotH = 400; 
            const targetRatio = slotW / slotH;
            
            let sWidth, sHeight, sx, sy;
            if (img.width / img.height > targetRatio) {
                sHeight = img.height; sWidth = img.height * targetRatio;
                sx = (img.width - sWidth) / 2; sy = 0;
            } else {
                sWidth = img.width; sHeight = img.width / targetRatio;
                sx = 0; sy = (img.height - sHeight) / 2;
            }

            // Draw to the single strip workspace
            const destY = 150 + (i * (slotH + 50)); 
            tempCtx.drawImage(img, sx, sy, sWidth, sHeight, 50, destY, slotW, slotH);
        }

        // Draw your original Canva overlay on the single strip
        tempCtx.drawImage(overlay, 0, 0, 600, 1800);

        // --- DRAW TO THE FINAL 4x6 SHEET ---
        // Left Strip
        ctx.drawImage(tempCanvas, 0, 0);
        // Right Strip
        ctx.drawImage(tempCanvas, 600, 0);

        // --- OPTIONAL: CUTTING GUIDE ---
        ctx.strokeStyle = "#E0E0E0"; // Light gray
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(600, 0);
        ctx.lineTo(600, 1800);
        ctx.stroke();

        const finalData = finalCanvas.toDataURL('image/png');
        resultImg.src = finalData;

        triggerAutoSave(finalData);
        mainUI.style.display = 'none';
        resultContainer.style.display = 'flex';
    };
} */
// 5. Controls
document.getElementById('restart').addEventListener('click', () => {
    resultContainer.style.display = 'none';
    mainUI.style.display = 'flex';
    
    // BRING TEXT & BUTTONS BACK
    snapBtn.classList.remove('hidden');
    statusText.classList.remove('hidden');
    
    statusText.innerText = "CLICK CAPTURE TO START";
    snapBtn.disabled = false;
});

document.getElementById('print-btn').addEventListener('click', () => {
    const pwin = window.open('', '_blank');
    pwin.document.write(`<img src="${resultImg.src}" style="width:100%;">`);
    pwin.document.close();
    pwin.print();
});