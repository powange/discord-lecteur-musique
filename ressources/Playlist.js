const {VoiceConnection, TextChannel, VoiceChannel, StreamDispatcher, Message} = require('discord.js');
const ytdl = require('ytdl-core');
const format = require('format-duration')

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
    volume = 0.1;

    /**
     * @type {boolean}
     */
    loop = false;

    /**
     * @type {GuildMember|null}
     */
    skipStatut = null;

    /**
     * @type {string}
     */
    prefix = '';

    /**
     * @type {Message}
     */
    messageRecap = null;

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

    /**
     * @param url {string}
     * @param guildMember {GuildMember}
     * @returns {Promise<void>}
     */
    async addSong(url, guildMember){
        const songInfo = await ytdl.getInfo(url);
        const song = {
            title: songInfo.title,
            url: songInfo.video_url,
            length_seconds: songInfo.length_seconds
        };
        this.songs.push(song);

        if(this.streamDispatcher === null){
            this.play(guildMember);
        }else{
            let duration = format(song.length_seconds * 1000);
            this.senMessage(`🎵 **${song.title}** ${duration} ${song.url} has been added to the queue! ${guildMember}`);
        }
    }

    /**
     * @param guildMember {GuildMember}
     * @returns {Promise<void>}
     */
    async play(guildMember) {
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

        if(this.skipStatut === null){
            let duration = format(song.length_seconds * 1000);
            if(guildMember){
                this.senMessage(`▶ **${song.title}** ${duration} ${song.url} ${guildMember}`);
            }else{
                this.senMessage(`▶ **${song.title}** ${duration} ${song.url}`);
            }
        }
        this.skipStatut = false;
    }

    /**
     * @param guildMember {GuildMember}
     */
    pause(guildMember){
        if(this.streamDispatcher !== null){
            this.streamDispatcher.pause();
            const song = this.songs[0];
            this.senMessage(`:pause_button: **${song.title}** ${song.url} ${guildMember}`);
        }
    }

    /**
     * @param guildMember {GuildMember}
     */
    resume(guildMember){
        if(this.streamDispatcher !== null){
            this.streamDispatcher.resume();
            const song = this.songs[0];
            this.senMessage(`:arrow_forward: **${song.title}** ${song.url} ${guildMember}`);
        }
    }

    /**
     * @param guildMember {GuildMember|undefined}
     */
    stop(guildMember) {
        this.songs = [];
        this.connection.dispatcher.end();
        if(guildMember){
            this.senMessage(`:stop_button: Le lecteur de musique est de nouveau disponible. ${guildMember}`);
        }else{
            this.senMessage(`:stop_button: Le lecteur de musique est de nouveau disponible.`);
        }
    }

    /**
     * @param guildMember {GuildMember}
     * @returns {Promise<void>}
     */
    async skip(guildMember) {
        this.skipStatut = guildMember;
        await this.connection.dispatcher.end();
        let song = this.songs[0];
        this.senMessage(`:track_next: **${song.title}** ${song.url} ${guildMember}`);
    }

    /**
     * @param guildMember {GuildMember}
     */
    switchLoop(guildMember){
        this.loop = !this.loop;
        let song = this.songs[0];
        if(this.loop){
            this.senMessage(`Loop enable on **${song.title}** ${song.url} ${guildMember}`);
        }else{
            this.senMessage(`Loop disable ${guildMember}`);
        }
    }

    /**
     * @param messageContent {string}
     */
    senMessage(messageContent){
        messageContent = ' ' + this.prefix + '  ' + messageContent;
        console.log(messageContent);
        this.textChannel.send(messageContent).then(message => {

        });
    }

    updateRecap(){
        if(this.messageRecap !== null){
            this.messageRecap.delete();
            this.messageRecap = null;
        }

        const messageEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Some title')
            .setURL('https://discord.js.org/')
            .setAuthor('Some name', 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
            .setDescription('Some description here')
            .setThumbnail('https://i.imgur.com/wSTFkRM.png')
            .addFields(
                { name: 'Regular field title', value: 'Some value here' },
                { name: '\u200B', value: '\u200B' },
                { name: 'Inline field title', value: 'Some value here', inline: true },
                { name: 'Inline field title', value: 'Some value here', inline: true },
            )
            .addField('Inline field title', 'Some value here', true)
            .setImage('https://i.imgur.com/wSTFkRM.png')
            .setTimestamp()
            .setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');

        this.textChannel.send(messageEmbed).then(message => {
            this.messageRecap = message;
        });
    }

};