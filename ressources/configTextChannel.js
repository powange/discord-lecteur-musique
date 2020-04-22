const fs = require('fs');

let instance = null;

module.exports = class ConfigTextChannel {

    /**
     * @returns {ConfigTextChannel}
     */
    static getInstance() {
        if (instance === null) {
            instance = new ConfigTextChannel()
        }

        return instance;
    }

    constructor() {
        if (!fs.existsSync(this.pathFile)) {
            fs.writeFileSync(this.pathFile, '{}', function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }

        this.textChannelsID = require('../' + this.pathFile);
    }

    textChannelsID = {};

    pathFile = './config-textchannel.json';

    /**
     * @param guild {Guild}
     * @returns {string}
     */
    getTextChannelID(guild){
        return this.textChannelsID[guild.id].textChannelID;
    }

    /**
     * @param guild {Guild}
     * @returns {string}
     */
    getMessageRecapID(guild){
        return this.textChannelsID[guild.id].messageRecapID;
    }

    /**
     * @param guild {Guild}
     * @param textChannel {TextChannel}
     */
    setConfigTextChannel(guild, textChannel) {

        if(!this.textChannelsID.hasOwnProperty(guild.id)){
            this.textChannelsID[guild.id] = {
                "textChannelID": null,
                "messageRecapID": null
            }
        }

        this.textChannelsID[guild.id]["textChannelID"] = textChannel.id;
        this.saveFileConfig();
    }

    /**
     * @param guild {Guild}
     * @param messageRecap {Message}
     */
    setConfigMessageRecap(guild, messageRecap) {
        this.textChannelsID[guild.id]["messageRecapID"] = messageRecap.id;
        this.saveFileConfig();
    }

    saveFileConfig(){
        fs.writeFileSync(this.pathFile, JSON.stringify(this.textChannelsID), function (err) {
            if (err) {
                console.log(err);
            }
        });
    }
}