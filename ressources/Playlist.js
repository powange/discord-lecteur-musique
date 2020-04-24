const {VoiceConnection, TextChannel, VoiceChannel, StreamDispatcher, Message, MessageEmbed} = require('discord.js');
const ytdl = require('ytdl-core');
const PlaylistYoutube = require('simple-youtube-api/src/structures/Playlist');
const format = require('format-duration');

const BotsManager = require('./BotsManager.js');
const botsManager = BotsManager.getInstance();

module.exports = class Playlist {

    /**
     * @param client {Client}
     * @param textChannel {TextChannel}
     * @param voiceChannel {VoiceChannel}
     * @param prefix {string}
     * @param color {string}
     */
    constructor(client, textChannel, voiceChannel, prefix, color) {
        this.client = client;
        this.textChannel = textChannel;
        this.voiceChannel = voiceChannel;
        this.prefix = prefix;
        this.color = color;
    }

    /**
     * @type {Client}
     */
    client;

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
     * @type {string}
     */
    prefix = '';

    /**
     * @type {string}
     */
    color = '';

    async join() {
        this.connection = await this.voiceChannel.join().catch(err => {
            console.log(err);
        });
    }

    /**
     * @param url {string}
     * @param guildMember {GuildMember}
     * @returns {Promise<void>}
     */
    async addSong(url, guildMember) {
        try {
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
                this.sendMessageSong(song, ':arrow_forward: playing.');
            } else {
                this.sendMessageSong(song, ':musical_note: has been added to the queue.');
            }
        } catch (e) {
            this.sendMessage(`${url} : ${e.message}`);
        }
    }

    /**
     * @param playlistYoutube {PlaylistYoutube}
     * @param videos {videos}
     * @param guildMember {GuildMember}
     * @returns {Promise<void>}
     */
    async addPlaylist(playlistYoutube, videos, guildMember) {
        try {
            const songs = [];
            const videoPromises = [];

            videos.forEach(v => {
                v.title !== 'Private video' && videoPromises.push(v.fetch({part: 'contentDetails'}));
            });

            await Promise.all(videoPromises)

            videos.forEach(video => {
                const song = {
                    title: video.title,
                    url: video.url,
                    length_seconds: video.durationSeconds,
                    guildMember: guildMember
                };
                this.songs.push(song);
                songs.push(song);
            });

            let playlistData = {
                title: playlistYoutube.title,
                url: playlistYoutube.url
            }

            if (this.streamDispatcher === null) {
                this.play(guildMember);
                this.sendMessageSongs(playlistData, songs, ':arrow_forward: playing playlist.', guildMember);
            } else {
                this.sendMessageSongs(playlistData, songs, ':musical_note: has been added to the queue.', guildMember);
            }
        } catch (e) {
            this.sendMessage(`${url} : ${e.message}`);
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
            this.end();
            let username = this.client.user.username;
            this.sendMessage(`:stop_button: ${username} est de nouveau disponible.`);
            return;
        }

        this.streamDispatcher = await this.connection
            .play(ytdl(song.url, {
                quality: 'highestaudio',
                filter: 'audioonly',
                highWaterMark: 1024 * 1024 * 10 // 10 megabytes
            }))
            .on("finish", () => {
                this.streamDispatcher = null;
                // Si stop volontaire
                if (this.songs.length === 0) {
                    this.end();
                } else {
                    if (!this.loop) {
                        this.songs.shift();
                    }
                    this.play();
                }
            })
            .on("error", error => console.error(error));
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
            this.sendMessageSong(song, ':arrow_forward: resume.', guildMember);
        }
    }

    /**
     * @param guildMember {GuildMember|undefined}
     */
    stop(guildMember) {
        this.songs = [];
        if (this.connection === null) {
            return;
        }
        let username = this.client.user.username;
        let dispatcher = this.connection.dispatcher;
        if (dispatcher !== null) {
            dispatcher.end();
        }
        if(guildMember){
            this.sendMessage(`:stop_button: ${username} est de nouveau disponible.`, `stopping by ${guildMember}`);
        }else{
            this.sendMessage(`:stop_button: ${username} est de nouveau disponible.`);
        }
    }

    end() {
        this.voiceChannel.leave();
        this.connection = null;
        this.client.reservation = false;
        this.client.playlists.delete(this.voiceChannel.guild.id);
    }

    /**
     * @param guildMember {GuildMember}
     * @returns {Promise<void>}
     */
    async skip(guildMember) {
        this.connection.dispatcher.on("finish", () => {
            let song = this.songs[0];
            this.sendMessageSong(song, ':track_next: skipping.', guildMember);
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
            this.sendMessageSong(song, 'Loop enable.', guildMember);
        } else {
            this.sendMessage(`Loop disable`, `${guildMember}`);
        }
    }

    /**
     * @param guildMember {GuildMember}
     */
    getQueue(guildMember) {
        const messageContent = new MessageEmbed()
            .setColor(this.color)
            .setTitle(playlistData.title)
            .setURL(playlistData.url)
            .setDescription(`${action} ${guildMember}`);

        let song = this.songs[0];
        let duration = format(song.length_seconds * 1000);
        messageContent.addField(
            `\:arrow_forward: Durée : ${duration}`,
            `[${song.title}](${song.url})`
        );

        for (const key in this.songs.slice(1)) {
            const song = this.songs[key];
            let duration = format(song.length_seconds * 1000);
            messageContent.addField(
                `Durée : ${duration}`,
                `[${song.title}](${song.url})`
            );
        }

        guildMember.send(messageContent, {split: true});
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
    sendMessageSong(song, action, guildMember) {
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

    /**
     * @param playlistData {Object}
     * @param songs {Object[]}
     * @param action {string}
     * @param guildMember {GuildMember}
     */
    sendMessageSongs(playlistData, songs, action, guildMember) {
        const messageEmbed = new MessageEmbed()
            .setColor(this.color)
            .setTitle(playlistData.title)
            .setURL(playlistData.url)
            .setDescription(`${action} ${guildMember}`);

        for (const key in songs) {
            const song = songs[key];
            let duration = format(song.length_seconds * 1000);
            messageEmbed.addField(
                `Durée : ${duration}`,
                `[${song.title}](${song.url})`
            );
        }

        this.textChannel.send(messageEmbed).then(m => {
            botsManager.getMessageRecap(this.textChannel.guild);
        });
    }

};