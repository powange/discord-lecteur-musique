const {VoiceConnection, TextChannel, VoiceChannel, StreamDispatcher} = require('discord.js');
const ytdl = require('ytdl-core');

module.exports = class PLaylist {
    /**
     * @type {TextChannel}
     */
    textChannel;

    /**
     * @type {VoiceChannel}
     */
    voiceChannel;

    /**
     * @type {VoiceConnection|null}
     */
    connection = null;


    /**
     *
     * @type {StreamDispatcher|null}
     */
    streamDispatcher = null;

    /**
     * @type {*[]}
     */
    songs = [];

    /**
     * @type {number}
     */
    volume = 0.2;

    /**
     * @type {boolean}
     */
    loop = false;

    /**
     * @type {boolean}
     */
    skipStatut = false;

    /**
     * @type {string}
     */
    prefix = '';

    /**
     * @param textChannel {TextChannel}
     * @param voiceChannel {VoiceChannel}
     * @param prefix {string}
     */
    constructor(textChannel, voiceChannel, prefix) {
        this.textChannel = textChannel;
        this.voiceChannel = voiceChannel;
        this.prefix = prefix;
    }

    async join(){
        this.connection = await this.voiceChannel.join();
    }

    async addSong(url){
        const songInfo = await ytdl.getInfo(url);
        const song = {
            title: songInfo.title,
            url: songInfo.video_url
        };
        this.songs.push(song);

        if(this.streamDispatcher === null){
            this.play();
        }else{
            this.senMessage(`🎵 **${song.title}** ${song.url} has been added to the queue!`);
        }
    }

    async play(senMessage = true) {
        await this.join();

        const song = this.songs[0];
        if (!song) {
            this.voiceChannel.leave();
            return;
        }

        this.streamDispatcher = this.connection
            .play(ytdl(song.url, {
                filter: 'audioonly'
            }))
            .on("finish", () => {
                this.streamDispatcher = null;
                if(!this.loop){
                    this.songs.shift();
                }
                this.play();
            })
            .on("error", error => console.error(error));
        this.streamDispatcher.setVolume(this.volume);

        if(!this.skipStatut){
            if(senMessage) this.senMessage(`▶ **${song.title}** ${song.url}`);
        }
        this.skipStatut = false;
    }

    pause(){
        if(this.streamDispatcher !== null){
            this.streamDispatcher.pause();
        }
    }

    resume(){
        if(this.streamDispatcher !== null){
            this.streamDispatcher.resume();
        }
    }

    stop() {
        this.songs = [];
        this.connection.dispatcher.end();
        this.senMessage(`:stop_button: Le lecteur de musique est de nouveau disponible.`);
    }

    async skip() {
        this.skipStatut = true;
        await this.connection.dispatcher.end();
        let song = this.songs[0];
        this.senMessage(`:track_next: **${song.title}** ${song.url}`);
    }

    swotchLoop(){
        this.loop = !loop;
        let song = this.songs[0];
        if(this.loop){
            this.senMessage(`Loop enable on **${song.title}** ${song.url}`);
        }else{
            this.senMessage(`Loop disable`);
        }
    }

    /**
     * @param messageContent {string}
     */
    senMessage(messageContent){
        messageContent = ' ' + this.prefix + '  ' + messageContent;
        console.log(messageContent);
        this.textChannel.send(messageContent);
    }

};