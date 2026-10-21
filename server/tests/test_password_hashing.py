"""
tests/test_password_hashing.py

Offline tests for password hashing: no database, no HTTP. A tiny fake session
stands in for SQLAlchemy.
"""

import types

import pytest

from app.core import auth as core_auth
from app.services.auth import create_user


class _Query:
    def __init__(self, user):
        self._user = user

    def filter(self, *a, **k):
        return self

    def first(self):
        return self._user


class FakeDB:
    def __init__(self, user=None):
        self.user = user
        self.added = []

    def query(self, *a):
        return _Query(self.user)

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        pass

    def refresh(self, obj):
        pass


def _new_user(password):
    return types.SimpleNamespace(
        email="a@b.co",
        password=password,
        provider="local",
        provider_id=None,
        full_name="A",
    )


def test_hash_is_bcrypt_and_round_trips():
    h = core_auth.get_password_hash("correct horse")
    assert h.startswith("$2") and h != "correct horse"
    assert core_auth.verify_password("correct horse", h)
    assert not core_auth.verify_password("wrong horse", h)


def test_same_password_hashes_differently_each_time():
    assert core_auth.get_password_hash("same-pass-1") != core_auth.get_password_hash(
        "same-pass-1"
    )


def test_verify_never_raises_on_bad_stored_values():
    assert core_auth.verify_password("abc", None) is False
    assert core_auth.verify_password("abc", "") is False
    assert core_auth.verify_password("abc", "abc") is False  # leftover plaintext row
    assert (
        core_auth.verify_password("x" * 73, core_auth.get_password_hash("x" * 72))
        is False
    )


def test_hash_rejects_over_72_bytes():
    with pytest.raises(ValueError):
        core_auth.get_password_hash("x" * 73)
    with pytest.raises(ValueError):
        core_auth.get_password_hash("é" * 37)  # 74 bytes, only 37 characters


def test_create_user_stores_a_hash_not_the_password():
    db = FakeDB()
    create_user(db, _new_user("my-secret-pw"))
    (stored,) = db.added
    assert stored.password != "my-secret-pw"
    assert core_auth.verify_password("my-secret-pw", stored.password)


def test_create_user_keeps_none_for_social_login():
    db = FakeDB()
    create_user(db, _new_user(None))
    assert db.added[0].password is None


def test_authenticate_user_accepts_only_the_right_password():
    row = types.SimpleNamespace(password=core_auth.get_password_hash("right-pass"))
    db = FakeDB(row)
    assert core_auth.authenticate_user(db, "a@b.co", "right-pass") is row
    assert core_auth.authenticate_user(db, "a@b.co", "wrong-pass") is False


def test_authenticate_user_unknown_email_and_google_account():
    assert core_auth.authenticate_user(FakeDB(None), "x@y.co", "whatever1") is False
    google = types.SimpleNamespace(password=None)
    assert core_auth.authenticate_user(FakeDB(google), "g@y.co", "whatever1") is False


def test_unmigrated_plaintext_row_cannot_log_in():
    # No plaintext fallback: a row the migration missed must fail closed.
    row = types.SimpleNamespace(password="plain-pass")
    assert core_auth.authenticate_user(FakeDB(row), "a@b.co", "plain-pass") is False
