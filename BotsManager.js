const Discord = require('discord.js');
const {VoiceChannel, GuildMember} = require('discord.js');

class BotsManager {

    /**
     *
     * @param clientMain {Client}
     */
    constructor(clientMain) {

        clientMain.queue = new Discord.Collection();
        clientMain.playlists = new Discord.Collection();
        clientMain.prefix = ':white_circle:';

        const {tokens} = require('./config.json');
        this.clients = [clientMain];

        for (const color in tokens) {
            let client = new Discord.Client();
            client.queue = new Discord.Collection();
            client.playlists = new Discord.Collection();
            client.prefix = color;
            client.once('ready', () => {
                console.log(`Logged in as "${client.user.tag}"`);
            });
            client.login(tokens[color]);

            this.clients.push(client);
        }
    }

    /**
     *
     * @param client {Client}
     * @param guild {Guild}
     * @returns {null|VoiceConnection}
     */
    getVoiceChannelOfBot(client, guild) {
        let connections = client.voice.connections;
        if (connections.has(guild.id)) {
            return connections.get(guild.id);
        }
        return null;
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
     *
     * @param voiceChannel {VoiceChannel}
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