const Discord = require('discord.js');
const {VoiceChannel, GuildMember, Client} = require('discord.js');

class BotsManager {

    /**
     * @type {Client|null}
     */
    botMain = null

    /**
     * @type {Client[]}
     */
    clients = [];

    /**
     * @param clientMain {Client}
     */
    constructor() {
        const {bots} = require('../config.json');

        for (let key in bots) {
            let botConfig = bots[key];
            let bot = this.addBot(botConfig.icon, botConfig.token);
            if(typeof(botConfig.main) !== "undefined" && botConfig.main){
                this.botMain = bot;
            }
        }

        if(this.botMainn === null){
            throw new Error('No bot Main setting!');
        }
    }

    /**
     * @param color {string}
     * @param token {string}
     */
    addBot(color, token){
        let client = new Discord.Client();
        client.playlists = new Discord.Collection();
        client.prefix = color;
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

            if (client.voice.connections.size === 0) {
                return client;
            }
        }
        return null;
    }

    /**
     *
     * @param guild {Guild}
     * @param user {GuildMember}
     * @returns {null|Client}
     */
    getBotForUser(guild, user) {
        let voiceChannel = guild.members.cache.get(user.id).voice.channel;
        if (voiceChannel === null) {
            return null;
        }
        let client = this.getBotInVoiceChannel(voiceChannel);
        if (client !== null) {
            console.log(`Found bot "${client.user.username}" already used by user ${user} `);
            return client;
        }
        client = this.getBotFree();
        console.log(`Found new bot "${client.user.username}" for user ${user} `);
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
}


module.exports = BotsManager;