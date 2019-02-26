# Minecraft Reverse Proxy

A simple reverse proxy which can run multiple minecraft servers on the same IP.

## Usage

```sh
mcrevproxy <address>:<local-port>
# or
mcrevproxy <address>:<local-address>:<local-port>
```

### Example

```
mcrevproxy mc.example.com:25566 play.example.com:25567
```

If a client connected to the reverse proxy via `mc.example.com`, they will
be redirected to `localhost:25566`. Same for `play.example.com -> localhost:25567`.
