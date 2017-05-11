var data_sources = ['screen', 'window'],
    desktopMediaRequestId = '';

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");

        requestScreenSharing(sender);
    });


function requestScreenSharing(sender) {
    // https://developer.chrome.com/extensions/desktopCapture
    // params:
    //  - 'data_sources' Set of sources that should be shown to the user.
    //  - 'targetTab' Tab for which the stream is created.
    //  - 'streamId' String that can be passed to getUserMedia() API

    desktopMediaRequestId = chrome.desktopCapture.chooseDesktopMedia(data_sources, sender.tab, function(streamId) {
        console.log("got stream at", streamId);
        let msg = {};
        if (streamId) {
            msg.type = 'SS_DIALOG_SUCCESS';
            msg.streamId = streamId;
        } else {
            msg.type = 'SS_DIALOG_CANCEL';
        }


            chrome.tabs.sendMessage(sender.tab.id, msg);


    });
}

function cancelScreenSharing(msg) {
    // cancelChooseDesktopMedia crashes on the Mac
    // See: http://stackoverflow.com/q/23361743/980524
    if (desktopMediaRequestId) {
        chrome.desktopCapture.cancelChooseDesktopMedia(desktopMediaRequestId);
    }
}


/*
// Avoiding a reload
chrome.windows.getAll({
    populate: true
}, function (windows) {
    var details = { file: 'index.js', allFrames: true },
        currentWindow;

    for (var i = 0; i < windows.length; i++ ) {
        currentWindow = windows[i];
        var currentTab;

        for (var j = 0; j < currentWindow.tabs.length; j++ ) {
            currentTab = currentWindow.tabs[j];
            // Skip chrome:// pages
            if (currentTab.url == "https://beachvolley.tk/") {
                // https://developer.chrome.com/extensions/tabs#method-executeScript
                chrome.tabs.executeScript(currentTab.id, details, function() {
                    console.log('Injected content-script.');
                });
            }
        }
    }
});
*/



// "*://*/*",