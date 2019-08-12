#!/usr/bin/env node
import { Client, Server, PacketWriter, State } from "mcproto"

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

new Server(async client => {
    const remoteAddr = client.socket.remoteAddress!.replace("::ffff:", "")

    const handshake = await client.nextPacket()
    const protocol = handshake.readVarInt()
    const address = handshake.readString().split("\x00")[0]

    const log = (code: string, text = "") => {
        const isoDate = new Date().toISOString()
        if (text) text = " - " + text
        console.log(`${isoDate} ${code} ${remoteAddr} ${address}` + text)
    }

    const serverAddr = servers.get(address)

    if (!serverAddr) {
        const msg = { text: "Please use a valid address to connect!", color: "red" }
        if (client.state == State.Status) {
            client.on("packet", packet => {
                if (packet.id == 0x0) client.send(new PacketWriter(0x0).writeJSON({
                    version: { name: "Proxy", protocol: -1 },
                    players: { max: -1, online: -1 },
                    description: msg
                }))
                if (packet.id == 0x1) client.send(new PacketWriter(0x1).write(packet.read(8)))
            })
        } else if (client.state == State.Login) {
            client.end(new PacketWriter(0x0).writeJSON(msg))
        }

        log("BAD_ADDR")
        return setTimeout(() => conn.end(), 1000)
    }

    client.on("error", error => log("ERROR", error))
    client.pause()
    
    const { host, port } = serverAddr
    
    let conn: Client
    try {
        conn = await Client.connect(host, port)
    } catch (error) {
        log("ERROR", error)
        return client.end()
    }
    conn.on("error", error => log("ERROR", error))
    
    log("CONNECT")

    conn.send(new PacketWriter(0x0).writeVarInt(protocol)
        .writeString(host).writeUInt16(port)
        .writeVarInt(client.state))

    client.on("packet", packet => conn.send(packet))
    client.resume()

    client.unpipe(), client.unpipe()

    client.socket.pipe(conn.socket, { end: true })
    conn.socket.pipe(client.socket, { end: true })
}).listen(port)

console.log("Server listening on port " + port)

servers.forEach(({ host, port }, localAddr) => {
    console.log(`  - ${localAddr} -> ${host}:${port}`)
})

console.log()
