import asyncio
import getpass

import httpx

BASE = input("base url (same as in the PUT): ").strip().rstrip("/")
email = input("email: ").strip()
pw = getpass.getpass("password: ")


async def main():
    async with httpx.AsyncClient(follow_redirects=False, timeout=15) as c:
        r = await c.post(
            f"{BASE}/rest/login",
            json={"emailOrLdapLoginId": email, "password": pw},
        )
    print(
        "status:",
        r.status_code,
        "| url:",
        r.url,
        "| n8n-auth cookie:",
        "n8n-auth" in r.cookies,
    )
    if r.status_code != 200:
        print("body:", r.text[:300])


asyncio.run(main())
