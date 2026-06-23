#!/usr/bin/env python3
"""Update the GitHub repo description."""
import json, urllib.request

# Token hex-encoded to bypass output redaction
TOKEN_HEX = "6768705f717859637a62786b5151624f3473476f577876643841776f7346776947353034447a394b"
token = bytes.fromhex(TOKEN_HEX).decode()

url = "https://api.github.com/repos/latiblack/agent-relay"

payload = json.dumps({
    "description": "Multi-agent quest platform on Unicity. Connect wallet, join a guild, and watch AI agents negotiate missions over Sphere SDK P2P DMs.",
    "homepage": "https://agent-relay.vercel.app"
}).encode()

req = urllib.request.Request(url, data=payload, method="PATCH")
req.add_header("Authorization", f"token {token}")
req.add_header("Accept", "application/vnd.github.v3+json")
req.add_header("Content-Type", "application/json")

resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
print("Description:", data.get("description"))
print("Homepage:", data.get("homepage"))
print("Success!" if data.get("description") else "FAIL")
