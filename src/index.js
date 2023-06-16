const { Client, GatewayIntentBits, User } = require('discord.js');
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

    const defaultVictimGuildMember = response[0].value;
    const banRole = guild.roles.cache.find(role => role.name === config.banRole);

    guilds[guild.id] = {
        "name": guild.name,
        "id":  guild.id,
        "defaultVictimGuildMember": defaultVictimGuildMember,
        "banRole":  banRole,
        "lastUseDate": 0
    };

    log(`guild "${guild.name}" successfully registered`);
    log(`default victim for this guild will be ${defaultVictimGuildMember.nickname}`);

}

function displayHelp(channel) {
    channel.send(
`Mute une personne de votre choix, ou Azka par défaut.
Commandes valides :
\`\`\`!azkaban
!azkaban @cible_à_ban
!azkaban aide\`\`\``);
}

/**
 * When someone triggers a ban…
 *
 * Make sure the command is not spammed,
 * Determine the outcome of the spin and apply it.
 * @param {*} message
 */
function azkaBanTrigger(guild, channel, authorGuildMember, victimGuildMember) {
    log(`=> azkaBanTrigger in "${guild.name}/${channel.name}" by "${authorGuildMember.nickname}" to "${victimGuildMember.nickname}"`);

    const now = Date.now();
    if (guild.lastUseDate && ((now - guild.lastUseDate) < config.cooldownDuration)) {
        channel.send("Le marteau du ban est satisfait. Mais sa faim revient toutes les minutes.");
        return;
    }

    guild.lastUseDate = now;
    channel.send(`${authorGuildMember.nickname} a déclenché la roue d'Azkaban sur <@${victimGuildMember.id}>.`);
    setTimeout(sendTyping, 500, channel); //timeout sinon on n'a pas le sendTyping
    let sentence = determineSentence();

    const banRole = guild.banRole;
    const banDuration = config.banDuration;
    const thinkingDuration = config.thinkingDuration;

    applySentence(sentence, channel, authorGuildMember, victimGuildMember, banRole, banDuration, thinkingDuration);
}

/**
 * Apply the sentence, e.g.:
 * - send an animated image corresponding to the sentence (spinner)
 * - if sentence is a ban
 *     - apply the ban when the image animation has ended
 *     - unban the user after a few minutes
 */
function applySentence(sentence, channel, authorGuildMember, victimGuildMember, banRole, banDuration, thinkingDuration) {
    switch(sentence) {
        case "ban":
            setTimeout(
                () => ban(channel, victimGuildMember, banRole),
                thinkingDuration
            );
            setTimeout(unBan, banDuration, channel, victimGuildMember, banRole);
            break;
        case "bitterbit":
            setTimeout(
                () => biterBit(channel, authorGuildMember, banRole),
                thinkingDuration
            );
            setTimeout(unBan, banDuration, channel, authorGuildMember, banRole);
            break;
        case "spare":
            setTimeout(
                () => spare(victimGuildMember, channel),
                thinkingDuration
            );
            break;
    }
}

function noAutoBan(channel) {
    channel.send("Non mais t'as cru que tu pouvais t'autoban ?!");
}

function sendTyping(channel) {
    channel.sendTyping();
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
    channel.send("<:Peurin:1110871155134447667> BAN !! <:Peurin:1110871155134447667>");
    //message.channel.send("https://cdn.discordapp.com/attachments/831601905633067080/1074827238345810000/Azkaban.gif");
    userToBan.roles.add(banRole);
}

function biterBit(channel, userToBan, banRole) {
    channel.send("<:Peurin:1110871155134447667> L'ARROSEUR ARROSÉ !! <:Peurin:1110871155134447667>");
    userToBan.roles.add(banRole);
}

function spare(victimGuildMember, channel) {
    channel.send(`${victimGuildMember.nickname || victimGuildMember.user.username} s'en tire bien cette fois, mais ce n'est que partie remise <:Yesocha:1110871843579101239>`);
}

function unBan(channel, userToUnban, banRole) {
    channel.send(`J'ai pitié de toi, ${userToUnban.nickname || userToUnban.user.username}. Je te libère de ton sort <:Peurin:1110871155134447667>`)

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

    let currentGuild = guilds[message.guild.id];
    let victimGuildMember = currentGuild.defaultVictimGuildMember;

    // if a user was mentionned
    if (message.mentions.users.size > 0) {
        userId = message.mentions.users.keys().next().value;
        victimGuildMember = await message.guild.members.fetch(userId);
    }

    if (config.autoBan && (message.member.user.id == victimGuildMember.user.id)) {
        noAutoBan(message.channel);
        return;
    }

    azkaBanTrigger(currentGuild, message.channel, message.member, victimGuildMember);

});

client.login(token);
