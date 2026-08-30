"""Keywords for inspecting tool registrations and results captured in the browser.

Standard library only, on purpose, like `WebMcpManifest.py` beside it: the
suite has to run on a checkout that has installed nothing beyond Robot
Framework, RequestsLibrary and robotframework-browser.

The walker here differs from the manifest one in a single deliberate way: it
also descends into string values that parse as JSON. A tool result carries its
payload twice — once as `structuredContent` and once serialized inside
`content[0].text` — and a coordinate that leaked only into the text copy would
be just as disclosed to the agent as one in the structured copy. Matching is
on *keys*, as in the manifest suite: a description that says "coordinates are
never returned" is correct, and failing on it would teach the wrong lesson.
"""

import json
import re

CELL_KEY = re.compile(r"-?\d+,-?\d+,-?\d+")

# Any of these appearing as a key in an outbound payload means a coordinate
# travelled back out. There is no allowlist on the result side: the manifest's
# one exemption (place_block's inbound `position` parameter) is an input
# schema, and input schemas do not appear in results.
COORDINATE_KEYS = {"x", "y", "z", "position", "cell", "bycell", "voxels"}


def _maybe_json(value):
    """Decode a string that looks like a JSON document, or return None."""
    if isinstance(value, str) and value[:1] in "{[":
        try:
            return json.loads(value)
        except ValueError:
            return None
    return None


def _walk(node, path="$"):
    """Yield every (path, key, value) pair, descending into embedded JSON strings."""
    if isinstance(node, dict):
        for key, value in node.items():
            here = "{}.{}".format(path, key)
            yield here, key, value
            yield from _walk(value, here)
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from _walk(value, "{}[{}]".format(path, index))
    else:
        embedded = _maybe_json(node)
        if embedded is not None:
            yield from _walk(embedded, path + "<json>")


def parse_tool_result(text):
    """Decode the JSON.stringify'd WebMcpToolResult captured in the page."""
    result = json.loads(text)
    if not isinstance(result, dict):
        raise AssertionError("tool result is not an object: {!r}".format(result))
    return result


def structured_content(result):
    """The result's payload, after checking the call did not fail.

    Every tool wraps errors as `isError: true` rather than throwing, so a
    silently failed call would otherwise sail through the disclosure checks —
    an empty error payload discloses nothing and proves nothing.
    """
    if result.get("isError"):
        raise AssertionError("tool reported an error: {!r}".format(result.get("content")))
    payload = result.get("structuredContent")
    if not isinstance(payload, dict):
        raise AssertionError("tool result has no structuredContent object")
    return payload


def execution_payload(result):
    """The payload of a mutating tool, which must additionally say ok: true."""
    payload = structured_content(result)
    if payload.get("ok") is not True:
        raise AssertionError("tool did not succeed: {!r}".format(payload))
    return payload


def result_should_not_expose_keys(result, forbidden):
    """Fail if a forbidden key name appears anywhere in the result, at any depth."""
    banned = {name.lower() for name in forbidden}
    hits = [
        "{} (key '{}')".format(path, key)
        for path, key, _ in _walk(result)
        if key.lower() in banned
    ]
    if hits:
        raise AssertionError(
            "tool result exposes disclosure-gated keys: " + ", ".join(sorted(hits))
        )


def result_should_not_expose_coordinates(result):
    """Fail if any coordinate-shaped key appears anywhere in the result."""
    result_should_not_expose_keys(result, COORDINATE_KEYS)


def result_should_not_contain_cell_keys(result):
    """Fail on any key or string value shaped like an 'x,y,z' grid cell key."""
    hits = []
    for path, key, value in _walk(result):
        if CELL_KEY.search(key):
            hits.append("{} (key {!r})".format(path, key))
        if isinstance(value, str) and _maybe_json(value) is None and CELL_KEY.search(value):
            hits.append("{} = {!r}".format(path, value))
    if hits:
        raise AssertionError("tool result contains grid cell keys: " + ", ".join(sorted(hits)))


def check_registered_tools(tools, expected_names):
    """Fail unless the registered set is exactly the expected catalog, usable by a model.

    'Usable' matches the manifest suite's bar: a non-empty description and an
    object inputSchema. Deliberately *no* assertion that annotations are
    absent — readOnlyHint and friends are expected to arrive, and this test
    must not break when they do.
    """
    names = [tool.get("name") for tool in tools]
    if sorted(names) != sorted(expected_names):
        raise AssertionError(
            "registered tools {} != expected {}".format(sorted(names), sorted(expected_names))
        )

    problems = []
    for tool in tools:
        label = tool.get("name") or "<unnamed>"
        if not (tool.get("description") or "").strip():
            problems.append("{}: description is missing or empty".format(label))
        schema = tool.get("inputSchema")
        if not isinstance(schema, dict) or schema.get("type") != "object":
            problems.append("{}: inputSchema is missing or not an object schema".format(label))
    if problems:
        raise AssertionError("; ".join(problems))
