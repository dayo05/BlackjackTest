import {
    Message,
    GatewayIntentBits,
    Client,
    User,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction, Interaction
} from 'discord.js';

class BlackJackData {
    username: string
    isStaying: boolean
    public constructor(username: string) {
        this.username = username
    }

    private currentCard: Array<String> = []
    public addCard(card: String) {
        this.currentCard.push(card)
    }

    public currentValue(): Array<number> {
        let ables: Array<number> = [0]
        for (const card of this.currentCard) {
            switch (card) {
                case 'A':
                    const cl = ables.length
                    for (let i = 0; i < cl; i++)
                        ables[i] += 1
                    for(let i = 0; i < cl; i++)
                        ables.push(ables[i] + 10)
                    break
                case 'J':
                case 'K':
                case 'Q':
                case '10':
                    for (let i = 0; i < ables.length; i++)
                        ables[i] += 10
                    break
                default:
                    const n = card.charCodeAt(0) - '0'.charCodeAt(0)
                    for(let i = 0; i < ables.length; i++)
                        ables[i] += n
                    break
            }
        }
        return ables
    }

    public isDie(): boolean {
        let mi = 22
        const cv = this.currentValue()
        for (const cdt of cv)
            mi = mi < cdt ? mi : cdt
        return mi >= 22
    }

    public getCardString(): string {
        return this.currentCard.join(', ')
    }

    public stay() {
        this.isStaying = true
    }

    public isFinished(): boolean {
        return this.isDie() || this.isStaying
    }
}

class BlackJackGame {
    messageButtons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(new ButtonBuilder()
            .setCustomId("stay")
            .setLabel('Stay')
            .setStyle(ButtonStyle.Secondary))
        .addComponents(new ButtonBuilder()
            .setCustomId("hit")
            .setLabel('Hit')
            .setStyle(ButtonStyle.Primary))

    message: Message
    public static async create(message: Message): Promise<BlackJackGame> {
        let g = new BlackJackGame()
        g.message = await message.reply('게임을 시작하는중...')
        return g
    }
    private constructor() { }
    private users = {}
    private cards = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    public async addPlayer (player: User) {
        if(this.isPlaying) return
        let ud = this.users[player.id] = new BlackJackData(player.username)

        for (let i = 0; i < 2; i++)
            ud.addCard(this.cards[rand(this.cards.length)])
        await this.updateMessage()
    }

    isPlaying = false

    public async startGame() {
        if(this.isPlaying) return
        this.isPlaying = true
        await this.updateMessage()
    }

    private async updateMessage() {
        if(!this.isPlaying) return
        console.log('update!')
        await this.message.edit({
            content: `게임이 시작되었습니당\n${Object.entries(this.users).map((v: [string, BlackJackData]) => {
                const it = v[1]
                return it.isDie() ? `${it.username} 버스트!` : `${it.username}의 카드는 ${it.getCardString()}입니다.`
            }).join('\n')}`, components: [this.messageButtons]
        })
    }

    public async hit(player: User) {
        const ud: BlackJackData = this.users[player.id]
        if(ud.isDie()) return
        if(ud.isStaying) return
        let cd = this.cards[rand(this.cards.length)]
        ud.addCard(cd)
        await this.updateMessage()
    }

    public async stay(player: User) {
        this.users[player.id].stay()
    }

    public async checkFinalize() {
        if(!Object.entries(this.users).some((x: [string, BlackJackData]) => !x[1].isFinished())) {
            this.isPlaying = false
            console.log('finish game')
            await this.message.edit({
                content: Object.entries(this.users).map((v: [string, BlackJackData]) => {
                    const it = v[1]
                    return it.isDie() ? `${it.username} 버스트!` : `${it.username}의 카드는 ${it.getCardString()}입니다.`
                }).join('\n'),
                components: []
            })
        }
    }
}

function rand(max: number): number {
    const x = Math.floor(Math.random() * max - 0.0001)
    return x > 0 ? x : 0
}

const client = new Client({'intents': [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]})

client.on('ready', () => {
    console.log(`Logged in! ${client.user.username}`)
})

const games = {}
client.on('messageCreate', async (msg: Message) => {
    if (msg.author.bot) return
    if (msg.content == '!blackjack') {
        let g = await BlackJackGame.create(msg)
        games[g.message.id] = g
        await g.addPlayer(msg.author)
        await g.startGame()
    }
})

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isButton()) return
    if((interaction as ButtonInteraction).customId === 'hit') {
        let game = games[(interaction as ButtonInteraction).message.id]
        await game.hit(interaction.user)

        await game.checkFinalize()
        await interaction.reply( {
            content: 'Hit!',
            ephemeral: true
        })
    }
    else if((interaction as ButtonInteraction).customId === 'stay') {
        let game = games[(interaction as ButtonInteraction).message.id]
        await game.stay(interaction.user)

        await game.checkFinalize()
        await interaction.reply( {
            content: 'Stay!',
            ephemeral: true
        })
    }
})

client.login("NzQwODQ5NzIxMjQwOTc3NDM3.G9KQNV.C4IN2TIwEAj9miVhDOU3_TCWwpV4ekhEHfDcy8")
