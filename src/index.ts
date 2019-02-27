#!/usr/bin/env node
import { Connection, Packet, PacketWriter, PacketReader, State } from "mcproto"
import { createServer, connect } from "net"

let port = 25565
const servers: Map<string, { host: string, port: number }> = new Map

let isPortOpt = false
for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("-p")) isPortOpt = true
    else if (isPortOpt) {
        isPortOpt = false
        port = parseInt(arg)
    } else {
        const [local, remote] = arg.split("=")
        const [host, port] = remote.split(":")
        if (!local) continue

        servers.set(local.trim(), {
            host: host.trim() || "127.0.0.1",
            port: parseInt(port) || 25565
        })
    }
}

createServer(async serverSocket => {
    serverSocket.on("error", _err => {})
    const server = new Connection(serverSocket, { isServer: true })

    const handshake = await server.nextPacket()
    const protocol = handshake.readVarInt(), address = handshake.readString()
    const packet = server.nextPacket()

    const serverAddr = servers.get(address)
    if (!serverAddr) {
        const msg = { text: "Please use a valid address to connect!", color: "red" }
        if (server.state == State.Status) {
            server.send(new PacketWriter(0x0).writeJSON({
                version: { name: "Proxy", protocol: -1 },
                players: { max: -1, online: -1 },
                description: msg
            }))

            server.onPacket = packet => {
                if (packet.id == 0x1) server.send(new PacketWriter(0x1).write(packet.read(8)))
            }
        } else if (server.state == State.Play) {
            server.send(new PacketWriter(0x0).writeJSON(msg))
            serverSocket.end()
        }
        return setTimeout(() => serverSocket.end(), 1000)
    }

    const { host, port } = serverAddr
    const clientSocket = connect({ host, port }, async () => {
        const client = new Connection(clientSocket)

        client.send(new PacketWriter(0x0).writeVarInt(protocol)
        .writeString(host).writeUInt16(port).writeVarInt(server.state))
        client.send(await packet)

        server.destroy(), client.destroy()
        serverSocket.pipe(clientSocket), clientSocket.pipe(serverSocket)
    })

    clientSocket.on("error", _err => {})
    clientSocket.on("close", () => serverSocket.end())
    serverSocket.on("close", () => clientSocket.end())
}).listen(port)

console.log("Server listening on port " + port)

servers.forEach(({ host, port }, localAddr) => {
    console.log(`  - ${localAddr} -> ${host}:${port}`)
})
