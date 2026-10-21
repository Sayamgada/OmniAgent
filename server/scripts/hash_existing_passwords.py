"""
One-off migration: replace plaintext passwords in `users` with bcrypt hashes.

    python -m scripts.hash_existing_passwords            # dry run, changes nothing
    python -m scripts.hash_existing_passwords --apply    # hash and commit

Run from the server/ directory (the one that contains app/). Safe to re-run:
rows that already hold a bcrypt hash and rows with no password (Google
accounts) are skipped. Never prints passwords. Back up the users table first.
"""

import argparse
import re

from app.core.auth import MAX_PASSWORD_BYTES, get_password_hash
from app.database import get_postgres_db
from app.models.user import User

_BCRYPT_RE = re.compile(r"^\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}$")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--apply", action="store_true", help="write changes (default: dry run)"
    )
    args = ap.parse_args()

    gen = get_postgres_db()
    db = next(gen)
    try:
        users = db.query(User).filter(User.password.isnot(None)).all()
        to_hash, already, too_long = [], 0, []
        for u in users:
            if _BCRYPT_RE.match(u.password):
                already += 1
            elif len(u.password.encode("utf-8")) > MAX_PASSWORD_BYTES:
                too_long.append(u.email)
            else:
                to_hash.append(u)

        print(f"users with a password: {len(users)}")
        print(f"  already bcrypt:      {already}")
        print(f"  to hash:             {len(to_hash)}")
        print(f"  skipped (>72 bytes): {len(too_long)}")
        for email in too_long:
            print(f"    needs a manual reset: {email}")

        if not args.apply:
            print("dry run - nothing written. Re-run with --apply.")
            return
        for u in to_hash:
            u.password = get_password_hash(u.password)
        db.commit()
        print(f"hashed {len(to_hash)} password(s).")
    finally:
        gen.close()


if __name__ == "__main__":
    main()
