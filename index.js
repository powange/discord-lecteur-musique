// ":white_circle:"⚪
// ":red_circle:"🔴
// ':blue_circle:'🔵
// ':brown_circle:'🟤
// ':purple_circle:'🟣
// ':green_circle:'🟢
// ':yellow_circle:'🟡
// ':orange_circle:'🟠

// ▶️ ⏸️ ⏹️ 🔂 🎵

const fs = require('fs');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const Playslist = require('./ressources/Playlist');
const {commands} = require('./config.json');
initConfigTextChannel();
let textChannelsID = require('./config-textchannel.json');
const BotsManager = require('./ressources/BotsManager.js');

const botsManager = new BotsManager();

const clientMain = botsManager.getBotMain();

clientMain.on('message', async message => {
    if (message.author.bot) return;

    if (message.content.startsWith('!channelBotMusique ')) {
        let channels = message.mentions.channels.filter(c => c.type === 'text');
        if (channels.size) {
            textChannelsID = setConfigTextChannel(textChannelsID, message.guild, channels.first());
            console.log(`Mise à jour du channel : guild ${message.guild.id} channel ${channels.first().id}.`);
            return;
        }
    }

    if (textChannelsID[message.guild.id] !== message.channel.id) {
        // console.log('Message dans le mauvais channel. On ne prend pas en compte.');
        return;
    }

    if (!message.member.voice.channel) {
        senMessageError(message, `You need to be in a voice channel to play music!`);
        return;
    }

    const clientUser = botsManager.getBotForUser(message.guild, message.member);

    const textChannel = message.channel;
    const voiceChannel = botsManager.getChannelFromBot(clientUser, message.member.voice.channel);

    if(!clientUser){
        senMessageError(message, `Aucun lecteur de musique n'est disponible.`);
        return;
    }

    const permissions = voiceChannel.permissionsFor(clientUser.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        senMessageError(message, `I need the permissions to join and speak in your voice channel!`);
        return;
    }

    const playlist = clientUser.playlists.get(message.guild.id);

    if (!playlist) {
        const playlist = new Playslist(textChannel, voiceChannel, clientUser.prefix);
        clientUser.playlists.set(message.guild.id, playlist);
    }
    /** @var playlist {Playslist} */

    if (commands.skip.indexOf(message.content) >= 0) {
        playlist.skip(message.member);
    }
    else if (commands.pause.indexOf(message.content) >= 0) {
        playlist.pause(message.member);
    }
    else if (commands.resume.indexOf(message.content) >= 0) {
        playlist.resume(message.member);
    }
    else if (commands.stop.indexOf(message.content) >= 0) {
        playlist.stop(message.member);
    }
    else if (commands.loop.indexOf(message.content) >= 0) {
        playlist.switchLoop(message.member);
    } else if (ytdl.validateURL(message.content)) {

        const clientUser = botsManager.getBotForUser(message.guild, message.member);

        execute(
            clientUser,
            clientUser.guilds.cache.get(message.guild.id),
            botsManager.getChannelFromBot(clientUser, message.member.voice.channel),
            message.content,
            message.member
        );
    }


    message.delete();
});

clientMain.on('voiceStateUpdate', (oldMember, newMember) => {
    if (oldMember.member.user.bot) return;

    let oldUserChannel = oldMember.channel;

    if(oldUserChannel === null) return;

    bot = botsManager.getBotInVoiceChannel(oldUserChannel);
    if(bot !== null && oldUserChannel.members.size === 1) {
        const playlist = bot.playlists.get(oldMember.guild.id);
        if(playlist){
            playlist.stop();
        }
    }
});

/**
 *
 * @param client {Client}
 * @param guild {Guild}
 * @param voiceChannel {VoiceChannel}
 * @param url {string}
 * @param guildMember {GuildMember}
 * @returns {Promise<void>}
 */
async function execute(client, guild, voiceChannel, url, guildMember) {
    console.log(client);
    let playlist = client.playlists.get(guild.id);

    if (!playlist) {
        const playlist = new Playslist();
        playlist.textChannel = clientMain
            .guilds.cache.get(guild.id)
            .channels.cache.get(textChannelsID[guild.id]);
        playlist.voiceChannel = voiceChannel;
        playlist.prefix = client.prefix;


        client.playlists.set(guild.id, playlist);

        await playlist.addSong(url);
        playlist.play(guildMember);
    } else {
        playlist.addSong(url, guildMember);
    }
}

/**
 *
 * @param textChannelsID
 * @param guild {Guild}
 * @param textChannel {TextChannel}
 */
function setConfigTextChannel(textChannelsID, guild, textChannel) {

    textChannelsID[guild.id] = textChannel.id;

    fs.writeFile('./config-textchannel.json', JSON.stringify(textChannelsID), function (err) {
        if (err) {
            console.log(err);
        }
    });
    return textChannelsID;
}

function initConfigTextChannel() {
    if (!fs.existsSync('./config-textchannel.json')) {
        fs.writeFileSync('./config-textchannel.json', '{}', function (err) {
            if (err) {
                console.log(err);
            }
        });
    }
}



/**
 * @param message {Discord.Message}
 * @param messageContent {string}
 */
function senMessageError(message, messageContent){
    console.log(messageContent);
    message.reply(messageContent)
        .then(msg => {
            msg.delete({timeout: 5000}).then(msg => {
                message.delete();
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
}

