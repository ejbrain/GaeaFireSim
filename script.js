window.onload = function () {
    console.log("Page fully loaded. Initializing fire simulation...");

    const canvas = document.getElementById("fireCanvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const resetButton = document.getElementById("resetButton");
    const windSpeedSlider = document.getElementById("windSpeed");
    const windDirectionSlider = document.getElementById("windDirection");
    const moistureSlider = document.getElementById("moistureLevel");

    let windSpeed = 0;
    let windAngle = 0; 
    let fireGrid = [];
    let heightGrid = [];
    let fireActive = false;
    let fireInterval;
    let k = 0.08; 

    let terrainImg = new Image();
    let treeMaskImg = new Image();
    let heightMapImg = new Image();

    let imagesLoaded = 0;

    terrainImg.src = "images/combine.png";
    treeMaskImg.src = "images/arboreal-colorguide.png";
    heightMapImg.src = "images/HeightMap.png";

    function checkAllImagesLoaded() {
        imagesLoaded++;
        if (imagesLoaded === 3) {
            console.log("All images loaded. Ready to start fire simulation.");
            initializeCanvas();
            processImageMasks();
        }
    }

    terrainImg.onload = checkAllImagesLoaded;
    treeMaskImg.onload = checkAllImagesLoaded;
    heightMapImg.onload = checkAllImagesLoaded;

    function initializeCanvas() {
        canvas.width = terrainImg.width;
        canvas.height = terrainImg.height;
        ctx.drawImage(terrainImg, 0, 0, canvas.width, canvas.height);
    }

    function processImageMasks() {
        let tempCanvas = document.createElement("canvas");
        let tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        function getImageData(image) {
            tempCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
            return tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        }

        let treeMaskData = getImageData(treeMaskImg);
        let heightMapData = getImageData(heightMapImg);

        fireGrid = new Array(canvas.width).fill(null).map(() => new Array(canvas.height).fill(0));
        heightGrid = new Array(canvas.width).fill(null).map(() => new Array(canvas.height).fill(0));

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                let index = (y * canvas.width + x) * 4;
                let treeValue = treeMaskData.data[index];
                let heightValue = heightMapData.data[index];

                if (treeValue > 128) fireGrid[x][y] = 1; 
                heightGrid[x][y] = heightValue / 255; 
            }
        }
    }

    function calculateSlope(x, y) {
        let hCenter = heightGrid[x][y];

        let hRight = x < canvas.width - 1 ? heightGrid[x + 1][y] : hCenter;
        let hLeft = x > 0 ? heightGrid[x - 1][y] : hCenter;
        let hUp = y > 0 ? heightGrid[x][y - 1] : hCenter;
        let hDown = y < canvas.height - 1 ? heightGrid[x][y + 1] : hCenter;

        let slopeX = hRight - hLeft;
        let slopeY = hDown - hUp;

        return Math.sqrt(slopeX * slopeX + slopeY * slopeY);
    }

    function drawFire() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(terrainImg, 0, 0, canvas.width, canvas.height);

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                if (fireGrid[x][y] === 4) ctx.fillStyle = "yellow";
                if (fireGrid[x][y] === 5) ctx.fillStyle = "red";
                if (fireGrid[x][y] === 6) ctx.fillStyle = "brown";
                if (fireGrid[x][y] === 7) ctx.fillStyle = "black";

                if (fireGrid[x][y] >= 4) ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    function spreadFire() {
        let newFireGrid = JSON.parse(JSON.stringify(fireGrid));
        let moistureFactor = Math.exp(-parseFloat(moistureSlider.value) / 50);
        let windStrength = windSpeed / 100;
        let windFactorX = Math.cos(windAngle) * windStrength;
        let windFactorY = Math.sin(windAngle) * windStrength;

        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                if (fireGrid[x][y] === 4) {
                    let slopeFactor = Math.exp(k * calculateSlope(x, y));
                    let baseSpread = 0.5 * slopeFactor * moistureFactor; 

                    let spreadProbability = windSpeed === 0 
                        ? baseSpread 
                        : baseSpread + (windFactorX + windFactorY) * 0.3; 

                    let neighbors = [
                        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
                        [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
                    ];

                    neighbors.forEach(([nx, ny]) => {
                        if (fireGrid[nx][ny] === 1 && Math.random() < spreadProbability) {
                            newFireGrid[nx][ny] = 4;
                        }
                    });

                    newFireGrid[x][y] = 5;
                } else if (fireGrid[x][y] === 5) {
                    newFireGrid[x][y] = 6;
                } else if (fireGrid[x][y] === 6) {
                    newFireGrid[x][y] = 7;
                }
            }
        }

        fireGrid = newFireGrid;
        drawFire();
    }

    canvas.addEventListener("click", function (event) {
        let rect = canvas.getBoundingClientRect();
        let x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
        let y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));

        if (fireGrid[x][y] === 1) {
            fireGrid[x][y] = 4;
            fireActive = true;
            if (!fireInterval) fireInterval = setInterval(spreadFire, 150);
        }
    });
    resetButton.addEventListener("click", function () {
        fireActive = false;
        clearInterval(fireInterval);
        fireInterval = null;
        processImageMasks();
        initializeCanvas();
    });

    windDirectionSlider.addEventListener("input", () => windAngle = parseFloat(windDirectionSlider.value) * (Math.PI / 180));
    windSpeedSlider.addEventListener("input", () => windSpeed = parseFloat(windSpeedSlider.value));
};
