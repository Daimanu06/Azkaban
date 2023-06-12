const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.MessageContent
] });
const config = require("./config.json");

let token = process.env.TOKEN;
let victimID = process.env.VICTIMID;

/*** Variables ***/
const validCommands = new RegExp(`^\\${config.prefix}azka(ban)?`, "gi");
const helpSubCommands = ['h', 'help', 'aide'];
let guilds = {}; //list of servers where the bot is present


/*** Functions ****/
function log(msg) {
    console.log(new Date().toLocaleString(), '-', msg);
}

/**
 * Register a guild (a server) when the bot is used
 *
 * For each guild:
 * - Get Azka GuildMember object from it's id
 * - Get ban Role from it's name
 * - Set a date of last bot use, so we can't spam it
 * @param {Guild} guild
 */
async function registerGuild(guild) {
    log("=> registerGuild");

    let azkaIdPromise = guild.members.fetch(victimID);
    let banRolePromise = guild.roles.fetch();

    const reponsePromise = Promise.allSettled([azkaIdPromise, banRolePromise]);
    const response = await reponsePromise;

    const victimUser = response[0].value;
    const banRole = guild.roles.cache.find(role => role.name === config.banRole);

    guilds[guild.id] = {
        "guildId":  guild.id,
        "victimUser": victimUser,
        "banRole":  banRole,
        "lastUseDate": new Date()
    };

    log(`guild "${guild.name}" successfully registered`);
    log(`user ${victimUser} identified`);

}

function displayHelp(channel) {
    channel.send(
`commandes valides :
!azkaban @cible_à_ban
!azkaban aide
    `);
}

/**
 * When someone triggers a ban…
 * @param {*} message
 */
function azkaBanTrigger(message) {
    log("=> azkaBanTrigger");

    message.channel.send(`${message.author} a déclenché la roue d'Azkaban.`); //@
    setTimeout(sendTyping, 500, message); //timeout sinon on n'a pas le sendTyping
    let sentence = determineSentence();

    applySentence(sentence, message);
}

/**
 * Apply the sentence, e.g.:
 * - send an animated image corresponding to the sentence (spinner)
 * - if sentence is a ban
 *     - apply the ban when the image animation has ended
 *     - unban the user after a few minutes
 */
function applySentence(sentence, message) {
    guild = guilds[message.guildId];
    switch(sentence) {
        case "ban":
            setTimeout(
                () => ban(message.channel, guild.victimUser, guild.banRole),
                config.thinkingDuration
            );
            setTimeout(unBan, config.banDuration, guild.victimUser, guild.banRole);
            break;
        case "bitterbit":
            setTimeout(
                () => biterBit(message.channel, message.member, guild.banRole),
                config.thinkingDuration
            );
            setTimeout(unBan, config.banDuration, message.member, guild.banRole);
            break;
        case "spare":
            setTimeout(
                () => spare(message.channel),
                config.thinkingDuration
            );
            break;
    }
}

function noAutoBan(message) {
    message.channel.send("Non mais t'as cru que tu pouvais t'autoban ?!");
}

function sendTyping(message) {
    log("=> sendTyping");

    message.channel.sendTyping();
}

/**
 * Determine the result of the spinner, and let the caller apply the sentence
 * e.g. apply the callback returned by this funtion.
 * Sentence can be:
 * - ban, e.g. Azka is banned
 * - bitter bit, e.g. the author of the command is banned
 * - spare, e.g. nothing happens
 * @returns the decision, as a string
 */
function determineSentence() {
    log("=> determineSentence");

    const decision = Math.random();
    if (decision < config.banProbability) {
        return "ban";
    }
    if (decision < (config.banProbability + config.biterBit)) {
        return "bitterbit";
    }
    return "spare";
}

function ban(channel, userToBan, banRole) {
    log("=> ban");

    channel.send("<:Peurin:1110871155134447667> BAN !! <:Peurin:1110871155134447667>");
    //message.channel.send("https://cdn.discordapp.com/attachments/831601905633067080/1074827238345810000/Azkaban.gif");
    userToBan.roles.add(banRole);
}

function biterBit(channel, userToBan, banRole) {
    log("=> bitterBit");

    channel.send("<:Peurin:1110871155134447667> L'ARROSEUR ARROSÉ !! <:Peurin:1110871155134447667>");
    userToBan.roles.add(banRole);
}

function spare(channel) {
    log("=> spare");

    channel.send("Azka s'en tire bien cette fois, mais ce n'est que partie remise <:Yesocha:1110871843579101239>");
}

function unBan(userToUnban, banRole) {
    log("=> unBan");

    userToUnban.roles.remove(banRole);
}


/*** Events handlers ***/
client.on('ready', () => {
    log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (!(message.guild.id in guilds)) {
        await registerGuild(message.guild);
    }

    if (message.author.bot) {
        return;
    }

    if (!message.content.match(validCommands)) {
        return;
    }

    const params = message.content.split(' ');

    // if one of subcommands is in helpSubCommands
    if (params.some(r => helpSubCommands.includes(r))) {
        displayHelp(message.channel);
        return;
    }

    if (config.autoBan && (message.member.id == guilds[message.guild.id].victimUser)) {
        noAutoBan(message);
        return;
    }

    azkaBanTrigger(message);

});

client.login(token);
