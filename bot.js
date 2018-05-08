const format = require('string-format')
const xhr = require('xhr-request');
const parseString = require('xml2js').parseString;
const config = require("./config.json");
const nls = require("./nls.json")["es"];

const Discord = require("discord.js");
const client = new Discord.Client();
const sqlite3 = require('sqlite3').verbose();
const dbPath = 'db/classic.db';
client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
	client.user.setActivity(` WoW on ${realmName}, !help`);
});
client.on("guildMemberAvailable", (member) => {
	console.log(member);
});
const availableCommands = ["item","i","quest","q","npc","n","player","p","help","h"];
const reCommand = new RegExp(config.prefix + "(" + availableCommands.join("|") + ")\\s*(.*)");
/*
mas rapido pero db menos precisa
const searchBackend = "https://classicdb.ch/opensearch.php?search={}";	// query
const resultBackend = "https://classicdb.ch/?{}={}";										// category, id
const ajaxBackend = "https://classicdb.ch/ajax.php?{}={}&power";				// category, id
const imageBackend = "http://classicdb.ch/images/icons/{}/{}.jpg";			// size, id(name)
*/
const searchBackend = "https://vanilla-twinhead.twinstar.cz/?live-search={}";	// query
const resultBackend = "https://vanilla-twinhead.twinstar.cz/?{}={}";										// category, id
const imageBackend = "https://vanilla-twinhead.twinstar.cz/images/icons/wotlk/{}/{}.jpg";			// size, id(name)
const ajaxBackend = "https://vanilla-twinhead.twinstar.cz/?tooltip&type={}&id={}";
const armoryLink = "http://armory.twinstar.cz/character-sheet.xml?r={}&cn={}";
const armoryFaceImage = "http://armory.twinstar.cz/images/portraits/wow/{}-{}-{}.gif"; // sex, race, classid
const discordLink = "{}";
const realmName = "Kronos III";
/*
if ((type == 3 || type == 6 || type == 9 || type == 10) && param1) {
	div.className += " live-search-icon";
	div.style.backgroundImage = "url(images/icons/small/" + param1.toLowerCase() + ".jpg)"
} else {
	if (type == 5 && param1 >= 1 && param1 <= 2) {
		div.className += " live-search-icon-quest-" + (param1 == 1 ? "alliance": "horde")
	}
}
*/
const commandToCategory = {
	"n": 1,
	"o": 2,
	"i": 3,
	"q": 5
};
const categoryToCommand = {
	1:"npc",
	2:"object",
	3:"item",
	4:"itemset",
	5:"quest",
	6:"spell",
	7:"zone",
	8:"faction",
	9:"pet",
	10:"achievement",
	20:"article",
	21:"user",
	22:"patchnotes",
	30:"characters"
};
const categoryToIcon = {
	1: "spell_shadow_charm",
	5: "inv_scroll_11"
};
const rarityToColor = {
	1: 1,
	2: 65280,
	3: 10751,
	4: 12452095,
	5: 16748032,
  6: 16748032
};
const elseColor = 15269632;
// inv_misc_questionmark
function resultToLink(r) {
	return format(discordLink, format(resultBackend, categoryToCommand[r[1]], r[2]));
}
function linkWithName(r) {
	return format("**{}** {}", r[0], resultToLink(r));
}
client.on("message", (message) => {
	if (message.content.startsWith(config.prefix) && !message.author.bot) {
		let command = reCommand.exec(message.content.toLowerCase());
		if (command) {
			let cmd = command[1][0];
			let category = commandToCategory[cmd];
			let input = command[2];
			if (cmd === "h") {
				message.reply(nls.message.help);
				message.delete();
			} else {
				if (input.length > 0) {
					switch(cmd) {
						case "p":	// armory search
							let armoryUrl = encodeURI(format(armoryLink, realmName, input));
							xhr(armoryUrl, function(err, data) {
								parseString(data, function (err, result) {
									if (!result.page.errorhtml) {
										let character = result.page.characterInfo[0].character[0]["$"];
										message.reply({
											"embed": {
												"thumbnail": {
													"url": format(armoryFaceImage, character.genderId, character.raceId, character.classId)
												},
												"url": armoryUrl,
												"title": format("{}{}{}", character.prefix ? format("{} ", character.prefix) : "", character.name, character.guildName ? format(" <{}>", character.guildName) : ""),
												"description": format("Level {} {} {}", character.level, character.race, character.class),
												"color": character.factionId == "1" ? 16711680 : 255
											}
										});
										message.delete();
									} else {
										message.reply(format(nls.message.noResults, "player", input));
										message.delete();
									}
								});
							});
						break;
						default: // classicdb search
              if (cmd === "i") { // DB solo items por ahora
                let db = new sqlite3.Database(dbPath);
                db.all(`SELECT * FROM item_template WHERE lower(name) LIKE ?`, format("%{}%", input.toLowerCase()), (err, items) => {
                  if (err) {
                    console.error(err.message);
                  }
                  switch(items.length) {
                    case 0:
                      message.reply(format(nls.message.noResults, categoryToCommand[category], input));
                      message.delete();
                    break;
                    case 1:
                      let item = items[0];
                      let link = format(discordLink, format(resultBackend, "item", item.entry));
                      message.reply({
                        "embed": {
                          "url": link,
                          "title": item.name,
                          "description": link,
                          "color": rarityToColor[item.Quality] || elseColor
                        }
                      });
                      message.delete();
                    break;
                    default:
                      items = items.map(function(item) {
                        return format("**{}** {}", item.name, format(discordLink, format(resultBackend, "item", item.entry)));
                      });
                      message.reply(format(nls.message.multipleResults, categoryToCommand[category], input, items.join("\n")));
                      message.delete();
                    break;
                  }
                });
                db.close();
              } else {
                xhr(encodeURI(format(searchBackend, input)), { json: true }, function(err, data) {
                  // 0: input
                  // 1: names
                  // 7: ids =>
                    // 0: category
                    // 1: id
                    // 2: icon
                    // 3: rarity
                  if (data && data[1] && data[1].length > 0 && data[2] && data[2].length) {
                    let d = data[1].map((x, i) => [x].concat(data[2][i]));
                    let matches = d.filter(x => x[1] == category);
                    switch(matches.length) {
                      case 0:
                        message.reply(format(nls.message.noResults, categoryToCommand[category], input));
                        message.delete();
                        // TODO: avisar de que hay resultados de otro tipo?
                      break;
                      case 1:
                        let iconurl = format(imageBackend, "medium", categoryToIcon[matches[0][1]] || matches[0][3].toLowerCase());
                        message.reply({
                          "embed": {
                            "thumbnail": {
                              "url": iconurl
                            },
                            "url": resultToLink(matches[0]),
                            "title": matches[0][0],
                            "description": resultToLink(matches[0]),
                            "color": rarityToColor[matches[0][4]] || elseColor
                          }
                        });
                        message.delete();
                      break;
                      default:
                        matches = matches.map(linkWithName);
                        message.reply(format(nls.message.multipleResults, categoryToCommand[category], input, matches.join("\n")));
                        message.delete();
                      break;
                    }
                  } else {
                    message.reply(format(nls.message.noResults, categoryToCommand[category], input));
                    message.delete();
                  }
                });
              }
						break;
					}
				} else {
					message.reply(format(nls.message.emptyQuery, command[1]));
					message.delete();
				}
			}
		}
	}
});

client.login(config.token);
