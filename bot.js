const format = require('string-format')
const Discord = require("discord.js");
const client = new Discord.Client();
const xhr = require('xhr-request');

client.on("ready", () => {
	console.log("I am ready!");
});

const availableCommands = ["item","i","quest","q","npc","n"];
const commandPrefix = "!";
const reCommand = new RegExp(commandPrefix + "(" + availableCommands.join("|") + ")\\s*(.*)");
const searchBackend = "https://classicdb.ch/opensearch.php?search={}";
const resultBackend = "https://classicdb.ch/?{}={}";
const imageBackend = "http://classicdb.ch/images/icons/{}/{}.jpg";
const ajaxBackend = "https://classicdb.ch/ajax.php?item={}&power";
const discordLink = "{}";
const commandToCategory = {
	"n": 1,
	"o": 2,
	"i": 3,
	"q": 5
};
const categoryToCommand = {
	1: "npc",
	2: "object",
	3: "item",
	5: "quest"
}
const rarityToColor = {
	1: 1,
	2: 65280,
	3: 10751,
	4: 12452095,
	5: 16748032
}
const elseColor = 15269632;
const categoryToIcon = {
	1: "spell_shadow_charm",
	2: "whatever",
	4: "masswatherver",
	5: "inv_scroll_11"
}
// inv_misc_questionmark
function resultToLink(r) {
	return format(discordLink, format(resultBackend, categoryToCommand[r[1]], r[2]));
}
function linkWithName(r) {
	return format("**{}** {}", r[0], resultToLink(r));
}
client.on("message", (message) => {
	if (message.content.startsWith(commandPrefix) && !message.author.bot) {
		let command = reCommand.exec(message.content.toLowerCase());
		if (command) {
			category = commandToCategory[command[1][0]];
			input = command[2];
			xhr(format(searchBackend, input), { json: true }, function(err, data) {
				// 0: input
				// 1: names
				// 7: ids =>
					// 0: category
					// 1: id
					// 2: icon
					// 3: rarity
				if (data && data[1] && data[1].length > 0 && data[7] && data[7].length) {
					let d = data[1].map((x, i) => [x].concat(data[7][i]));
					let matches = d.filter(x => x[1] == category);
					switch(matches.length) {
						case 0:
							message.reply(format("no results found for **{}**", input));
							// TODO: avisar de que hay resultados de otro tipo
						break;
						case 1:
							/*message.reply(resultToLink(matches[0]));
							console.log(format(ajaxBackend, matches[0][2]));
							xhr(format(ajaxBackend, matches[0][2]), function(err, data) {
								console.log(err, data);
							});
							*/
							message.reply({
								"embed": {
									"thumbnail": {
									  "url": format(imageBackend, "medium", categoryToIcon[matches[0][1]] || matches[0][3].toLowerCase())
									},
									/*
									"image": {
									  "url": "https://cdn.discordapp.com/embed/avatars/0.png"
									},
									*/
									"url": resultToLink(matches[0]),
									"title": matches[0][0],
									"description": resultToLink(matches[0]),
									"color": rarityToColor[matches[0][4]] || elseColor
								}
							})
						break;
						default:
							matches = matches.map(linkWithName);
							message.reply(format("multiple results for **{}**:\n{}", input, matches.join("\n")));
						break;
					}
				} else {
					message.reply(format("no results found for **{}**", input));
				}
			});
		}
	}
});

client.login("NDQwNDE2NDI0NzA0MzQ0MDY1.Dchohw.VR8N-PzH4PBrFJfwQdxSDntNXUM");
