# Minecraft Reverse Proxy

[![npm](https://img.shields.io/npm/v/mcrevproxy)](https://www.npmjs.com/package/mcrevproxy)

A small reverse proxy which can run multiple minecraft servers on the same IP.
It works by reading the hostname of the handshake packet and mapping it to
a different address. It has basic logging to the terminal.

## Usage

```sh
mcrevproxy -p <server-port> <address>=<host>:<port> ...
```

### Example

```sh
mcrevproxy server1.localhost=:25566 server2.localhost=192.168.2.100
```

Assuming that `*.localhost` does resolve to `127.0.0.1`, clients that connect to
`server1.localhost` will be forwarded to `127.0.0.1:25566`, and connections to
`server2.localhost` will be forwarded to `192.168.2.100:25565`.
