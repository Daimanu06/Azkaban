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
let azkaID = process.env.AZKAID;

/*** Variables ***/
const validCommands = new RegExp(`^\\${config.prefix}azka(ban)?`, "gi");
const helpSubCommands = ['h', 'help', 'aide'];
let guilds = {}; //list of servers where the bot is on


/*** Functions ****/
function log(msg) {
    console.log(new Date().toLocaleString(), msg);
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
    if (guild.id in guilds)
        return;

    log("=> registerGuild");

    let azkaIdPromise = guild.members.fetch(azkaID);
    let banRolePromise = guild.roles.fetch();

    const response = await Promise.allSettled([azkaIdPromise, banRolePromise]);
    const azkaUser = response[0].value;
    const banRole = guild.roles.cache.find(role => role.name === config.banRole);

    guilds[guild.id] = {
        "guildId":  guild.id,
        "azkaUser": azkaUser,
        "banRole":  banRole,
        "lastUseDate": new Date()
    };

}

function displayHelp(channel) {
    channel.send(
`commandes valides :
!azkaban @cible_à_ban
!azkaban aide
    `);
}

function azkaBanTrigger(message) {
    log("=> azkaBanTrigger");

    message.channel.send(`${message.author} a déclenché la roue d'<@${config.azkaid}>ban.`); //@
    setTimeout(sendTyping, 500, message); //timeout sinon on n'a pas le sendTyping
    setTimeout(azkaBanResult, config.thinkingDuration, message);
}

function noAutoBan(message) {
    message.channel.send("Non mais t'as cru que tu pouvais t'autoban ?!");
}

function sendTyping(message) {
    log("=> sendTyping");

    message.channel.sendTyping();
}

/**
 * Determine the result of the spinner
 * Can be:
 * - ban, e.g. Azka is banned
 * - bitter bit, e.g. the author of the command is banned
 * - spare, e.g. nothing happens
 * @param {Message} message message containing the command
 * @returns 
 */
function azkaBanResult(message) {
    log("=> azkaBanResult");

    const decision = Math.random();
    if (decision < config.banProbability) {
        guild = guilds[message.guildId];
        ban(message, guild.azkaUser, guild.banRole);
        setTimeout(unBan, config.banDuration, guild.azkaUser, guild.banRole);
        return;
    }
    if (decision < (config.banProbability + config.biterBit)) {
        guild = guilds[message.guildId];
        biterBit(message, message.member, guild.banRole);
        setTimeout(unBan, config.banDuration, message.member, guild.banRole);
        return;
    }
    spare(message);
}

function ban(message, userToBan, banRole) {
    log("=> ban");

    message.channel.send("<:Peurin:904838212290228245> BAN !! <:Peurin:904838212290228245>");
    //message.channel.send("https://cdn.discordapp.com/attachments/831601905633067080/1074827238345810000/Azkaban.gif");
    userToBan.roles.add(banRole);
}

function biterBit(message, userToBan, banRole) {
    log("=> bitterBit");

    message.channel.send("<:Peurin:904838212290228245> L'ARROSEUR ARROSÉ !! <:Peurin:904838212290228245>");
    userToBan.roles.add(banRole);
}

function spare(message) {
    log("=> spare");

    message.channel.send("Azka s'en tire bien cette fois, mais ce n'est que partie remise <:Yesocha:995003497235873904>");
}

function unBan(userToUnban, banRole) {
    log("=> unBan");

    userToUnban.roles.remove(banRole);
}


/*** Events handlers ***/
client.on('ready', () => {
    log(`Logged in as ${client.user.tag}!`); //date
});

client.on('messageCreate', message => {
    registerGuild(message.guild);

    if (message.author.bot) return;

    if (!message.content.match(validCommands)) return;

    const params = message.content.split(' ');

    // if one of subcommands is in helpSubCommands
    if (params.some(r => helpSubCommands.includes(r))) {
        displayHelp(message.channel);
        return;
    }

    if (config.autoBan && (message.member.id == guilds[message.guild.id].azkaUser)) {
        noAutoBan(message);
        return;
    }

    azkaBanTrigger(message);

});

//client.login(config.token);
client.login(token);
