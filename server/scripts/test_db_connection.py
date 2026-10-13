"""
Safe PostgreSQL connectivity diagnostic script.
Tests connection to the configured database without leaking credentials.
"""
import sys
import socket
from pathlib import Path
from urllib.parse import urlparse
from sqlalchemy import text

# Ensure server root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from app.core.config import settings
    from app.database import engine
except ImportError as e:
    print(f"[ERROR] Could not import app modules: {e}")
    sys.exit(1)


def mask_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        netloc = ""
        if parsed.username:
            netloc += parsed.username
            if parsed.password:
                netloc += ":****"
            netloc += "@"
        netloc += parsed.hostname or "unknown"
        if parsed.port:
            netloc += f":{parsed.port}"
        return f"{parsed.scheme}://{netloc}{parsed.path}"
    except Exception:
        return "<masked_connection_url>"


def run_diagnostics():
    raw_url = settings.POSTGRE_DB_URL
    masked = mask_url(raw_url)
    print("=" * 60)
    print(" OmniAgent PostgreSQL Connectivity Diagnostic")
    print("=" * 60)
    print(f"Target: {masked}")

    parsed = urlparse(raw_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432

    # Step 1: TCP Port Check
    print(f"\n[1/3] Testing raw TCP socket to {host}:{port}...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5.0)
    try:
        s.connect((host, port))
        s.close()
        print(f"      [OK] TCP socket reached {host}:{port} successfully.")
    except Exception as e:
        print(f"      [FAIL] TCP socket failed: {e}")
        print("      Check firewall, hostname resolution, or server availability.")
        sys.exit(2)

    # Step 2: Database Engine & Query Execution
    print("\n[2/3] Testing database engine connection & 'SELECT 1'...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            print(f"      [OK] Query executed successfully. Result: {result}")
    except Exception as e:
        print(f"      [FAIL] Database connection failed: {e}")
        sys.exit(3)

    # Step 3: Schema Inspection
    print("\n[3/3] Inspecting existing database tables...")
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"      [OK] Found {len(tables)} tables: {', '.join(tables) if tables else 'None (empty DB)'}")
    except Exception as e:
        print(f"      [WARN] Could not inspect tables: {e}")

    print("\n" + "=" * 60)
    print(" [SUCCESS] PostgreSQL connection is healthy and verified!")
    print("=" * 60)
    sys.exit(0)


if __name__ == "__main__":
    run_diagnostics()
