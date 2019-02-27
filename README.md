# Minecraft Reverse Proxy

A simple reverse proxy which can run multiple minecraft servers on the same IP.

## Usage

```sh
mcrevproxy -p <server-port> <address>=<host>:<port> ...
```

### Example

```
mcrevproxy 1.localhost=:25566 2.localhost=192.168.2.100
```

If a client connects via `1.localhost`, they will be redirected to the local
address `127.0.0.1:25566`. Similar for `2.localhost`, it will redirect the
client to the network address `192.168.2.100:25565`.
