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
const Playlist = require('./ressources/Playlist');
const {commands, APIKey} = require('./config.json');

let ConfigTextChannel = require('./ressources/configTextChannel');
const configTextChannel = ConfigTextChannel.getInstance();

const BotsManager = require('./ressources/BotsManager.js');
const botsManager = BotsManager.getInstance();

const clientMain = botsManager.getBotMain();

const Youtube = require('simple-youtube-api');
const youtube = new Youtube(APIKey);

clientMain.on('message', async message => {
    if (message.author.bot) return;

    if (message.content.startsWith('!channelBotMusique ')) {
        let channels = message.mentions.channels.filter(c => c.type === 'text');
        if (channels.size) {
            configTextChannel.setConfigTextChannel(message.guild, channels.first());
            message.reply(`Mise à jour du channel : guild ${message.guild.id} channel ${channels.first().id}.`)
            message.delete();
            console.log(`Mise à jour du channel : guild ${message.guild.id} channel ${channels.first().id}.`);
            return;
        }
    }

    if (configTextChannel.getTextChannelID(message.guild) !== message.channel.id) {
        // console.log('Message dans le mauvais channel. On ne prend pas en compte.');
        return;
    }

    if (!message.member.voice.channel) {
        senMessageError(message, `You need to be in a voice channel to play music!`);
        return;
    }

    if(message.member.voice.channel.id === message.guild.afkChannelID){
        senMessageError(message, `You can't play music in the AFK voice channel!`);
        return;
    }

    const clientUser = botsManager.getBotForUser(message.member);

    const textChannel = message.channel;
    const voiceChannel = botsManager.getChannelFromBot(clientUser, message.member.voice.channel);

    if (!clientUser) {
        senMessageError(message, `Aucun lecteur de musique n'est disponible.`);
        return;
    }

    const permissions = voiceChannel.permissionsFor(clientUser.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        senMessageError(message, `I need the permissions to join and speak in your voice channel!`);
        return;
    }

    /**
     *  @type {Playlist}
     */
    var playlist = clientUser.playlists.get(message.guild.id);

    if (!playlist) {
        playlist = new Playlist(clientUser, textChannel, voiceChannel, clientUser.prefix, clientUser.color);
        clientUser.playlists.set(message.guild.id, playlist);
    }

    try {
        if (commands.skip.indexOf(message.content) >= 0) {
            playlist.skip(message.member);
        } else if (commands.pause.indexOf(message.content) >= 0) {
            playlist.pause(message.member);
        } else if (commands.resume.indexOf(message.content) >= 0) {
            playlist.resume(message.member);
        } else if (commands.stop.indexOf(message.content) >= 0) {
            playlist.stop(message.member);
        } else if (commands.loop.indexOf(message.content) >= 0) {
            playlist.switchLoop(message.member);
        } else if (commands.loop.indexOf(message.content) >= 0) {
            playlist.switchLoop(message.member);
        } else if (commands.queue.indexOf(message.content) >= 0) {
            playlist.getQueue(message.member);
        } else if (message.content === 'recap') {
            botsManager.getMessageRecap(message.guild);
        } else if (ytdl.validateURL(message.content)) {
            await playlist.addSong(message.content, message.member).catch(err => {
                senMessageError(message, err.message);
            });
        } else if(validateURLPlaylist(message.content)) {
            youtube.getPlaylist(message.content)
                .then(playlistYoutube => {
                    playlistYoutube.getVideos().then(videos => {
                        playlist.addPlaylist(playlistYoutube, videos, message.member).catch(err => {
                            senMessageError(message, err.message);
                        });
                    }).catch(err => {
                        senMessageError(message, err.message);
                    });
                })
                .catch(console.log);
        } else {
            const videos = await youtube.searchVideos(message.content, 1).catch(err => console.log(err));

            if (videos.length) {
                let video = videos[0];

                await playlist.addSong(video.url, message.member).catch(err => {
                    senMessageError(message, err.message);
                });
            }
            
        }


        message.delete();

    } catch (e) {
        clientUser.reservation = false;
        console.log(e);
    }
});

clientMain.on('voiceStateUpdate', (oldMember, newMember) => {
    if (oldMember.member.user.bot) return;

    let oldUserChannel = oldMember.channel;

    if (oldUserChannel === null) return;

    bot = botsManager.getBotInVoiceChannel(oldUserChannel);
    if (bot !== null && oldUserChannel.members.filter(gm => gm.user.bot === false).size === 0) {
        const playlist = bot.playlists.get(oldMember.guild.id);
        if (playlist) {
            playlist.stop();
        }
    }
});

function validateURLPlaylist(url){
    const Playlist = require('simple-youtube-api/src/structures/Playlist');
    return Playlist.extractID(url);

}

/**
 * @param message {Discord.Message}
 * @param messageContent {string}
 */
function senMessageError(message, messageContent) {
    console.log(messageContent);
    message.reply(messageContent)
        .then(msg => {
            msg.delete({timeout: 5000}).then(msg => {
                message.delete();
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
}

