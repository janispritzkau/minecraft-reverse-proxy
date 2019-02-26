import { Connection, Packet, PacketWriter } from "mcproto"
import { createServer, connect } from "net"

const servers: {[key: string]: { host: string, port: number }} = {}

process.argv.slice(2).forEach(arg => {
    const parts = arg.split(":")
    const remoteHost = parts.shift()!
    servers[remoteHost] = {
        host: parts.length > 1 ? parts[0] : "localhost",
        port: parts.length > 1 ? +parts[1] : +parts[0]
    }
})

createServer(async serverSocket => {
    serverSocket.on("error", _err => {})
    const server = new Connection(serverSocket, { isServer: true })
    const packets: Packet[] = []

    const remoteAddress = serverSocket.remoteAddress!.replace("::ffff:", "")

    server.onPacket = packet => packets.push(packet)
    let packet = await server.nextPacket
    const host = (packet.readVarInt(), packet.readString())
    const nextState = (packet.readUInt16(), packet.readVarInt())

    const addr = servers[host]

    if (!addr) {
        const msg = { text: "Please use a valid address to connect!", color: "red" }
        if (nextState == 1) {
            server.send(new PacketWriter(0x0).writeJSON({
                version: { name: "Proxy", protocol: -1 },
                players: { max: -1, online: -1 },
                description: msg
            }))
            server.onPacket = packet => {
                if (packet.id == 0x1) server.send(new PacketWriter(0x1).write(packet.read(8)))
            }
        } else if (nextState == 2) {
            server.send(new PacketWriter(0x0).writeJSON(msg))
            serverSocket.end()
        }
        setTimeout(() => serverSocket.end(), 1000)
        return log(remoteAddress, host, nextState, "INVALID_HOST")
    }

    const clientSocket = connect({ host: addr.host, port: addr.port }, () => {
        const client = new Connection(clientSocket)
        for (let packet of packets) client.send(packet)
        server.stop(), client.stop()

        log(remoteAddress, host, nextState, "CONNECT")
        serverSocket.pipe(clientSocket), clientSocket.pipe(serverSocket)
    })

    clientSocket.on("error", (err: any) => {
        if (!clientSocket.writable) log(remoteAddress, host, nextState, err.code)
    })
    clientSocket.on("close", () => serverSocket.end())
    serverSocket.on("close", () => clientSocket.end())
}).listen(25565)

function log(remoteAddress: string, host: string, state: number, code: string) {
    const date = new Date
    console.log(`${date.toISOString()} ${remoteAddress} ${host} ${state} ${code}`)
}
