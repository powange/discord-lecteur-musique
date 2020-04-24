const Discord = require('discord.js');
const {VoiceChannel, GuildMember, Client} = require('discord.js');
const format = require('format-duration');
let ConfigTextChannel = require('./configTextChannel.js');
const configTextChannel = ConfigTextChannel.getInstance();


let instance = null;

class BotsManager {
    /**
     * @returns {ConfigTextChannel}
     */
    static getInstance() {
        if (instance === null) {
            instance = new BotsManager()
        }

        return instance;
    }

    /**
     * @type {Client|null}
     */
    botMain = null

    /**
     * @type {Client[]}
     */
    clients = [];

    constructor() {
        const {bots, commands} = require('../config.json');

        this.commands = commands;

        for (let key in bots) {
            let botConfig = bots[key];
            let isMain = (typeof(botConfig.main) !== "undefined" && botConfig.main);
            let options = isMain ? { partials: ['MESSAGE'] } : {}
            let bot = this.addBot(botConfig.icon, botConfig.color, botConfig.token, options);

            if(isMain){
                this.botMain = bot;
            }
        }

        if(this.botMainn === null){
            throw new Error('No bot Main setting!');
        }
    }

    /**
     * @param icon {string}
     * @param color {string}
     * @param token {string}
     * @param options {Object}
     */
    addBot(icon, color, token, options){
        let client = new Discord.Client(options);
        client.playlists = new Discord.Collection();
        client.prefix = icon;
        client.color = color;
        client.reservation = false;
        client.once('ready', () => {
            console.log(`Logged in as "${client.user.tag}"`);
        });
        client.login(token);

        this.clients.push(client);
        return client;
    }

    /**
     * @returns {Client}
     */
    getBotMain(){
        return this.botMain;
    }

    /**
     *
     * @param voiceChannel {VoiceChannel}
     * @returns {null|Client}
     */
    getBotInVoiceChannel(voiceChannel) {
        for (const key in this.clients) {
            let client = this.clients[key];

            let connections = client.voice.connections;
            if (connections.has(voiceChannel.guild.id)) {
                if (connections.get(voiceChannel.guild.id).channel.id === voiceChannel.id) {
                    return client;
                }
            }
        }
        return null;
    }



    /**
     * @returns {null|Client}
     */
    getBotFree() {
        for (const key in this.clients) {
            let client = this.clients[key];

            if (client.reservation === false && client.voice.connections.size === 0) {
                return client;
            }
        }
        return null;
    }

    /**
     * @param user {GuildMember}
     * @returns {null|Client}
     */
    getBotForUser(user) {
        let voiceChannel = user.guild.members.cache.get(user.id).voice.channel;
        if (voiceChannel === null) {
            return null;
        }
        let client = this.getBotInVoiceChannel(voiceChannel);
        if (client !== null) {
            console.log(`Found bot "${client.user.username}" already used by user ${user} `);
            return client;
        }
        client = this.getBotFree();

        if(client !== null){
            console.log(`Found new bot "${client.user.username}" for user ${user} `);
            client.reservation = true;
        }
        return client;

    }

    /**
     *
     * @param client
     * @param voiceChannel {VoiceChannel}
     */
    getChannelFromBot(client, voiceChannel){
        return client.channels.cache.filter(c => c.id === voiceChannel.id).first();
    }

    /**
     * @param guild {Guild}
     */
    async getMessageRecap(guild){
        const textChannelID = configTextChannel.getTextChannelID(guild);
        const messageRecapID = configTextChannel.getMessageRecapID(guild);


        const messageEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Comment ça marche ?')
            .setDescription(`Vous pouvez écouter de la musique si vous êtes en vocal, en rentrant simplement ici, le lien YouTube que vous voulez.\n\n` +
            `Vous pouvez également faire les actions suivantes : \n` +
                `- Passer à la musique suivante : ` + this.commands.skip.map(x => '"' + x + '"').join(', ') + `\n` +
                `- Arrêter le jukebox : ` + this.commands.stop.map(x => '"' + x + '"').join(', ') + `\n` +
                `- Répéter en boucle la musique en cours : ` + this.commands.loop.map(x => '"' + x + '"').join(', ') + `\n` +
                `- Mettre en pause la lecture : ` + this.commands.pause.map(x => '"' + x + '"').join(', ') + `\n` +
                `- Reprendre la lecture : ` + this.commands.resume.map(x => '"' + x + '"').join(', ') + `\n` +
                `- Découvrir la playliste complète : ` + this.commands.queue.map(x => '"' + x + '"').join(', ') + `\n`);


        messageEmbed.addField('---------------------------------------------------------', 'Les playlists en cours', false);

        for (const key in this.clients) {
            let client = this.clients[key];
            client.playlists.filter(p => {
                return p.voiceChannel.guild.id === guild.id && p.songs.length > 0
            }).each(playlist => {
                let list = [];
                for (const k in playlist.songs.slice(0, 5)) {
                    let song = playlist.songs[k];
                    let duration = format(song.length_seconds * 1000);
                    let nickname = song.guildMember.nickname;
                    if(!nickname){
                        nickname = song.guildMember.user.username;
                    }
                    list.push(`[${song.title}](${song.url}) ${duration} add by ${nickname}`);
                }
                if(playlist.songs.length > 5){
                    list.push(`+` + (playlist.songs.length - 5) + ' vidéos');
                }
                messageEmbed.addField(
                    `${playlist.prefix} ${client.user.username} | connecté dans ${playlist.voiceChannel.name}`,
                    list.join("\n"),
                    false
                );
            });
        }

        const textChannel = guild.channels.cache.get(textChannelID);
        if(messageRecapID){
            await textChannel.messages.delete(messageRecapID).catch(err => console.log('Ancien message de recap introuvable.'));
        }

        textChannel.send(messageEmbed).then(message => {
            configTextChannel.setConfigMessageRecap(guild, message);
        });
    }
}


module.exports = BotsManager;