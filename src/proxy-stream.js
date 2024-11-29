ProxyStream = {
    channel: null,
    currentQuality: null, // Store the current quality level

    getPlaylist: async function (channel) {
        const url = `https://mur3dz2sp4.execute-api.eu-north-1.amazonaws.com/getTwitchPlaylist?channel=${channel}`;

        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            return await response.text();
        } catch (error) {
            console.log(`'Twitch Anti-Ban: unable to fetch from ${url}: ${error}`);
            return null;
        }
    },

    convertToPlaylistBlob: function (playlist) {
        const blob = new Blob([playlist], {type: 'application/vnd.apple.mpegurl'});
        return URL.createObjectURL(blob);
    },

    getStreamPlaylist: function (channel) {
        return ProxyStream.getPlaylist(channel)
            .then(playlist => ProxyStream.convertToPlaylistBlob(playlist));
    },

    restoreOriginalPlayer: function () {
        let streamContainer = $('[data-a-target="video-player"]');
        streamContainer.css("display", "block");
        $('#proxy-stream').remove();
        ProxyStream.channel = null;
        ProxyStream.currentQuality = null; // Reset quality
    },

    initStream: function (channel) {
        ProxyStream.channel = channel;
        let proxyStream = $(`<div id="proxy-stream"><video id="proxy-stream-player" controls></video></div>`);
        let streamContainer = $('[data-a-target="video-player"]');
        streamContainer.css("display", "none");
        streamContainer.parent().append(proxyStream);

        if (Hls.isSupported()) {
            let video = document.getElementById('proxy-stream-player');
            let hls = new Hls();
            ProxyStream.getStreamPlaylist(channel).then(function (playlist) {
                hls.loadSource(playlist);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, function () {
                    video.play();
                    // Add quality levels to the player once the manifest is parsed
                    ProxyStream.addQualityHotkeys(hls);
                });

                hls.on(Hls.Events.ERROR, function (event, data) {
                    if (event && data) {
                        console.log('Twitch Anti-Ban:', event, data);
                    }
                });
            });
        } else {
            ProxyChat.log('Unable to initialize stream player. HLS is not supported in this browser.');
        }
    },

    // Adds the hotkeys for changing the quality
    addQualityHotkeys: function (hls) {
        // Listen for keypress events to change quality
        document.addEventListener('keydown', function (e) {
            // Dynamically select the quality based on available levels
            if (e.key >= '1' && e.key <= '9') {
                const qualityIndex = e.key - '1'; // Hotkeys '1' to '9' (1-9)
                ProxyStream.setQuality(hls, qualityIndex);
            }
        });
    },

    // Sets the quality and updates the UI
    setQuality: function (hls, qualityIndex) {
        const levels = hls.levels;
        if (qualityIndex >= 0 && qualityIndex < levels.length) {
            const selectedLevel = levels[qualityIndex];
            hls.startLevel = qualityIndex;
            hls.currentLevel = qualityIndex;
            ProxyStream.currentQuality = selectedLevel.height;
            ProxyStream.showQualityIndicator(ProxyStream.currentQuality);
        }
    },

    // Displays the quality selection in a fading box
    showQualityIndicator: function (quality) {
        // Create the quality indicator box if it doesn't exist already
        let qualityBox = $('#quality-indicator');
        if (qualityBox.length === 0) {
            qualityBox = $(`<div id="quality-indicator" style="position: fixed; top: 20px; right: 20px; background-color: rgba(0, 0, 0, 0.7); color: white; padding: 10px; border-radius: 5px; font-size: 14px; z-index: 9999;"></div>`);
            $('body').append(qualityBox);
        }

        // Update the content and make it visible
        qualityBox.text(`Quality: ${quality}p`);
        qualityBox.stop(true, true).fadeIn(300).delay(2000).fadeOut(500); // Fade in and out with delay
    },
}
