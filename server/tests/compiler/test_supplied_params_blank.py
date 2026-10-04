import pytest

from app.compiler.interfaces import MissingRequiredParam, SuppliedParamProvider
from app.compiler.models import Step
from app.compiler.param_schema import FieldDef


def _field(name, default="", type_="string"):
    return FieldDef(
        name=name, display_name=name, type=type_, required=True, default=default
    )


def _step():
    return Step(step=1, service="gmail")


def test_blank_required_values_are_reported_missing():
    provider = SuppliedParamProvider(
        {1: {"sendTo": "", "subject": "   ", "message": "hi"}}
    )
    fields = [_field("sendTo"), _field("subject"), _field("message")]
    with pytest.raises(MissingRequiredParam) as exc:
        provider.get_params(_step(), None, fields)
    assert exc.value.field_names == ["sendTo", "subject"]


def test_real_values_pass_through_unchanged():
    provider = SuppliedParamProvider({1: {"sendTo": "a@b.co", "flag": False}})
    fields = [_field("sendTo"), _field("flag", default=True, type_="boolean")]
    params = provider.get_params(_step(), None, fields)
    assert params["sendTo"] == "a@b.co"
    assert params["flag"] is False  # False is a real value, not "blank"


def test_blank_required_with_real_default_falls_back_to_default():
    provider = SuppliedParamProvider({1: {"emailType": ""}})
    params = provider.get_params(
        _step(), None, [_field("emailType", default="html", type_="options")]
    )
    assert params["emailType"] == "html"
