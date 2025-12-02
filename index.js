const { Client, Partials, Collection } = require('discord.js')

const { User, Message, GuildMember, ThreadMember } = Partials

const client = new Client({
    intents: [53608447],
    partials: [User, Message, GuildMember, ThreadMember]
})

const { loadEvents } = require("./Handlers/eventHandler.js")

client.config = require("./config.json")
client.events = new Collection;
client.commands = new Collection;

loadEvents(client);

client.login(client.config.token);