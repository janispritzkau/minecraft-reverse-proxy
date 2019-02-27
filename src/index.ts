#!/usr/bin/env node
import { Connection, Packet, PacketWriter, PacketReader, State } from "mcproto"
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

    const handshake = await server.nextPacket()
    const protocol = handshake.readVarInt(), address = handshake.readString()
    const packet = server.nextPacket()

    if (!(address in servers)) {
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

    const { host, port } = servers[address]
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
}).listen(25565)
