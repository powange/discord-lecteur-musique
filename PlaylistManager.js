var youtubeStream = require('youtube-audio-stream');

class PlaylistManager {

    constructor() {
    }

    play(search){
        let stream = youtubeStream(search);
        connection.playStream(stream).on('end', function () {
            connection.disconnect();
        });
    }
}

module.exports = PlaylistManager;