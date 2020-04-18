// ":white_circle:"⚪
// ":red_circle:"🔴
// ':blue_circle:'🔵
// ':brown_circle:'🟤
// ':purple_circle:'🟣
// ':green_circle:'🟢
// ':yellow_circle:'🟡
// ':orange_circle:'🟠

// ▶️ ⏸️ ⏹️ 🔂 🎵


const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const Playslist = require('./Playlist');

const {token, commands} = require('./config.json');

let textChannelsID = require('./config-textchannel.json');

const clientMain = new Discord.Client();

const BotsManager = require('./BotsManager.js');
const botsManager = new BotsManager(clientMain);

clientMain.once('ready', () => {
    console.log(`Logged in main as "${clientMain.user.tag}"`);
});

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
        console.log(message.content);
        console.log('Message dans le mauvais channel. On ne prend pas en compte.');
        return;
    }

    if (!message.member.voice.channel) {
        console.log('You need to be in a voice channel to play music!');
        message.delete();
        return;
    }

    const clientUser = botsManager.getBotForUser(message.guild, message.member);

    const textChannel = message.channel;
    const voiceChannel = botsManager.getChannelFromBot(clientUser, message.member.voice.channel);

    if(!clientUser){
        console.log('No bot available!');
        textChannel.send(`Aucun lecteur de musique n'est disponible`);
        return;
    }

    const permissions = voiceChannel.permissionsFor(clientUser.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        textChannel.send(`I need the permissions to join and speak in your voice channel!`);
        return;
    }

    /**
     * @type {Playslist}
     */
    const playlist = clientUser.playlists.get(message.guild.id);

    if (!playlist) {
        const playlist = new Playslist(textChannel, voiceChannel, clientUser.prefix);
        clientUser.playlists.set(message.guild.id, playlist);
    }

    if (commands.skip.indexOf(message.content) >= 0) {
        playlist.skip();
    }
    else if (commands.pause.indexOf(message.content) >= 0) {
        playlist.pause();
    }
    else if (commands.resume.indexOf(message.content) >= 0) {
        playlist.resume();
    }
    else if (commands.stop.indexOf(message.content) >= 0) {
        playlist.stop();
    }
    else if (commands.loop.indexOf(message.content) >= 0) {
        playlist.swotchLoop();
    } else if (ytdl.validateURL(message.content)) {

        // Join the same voice channel of the author of the message

        // console.log(botsManager.clients);
        const clientUser = botsManager.getBotForUser(message.guild, message.member);
        // console.log(clientUser);

        execute(
            clientUser,
            clientUser.guilds.cache.get(message.guild.id),
            botsManager.getChannelFromBot(clientUser, message.member.voice.channel),
            message.content
        );

        // botsManager.getChannelFromBot(clientUser, message.member.voice.channel).join();
        //
        // const broadcast = client.voice.createBroadcast();
        // const dispatcher = broadcast.play('./ressources/a.webm');

        // connection.play(broadcast);
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

// function senMessage(client, guild, messageContent) {
//     messageContent = ' ' + client.prefix + '  ' + messageContent;
//     console.log(messageContent);
//     clientMain
//         .guilds.cache.get(guild.id)
//         .channels.cache.get(textChannelsID[guild.id])
//         .send(messageContent);
// }


async function execute(client, guild, voiceChannel, url) {
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
        playlist.play();
        console.log(playlist);
    } else {
        playlist.addSong(url);
    }
}

// async function skip(client, guild, message) {
//     if (!message.member.voice.channel)
//         throw new Error("You have to be in a voice channel to stop the music!");
//     const serverQueue = client.queue.get(guild.id);
//     if (!serverQueue)
//         throw new Error("There is no song that I could skip!");
//     await serverQueue.connection.dispatcher.end();
//     let song = serverQueue.songs[0];
//     senMessage(client, guild, `:track_next: **${song.title}** ${song.url}`);
// }
//
// function stop(client, guild, message) {
//     if (!message.member.voice.channel)
//         throw new Error("You have to be in a voice channel to stop the music!");
//
//     const serverQueue = client.queue.get(guild.id);
//     serverQueue.songs = [];
//     serverQueue.connection.dispatcher.end();
//     let song = serverQueue.songs[0];
//     senMessage(client, guild, `:stop_button:`);
// }
//
// function play(client, guild, song) {
//     const serverQueue = client.queue.get(guild.id);
//     if (!song) {
//         this.voiceChannel.leave();
//         return;
//     }
//
//     const dispatcher = serverQueue.connection
//         .play(ytdl(song.url))
//         .on("finish", () => {
//             serverQueue.songs.shift();
//             play(client, guild, serverQueue.songs[0]);
//         })
//         .on("error", error => console.error(error));
//     dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
//     console.log(serverQueue.voiceChannel);
//     senMessage(client, guild, `▶ **${song.title}** ${song.url}`);
// }

/**
 *
 * @param textChannelsID
 * @param guild {Guild}
 * @param textChannel {TextChannel}
 */
function setConfigTextChannel(textChannelsID, guild, textChannel) {
    let fs = require('fs');

    textChannelsID[guild.id] = textChannel.id;

    fs.writeFile('./config-textchannel.json', JSON.stringify(textChannelsID), function (err) {
        if (err) {
            console.log(err);
        }
    });
    return textChannelsID;
}

clientMain.login(token);


