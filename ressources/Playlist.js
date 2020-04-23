const {VoiceConnection, TextChannel, VoiceChannel, StreamDispatcher, Message, MessageEmbed} = require('discord.js');
const ytdl = require('ytdl-core');
const ytdldis = require('ytdl-core-discord');
const format = require('format-duration');

const BotsManager = require('./BotsManager.js');
const botsManager = BotsManager.getInstance();

module.exports = class Playlist {

    /**
     * @param textChannel {TextChannel}
     * @param voiceChannel {VoiceChannel}
     * @param prefix {string}
     * @param color {string}
     */
    constructor(textChannel, voiceChannel, prefix, color) {
        this.textChannel = textChannel;
        this.voiceChannel = voiceChannel;
        this.prefix = prefix;
        this.color = color;
    }

    /**
     * @type {VoiceConnection|null}
     */
    connection = null;

    /**
     * @type {VoiceChannel}
     */
    voiceChannel;

    /**
     * @type {TextChannel}
     */
    textChannel;


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
     * @type {string}
     */
    color = '';

    /**
     * @type {Message}
     */
    messageRecap = null;

    async join() {
        this.connection = await this.voiceChannel.join();
    }

    /**
     * @param url {string}
     * @param guildMember {GuildMember}
     * @returns {Promise<void>}
     */
    async addSong(url, guildMember) {
        const songInfo = await ytdl.getInfo(url);
        const song = {
            title: songInfo.title,
            url: songInfo.video_url,
            length_seconds: songInfo.length_seconds,
            guildMember: guildMember
        };
        this.songs.push(song);

        if (this.streamDispatcher === null) {
            this.play(guildMember);
            this.sendMessageEmbed(song, ':arrow_forward: playing.');
        } else {
            this.sendMessageEmbed(song, ':musical_note: has been added to the queue.');
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

        this.streamDispatcher = await this.connection
            .play(ytdldis(song.url), { type: 'opus' })
            .on("finish", () => {
                this.streamDispatcher = null;
                if (!this.loop) {
                    this.songs.shift();
                }
                this.play();
            })
            .on("error", error => console.error(error));

        // this.streamDispatcher = await this.connection
        //     .play(ytdl(song.url, {
        //         quality: 'lowest',
        //         filter: 'audioonly'
        //     }), { type: 'opus' })
        //     .on("finish", () => {
        //         this.streamDispatcher = null;
        //         if (!this.loop) {
        //             this.songs.shift();
        //         }
        //         this.play();
        //     })
        //     .on("error", error => console.error(error));


        this.streamDispatcher.setVolume(this.volume);
    }

    /**
     * @param guildMember {GuildMember}
     */
    pause(guildMember) {
        if (this.streamDispatcher !== null) {
            this.streamDispatcher.pause();
            const song = this.songs[0];
            this.sendMessage(`:pause_button: pause song`, `${guildMember}`);
        }
    }

    /**
     * @param guildMember {GuildMember}
     */
    resume(guildMember) {
        if (this.streamDispatcher !== null) {
            this.streamDispatcher.resume();
            const song = this.songs[0];
            this.sendMessageEmbed(song, ':arrow_forward: resume.', guildMember);
        }
    }

    /**
     * @param guildMember {GuildMember|undefined}
     */
    stop(guildMember) {
        this.songs = [];
        this.connection.dispatcher.end();
        if (guildMember) {
            this.sendMessage(`:stop_button: Le lecteur de musique est de nouveau disponible.`, `stoppping by ${guildMember}`);
        } else {
            this.sendMessage(`:stop_button: Le lecteur de musique est de nouveau disponible.`);
        }
    }

    /**
     * @param guildMember {GuildMember}
     * @returns {Promise<void>}
     */
    async skip(guildMember) {
        this.skipStatut = guildMember;
        this.connection.dispatcher.on("finish", () => {
            let song = this.songs[0];
            this.sendMessageEmbed(song, ':track_next: skipping.', guildMember);
        })
        this.connection.dispatcher.end();
    }

    /**
     * @param guildMember {GuildMember}
     */
    switchLoop(guildMember) {
        this.loop = !this.loop;
        let song = this.songs[0];
        if (this.loop) {
            this.sendMessageEmbed(song, 'Loop enable.', guildMember);
        } else {
            this.sendMessage(`Loop disable`, `${guildMember}`);
        }
    }

    /**
     * @param guildMember {GuildMember}
     */
    getQueue(guildMember) {
        let messageContent = this.prefix + "  Voici la playlist actuelle :\n";
        let song = this.songs[0];
        let duration = format(song.length_seconds * 1000);
        messageContent += `\:arrow_forward: **${song.title}** ${duration} ${song.url}\n`
        for (let key in this.songs.slice(1)) {
            let song = this.songs[key];
            let duration = format(song.length_seconds * 1000);
            messageContent += `\:musical_note: **${song.title}** ${duration} ${song.url}\n`;
        }
        guildMember.send(messageContent);
    }

    /**
     * @param title {string}
     * @param description {string}
     */
    sendMessage(title, description) {
        const messageEmbed = new MessageEmbed()
            .setColor(this.color)
            .setTitle(title);
        if (description) {
            messageEmbed.setDescription(description);
        }
        this.textChannel.send(messageEmbed);
        botsManager.getMessageRecap(this.textChannel.guild);
    }

    /**
     * @param song {Object}
     * @param action {string}
     * @param guildMember {GuildMember}
     */
    sendMessageEmbed(song, action, guildMember) {
        let duration = format(song.length_seconds * 1000);
        if (!guildMember) {
            guildMember = song.guildMember;
        }
        const messageEmbed = new MessageEmbed()
            .setColor(this.color)
            .setTitle(song.title)
            .setURL(song.url)
            .setDescription(`${action} ${guildMember} | Durée : ${duration}`);
        this.textChannel.send(messageEmbed).then(m => {
            botsManager.getMessageRecap(this.textChannel.guild);
        });
    }

};