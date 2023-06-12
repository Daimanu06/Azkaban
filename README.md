Slot machine bot (for Discord) to ban (or not)¹ a specified victim.

# Instantiate the bot
## Locally
```bash
VICTIMID="<Discord user numerical id>" TOKEN="<Discord token>" nodemon --inspect src/index.js
```

## Via Docker
```bash
docker run --name azkaban --restart on-failure --read-only -e TOKEN="<Discord token>" -e VICTIMID=<Discord user numerical id> azkaban
```

# Configuration file
File [config.json](src/config.json)
| field | type | description |
|---|---|---|
| prefix | string | Prefix to invoke the bot (e.g. !azkaban) |
| banProbability | float | Ban probability. Must be between 0 and 1² |
| biterBit | float | Biter bit probability. Must be between 0 and 1² |
| banRole | string | Discord role to apply to the "banned" user |
| thinkingDuration | integer | Time (simulated in ms) to "think" about the sentence. In fact, allows time to the slot machine to perform its animation |
| banDuration | integer | Time (in ms) before the bot remove the sentence (the Discord role) automatically |
| autoban | boolean | Allow or disallow autoban |


# Use
Simply type `!azkaban` and let the magic happen.

This bot casts a slot machine with 3 possible outcomes:
- Ban the victim
- Spare the victim
- Biter bit (the person who invoked the bot is banned instead)

In case of ban (or bitter bit), the bot will automatically free the victim after a short (configurable) amount of time.

# Notes

> ¹ Although the bot is called "Azkaban" (to make a pun on Harry Potter), it actually performs a *mute*. More precisely, it applies a role (to configure in [config.json](src/config.json)) to the "banned" user.

> ² The sum banProbability + biterBit must not exceed 1.