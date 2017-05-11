var tesseract  = window.Tesseract = Tesseract.create({
    workerPath: chrome.extension.getURL('ts/ts.worker.js'),
    langPath: chrome.extension.getURL('ts/'),
    corePath: chrome.extension.getURL('ts/ts.core.js')
});

chrome.runtime.onMessage.addListener(

    function(msg, sender, sendResponse) {

        // user chose a stream
        if (msg.type && (msg.type === 'SS_DIALOG_SUCCESS')) {
            startScreenStreamFrom(msg.streamId);
        }

        // user clicked on 'cancel' in choose media dialog
        if (msg.type && (msg.type === 'SS_DIALOG_CANCEL')) {
            console.log('User cancelled!');
        }

    }

);

chrome.runtime.sendMessage({getVideo:true});

/*
let s = document.createElement("script");
s.src = "https://cdn.rawgit.com/naptha/tesseract.js/1.0.10/dist/tesseract.js";
document.getElementsByTagName("head")[0].appendChild(s);
*/


function startScreenStreamFrom(streamId) {
    navigator.webkitGetUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: streamId,
                    maxWidth: window.screen.width,
                    maxHeight: window.screen.height
                }
            }
        },
        // successCallback
        function(screenStream) {


            var div = document.createElement("div");
            var videoCanvas = document.createElement("canvas");
            var videoCanvasCtx = videoCanvas.getContext('2d');



            div.className = 'popover';
            div.innerHTML = "<canvas id='previewCanvas'>";
            document.getElementsByTagName("body")[0].appendChild(div);

            let previewCanvas = document.getElementById("previewCanvas");
            let previewCanvasContext = previewCanvas.getContext('2d');
            previewCanvas.width = 600;
            previewCanvas.height = 300;

            previewCanvasContext.beginPath();
            previewCanvasContext.rect(0, 0, previewCanvas.width, previewCanvas.height);
            previewCanvasContext.fillStyle = "white";
            previewCanvasContext.fill();

            let videoElement = document.createElement('video');
            videoElement.src = URL.createObjectURL(screenStream);
            videoElement.muted=true;
            videoElement.onloadedmetadata = function() {
                console.log('width is', this.videoWidth, this);
                console.log('height is', this.videoHeight);

                let width = this.videoWidth;
                let height = this.videoHeight;
                videoCanvas.width = width;
                videoCanvas.height = height;

                let foundGreenSquare = false;

                let recheckScreenInterval = window.setInterval(function(){

                    let captureSegmentWidth = 500;
                    let captureSegmentHeight = 250;
                    let captureSegmentStartX = 400;
                    let captureSegmentStartY = 0;

                    videoCanvasCtx.drawImage(videoElement, 0, 0, width, height);

                    // take screenshot of specific area (where we suppose the title of the window will appear)
                    let data = videoCanvasCtx.getImageData (
                            captureSegmentStartX, captureSegmentStartY,
                             captureSegmentWidth,
                             captureSegmentHeight
                    );

                    let greenSquareRect = findGreenSquare(data);
                    console.log("green square search results: ", greenSquareRect);

                    if(greenSquareRect != false)
                    {
                        window.clearInterval(recheckScreenInterval);
                        recheckScreenInterval = null;
                        foundGreenSquare = true;


                        //console.log(data);
                        let greenSquareFromCanvas = videoCanvasCtx.getImageData (
                            greenSquareRect.startX + captureSegmentStartX,
                            greenSquareRect.startY + captureSegmentStartY,
                            greenSquareRect.endX - greenSquareRect.startX ,
                            greenSquareRect.endY - greenSquareRect.startY
                        );

                        let s = new Date().getMilliseconds();
                        tesseract.recognize(greenSquareFromCanvas)
                            .progress(function(message){console.log('progress is: ', message)})
                            .then(function(result){
                                console.log("in (", (new Date().getMilliseconds() - s),
                                    ") ts recognized:", result);
                            });

                        previewCanvasContext.putImageData(greenSquareFromCanvas, 0, 0);
                    }



                }, 1000/30);


                function findGreenSquare(imageData)
                {
                    // imageData = Uint8ClampedArray contains height × width × 4 bytes of data,
                    // with index values ranging from 0 to (height×width×4)-1.

                    let colorOfGreenTitleRgb = [165, 179, 65]; // a5b341

                    let rowSize = imageData.width * 4;
                    //let colSize = image.h
                    let verticalCenterLine = (imageData.width / 2 * 4);


                    let verticalStart = 0, horizontalStart = 0;
                    let verticalEnd = imageData.height;
                    let horizontalEnd = imageData.width;



                    // search from top to bottom
                    for(let rowNum = 0; rowNum < imageData.height; rowNum++) {

                        let pixelPos = rowNum * rowSize + verticalCenterLine;

                        //debugger;
                        if (imageData.data.slice(pixelPos, pixelPos + 3).closeTo(colorOfGreenTitleRgb))
                        {
                            verticalStart = rowNum;
                            break;
                        }
                    }

                    if(verticalStart < 1)
                    {
                        console.log("Couldn't find vertical start of green box");
                        return false;
                    }

                    // search from bottom to top
                    for(let rowNum = imageData.height; rowNum > verticalStart; rowNum--) {

                        let pixelPos = rowNum * rowSize + verticalCenterLine;

                        //debugger;
                        if (imageData.data.slice(pixelPos, pixelPos + 3).closeTo(colorOfGreenTitleRgb))
                        {
                            verticalEnd = rowNum;
                            break;
                        }
                    }


                    let horizontalCenterLine =  (verticalStart + ((verticalEnd - verticalStart) / 2)) * rowSize;

                    // search from left to right
                    for(let colNum = 0; colNum < imageData.width; colNum++) {

                        let pixelPos = horizontalCenterLine  + (colNum * 4);


                        //debugger;
                        if (imageData.data.slice(pixelPos, pixelPos + 3).closeTo(colorOfGreenTitleRgb))
                        {
                            horizontalStart = colNum;
                            break;
                        }

                        else
                        {
                            // draw debug line
                            imageData.data[pixelPos] = 0;
                            imageData.data[pixelPos+1] = 0;
                            imageData.data[pixelPos+2] = 255;
                        }

                    }

                    // search from right to left

                    for(let colNum = imageData.width-1; colNum > horizontalStart; colNum--) {

                        let pixelPos = horizontalCenterLine + (colNum * 4);

                        //debugger;
                        if (imageData.data.slice(pixelPos, pixelPos + 3).closeTo(colorOfGreenTitleRgb))
                        {
                            horizontalEnd = colNum;
                            break;
                        }
                        /*
                        else
                        {
                            // draw debug line
                            imageData.data[pixelPos] = 255;
                            imageData.data[pixelPos+1] = 0;
                            imageData.data[pixelPos+2] = 0;
                        }*/
                    }


                    // draw debug
                    //previewCanvasContext.putImageData(imageData, 0, 50);

                    return {
                        startY: verticalStart,
                        endY: verticalEnd,
                        startX: horizontalStart,
                        endX: horizontalEnd
                    };
                    //debugger;
                    //return cropImageData(imageData, horizontalStart, verticalStart, horizontalEnd, verticalEnd);

                }


                function cropImageData(imageData, startX, startY, endX, endY)
                {
                    let pixelData = imageData.data;
                    // crop rows from top and bottom
                    let rowSize = imageData.width * 4;
                    let skeepStart = 0;
                    let imgHeight = endY - startY;

                    if(startY > 0)
                        skeepStart = startY * rowSize;



                    // remove rows from top and bottom:
                    let result = pixelData.slice(skeepStart).slice(0, rowSize * imgHeight);


                    let skeepColumnsLeftCount = startX - 0;
                    let skeepColumnsRightCount = imageData.width - endX;
                    let alreadyRemovedAdjustment = 0;

                    // remove columns from beginning
                    if(skeepColumnsLeftCount > 0)
                    {
                        for(let rowNum = 0; rowNum < imgHeight; rowNum++) {
                            result.splice(rowNum * rowSize - alreadyRemovedAdjustment, skeepColumnsLeftCount * 4);
                            alreadyRemovedAdjustment += skeepColumnsLeftCount * 4;
                        }
                    }

                    //debugger;
                    return new ImageData(result, endX - startX, endY - startY);
                }





            };
            videoElement.play();
        },
        // errorCallback
        function(err) {
            console.log('getUserMedia failed!: ' + err);
        });
}


// attach the .equals method to Array's prototype to call it on any array
Uint8ClampedArray.prototype.closeTo = function (array, maxDiff = 30) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    let totalDiff = 0;

    for (let i = 0, l=this.length; i < l; i++) {
        totalDiff += Math.abs(this[i] - array[i]);
    }

    return totalDiff <= maxDiff;
};
// Hide method from for-in loops
Object.defineProperty(Uint8ClampedArray.prototype, "closeTo", {enumerable: false});